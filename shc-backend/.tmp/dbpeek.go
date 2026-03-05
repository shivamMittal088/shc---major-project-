package main

import (
    "fmt"
    "os"

    _ "github.com/joho/godotenv/autoload"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
)

type tableCount struct {
    TableName string
    RowCount  int64
}

func main() {
    dsn := fmt.Sprintf("host=%s port=%s user=%s dbname=%s sslmode=disable password=%s", os.Getenv("DB_HOST"), os.Getenv("DB_PORT"), os.Getenv("DB_USER"), os.Getenv("DB_NAME"), os.Getenv("DB_PASSWORD"))

    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        panic(err)
    }

    var tables []string
    if err := db.Raw("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename").Scan(&tables).Error; err != nil {
        panic(err)
    }

    fmt.Println("Connected to PostgreSQL. Public tables:")
    if len(tables) == 0 {
        fmt.Println("(no tables found)")
        return
    }

    for _, t := range tables {
        var c int64
        q := fmt.Sprintf("SELECT COUNT(*) FROM \"%s\"", t)
        if err := db.Raw(q).Scan(&c).Error; err != nil {
            fmt.Printf("- %s (count failed: %v)\n", t, err)
            continue
        }
        fmt.Printf("- %s: %d rows\n", t, c)
    }
}
