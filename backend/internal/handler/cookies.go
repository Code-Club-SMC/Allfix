package handler

import "net/http"

type CookieConfig struct {
	Secure   bool
	SameSite http.SameSite
}

func tokenCookie(token string, maxAge int, cfg CookieConfig) *http.Cookie {
	return &http.Cookie{
		Name:     "allfix_token",
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   cfg.Secure,
		SameSite: cfg.SameSite,
		MaxAge:   maxAge,
	}
}

func clearTokenCookie(cfg CookieConfig) *http.Cookie {
	return &http.Cookie{
		Name:     "allfix_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   cfg.Secure,
		SameSite: cfg.SameSite,
	}
}
