import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";

const VideoContext = createContext();

export const useVideoContext = () => useContext(VideoContext);

export const VideoProvider = ({ children }) => {
  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  
  // Use refs to track loading state without triggering re-renders
  const loadingRef = useRef(false);
  const initialLoadDoneRef = useRef(false);
  
  // Fetch videos with pagination
  const fetchVideos = useCallback(async (skip = 0, limit = 20, userId = null) => {
    // Prevent concurrent API calls
    if (loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      
      let url = `${API_BASE_URL}/videos/`;
      const params = { skip, limit };
      
      // Add userId filter if provided
      if (userId) {
        console.log(`Fetching videos for specific user ID: ${userId}`);
        params.user_id = userId;
      } else {
        console.log(`Fetching all videos with skip=${skip}, limit=${limit}`);
      }
      
      console.log('API URL:', url, 'Full request URL:', `${url}?${new URLSearchParams(params)}`);
      const response = await axios.get(url, { 
        params,
        timeout: 15000 // 15 seconds timeout
      });
      
      const newVideos = response.data || [];
      console.log(`Fetched ${newVideos.length} videos`);
      
      // Update hasMore flag based on response
      setHasMore(newVideos.length >= limit);
      
      if (skip === 0) {
        // Initial load or refresh
        setVideos(newVideos);
      } else {
        // Append to existing videos
        setVideos(prev => {
          // Avoid duplicates by checking video_id
          const existingIds = new Set(prev.map(v => v.video_id));
          const uniqueNewVideos = newVideos.filter(v => !existingIds.has(v.video_id));
          return [...prev, ...uniqueNewVideos];
        });
      }
      
      // Return the videos for direct use
      return newVideos;
    } catch (err) {
      console.error("Error fetching videos:", err.message || err);
      
      // Log more detailed error information
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Error response data:", err.response.data);
        console.error("Error response status:", err.response.status);
        console.error("Error response headers:", err.response.headers);
      } else if (err.request) {
        // The request was made but no response was received
        console.error("Error request:", err.request);
        console.error("No response received from server");
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error("Error message:", err.message);
      }
      
      setError("Failed to load videos. Please try again.");
      return []; // Return an empty array for direct use
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []); // Empty dependency array since we're using refs for tracking state
  
  // Load a specific video by ID
  const fetchVideoById = useCallback(async (videoId) => {
    try {
      console.log(`Fetching specific video with ID: ${videoId}`);
      const response = await axios.get(`${API_BASE_URL}/videos/${videoId}/`);
      return response.data;
    } catch (err) {
      console.error(`Error fetching video with ID ${videoId}:`, err);
      setError(`Failed to load video ID ${videoId}`);
      return null;
    }
  }, []);

  // Load next batch of videos
  const loadMoreVideos = useCallback(async (userId = null) => {
    if (!hasMore || loadingRef.current) {
      console.log("📋 loadMoreVideos: Skipping load", { hasMore, loading: loadingRef.current });
      return []; // Return empty array for consistency
    }
    
    console.log("📥 loadMoreVideos: Starting load at offset:", videos.length);
    
    try {
      const newVideos = await fetchVideos(videos.length, 20, userId);
      console.log("✅ loadMoreVideos: Successfully loaded", newVideos?.length || 0, "videos");
      return newVideos || [];
    } catch (error) {
      console.error("❌ loadMoreVideos: Error loading videos:", error);
      return [];
    }
  }, [fetchVideos, hasMore, videos.length]);

  // Initialize videos on mount, but only once
  useEffect(() => {
    if (!initialLoadDoneRef.current) {
      console.log("Initial video fetch");
      fetchVideos(0, 20, null);
      initialLoadDoneRef.current = true;
    }
  }, [fetchVideos]);

  // Handle when user approaches end of video list
  useEffect(() => {
    // DISABLED: Automatic loading is now handled by VerticalVideoFeed to prevent race conditions
    // Only load more if we're close to the end and not already loading
    // if (videos.length > 0 && 
    //     currentIndex >= videos.length - 3 && 
    //     hasMore && 
    //     !loadingRef.current) {
    //   console.log("Near end of list, loading more videos");
    //   loadMoreVideos();
    // }
    
    // Keep the effect but make it passive for debugging
    if (videos.length > 0 && currentIndex >= videos.length - 3) {
      console.log("VideoContext: Near end of list detected", {
        currentIndex,
        videosLength: videos.length,
        hasMore,
        loading: loadingRef.current
      });
    }
  }, [currentIndex, videos.length, hasMore, loadMoreVideos]);

  // Reset everything
  const resetVideos = useCallback(() => {
    setVideos([]);
    setCurrentIndex(0);
    setHasMore(true);
    initialLoadDoneRef.current = false; // Allow initial fetch again
    fetchVideos(0);
  }, [fetchVideos]);
  
  // Find a video by ID in the current videos array
  const findVideoById = useCallback((videoId) => {
    const index = videos.findIndex(video => video.video_id === videoId);
    return index !== -1 ? videos[index] : null;
  }, [videos]);

  const value = {
    videos,
    setVideos,
    currentIndex,
    setCurrentIndex,
    loading,
    hasMore,
    error,
    fetchVideos,
    fetchVideoById,
    loadMoreVideos,
    resetVideos,
    findVideoById
  };

  return (
    <VideoContext.Provider value={value}>
      {children}
    </VideoContext.Provider>
  );
};

export default VideoContext; 