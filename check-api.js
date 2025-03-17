const axios = require('axios');

// Use the same URL as in your .env file
const API_URL = "http://13.60.198.222:8000/api/videos/";

console.log("Attempting to connect to:", API_URL);

axios.get(API_URL)
  .then(response => {
    console.log("Connection successful!");
    console.log("Retrieved", response.data.length, "videos");
    console.log("First few videos:", JSON.stringify(response.data.slice(0, 2), null, 2));
  })
  .catch(error => {
    console.error("Connection failed:", error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error("The server is not running or not accepting connections on this address/port");
      console.error("Make sure your backend server is running with: uvicorn app.main:app --host 0.0.0.0 --port 8000");
    }
  }); 