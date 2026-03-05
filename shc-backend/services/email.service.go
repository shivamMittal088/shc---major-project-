package services

import (
	"bytes"
	"crypto/tls"
	"errors"
	"fmt"
	"html/template"
	"net"
	"net/smtp"
	"os"
	"strconv"
	"strings"
	"time"
)

type smtpServer struct {
	host string
	port string
}

func (s *smtpServer) Address() string {
	return s.host + ":" + s.port
}

type EmailService struct {
	smtpServer  *smtpServer
	tlsMode     string
	dialTimeout time.Duration
}

const (
	tlsModeStartTLS = "starttls"
	tlsModeImplicit = "tls"
	tlsModeNone     = "none"
)

func getEnvOrDefault(key string, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	return value
}

func getDialTimeout() time.Duration {
	secondsRaw := strings.TrimSpace(os.Getenv("SMTP_DIAL_TIMEOUT_SECONDS"))
	if secondsRaw == "" {
		return 10 * time.Second
	}

	seconds, err := strconv.Atoi(secondsRaw)
	if err != nil || seconds <= 0 {
		return 10 * time.Second
	}

	return time.Duration(seconds) * time.Second
}

func normalizeTLSMode(mode string, port string) string {
	mode = strings.ToLower(strings.TrimSpace(mode))
	if mode == "" {
		if strings.TrimSpace(port) == "465" {
			return tlsModeImplicit
		}

		return tlsModeStartTLS
	}

	switch mode {
	case tlsModeStartTLS, tlsModeImplicit, tlsModeNone:
		return mode
	default:
		return tlsModeStartTLS
	}
}

func NewEmailService() *EmailService {
	host := getEnvOrDefault("SMTP_HOST", "smtp.gmail.com")
	port := getEnvOrDefault("SMTP_PORT", "587")
	tlsMode := normalizeTLSMode(os.Getenv("SMTP_TLS_MODE"), port)

	return &EmailService{
		smtpServer: &smtpServer{
			host: host,
			port: port,
		},
		tlsMode:     tlsMode,
		dialTimeout: getDialTimeout(),
	}
}

func (es *EmailService) sendMessage(client *smtp.Client, from string, to []string, msg []byte) error {
	if err := client.Mail(from); err != nil {
		return err
	}

	for _, receiver := range to {
		if err := client.Rcpt(receiver); err != nil {
			return err
		}
	}

	writer, err := client.Data()
	if err != nil {
		return err
	}

	if _, err = writer.Write(msg); err != nil {
		writer.Close()
		return err
	}

	if err = writer.Close(); err != nil {
		return err
	}

	return client.Quit()
}

func (es *EmailService) sendWithImplicitTLS(auth smtp.Auth, from string, to []string, msg []byte) error {
	tlsConfig := &tls.Config{ServerName: es.smtpServer.host, MinVersion: tls.VersionTLS12}
	dialer := &net.Dialer{Timeout: es.dialTimeout}

	conn, err := tls.DialWithDialer(dialer, "tcp", es.smtpServer.Address(), tlsConfig)
	if err != nil {
		return err
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, es.smtpServer.host)
	if err != nil {
		return err
	}
	defer client.Close()

	if auth != nil {
		authSupported, _ := client.Extension("AUTH")
		if !authSupported {
			return errors.New("smtp server does not support AUTH")
		}

		if err = client.Auth(auth); err != nil {
			return err
		}
	}

	return es.sendMessage(client, from, to, msg)
}

func (es *EmailService) sendWithSMTP(auth smtp.Auth, from string, to []string, msg []byte) error {
	dialer := &net.Dialer{Timeout: es.dialTimeout}
	conn, err := dialer.Dial("tcp", es.smtpServer.Address())
	if err != nil {
		return err
	}

	client, err := smtp.NewClient(conn, es.smtpServer.host)
	if err != nil {
		conn.Close()
		return err
	}
	defer client.Close()

	if es.tlsMode == tlsModeStartTLS {
		startTLSSupported, _ := client.Extension("STARTTLS")
		if !startTLSSupported {
			return errors.New("smtp server does not support STARTTLS")
		}

		tlsConfig := &tls.Config{ServerName: es.smtpServer.host, MinVersion: tls.VersionTLS12}
		if err = client.StartTLS(tlsConfig); err != nil {
			return err
		}
	}

	if auth != nil {
		authSupported, _ := client.Extension("AUTH")
		if !authSupported {
			return errors.New("smtp server does not support AUTH")
		}

		if err = client.Auth(auth); err != nil {
			return err
		}
	}

	return es.sendMessage(client, from, to, msg)
}

func (es *EmailService) sendMail(auth smtp.Auth, from string, to []string, msg []byte) error {
	switch es.tlsMode {
	case tlsModeImplicit:
		return es.sendWithImplicitTLS(auth, from, to, msg)
	case tlsModeStartTLS, tlsModeNone:
		return es.sendWithSMTP(auth, from, to, msg)
	default:
		return fmt.Errorf("unsupported smtp tls mode: %s", es.tlsMode)
	}
}

func (es *EmailService) SendEmail(
	to []string,
	subject string,
	body string,
) error {
	from := os.Getenv("SMTP_FROM_EMAIL")
	if from == "" {
		from = os.Getenv("SMTP_USER")
	}

	username := os.Getenv("SMTP_USER")
	if username == "" {
		username = from
	}

	password := os.Getenv("GOOGLE_APP_PASSWORD")
	if password == "" {
		password = os.Getenv("SMTP_PASSWORD")
	}

	if from == "" {
		return errors.New("smtp sender missing: set SMTP_FROM_EMAIL or SMTP_USER")
	}

	if username == "" || password == "" {
		return errors.New("smtp credentials missing: set SMTP_USER and SMTP_PASSWORD or GOOGLE_APP_PASSWORD")
	}

	auth := smtp.PlainAuth("", username, password, es.smtpServer.host)

	// Create a new template
	tmpl := template.New("emailTemplate")

	// Parse the HTML email template
	templateString := `
		<html>
			<body>
				<h1>{{.Subject}}</h1>
				<p>{{.Body}}</p>
			</body>
		</html>
	`
	tmpl, err := tmpl.Parse(templateString)
	if err != nil {
		return err
	}

	// Prepare the data for the template
	data := struct {
		Subject string
		Body    string
	}{
		Subject: subject,
		Body:    body,
	}

	// Render the template into a buffer
	buffer := new(bytes.Buffer)
	err = tmpl.Execute(buffer, data)
	if err != nil {
		return err
	}

	// Convert the buffer to a string
	htmlBody := buffer.String()

	// Set the email content type to HTML
	msg := "From: " + from + "\r\n" +
		"To: " + strings.Join(to, ",") + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=\"UTF-8\"\r\n\r\n" +
		htmlBody

	// Send the email
	err = es.sendMail(auth, from, to, []byte(msg))
	if err != nil {
		return fmt.Errorf("send email via %s failed: %w", es.smtpServer.Address(), err)
	}

	return nil
}
