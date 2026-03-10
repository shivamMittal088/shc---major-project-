package filehandlers

import (
	"strconv"

	"github.com/aj-2000/shc-backend/models"
	"github.com/aj-2000/shc-backend/services"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type listFileItemResponse struct {
	ID           uuid.UUID           `json:"id"`
	Name         string              `json:"name"`
	Size         uint                `json:"size"`
	IsPublic     bool                `json:"is_public"`
	MimeType     string              `json:"mime_type"`
	Extension    string              `json:"extension"`
	UserID       uuid.UUID           `json:"user_id"`
	UploadStatus models.UploadStatus `json:"upload_status"`
	CreatedAt    string              `json:"created_at"`
	UpdatedAt    string              `json:"updated_at"`
}

type listFilesResponse struct {
	Results      []listFileItemResponse `json:"results"`
	TotalResults int64                  `json:"total_results"`
	TotalPages   uint                   `json:"total_pages"`
	CurrentPage  uint                   `json:"current_page"`
	NextPage     uint                   `json:"next_page"`
	PerPage      uint                   `json:"per_page"`
	PrevPage     uint                   `json:"prev_page"`
}

func ListFiles(c fiber.Ctx, as *services.AppService) error {

	userIdString := string(c.Request().Header.Peek("user_id"))

	pageString := c.Query("page")
	page, err := strconv.Atoi(pageString)
	if err != nil || page < 1 {
		page = 1
	}

	limitString := c.Query("limit")
	limit, err := strconv.Atoi(limitString)
	if err != nil || limit < 1 {
		limit = 10
	}

	search := c.Query("search")
	language := c.Query("language")

	userId, err := uuid.Parse(userIdString)
	if err != nil {
		return err
	}

	cacheKey := services.UserFilesCacheKey(userId, search, language, page, limit)
	var cachedResponse listFilesResponse
	if err := as.RedisService.GetJSONCache(cacheKey, &cachedResponse); err == nil {
		return c.JSON(cachedResponse)
	}

	filesPaginationResults, err := as.FileService.FindFilesByUserId(userId, search, language, page, limit)
	if err != nil {
		return err
	}

	// TODO: clean this up

	trimmedFiles := []listFileItemResponse{}
	var files []models.File

	if results, ok := filesPaginationResults.Results.([]models.File); ok {
		files = results
	} else {
		return &fiber.Error{Code: fiber.StatusInternalServerError, Message: "Error while parsing files"}
	}

	for _, file := range files {
		trimmedFiles = append(trimmedFiles, listFileItemResponse{
			ID:           file.ID,
			Name:         file.Name,
			Size:         file.Size,
			IsPublic:     file.IsPublic,
			MimeType:     file.MimeType,
			Extension:    file.Extension,
			UserID:       file.UserId,
			UploadStatus: file.UploadStatus,
			CreatedAt:    file.CreatedAt.Format("2006-01-02T15:04:05.999999999Z07:00"),
			UpdatedAt:    file.UpdatedAt.Format("2006-01-02T15:04:05.999999999Z07:00"),
		})
	}

	response := listFilesResponse{
		Results:      trimmedFiles,
		TotalResults: filesPaginationResults.TotalResults,
		TotalPages:   filesPaginationResults.TotalPages,
		CurrentPage:  filesPaginationResults.CurrentPage,
		NextPage:     filesPaginationResults.NextPage,
		PerPage:      filesPaginationResults.PerPage,
		PrevPage:     filesPaginationResults.PrevPage,
	}

	_ = as.RedisService.SetJSONCache(cacheKey, response, services.UserFilesCacheTTL)

	return c.JSON(response)
}
