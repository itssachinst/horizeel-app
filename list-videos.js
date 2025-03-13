/**
 * Script to list videos from the API
 * 
 * This script fetches videos from the API and displays their IDs and titles
 * to help with testing the save video functionality.
 */

const axios = require('axios');
const API_BASE_URL = "http://192.168.29.199:8000/api";

// Function to fetch videos
async function fetchVideos() {
  try {
    console.log('Fetching videos from API...');
    const response = await axios.get(`${API_BASE_URL}/videos/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching videos:', error.response?.data || error.message);
    return [];
  }
}

// Main function to run the script
async function listVideos() {
  try {
    const videos = await fetchVideos();
    
    if (videos.length === 0) {
      console.log('No videos found. Please upload some videos first.');
      return;
    }
    
    console.log(`Found ${videos.length} videos:`);
    console.log('------------------------------');
    
    videos.forEach((video, index) => {
      console.log(`${index + 1}. ID: ${video.video_id}`);
      console.log(`   Title: ${video.title}`);
      console.log(`   User ID: ${video.user_id}`);
      console.log('------------------------------');
    });
    
    console.log('\nTo test saving a video, use:');
    console.log(`node test-save-video.js YOUR_JWT_TOKEN ${videos[0].video_id}`);
  } catch (error) {
    console.error('Error listing videos:', error);
  }
}

// Run the script
listVideos(); 