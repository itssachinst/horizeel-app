import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";

export const fetchVideoById = async (id) => {
  try {
    console.log(`API: Fetching video with direct ID call: ${id}`);
    const response = await axios.get(`${API_BASE_URL}/videos/${id}`);
    
    // Check if response has data
    if (!response.data) {
      console.warn('API: Empty response from direct video fetch');
      return null;
    }
    
    console.log(`API: Successfully fetched video with ID ${id}`);
    return response.data;
  } catch (error) {
    // Log the specific HTTP status if available
    if (error.response) {
      console.error(`API: Error fetching video ${id} - Status: ${error.response.status}`);
      if (error.response.status === 404) {
        console.warn(`API: Video with ID ${id} not found (404)`);
      }
    } else {
      console.error(`API: Error fetching video ${id}:`, error.message || error);
    }
    
    // Don't throw, just return null to allow the pagination approach as a fallback
    return null;
  }
}; 

export const fetchVideos = async (options = {}) => {
  try {
    const { skip = 0, limit = 20, userId = null } = options;
    
    let url = `${API_BASE_URL}/videos/?skip=${skip}&limit=${limit}`;
    
    // Add userId filter if provided
    if (userId) {
      console.log(`API: Fetching videos for specific user ID: ${userId}`);
      url = `${API_BASE_URL}/videos/?user_id=${userId}&limit=${limit}&skip=${skip}`;
    } else {
      console.log(`API: Fetching all videos with skip=${skip}, limit=${limit}`);
    }
    
    // Add timeout to prevent hanging requests
    const response = await axios.get(url, {
      timeout: 10000 // 10 seconds timeout
    });
    
    if (!response.data) {
      console.warn("API: Empty response from fetchVideos");
      return [];
    }
    
    if (!Array.isArray(response.data)) {
      console.warn(`API: Unexpected response format from fetchVideos (not an array):`, response.data);
      
      // Try to extract videos array if response is an object with a videos property
      if (response.data && response.data.videos && Array.isArray(response.data.videos)) {
        console.log(`API: Extracted videos array from response object, contains ${response.data.videos.length} videos`);
        return response.data.videos;
      }
      
      return [];
    }
    
    // Validate and sanitize video objects
    const validVideos = response.data.filter(video => {
      // Check if it's a valid object
      if (!video || typeof video !== 'object') {
        console.warn("API: Skipping invalid video entry (not an object):", video);
        return false;
      }
      
      // Ensure required fields exist
      if (!video.video_id || !video.video_url) {
        console.warn("API: Skipping video with missing required fields:", video);
        return false;
      }
      
      return true;
    });
    
    console.log(`API: Received ${response.data.length} videos, ${validVideos.length} are valid`);
    return validVideos;
  } catch (error) {
    console.error("API: Error fetching videos:", error.message || error);
    if (error.response) {
      console.error(`API: Error status: ${error.response.status}`);
    } else if (error.request) {
      console.error("API: No response received from server");
    }
    return []; // Return an empty array on error
  }
}; 

export const deleteVideo = async (videoId) => {
  try {
    if (!videoId) {
      throw new Error("Video ID is required for deletion");
    }
    
    console.log(`API: Deleting video with ID: ${videoId}`);
    
    // Get the auth token from local storage
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error("Authentication required to delete videos");
    }
    
    // Send the DELETE request with authentication header
    const response = await axios.delete(`${API_BASE_URL}/videos/${videoId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      timeout: 10000 // 10 seconds timeout
    });
    
    console.log(`API: Successfully deleted video with ID ${videoId}`);
    return { success: true, message: 'Video deleted successfully' };
    
  } catch (error) {
    console.error(`API: Error deleting video ${videoId}:`, error.message || error);
    
    // Handle specific error cases
    if (error.response) {
      const status = error.response.status;
      console.error(`API: Error status: ${status}`);
      
      if (status === 401 || status === 403) {
        throw new Error("You don't have permission to delete this video");
      } else if (status === 404) {
        throw new Error("Video not found or already deleted");
      }
    }
    
    throw new Error("Failed to delete video. Please try again.");
  }
}; 