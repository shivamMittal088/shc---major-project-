package filehandlers

import (
	"strconv"

	"github.com/aj-2000/shc-backend/models"
	"github.com/aj-2000/shc-backend/services"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

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

	userId, err := uuid.Parse(userIdString)
	if err != nil {
		return err
	}

	filesPaginationResults, err := as.FileService.FindFilesByUserId(userId, search, page, limit)
	if err != nil {
		return err
	}

	// TODO: clean this up

	trimmedFiles := []map[string]any{}
	var files []models.File

	if results, ok := filesPaginationResults.Results.([]models.File); ok {
		files = results
	} else {
		return &fiber.Error{Code: fiber.StatusInternalServerError, Message: "Error while parsing files"}
	}

	for _, file := range files {
		trimmedFiles = append(trimmedFiles, map[string]any{
			"id":            file.ID,
			"name":          file.Name,
			"size":          file.Size,
			"is_public":     file.IsPublic,
			"mime_type":     file.MimeType,
			"extension":     file.Extension,
			"user_id":       file.UserId,
			"upload_status": file.UploadStatus,
			"updated_at":    file.UpdatedAt,
		})
	}

	filesPaginationResults.Results = trimmedFiles
	return c.JSON(filesPaginationResults)
}
