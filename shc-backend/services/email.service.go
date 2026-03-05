package services

import (
	"bytes"
	"errors"
	"html/template"
	"net/smtp"
	"os"
	"strings"
)

type smtpServer struct {
	host string
	port string
}

func (s *smtpServer) Address() string {
	return s.host + ":" + s.port
}

type EmailService struct {
	smtpServer *smtpServer
}

type loginAuth struct {
	username string
	password string
}

func (a *loginAuth) Start(server *smtp.ServerInfo) (string, []byte, error) {
	if !server.TLS {
		return "", nil, errors.New("unencrypted connection")
	}

	if server.Name != "smtp.gmail.com" {
		return "", nil, errors.New("wrong host name")
	}

	return "LOGIN", []byte(a.username), nil
}

func (a *loginAuth) Next(fromServer []byte, more bool) ([]byte, error) {
	if !more {
		return nil, nil
	}

	prompt := strings.ToLower(string(fromServer))
	if strings.Contains(prompt, "username") {
		return []byte(a.username), nil
	}

	if strings.Contains(prompt, "password") {
		return []byte(a.password), nil
	}

	return nil, errors.New("unknown server challenge")
}

func NewEmailService() *EmailService {
	return &EmailService{
		smtpServer: &smtpServer{
			host: "smtp.gmail.com", port: "587",
		},
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
	if from == "" {
		from = "arl0817osho@gmail.com"
	}

	username := os.Getenv("SMTP_USER")
	if username == "" {
		username = from
	}

	password := os.Getenv("GOOGLE_APP_PASSWORD")
	if username == "" || password == "" {
		return errors.New("smtp credentials missing: set SMTP_USER and GOOGLE_APP_PASSWORD in .env")
	}

	auth := &loginAuth{username: username, password: password}

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
	err = smtp.SendMail(es.smtpServer.Address(), auth, from, to, []byte(msg))
	if err != nil {
		return err
	}

	return nil
}
