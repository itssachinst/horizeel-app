import axios from "axios";

// Use environment variable or fallback to localhost
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

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

export const fetchVideos = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/videos/`);
    console.log("API Response:", response.data); // Debugging
    return response.data;
  } catch (error) {
    console.error("Error fetching videos:", error);
    return []; // Return an empty array on error
  }
};

export const fetchVideoById = async (id) => {
  const response = await axios.get(`${API_BASE_URL}/videos/${id}`);
  return response.data;
};

// Authentication API calls
export const registerUser = async (userData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/users/register`, userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: "Registration failed" };
  }
};

export const loginUser = async (credentials) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);
    localStorage.setItem('token', response.data.access_token);
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: "Login failed" };
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
    throw error.response?.data || { detail: "Failed to get current user" };
  }
};

// Enhanced video upload function with authentication
export const uploadVideo = async (videoData) => {
  try {
    const response = await authAxios.post(`${API_BASE_URL}/videos/`, videoData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { detail: "Upload failed" };
  }
};

// Add view count
export const incrementVideoView = async (videoId) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/videos/${videoId}/view`);
    return response.data;
  } catch (error) {
    console.error("Error incrementing views:", error);
  }
};

// Add like count
export const incrementVideoLike = async (videoId) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/videos/${videoId}/like`);
    return response.data;
  } catch (error) {
    console.error("Error incrementing likes:", error);
  }
};

// Add dislike count
export const incrementVideoDislike = async (videoId) => {
  try {
    const response = await authAxios.post(`${API_BASE_URL}/videos/${videoId}/dislike`);
    return response.data;
  } catch (error) {
    console.error("Error disliking video:", error);
    throw error.response?.data || { detail: "Failed to dislike video" };
  }
};

// Search videos
export const searchVideos = async (query) => {
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
    
    // Make the API call with appropriate parameters
    const response = await axios.get(`${API_BASE_URL}/videos/search?${searchParam}`);
    
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

// Direct password reset (without email verification)
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
  directResetPassword
};

export default apiServices;
