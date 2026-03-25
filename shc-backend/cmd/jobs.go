package main

import (
	"fmt"

	"github.com/aj-2000/shc-backend/services"
)

func runCronJobs(as *services.AppService) {
	as.CronService.AddFunc("@midnight", func() {
		print("Deleting all non-uploaded files")
		err := as.FileService.DeleteAllNonUploadedFiles()
		if err != nil {
			fmt.Println(err)
		}
	})
	as.CronService.Start()
}
