import axios from "axios";

// Use environment variable or fallback to localhost
export const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (window.location.hostname === 'localhost' ? 'http://localhost:8000/api' : 'https://horizontalreels.com/api');

// Log API base URL on initialization 
console.log('API is configured to use:', API_BASE_URL);

// Create axios instance with auth header
const authAxios = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include token in requests
authAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for standardized error handling
authAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors
    if (!error.response) {
      return Promise.reject({
        status: 'network_error',
        message: 'Network error. Please check your internet connection.',
        originalError: error
      });
    }
    
    // Handle API errors with standard format
    const errorData = {
      status: error.response.status,
      message: error.response.data?.detail || 'An unexpected error occurred',
      data: error.response.data,
      originalError: error
    };
    
    // Log errors for debugging (could be conditionally disabled in production)
    console.error(`API Error (${error.response.status}):`, errorData.message);
    
    return Promise.reject(errorData);
  }
);

// Same interceptor for the regular axios instance
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors
    if (!error.response) {
      return Promise.reject({
        status: 'network_error',
        message: 'Network error. Please check your internet connection.',
        originalError: error
      });
    }
    
    // Handle API errors with standard format
    const errorData = {
      status: error.response.status,
      message: error.response.data?.detail || 'An unexpected error occurred',
      data: error.response.data,
      originalError: error
    };
    
    console.error(`API Error (${error.response.status}):`, errorData.message);
    
    return Promise.reject(errorData);
  }
);

// Update fetchVideos to use the horizontalreels.com API
export const fetchVideos = async (skip = 0, limit = 20) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/videos`, {
      params: { skip, limit }
    });
    
    if (response.status === 200 && response.data) {
      // Process the response to ensure it matches expected format
      const videos = Array.isArray(response.data) ? response.data : response.data.videos || [];
      return videos;
    }
    
    throw new Error(`Failed to fetch videos: ${response.status}`);
  } catch (error) {
    console.error("Error fetching videos:", error);
    return [];
  }
};

// Update fetchVideoById to use the horizontalreels.com API
export const fetchVideoById = async (id) => {
  if (!id) return null;
  
  try {
    const response = await axios.get(`${API_BASE_URL}/videos/${id}`);
    
    if (response.status === 200 && response.data) {
      return response.data;
    }
    
    throw new Error(`Failed to fetch video: ${response.status}`);
  } catch (error) {
    console.error(`Error fetching video with ID ${id}:`, error);
    return null;
  }
};

// Authentication API calls
export const registerUser = async (userData) => {
  console.log("Starting registration request to:", `${API_BASE_URL}/users/register`);
  console.log("Registration payload:", JSON.stringify(userData, null, 2));
  
  try {
    const response = await axios.post(`${API_BASE_URL}/users/register`, userData);
    console.log("Registration successful, server response:", response.data);
    return response.data;
  } catch (error) {
    // Network debugging - check if request was actually sent
    console.log("Registration request failed");
    
    if (!navigator.onLine) {
      console.error("Browser is offline - no internet connection");
      error.detail = "You appear to be offline. Please check your internet connection.";
      throw error;
    }
    
    // Enhanced error logging
    console.error("Registration error details:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      endpoint: `${API_BASE_URL}/users/register`,
      requestWasSent: !!error.request,
      responseWasReceived: !!error.response
    });
    
    // Check if request was sent but no response received
    if (error.request && !error.response) {
      console.error("Request was sent but no response received - likely CORS or network issue");
      error.detail = "Server not responding. This could be due to connectivity issues or CORS configuration.";
      
      // Log the API base URL to help with debugging
      console.log("Current API URL:", API_BASE_URL);
      
      // Test if the API base URL is reachable with a simple GET request
      try {
        console.log("Testing API base URL reachability...");
        fetch(API_BASE_URL)
          .then(response => console.log("API base URL is reachable:", response.status))
          .catch(e => console.error("API base URL is NOT reachable:", e));
      } catch (testError) {
        console.error("Error testing API reachability:", testError);
      }
      
      throw error;
    }
    
    // Preserve the entire error object including response data which contains details
    if (error.response) {
      // Server responded with an error status
      error.detail = error.response.data?.detail || 
                     error.response.data?.message || 
                     error.response.data?.error ||
                     `Server error: ${error.response.status}`;
                     
      // Log more details about the response for debugging
      console.log("Server responded with status:", error.response.status);
      console.log("Response headers:", error.response.headers);
    } else if (error.request) {
      // Request made but no response received (this is likely the issue)
      error.detail = "No response from server. Please check your connection or server availability.";
    } else {
      // Error setting up the request
      error.detail = error.message || "Registration failed due to a network error.";
    }
    
    // Throw the enhanced error
    throw error;
  }
};

export const loginUser = async (credentials) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);
    localStorage.setItem('token', response.data.access_token);
    return response.data;
  } catch (error) {
    console.error("Login error:", error.message || error);
    throw error;
  }
};

export const logoutUser = () => {
  localStorage.removeItem('token');
};

export const getCurrentUser = async () => {
  try {
    const response = await authAxios.get(`${API_BASE_URL}/users/me`);
    return response.data;
  } catch (error) {
    console.error("Error getting current user:", error.message || error);
    throw error;
  }
};

// Enhanced video upload function with authentication
export const uploadVideo = async (videoData) => {
  try {
    const response = await authAxios.post(`${API_BASE_URL}/videos/`, videoData);
    return response.data;
  } catch (error) {
    console.error("Upload error:", error.message || error);
    throw error;
  }
};

// Add view count
export const incrementVideoView = async (videoId) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/videos/${videoId}/view`);
    return response.data;
  } catch (error) {
    console.error("Error incrementing views:", error.message || error);
    return { views: null, error: error.message || "Failed to increment view count" };
  }
};

// Add like count
export const incrementVideoLike = async (videoId) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/videos/${videoId}/like`);
    return response.data;
  } catch (error) {
    console.error("Error incrementing likes:", error.message || error);
    return { likes: null, error: error.message || "Failed to increment like count" };
  }
};

// Add dislike count
export const incrementVideoDislike = async (videoId) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/videos/${videoId}/dislike`);
    return response.data;
  } catch (error) {
    console.error("Error incrementing dislikes:", error.message || error);
    return { dislikes: null, error: error.message || "Failed to increment dislike count" };
  }
};

// Search videos
export const searchVideos = async (query, skip = 0, limit = 20) => {
  try {
    if (!query || !query.trim()) {
      return [];
    }

    // Check if the query is a hashtag search
    const isHashtagSearch = query.startsWith('#');
    
    // If it's a hashtag search, format it properly for the backend
    // Remove the # symbol if present but indicate hashtag search mode
    const searchParam = isHashtagSearch ? 
      `q=${encodeURIComponent(query.substring(1))}&type=hashtag` : 
      `q=${encodeURIComponent(query)}`;
    
    // Make the API call with appropriate parameters including pagination
    const response = await axios.get(`${API_BASE_URL}/videos/search?${searchParam}&skip=${skip}&limit=${limit}`);
    
    // Ensure we have a valid response
    if (!response.data) {
      throw new Error('No data received from server');
    }

    // If the response is not an array, check if it's wrapped in a data property
    const videos = Array.isArray(response.data) ? response.data : 
                  Array.isArray(response.data.videos) ? response.data.videos :
                  Array.isArray(response.data.data) ? response.data.data : [];

    console.log("Search results:", videos);
    return videos;
  } catch (error) {
    console.error("Error searching videos:", error);
    // Throw a more descriptive error
    throw new Error(error.response?.data?.detail || error.message || 'Failed to search videos');
  }
};

// New API functions for saved videos
export const saveVideo = async (videoId, isSaving = true) => {
  try {
    if (isSaving) {
      const response = await authAxios.post(`${API_BASE_URL}/videos/${videoId}/save`);
      return response.data;
    } else {
      const response = await authAxios.delete(`${API_BASE_URL}/videos/${videoId}/save`);
      return response.data;
    }
  } catch (error) {
    console.error("Error saving/unsaving video:", error);
    throw error.response?.data || { detail: "Failed to save/unsave video" };
  }
};

export const getSavedVideos = async () => {
  try {
    const response = await authAxios.get(`${API_BASE_URL}/videos/saved`);
    return response.data;
  } catch (error) {
    console.error("Error fetching saved videos:", error);
    return []; // Return an empty array on error
  }
};

export const checkVideoSaved = async (videoId) => {
  try {
    const response = await authAxios.get(`${API_BASE_URL}/videos/${videoId}/saved`);
    return response.data;
  } catch (error) {
    console.error("Error checking if video is saved:", error);
    return { is_saved: false }; // Return false on error
  }
};

export const deleteVideo = async (videoId) => {
  try {
    const response = await authAxios.delete(`${API_BASE_URL}/videos/${videoId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting video:", error);
    throw error.response?.data || { detail: "Failed to delete video" };
  }
};

// Follow system API functions
export const followUser = async (userId) => {
  try {
    const response = await authAxios.post(`${API_BASE_URL}/users/${userId}/follow`);
    return response.data;
  } catch (error) {
    console.error("Error following user:", error);
    throw error.response?.data || { detail: "Failed to follow user" };
  }
};

export const unfollowUser = async (userId) => {
  try {
    const response = await authAxios.delete(`${API_BASE_URL}/users/${userId}/follow`);
    return response.data;
  } catch (error) {
    console.error("Error unfollowing user:", error);
    throw error.response?.data || { detail: "Failed to unfollow user" };
  }
};

export const checkIsFollowing = async (userId) => {
  try {
    const response = await authAxios.get(`${API_BASE_URL}/users/${userId}/is-following`);
    return response.data.is_following;
  } catch (error) {
    console.error("Error checking follow status:", error);
    return false; // Default to not following on error
  }
};

export const getFollowStats = async (userId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/users/${userId}/follow-stats`);
    return response.data;
  } catch (error) {
    console.error("Error fetching follow stats:", error);
    return { followers_count: 0, following_count: 0 }; // Default counts on error
  }
};

// Password reset API calls
export const requestPasswordReset = async (email) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, { email });
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: "Failed to send password reset email" };
  }
};

export const verifyResetToken = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/verify-reset-token?token=${token}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: "Invalid or expired token" };
  }
};

export const resetPassword = async (token, newPassword) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/reset-password-confirm`, {
      token,
      new_password: newPassword
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: "Failed to reset password" };
  }
};

// Direct password reset (using the new endpoint without email verification)
export const directResetPassword = async (email, newPassword) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/direct-reset-password`, {
      email,
      new_password: newPassword
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: "Failed to reset password" };
  }
};

// Function to upload profile image to S3
export const uploadProfileImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append('profileImage', file);
    
    const response = await authAxios.post(`${API_BASE_URL}/users/upload-profile-image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data.profileImageUrl; // Return the S3 URL of the uploaded image
  } catch (error) {
    console.error('Error uploading profile image:', error);
    throw error;
  }
};

// Function to update user profile 
export const updateUserProfile = async (userData) => {
  try {
    const response = await authAxios.put(`${API_BASE_URL}/users/profile`, userData);
    return response.data.user;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Watch History API functions
export const updateWatchHistory = async (watchData) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      // If no token, user is not logged in, so we don't track watch history
      return;
    }

    const response = await axios.post(`${API_BASE_URL}/videos/watch-history`, watchData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating watch history:', error);
    // Don't throw error - watch history tracking should be non-blocking
    return null;
  }
};

export const getWatchHistory = async (limit = 50, skip = 0) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('You need to be logged in to view watch history');
    }

    const response = await axios.get(`${API_BASE_URL}/videos/watch-history?limit=${limit}&skip=${skip}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error getting watch history:', error);
    throw error;
  }
};

export const getVideoWatchStats = async (videoId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      // If not logged in, return null - indicates no watch history
      return null;
    }

    const response = await axios.get(`${API_BASE_URL}/videos/${videoId}/watch-stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // 404 means no watch history for this video, which is normal
      return null;
    }
    console.error('Error getting video watch stats:', error);
    return null;
  }
};

export const deleteWatchHistory = async (videoId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('You need to be logged in to delete watch history');
    }

    const response = await axios.delete(`${API_BASE_URL}/videos/watch-history/${videoId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting watch history:', error);
    throw error;
  }
};

// User feedback API functions
export const submitUserFeedback = async (feedback) => {
  try {
    const response = await authAxios.post(`${API_BASE_URL}/users/feedback`, {
      feedback
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting feedback:', error);
    throw error;
  }
};

export const getAllUserFeedback = async (skip = 0, limit = 100) => {
  try {
    const response = await authAxios.get(`${API_BASE_URL}/users/feedback`, {
      params: { skip, limit }
    });
  return response.data;
  } catch (error) {
    console.error('Error getting all feedback:', error);
    throw error;
  }
};

// Create a named export object instead of an anonymous one
const apiServices = {
  fetchVideos,
  fetchVideoById,
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  uploadVideo,
  incrementVideoView,
  incrementVideoLike,
  incrementVideoDislike,
  searchVideos,
  saveVideo,
  getSavedVideos,
  checkVideoSaved,
  deleteVideo,
  followUser,
  unfollowUser,
  checkIsFollowing,
  getFollowStats,
  requestPasswordReset,
  verifyResetToken,
  resetPassword,
  directResetPassword,
  uploadProfileImage,
  updateUserProfile,
  updateWatchHistory,
  getWatchHistory,
  getVideoWatchStats,
  deleteWatchHistory,
  submitUserFeedback,
  getAllUserFeedback,
};

export default apiServices;
