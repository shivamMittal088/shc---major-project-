# syntax=docker/dockerfile:1.7

FROM golang:1.24-alpine AS build
WORKDIR /src
RUN apk add --no-cache git ca-certificates
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/app ./cmd

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata && \
    adduser -D -u 10001 app
WORKDIR /app
COPY --from=build /out/app /app/app
RUN mkdir -p /data/storage && chown -R app:app /data
USER app
ENV PORT=10000 \
    SHC_LOCAL_STORAGE_DIR=/data/storage
EXPOSE 10000
CMD ["/app/app"]
