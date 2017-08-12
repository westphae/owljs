package main

import (
	"fmt"
	//"io/ioutil"
	"net/http"
	//"os"

	"github.com/gorilla/websocket"
	"time"
	"math/rand"
)

var varNames = []string{"T", "A1", "A2", "A3", "B1", "B2", "B3"}

func main() {
	// Serve index.html
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r,"../index.html")
		fmt.Println("Served index.html")
	})

	// Serve res/owl.js
	http.HandleFunc("/res/owl.js", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r,"../res/owl.js")
		fmt.Println("Served res/owl.js")
	})

	// Serve res/owl.css
	http.HandleFunc("/res/owl.css", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r,"../res/owl.css")
		fmt.Println("Served res/owl.css")
	})

	// Set up websocket
	var upgrader = websocket.Upgrader{
		ReadBufferSize: 1024,
		WriteBufferSize: 1024,
	}
	http.HandleFunc("/websocket", func(w http.ResponseWriter, r *http.Request) {
		fmt.Println("Processing websocket")
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			fmt.Printf("Error upgrading to websocket: %s\n", err)
			return
		}
		fmt.Println("Client opened a connection")

		dat := make(map[string]float64)
		noise := rand.New(rand.NewSource(99))
		ticker := time.NewTicker(50 * time.Millisecond)
		t0 := time.Now()
		var t time.Time
		for {
			t = <-ticker.C
			for _, key := range(varNames) {
				if key == "T" {
					dat[key] = float64(t.Sub(t0))/1e9
				} else {
					dat[key] = 2*noise.Float64() - 1
				}
			}
			conn.WriteJSON(dat)
			fmt.Printf("Data sent at time %v\n", t)
			if t.Sub(t0) > 20 * time.Second {
				ticker.Stop()
				conn.Close()
				break
			}
		}
	})

	// Start server
	fmt.Println("Listening on port 8000")
	http.ListenAndServe(":8000", nil)
}
