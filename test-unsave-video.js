/**
 * Test script for the unsave video functionality
 * 
 * This script tests the unsave video endpoint by:
 * 1. Getting a JWT token from command line
 * 2. Checking if a video is saved
 * 3. Unsaving the video if it's saved
 * 4. Checking if the video is unsaved
 */

const axios = require('axios');
const API_BASE_URL = "http://192.168.29.199:8000/api";

// Create axios instance with auth header
const authAxios = axios.create({
  baseURL: API_BASE_URL
});

// Function to get token from command line
function getToken() {
  const token = process.argv[2]; // Get token from command line argument
  if (!token) {
    console.error('Please provide a JWT token as a command line argument');
    console.error('Usage: node test-unsave-video.js YOUR_JWT_TOKEN VIDEO_ID');
    process.exit(1);
  }
  return token;
}

// Function to get video ID from command line
function getVideoId() {
  const videoId = process.argv[3]; // Get video ID from command line argument
  if (!videoId) {
    console.error('Please provide a video ID as a command line argument');
    console.error('Usage: node test-unsave-video.js YOUR_JWT_TOKEN VIDEO_ID');
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

// Function to unsave a video
async function unsaveVideo(videoId) {
  try {
    console.log(`Attempting to unsave video with ID: ${videoId}`);
    const response = await authAxios.delete(`/videos/${videoId}/save`);
    console.log('Unsave video response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error unsaving video:', error.response?.data || error.message);
    throw error;
  }
}

// Main function to run the test
async function runTest() {
  try {
    const videoId = getVideoId();
    
    // First check if the video is saved
    const initialCheck = await checkVideoSaved(videoId);
    console.log(`Video is ${initialCheck.is_saved ? 'saved' : 'not saved'}`);
    
    if (initialCheck.is_saved) {
      // Unsave the video
      const unsaveResult = await unsaveVideo(videoId);
      console.log('Unsave result:', unsaveResult);
      
      // Check if the video is now unsaved
      const finalCheck = await checkVideoSaved(videoId);
      console.log(`After unsave attempt, video is ${finalCheck.is_saved ? 'still saved' : 'unsaved'}`);
      
      if (!finalCheck.is_saved) {
        console.log('Test PASSED: Video was successfully unsaved');
      } else {
        console.log('Test FAILED: Video was not unsaved');
      }
    } else {
      console.log('Video is not saved, cannot test unsave functionality');
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
runTest(); 