import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Create context
const VideoContext = createContext();

// Provider component
export const VideoProvider = ({ children }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [pageNum, setPageNum] = useState(0);
  const [pageSize] = useState(20);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch videos on mount and when page changes
  const fetchVideos = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      
      // Reset pagination if requested
      const page = reset ? 0 : pageNum;
      if (reset) {
        setPageNum(0);
      }
      
      // Fetch videos from API
      const response = await fetch(`/api/videos/?skip=${page * pageSize}&limit=${pageSize}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }
      
      const data = await response.json();
      
      // Update videos list
      if (reset) {
        setVideos(data);
      } else {
        // Append new videos and remove duplicates
        const newVideos = [...videos];
        
        data.forEach(video => {
          if (!newVideos.some(v => v.video_id === video.video_id)) {
            newVideos.push(video);
          }
        });
        
        setVideos(newVideos);
      }
      
      // Update hasMore flag
      setHasMore(data.length === pageSize);
      
      // Increment page number
      if (!reset && data.length > 0) {
        setPageNum(prevPage => prevPage + 1);
      }
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pageNum, pageSize, videos]);

  // Load initial videos
  useEffect(() => {
    fetchVideos(true);
  }, []);

  // Function to load more videos
  const loadMoreVideos = useCallback(() => {
    if (!loading && hasMore) {
      fetchVideos();
    }
  }, [fetchVideos, loading, hasMore]);

  // Search videos
  const searchVideos = useCallback(async (query) => {
    if (!query) {
      // Reset to regular video list if query is empty
      fetchVideos(true);
      return;
    }
    
    try {
      setLoading(true);
      
      // Search API
      const response = await fetch(`/api/videos/search/?query=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      
      // Update videos
      setVideos(data);
      
      // Reset pagination
      setPageNum(0);
      setHasMore(false);
    } catch (err) {
      console.error('Error searching videos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchVideos]);

  // Get video by ID
  const getVideoById = useCallback(async (videoId) => {
    // First check if we already have this video
    const existingVideo = videos.find(v => v.video_id === videoId);
    
    if (existingVideo) {
      return existingVideo;
    }
    
    // Otherwise fetch from API
    try {
      const response = await fetch(`/api/videos/${videoId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch video');
      }
      
      const data = await response.json();
      
      // Add to videos list
      setVideos(prevVideos => {
        const newVideos = [...prevVideos];
        
        if (!newVideos.some(v => v.video_id === data.video_id)) {
          newVideos.push(data);
        }
        
        return newVideos;
      });
      
      return data;
    } catch (err) {
      console.error('Error fetching video by ID:', err);
      throw err;
    }
  }, [videos]);

  // Update a video in the list
  const updateVideo = useCallback((videoId, newData) => {
    setVideos(prevVideos => {
      return prevVideos.map(video => {
        if (video.video_id === videoId) {
          return { ...video, ...newData };
        }
        return video;
      });
    });
  }, []);

  const value = {
    videos,
    loading,
    error,
    hasMore,
    loadMoreVideos,
    searchVideos,
    getVideoById,
    updateVideo,
    refreshVideos: () => fetchVideos(true),
    currentIndex,
    setCurrentIndex
  };

  return (
    <VideoContext.Provider value={value}>
      {children}
    </VideoContext.Provider>
  );
};

// Custom hook to use video context
export const useVideoContext = () => {
  const context = useContext(VideoContext);
  if (context === undefined) {
    throw new Error('useVideoContext must be used within a VideoProvider');
  }
  return context;
}; 