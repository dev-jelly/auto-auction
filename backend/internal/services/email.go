package services

import (
	"crypto/tls"
	"fmt"
	"net"
	"net/smtp"

	"github.com/jelly/auto-auction/backend/internal/config"
)

type EmailService struct {
	cfg *config.Config
}

func NewEmailService(cfg *config.Config) *EmailService {
	return &EmailService{cfg: cfg}
}

func (s *EmailService) SendVerificationEmail(toEmail, toName, token string) error {
	if s.cfg.SMTPHost == "" || s.cfg.SMTPUser == "" {
		// SMTP not configured — skip silently in dev
		return nil
	}
	verifyURL := fmt.Sprintf("%s/verify-email?token=%s", s.cfg.AppBaseURL, token)
	subject := "이메일 인증 - 오토옥션"
	body := fmt.Sprintf(`안녕하세요, %s님!

오토옥션 이메일 인증을 위해 아래 링크를 클릭해 주세요:

%s

이 링크는 24시간 후 만료됩니다.

감사합니다.
오토옥션 팀`, toName, verifyURL)

	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		s.cfg.SMTPFrom, toEmail, subject, body)

	addr := fmt.Sprintf("%s:%d", s.cfg.SMTPHost, s.cfg.SMTPPort)
	host, _, _ := net.SplitHostPort(addr)

	auth := smtp.PlainAuth("", s.cfg.SMTPUser, s.cfg.SMTPPassword, host)

	// Try STARTTLS first, fall back to plain
	conn, err := net.Dial("tcp", addr)
	if err != nil {
		return fmt.Errorf("smtp dial: %w", err)
	}
	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return fmt.Errorf("smtp client: %w", err)
	}
	defer client.Close()

	if ok, _ := client.Extension("STARTTLS"); ok {
		tlsCfg := &tls.Config{ServerName: host, InsecureSkipVerify: true}
		if err = client.StartTLS(tlsCfg); err != nil {
			return fmt.Errorf("starttls: %w", err)
		}
	}

	if err = client.Auth(auth); err != nil {
		return fmt.Errorf("smtp auth: %w", err)
	}
	if err = client.Mail(s.cfg.SMTPFrom); err != nil {
		return fmt.Errorf("smtp mail from: %w", err)
	}
	if err = client.Rcpt(toEmail); err != nil {
		return fmt.Errorf("smtp rcpt: %w", err)
	}
	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("smtp data: %w", err)
	}
	_, err = fmt.Fprint(w, msg)
	if err != nil {
		return err
	}
	return w.Close()
}
