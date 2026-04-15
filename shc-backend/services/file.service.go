package services

import (
	"time"

	m "github.com/aj-2000/shc-backend/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type FileService struct {
	dbService *DbService
}

type userFileCount struct {
	UserId uuid.UUID
	Total  int64
}

func NewFileService(dbService *DbService) *FileService {
	return &FileService{
		dbService: dbService,
	}
}

func (fs *FileService) FindFileById(fileId uuid.UUID) (*m.File, error) {
	var file m.File
	if err := fs.dbService.Db.Where("id = ?", fileId).First(&file).Error; err != nil {
		return nil, err
	}

	return &file, nil
}

func (fs *FileService) FindFileByIdRaw(fileId uuid.UUID) (*m.File, error) {
	var file m.File
	if err := fs.dbService.Db.Where("id = ?", fileId).First(&file).Error; err != nil {
		return nil, err
	}

	return &file, nil
}

func (fs *FileService) ToggleIsPublic(fileId uuid.UUID, userId uuid.UUID) (*m.File, error) {
	var file m.File
	if err := fs.dbService.Db.Where("id = ? AND user_id = ?", fileId, userId).First(&file).Error; err != nil {
		return nil, err
	}
	file.IsPublic = !file.IsPublic
	if err := fs.dbService.Db.Save(&file).Error; err != nil {
		return nil, err
	}

	return &file, nil
}

func (fs *FileService) FindFilesByUserId(user_id uuid.UUID, search string, language string, page int, limit int) (*PaginatedResults, error) {
	var files []m.File
	var totalCount int64

	baseQuery := fs.dbService.Db.Model(&m.File{}).Where("user_id = ?", user_id)
	if search != "" {
		baseQuery = baseQuery.Where("name ILIKE ?", "%"+search+"%")
	}
	if language != "" {
		baseQuery = baseQuery.Where("extension = ?", language)
	}

	if err := baseQuery.Count(&totalCount).Error; err != nil {
		return nil, err
	}

	query := baseQuery.Order("updated_at DESC").Offset((page - 1) * limit).Limit(limit).Find(&files)

	if query.Error != nil {
		return nil, query.Error
	}

	// TODO: find a better way to do this - maybe a helper function

	pagesCount := totalCount / int64(limit)
	if totalCount%int64(limit) != 0 {
		pagesCount += 1
	}

	currentPage := uint(page)

	nextPage := currentPage + 1
	if currentPage >= uint(pagesCount) {
		nextPage = 0
	}

	prevPage := currentPage - 1
	if currentPage <= 1 {
		prevPage = 0
	}

	return &PaginatedResults{
		Results:      files,
		TotalResults: totalCount,
		TotalPages:   uint(pagesCount),
		CurrentPage:  currentPage,
		NextPage:     nextPage,
		PerPage:      uint(limit),
		PrevPage:     prevPage,
	}, nil
}

func (fs *FileService) CreateFile(file *m.File) (*m.File, error) {
	if err := fs.dbService.Db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&file).Error; err != nil {
			return err
		}

		return fs.syncUserFileCountTx(tx, file.UserId)
	}); err != nil {
		return nil, err
	}

	return file, nil
}

func (fs *FileService) UpdateAFile(file *m.File) (*m.File, error) {
	if err := fs.dbService.Db.Save(&file).Error; err != nil {
		return nil, err
	}
	return file, nil
}

func (fs *FileService) DeleteAFile(userId uuid.UUID, fileId uuid.UUID) (string, error) {
	var file m.File
	r2Path := ""

	if err := fs.dbService.Db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("id = ? AND user_id = ?", fileId, userId).First(&file).Error; err != nil {
			return err
		}

		r2Path = file.R2Path

		if err := tx.Delete(&file).Error; err != nil {
			return err
		}

		return fs.syncUserFileCountTx(tx, userId)
	}); err != nil {
		return "", err
	}

	return r2Path, nil
}

func (fs *FileService) RenameFile(userId uuid.UUID, fileId uuid.UUID, newName string) (*m.File, error) {
	var file m.File
	if err := fs.dbService.Db.Where("id = ? AND user_id = ?", fileId, userId).First(&file).Error; err != nil {
		return nil, err
	}
	file.Name = newName
	if err := fs.dbService.Db.Save(&file).Error; err != nil {
		return nil, err
	}
	return &file, nil
}

func (fs *FileService) UpdateUploadStatus(userId uuid.UUID, fileId uuid.UUID, status m.UploadStatus) (*m.File, error) {
	var file m.File

	if err := fs.dbService.Db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("id = ? AND user_id = ?", fileId, userId).First(&file).Error; err != nil {
			return err
		}

		file.UploadStatus = status
		if err := tx.Save(&file).Error; err != nil {
			return err
		}

		return fs.syncUserFileCountTx(tx, userId)
	}); err != nil {
		return nil, err
	}

	return &file, nil
}

func (fs *FileService) IncrementDownloadCount(fileId uuid.UUID) error {
	if err := fs.dbService.Db.Model(&m.File{}).Where("id = ?", fileId).Update("download_count", gorm.Expr("download_count + ?", 1)).Error; err != nil {
		return err
	}
	return nil
}

func (fs *FileService) IncrementViewCount(fileId uuid.UUID) error {
	if err := fs.dbService.Db.Model(&m.File{}).Where("id = ?", fileId).Update("view_count", gorm.Expr("view_count + ?", 1)).Error; err != nil {
		return err
	}
	return nil
}

func (fs *FileService) DeleteAllNonUploadedFiles() error {
	oneDayAgo := time.Now().AddDate(0, 0, -1)

	return fs.dbService.Db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("upload_status != ? AND created_at < ?", m.Uploaded, oneDayAgo).Delete(&m.File{}).Error; err != nil {
			return err
		}

		return fs.syncAllUserFileCountsTx(tx)
	})
}

// DeleteExpiredFiles deletes files past their ExpiresAt time and returns their R2 paths for S3 cleanup.
func (fs *FileService) DeleteExpiredFiles() ([]string, error) {
	var files []m.File
	now := time.Now()

	if err := fs.dbService.Db.Where("expires_at IS NOT NULL AND expires_at < ? AND upload_status = ?", now, m.Uploaded).Find(&files).Error; err != nil {
		return nil, err
	}

	if len(files) == 0 {
		return nil, nil
	}

	r2Paths := make([]string, 0, len(files))
	for _, f := range files {
		r2Paths = append(r2Paths, f.R2Path)
	}

	ids := make([]string, 0, len(files))
	for _, f := range files {
		ids = append(ids, f.ID.String())
	}

	if err := fs.dbService.Db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("id IN ?", ids).Delete(&m.File{}).Error; err != nil {
			return err
		}
		return fs.syncAllUserFileCountsTx(tx)
	}); err != nil {
		return nil, err
	}

	return r2Paths, nil
}

func (fs *FileService) SyncAllUserFileCounts() error {
	return fs.dbService.Db.Transaction(func(tx *gorm.DB) error {
		return fs.syncAllUserFileCountsTx(tx)
	})
}

func (fs *FileService) syncUserFileCountTx(tx *gorm.DB, userId uuid.UUID) error {
	var total int64

	if err := tx.Model(&m.File{}).Where("user_id = ? AND upload_status = ?", userId, m.Uploaded).Count(&total).Error; err != nil {
		return err
	}

	return tx.Model(&m.User{}).Where("id = ?", userId).Update("file_count", total).Error
}

func (fs *FileService) syncAllUserFileCountsTx(tx *gorm.DB) error {
	if err := tx.Session(&gorm.Session{AllowGlobalUpdate: true}).Model(&m.User{}).Update("file_count", 0).Error; err != nil {
		return err
	}

	var counts []userFileCount
	if err := tx.Model(&m.File{}).
		Select("user_id, COUNT(*) AS total").
		Where("upload_status = ?", m.Uploaded).
		Group("user_id").
		Scan(&counts).Error; err != nil {
		return err
	}

	for _, count := range counts {
		if err := tx.Model(&m.User{}).Where("id = ?", count.UserId).Update("file_count", count.Total).Error; err != nil {
			return err
		}
	}

	return nil
}
