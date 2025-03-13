/**
 * Test script for getting saved videos
 * 
 * This script tests the getSavedVideos endpoint by:
 * 1. Getting a JWT token from command line
 * 2. Making a request to get all saved videos
 * 3. Displaying the saved videos
 */

const axios = require('axios');
const API_BASE_URL = "http://192.168.29.199:8000/api";

// Create axios instance with auth header
const authAxios = axios.create({
  baseURL: API_BASE_URL
});

// Function to get token from command line
function getToken() {
  try {
    const token = process.argv[2]; // Get token from command line argument
    if (!token) {
      console.error('Please provide a JWT token as a command line argument');
      console.error('Usage: node test-get-saved-videos.js YOUR_JWT_TOKEN');
      process.exit(1);
    }
    return token;
  } catch (error) {
    console.error('Error getting token:', error);
    process.exit(1);
  }
}

// Add request interceptor to include token in requests
authAxios.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Function to get saved videos
async function getSavedVideos() {
  try {
    console.log('Fetching saved videos...');
    const response = await authAxios.get(`/videos/saved`);
    console.log('Saved videos response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching saved videos:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('Headers:', error.response?.headers);
    console.error('Config:', error.config);
    throw error;
  }
}

// Main function to run the test
async function runTest() {
  try {
    // Get saved videos
    const savedVideos = await getSavedVideos();
    
    console.log('\n======= SAVED VIDEOS =======\n');
    
    if (savedVideos.length === 0) {
      console.log('No saved videos found');
    } else {
      console.log(`Found ${savedVideos.length} saved videos:`);
      
      savedVideos.forEach((video, index) => {
        console.log(`------------------------------`);
        console.log(`${index + 1}. ID: ${video.video_id}`);
        console.log(`   Title: ${video.title}`);
        console.log(`   User ID: ${video.user_id}`);
        if (video.thumbnail_url) {
          console.log(`   Thumbnail: ${video.thumbnail_url}`);
        }
      });
    }
    
    console.log('\n======= TEST COMPLETE =======\n');
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
runTest(); 