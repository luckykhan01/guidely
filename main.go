package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/lib/pq"
	"google.golang.org/genai"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type User struct {
	ID    uint   `gorm:"primaryKey" json:"id"`
	Name  string `json:"name"`
	Email string `gorm:"uniqueIndex" json:"email"`
	Trips []Trip `gorm:"foreignKey:UserID" json:"trips,omitempty"`
}

type Trip struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	UserID           uint           `json:"user_id"`
	DestinationCity  string         `json:"destination_city"`
	DurationDays     int            `json:"duration_days"`
	PreferencesArray pq.StringArray `gorm:"type:text[]" json:"preferences_array"`
	ItineraryDays    []ItineraryDay `gorm:"foreignKey:TripID" json:"itinerary_days,omitempty"`
}

type ItineraryDay struct {
	ID        uint    `gorm:"primaryKey" json:"id"`
	TripID    uint    `json:"trip_id"`
	DayNumber int     `json:"day_number"`
	Places    []Place `gorm:"foreignKey:ItineraryDayID" json:"places,omitempty"`
}

type Place struct {
	ID                 uint   `gorm:"primaryKey" json:"id"`
	ItineraryDayID     uint   `json:"itinerary_day_id"`
	Name               string `json:"name"`
	Category           string `json:"category"`
	Description        string `json:"description"`
	OrderSequence      int    `json:"order_sequence"`
	EstimatedTimeSpent int    `json:"estimated_time_spent"` // in minutes
}

type LLMPlace struct {
	Name        string  `json:"name"`
	Category    string  `json:"category"`
	Description string  `json:"description"`
	TravelTime  string  `json:"travelTime"`
	Distance    string  `json:"distance"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	ImageURL    string  `json:"imageUrl"`
}

type LLMDay struct {
	DayNumber int        `json:"dayNumber"`
	Places    []LLMPlace `json:"places"`
}

type LLMResponse struct {
	TripTitle string   `json:"tripTitle"`
	Days      []LLMDay `json:"days"`
}

var db *gorm.DB

func main() {
	// Load environment variables from .env file
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: No .env file found")
	}

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	var err error
	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	err = db.AutoMigrate(&User{}, &Trip{}, &ItineraryDay{}, &Place{})
	if err != nil {
		log.Fatal("Failed to auto-migrate:", err)
	}
	r := gin.Default()

	api := r.Group("/api")
	{
		api.POST("/trips", createTrip)
		api.POST("/generate-trip", generateTrip)
		api.GET("/trips/:id", getTrip)
		api.GET("/users/:id/trips", getUserTrips)
	}

	log.Println("Server starting on port 8080...")
	if err := r.Run(":8080"); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

// Helper: fetch Google Places real photo URL. If it fails, return a reliable fallback photo.
func fetchPlacePhotoURL(placeName, city string) string {
	apiKey := os.Getenv("GOOGLE_PLACES_API_KEY")
	fallbackURL := "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=600&auto=format&fit=crop"

	if apiKey == "" || apiKey == "your_google_places_api_key_here" {
		log.Println("Missing or placeholder Google Places API key. Using fallback image.")
		return fallbackURL
	}

	query := url.QueryEscape(placeName + " " + city)
	searchURL := fmt.Sprintf("https://maps.googleapis.com/maps/api/place/textsearch/json?query=%s&key=%s", query, apiKey)

	resp, err := http.Get(searchURL)
	if err != nil || resp.StatusCode != 200 {
		return fallbackURL
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var searchResp struct {
		Results []struct {
			Photos []struct {
				PhotoReference string `json:"photo_reference"`
			} `json:"photos"`
		} `json:"results"`
	}

	if err := json.Unmarshal(body, &searchResp); err != nil {
		return fallbackURL
	}

	if len(searchResp.Results) > 0 && len(searchResp.Results[0].Photos) > 0 {
		ref := searchResp.Results[0].Photos[0].PhotoReference
		return fmt.Sprintf("https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=%s&key=%s", ref, apiKey)
	}

	return fallbackURL
}

func generateItineraryPrompt(city string, durationDays int, preferences []string) string {
	prefs := strings.Join(preferences, ", ")
	return fmt.Sprintf(`You are an expert travel planner. Generate a %d-day trip to %s based on these interests: %s.

Output Format: You must respond only with a JSON object. Do not include any markdown formatting like `+"```json"+`.
JSON Structure:
{
"tripTitle": "%d-Day %s Trip",
"days": [
{
"dayNumber": 1,
"places": [
{
"name": "Name of Place",
"category": "Attraction/Food/History",
"description": "Brief 1-sentence hook",
"travelTime": "15 min",
"distance": "1.2 km",
"latitude": 43.2220,
"longitude": 76.8512
}
]
}
]
}
IMPORTANT: DO NOT invent, hallucinate, or return any image URLs. You MUST ONLY include accurate real-world latitude and longitude coordinates for every place based on its actual location in %s. Ensure the places are logically ordered by distance to minimize travel time.`, durationDays, city, prefs, durationDays, city, city)
}

func createTrip(c *gin.Context) {
	var trip Trip
	if err := c.ShouldBindJSON(&trip); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	prompt := generateItineraryPrompt(trip.DestinationCity, trip.DurationDays, trip.PreferencesArray)
	log.Println("Generated Prompt:\n", prompt)

	mockLLMJSON := `{
		"tripTitle": "1-Day Mock Trip",
		"days": [
			{
				"dayNumber": 1,
				"places": [
					{"name": "Central Museum", "category": "History", "description": "A large museum in the city center.", "travelTime": "15 min", "distance": "1.2 km"},
					{"name": "Local Bistro", "category": "Foodie", "description": "Famous for traditional dishes.", "travelTime": "10 min", "distance": "0.8 km"}
				]
			}
		]
	}`

	var llmResp LLMResponse
	if err := json.Unmarshal([]byte(mockLLMJSON), &llmResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse LLM response: " + err.Error()})
		return
	}

	for _, day := range llmResp.Days {
		itineraryDay := ItineraryDay{
			DayNumber: day.DayNumber,
		}
		for i, p := range day.Places {
			itineraryDay.Places = append(itineraryDay.Places, Place{
				Name:               p.Name,
				Category:           p.Category,
				Description:        p.Description,
				OrderSequence:      i + 1,
				EstimatedTimeSpent: 60, // Default to 60 minutes
			})
		}
		trip.ItineraryDays = append(trip.ItineraryDays, itineraryDay)
	}

	if err := db.Create(&trip).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create trip with itinerary: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, trip)
}

func getTrip(c *gin.Context) {
	id := c.Param("id")
	var trip Trip
	if err := db.Preload("ItineraryDays.Places").First(&trip, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Trip not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch trip: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, trip)
}

func getUserTrips(c *gin.Context) {
	userID := c.Param("id")
	var trips []Trip
	if err := db.Where("user_id = ?", userID).Preload("ItineraryDays.Places").Find(&trips).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user trips: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, trips)
}

func generateTrip(c *gin.Context) {
	var req struct {
		City         string   `json:"destination_city"`
		DurationDays int      `json:"duration_days"`
		Preferences  []string `json:"preferences_array"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: " + err.Error()})
		return
	}

	ctx := context.Background()

	// Initialize the client using genai.NewClient with genai.BackendGeminiAPI
	client, err := genai.NewClient(ctx, &genai.ClientConfig{Backend: genai.BackendGeminiAPI})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize GenAI SDK: " + err.Error()})
		return
	}

	prompt := generateItineraryPrompt(req.City, req.DurationDays, req.Preferences)
	log.Println("Calling GenAI with prompt for:", req.City)

	model := "gemini-2.5-flash"

	config := &genai.GenerateContentConfig{
		ResponseMIMEType: "application/json",
	}

	resp, err := client.Models.GenerateContent(ctx, model, genai.Text(prompt), config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gemini API failed to generate plan: " + err.Error()})
		return
	}

	jsonText := resp.Text()

	if jsonText == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Empty or invalid response structure from Gemini API"})
		return
	}

	jsonText = strings.TrimPrefix(jsonText, "```json\n")
	jsonText = strings.TrimPrefix(jsonText, "```\n")
	jsonText = strings.TrimSuffix(jsonText, "\n```")
	jsonText = strings.TrimSuffix(jsonText, "```")

	var llmResp LLMResponse
	if err := json.Unmarshal([]byte(jsonText), &llmResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse AI generated structured plan: " + err.Error(), "raw": jsonText})
		return
	}

	// WaitGroup to concurrently fetch Google Place photo URLs for every generated place
	var wg sync.WaitGroup
	for i := range llmResp.Days {
		for j := range llmResp.Days[i].Places {
			wg.Add(1)
			go func(dIdx, pIdx int) {
				defer wg.Done()
				placeName := llmResp.Days[dIdx].Places[pIdx].Name
				// Pass the place name along with the city name from request for better accuracy in Place TextSearch
				photoURL := fetchPlacePhotoURL(placeName, req.City)
				llmResp.Days[dIdx].Places[pIdx].ImageURL = photoURL
			}(i, j)
		}
	}
	wg.Wait()

	c.JSON(http.StatusOK, llmResp)
}
