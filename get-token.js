/**
 * Script to get a JWT token for testing
 * 
 * This script logs in a user and returns a JWT token that can be used for testing
 * the save video functionality.
 */

const axios = require('axios');
const FormData = require('form-data');
const API_BASE_URL = "http://192.168.29.199:8000/api";

// Function to login and get a token
async function loginUser(email, password) {
  try {
    console.log(`Logging in user: ${email}`);
    
    // Create form data for login
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    
    // Make the login request
    const response = await axios.post(`${API_BASE_URL}/users/login`, formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error logging in:', error.response?.data || error.message);
    throw error;
  }
}

// Main function to run the script
async function getToken() {
  try {
    // Get email and password from command line arguments
    const email = process.argv[2];
    const password = process.argv[3];
    
    if (!email || !password) {
      console.error('Please provide email and password as command line arguments');
      console.error('Usage: node get-token.js EMAIL PASSWORD');
      process.exit(1);
    }
    
    // Login and get token
    const loginResult = await loginUser(email, password);
    
    if (loginResult.access_token) {
      console.log('\nLogin successful!');
      console.log('------------------------------');
      console.log('JWT Token:');
      console.log(loginResult.access_token);
      console.log('------------------------------');
      
      console.log('\nTo test saving a video, use:');
      console.log(`node test-save-video.js "${loginResult.access_token}" VIDEO_ID`);
    } else {
      console.error('Login successful but no token returned');
    }
  } catch (error) {
    console.error('Failed to get token:', error);
  }
}

// Run the script
getToken(); 