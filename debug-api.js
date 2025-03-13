/**
 * Debug script for API issues
 * 
 * This script performs various tests against the API to diagnose issues
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
      console.error('Usage: node debug-api.js YOUR_JWT_TOKEN');
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

// Helper function to run a test and report results
async function runTest(name, fn) {
  console.log(`\n=== Testing: ${name} ===\n`);
  try {
    const result = await fn();
    console.log(`✓ SUCCESS: ${name}`);
    return result;
  } catch (error) {
    console.error(`✗ FAILED: ${name}`);
    console.error('  Error:', error.response?.data || error.message);
    console.error('  Status:', error.response?.status);
    if (error.response?.data) {
      console.error('  Response data:', error.response.data);
    }
    return null;
  }
}

// Test API connection
async function testConnection() {
  try {
    console.log('Testing base API connection...');
    const response = await axios.get(`${API_BASE_URL}/health-check`);
    return response.data;
  } catch (error) {
    // If health-check endpoint doesn't exist, try videos endpoint
    console.log('Health check failed, trying videos endpoint...');
    const response = await axios.get(`${API_BASE_URL}/videos/`);
    return { message: 'Connected to API via videos endpoint', videos_count: response.data.length };
  }
}

// Test authentication
async function testAuthentication() {
  console.log('Testing authentication with provided token...');
  const response = await authAxios.get(`${API_BASE_URL}/users/me`);
  return response.data;
}

// Test getting videos
async function testGetVideos() {
  console.log('Testing videos endpoint...');
  const response = await axios.get(`${API_BASE_URL}/videos/`);
  return { message: 'Successfully retrieved videos', count: response.data.length };
}

// Test getting specific video
async function testGetVideoById() {
  console.log('Testing get video by ID...');
  // Get the first video from the list
  const videos = await axios.get(`${API_BASE_URL}/videos/`);
  if (videos.data.length === 0) {
    throw new Error('No videos available to test with');
  }
  
  const firstVideoId = videos.data[0].video_id;
  console.log(`Using video ID: ${firstVideoId}`);
  
  const response = await axios.get(`${API_BASE_URL}/videos/${firstVideoId}`);
  return { message: 'Successfully retrieved video by ID', video: response.data };
}

// Test saved videos endpoint
async function testSavedVideos() {
  console.log('Testing saved videos endpoint...');
  const response = await authAxios.get(`${API_BASE_URL}/videos/saved`);
  return { message: 'Successfully retrieved saved videos', count: response.data.length };
}

// Test check if video is saved
async function testCheckVideoSaved() {
  console.log('Testing check if video is saved endpoint...');
  // Get the first video from the list
  const videos = await axios.get(`${API_BASE_URL}/videos/`);
  if (videos.data.length === 0) {
    throw new Error('No videos available to test with');
  }
  
  const firstVideoId = videos.data[0].video_id;
  console.log(`Using video ID: ${firstVideoId}`);
  
  const response = await authAxios.get(`${API_BASE_URL}/videos/${firstVideoId}/saved`);
  return { message: 'Successfully checked if video is saved', is_saved: response.data.is_saved };
}

// Main function to run all tests
async function runAllTests() {
  console.log('\n======= API DIAGNOSTICS =======\n');
  
  // Run all tests in sequence
  await runTest('API Connection', testConnection);
  const userData = await runTest('Authentication', testAuthentication);
  
  if (userData) {
    console.log('\n=== User Information ===');
    console.log(`User ID: ${userData.id || userData.user_id}`);
    console.log(`Username: ${userData.username}`);
    console.log(`Email: ${userData.email}`);
  }
  
  await runTest('Get Videos', testGetVideos);
  await runTest('Get Video by ID', testGetVideoById);
  
  // These tests require authentication
  if (userData) {
    try {
      await runTest('Check if Video is Saved', testCheckVideoSaved);
      await runTest('Get Saved Videos', testSavedVideos);
    } catch (error) {
      console.error('Error in authenticated tests:', error);
    }
  }
  
  console.log('\n======= DIAGNOSTICS COMPLETE =======\n');
}

// Run all tests
runAllTests();