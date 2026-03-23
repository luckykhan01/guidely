package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/lib/pq"
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
	Name        string `json:"name"`
	Category    string `json:"category"`
	Description string `json:"description"`
}

type LLMDay struct {
	DayNumber int        `json:"day_number"`
	Places    []LLMPlace `json:"places"`
}

type LLMResponse struct {
	Days []LLMDay `json:"days"`
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
		api.GET("/trips/:id", getTrip)
		api.GET("/users/:id/trips", getUserTrips)
	}

	log.Println("Server starting on port 8080...")
	if err := r.Run(":8080"); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func generateItineraryPrompt(city string, durationDays int, preferences []string) string {
	prefs := strings.Join(preferences, ", ")
	return fmt.Sprintf(`You are an expert travel planner. Create an optimized daily travel itinerary for a %d-day trip to %s.
The traveler has the following preferences: %s.

Please return the response *strictly* as a JSON object matching this structure, with no formatting or other text:
{
  "days": [
    {
      "day_number": 1,
      "places": [
        {
          "name": "Place Name",
          "category": "Category",
          "description": "A brief description of the place."
        }
      ]
    }
  ]
}`, durationDays, city, prefs)
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
		"days": [
			{
				"day_number": 1,
				"places": [
					{"name": "Central Museum", "category": "History", "description": "A large museum in the city center."},
					{"name": "Local Bistro", "category": "Foodie", "description": "Famous for traditional dishes."}
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
