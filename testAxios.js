const axios = require("axios");

const API_BASE_URL = "http://13.60.198.222:8000/api";

axios.get(`${API_BASE_URL}/videos/`)
  .then((response) => console.log("Data:", response.data))
  .catch((error) => console.error("Error:", error.message));
