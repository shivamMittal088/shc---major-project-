package main

import (
	"fmt"
	"log"

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

	as.CronService.AddFunc("@every 1h", func() {
		r2Paths, err := as.FileService.DeleteExpiredFiles()
		if err != nil {
			log.Printf("DeleteExpiredFiles: %v", err)
			return
		}
		for _, key := range r2Paths {
			if err := as.S3Service.DeleteObject(key); err != nil {
				log.Printf("S3 delete failed for key %q: %v", key, err)
			}
		}
		if len(r2Paths) > 0 {
			log.Printf("Deleted %d expired file(s) from storage", len(r2Paths))
		}
	})

	as.CronService.Start()
}
