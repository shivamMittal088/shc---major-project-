package services

import (
	"time"

	m "github.com/aj-2000/shc-backend/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type FileService struct {
	dbService           *DbService
	subscriptionService *SubscriptionService
}

func NewFileService(dbService *DbService, subscriptionService *SubscriptionService) *FileService {
	return &FileService{
		dbService:           dbService,
		subscriptionService: subscriptionService,
	}
}

func (fs *FileService) FindFileById(fileId uuid.UUID) (*m.File, error) {
	var file m.File
	if err := fs.dbService.Db.Where("id = ?", fileId).First(&file).Error; err != nil {
		return nil, err
	}
	if err := fs.subscriptionService.IncrementReads(file.UserId); err != nil {
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

func (fs *FileService) FindFilesByUserId(user_id uuid.UUID, search string, page int, limit int) (*PaginatedResults, error) {
	var files []m.File
	var totalCount int64

	query := fs.dbService.Paginated(page, limit).Where("user_id = ?", user_id)
	if search != "" {
		query = query.Where("name ILIKE ?", "%"+search+"%")
	}
	query = query.Order("updated_at DESC").Limit(50).Find(&files).Count(&totalCount)

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
	err := fs.subscriptionService.IncrementWrites(file.UserId, file.Size, true)

	if err != nil {
		return nil, err
	}

	if err := fs.dbService.Db.Create(&file).Error; err != nil {
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
	if err := fs.dbService.Db.Where("id = ? AND user_id = ?", fileId, userId).First(&file).Error; err != nil {
		return "", err
	}
	r2Path := file.R2Path
	if err := fs.dbService.Db.Delete(&file).Error; err != nil {
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
	if err := fs.dbService.Db.Where("id = ? AND user_id = ?", fileId, userId).First(&file).Error; err != nil {
		return nil, err
	}
	file.UploadStatus = status
	if err := fs.dbService.Db.Save(&file).Error; err != nil {
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
	if err := fs.dbService.Db.Where("upload_status != ? AND created_at < ?", m.Uploaded, oneDayAgo).Delete(&m.File{}).Error; err != nil {
		return err
	}
	return nil
}
