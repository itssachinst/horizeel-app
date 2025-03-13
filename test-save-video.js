/**
 * Test script for the save video functionality
 * 
 * This script tests the save video endpoint by:
 * 1. Getting a JWT token from localStorage
 * 2. Making a request to save a video
 * 3. Checking if the video was saved successfully
 */

const axios = require('axios');
const API_BASE_URL = "http://192.168.29.199:8000/api";

// Create axios instance with auth header
const authAxios = axios.create({
  baseURL: API_BASE_URL
});

// Function to get token from localStorage
function getToken() {
  try {
    // In Node.js, we can't access localStorage directly
    // This is just for demonstration - you'll need to provide a token
    const token = process.argv[2]; // Get token from command line argument
    if (!token) {
      console.error('Please provide a JWT token as a command line argument');
      console.error('Usage: node test-save-video.js YOUR_JWT_TOKEN VIDEO_ID');
      process.exit(1);
    }
    return token;
  } catch (error) {
    console.error('Error getting token:', error);
    process.exit(1);
  }
}

// Function to get video ID from command line
function getVideoId() {
  const videoId = process.argv[3]; // Get video ID from command line argument
  if (!videoId) {
    console.error('Please provide a video ID as a command line argument');
    console.error('Usage: node test-save-video.js YOUR_JWT_TOKEN VIDEO_ID');
    process.exit(1);
  }
  return videoId;
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

// Function to save a video
async function saveVideo(videoId) {
  try {
    console.log(`Attempting to save video with ID: ${videoId}`);
    const response = await authAxios.post(`/videos/${videoId}/save`);
    console.log('Save video response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error saving video:', error.response?.data || error.message);
    throw error;
  }
}

// Function to check if a video is saved
async function checkVideoSaved(videoId) {
  try {
    console.log(`Checking if video with ID: ${videoId} is saved`);
    const response = await authAxios.get(`/videos/${videoId}/saved`);
    console.log('Check saved response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error checking if video is saved:', error.response?.data || error.message);
    throw error;
  }
}

// Main function to run the test
async function runTest() {
  try {
    const videoId = getVideoId();
    
    // First check if the video is already saved
    const initialCheck = await checkVideoSaved(videoId);
    console.log(`Video is ${initialCheck.is_saved ? 'already saved' : 'not saved'}`);
    
    // Save the video
    const saveResult = await saveVideo(videoId);
    console.log('Save result:', saveResult);
    
    // Check if the video is now saved
    const finalCheck = await checkVideoSaved(videoId);
    console.log(`After save attempt, video is ${finalCheck.is_saved ? 'saved' : 'still not saved'}`);
    
    if (finalCheck.is_saved) {
      console.log('Test PASSED: Video was successfully saved');
    } else {
      console.log('Test FAILED: Video was not saved');
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
runTest(); 