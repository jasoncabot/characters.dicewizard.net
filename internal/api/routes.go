package api

import (
	"io/fs"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// NewRouter creates a new chi router with all routes configured
func NewRouter(h *Handler, frontendFS fs.FS, assetsPath string) *chi.Mux {
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Compress(5))

	// CORS for development
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://localhost:8080"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Prometheus metrics
	r.Handle("/metrics", promhttp.Handler())

	// API routes
	r.Route("/api", func(r chi.Router) {
		// Public auth routes
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", h.Register)
			r.Post("/login", h.Login)

			// Protected auth routes
			r.Group(func(r chi.Router) {
				r.Use(h.AuthMiddleware)
				r.Get("/me", h.Me)
			})
		})

		// Protected character routes
		r.Route("/characters", func(r chi.Router) {
			r.Use(h.AuthMiddleware)
			r.Get("/", h.ListCharacters)
			r.Post("/", h.CreateCharacter)
			r.Get("/{id}", h.GetCharacter)
			r.Put("/{id}", h.UpdateCharacter)
			r.Post("/{id}/avatar", h.UploadCharacterAvatar)
			r.Delete("/{id}", h.DeleteCharacter)
		})

		// Protected campaign routes
		r.Route("/campaigns", func(r chi.Router) {
			r.Use(h.AuthMiddleware)
			r.Get("/", h.ListCampaigns)
			r.Get("/details", h.ListCampaignDetails)
			r.Post("/", h.CreateCampaign)
			r.Put("/{id}", h.UpdateCampaign)
			r.Put("/{id}/status", h.UpdateCampaignStatus)
			r.Post("/{id}/characters", h.AddCharacterToCampaign)
			r.Post("/{id}/invites", h.CreateCampaignInvite)
			r.Get("/{id}/members", h.ListCampaignMembers)
			r.Put("/{id}/members/{userId}/role", h.UpdateCampaignMemberRole)
			r.Post("/{id}/members/{userId}/revoke", h.RevokeCampaignMember)
		})

		// Public invite accept (auth required)
		r.Group(func(r chi.Router) {
			r.Use(h.AuthMiddleware)
			r.Post("/campaigns/invites/{code}/accept", h.AcceptCampaignInvite)
		})

		// Protected note routes
		r.Route("/notes", func(r chi.Router) {
			r.Use(h.AuthMiddleware)
			r.Post("/", h.CreateNote)
			r.Get("/search", h.SearchNotes)
		})
	})

	// Serve uploaded assets from a dedicated mount to avoid clashing with built frontend assets
	r.Handle("/uploads/*", http.StripPrefix("/uploads/", http.FileServer(http.Dir(assetsPath))))

	// Serve frontend static files
	if frontendFS != nil {
		fileServer := http.FileServer(http.FS(frontendFS))
		r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
			// Try to serve the file
			path := strings.TrimPrefix(r.URL.Path, "/")
			if path == "" {
				path = "index.html"
			}

			// Check if file exists
			if _, err := fs.Stat(frontendFS, path); err != nil {
				// File doesn't exist, serve index.html for SPA routing
				r.URL.Path = "/"
				path = "index.html"
			}

			fileServer.ServeHTTP(w, r)
		})
	}

	return r
}
