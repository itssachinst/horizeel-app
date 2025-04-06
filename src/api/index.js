// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

/**
 * Helper function to make API requests
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method
 * @param {Object} data - Request body for POST/PUT requests
 * @return {Promise} Response from API
 */
const apiRequest = async (endpoint, method = 'GET', data = null) => {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Add auth token if available
  const token = localStorage.getItem('token');
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  // Add body for non-GET requests
  if (method !== 'GET' && data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  
  // Handle non-200 responses
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  // Return JSON response or empty object for 204 No Content
  if (response.status === 204) {
    return {};
  }
  
  return response.json();
};

/**
 * Increment video view count
 * @param {string} videoId - ID of the video
 * @return {Promise} Updated view count
 */
export const incrementVideoView = async (videoId) => {
  return apiRequest(`/videos/${videoId}/view`, 'POST');
};

/**
 * Increment video like count
 * @param {string} videoId - ID of the video
 * @return {Promise} Updated like count
 */
export const incrementVideoLike = async (videoId) => {
  return apiRequest(`/videos/${videoId}/like`, 'POST');
};

/**
 * Increment video dislike count
 * @param {string} videoId - ID of the video
 * @return {Promise} Updated dislike count
 */
export const incrementVideoDislike = async (videoId) => {
  return apiRequest(`/videos/${videoId}/dislike`, 'POST');
};

/**
 * Check if a video is saved by the current user
 * @param {string} videoId - ID of the video
 * @return {Promise} Object with is_saved boolean
 */
export const checkVideoSaved = async (videoId) => {
  return apiRequest(`/videos/${videoId}/saved`);
};

/**
 * Save or unsave a video
 * @param {string} videoId - ID of the video
 * @param {boolean} isSaved - Whether to save (true) or unsave (false)
 * @return {Promise} Response from API
 */
export const saveVideo = async (videoId, isSaved) => {
  return apiRequest(`/videos/${videoId}/save`, 'POST', { is_saved: isSaved });
};

/**
 * Delete a video
 * @param {string} videoId - ID of the video to delete
 * @return {Promise} Response from API
 */
export const deleteVideo = async (videoId) => {
  return apiRequest(`/videos/${videoId}`, 'DELETE');
};

/**
 * Follow a user
 * @param {string} userId - ID of the user to follow
 * @return {Promise} Response from API
 */
export const followUser = async (userId) => {
  return apiRequest(`/users/${userId}/follow`, 'POST');
};

/**
 * Unfollow a user
 * @param {string} userId - ID of the user to unfollow
 * @return {Promise} Response from API
 */
export const unfollowUser = async (userId) => {
  return apiRequest(`/users/${userId}/unfollow`, 'POST');
};

/**
 * Check if current user is following another user
 * @param {string} userId - ID of the user to check
 * @return {Promise<boolean>} Whether user is following
 */
export const checkIsFollowing = async (userId) => {
  const response = await apiRequest(`/users/${userId}/is-following`);
  return response.is_following;
};

/**
 * Update watch history
 * @param {Object} watchData - Watch history data
 * @return {Promise} Response from API
 */
export const updateWatchHistory = async (watchData) => {
  return apiRequest('/user/watch-history', 'POST', watchData);
};

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

export const fetchVideos = async (skip = 0, limit = 20) => {
  try {
    console.log(`API: Fetching videos with skip=${skip}, limit=${limit}`);
    
    // Add timeout to prevent hanging requests
    const response = await axios.get(`${API_BASE_URL}/videos/?skip=${skip}&limit=${limit}`, {
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