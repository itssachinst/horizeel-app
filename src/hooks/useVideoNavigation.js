import { useState, useEffect, useCallback, useRef } from 'react';

const useVideoNavigation = (initialVideoId) => {
  const [videoList, setVideoList] = useState([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(-1);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Use a ref to keep track of the current video ID to avoid stale closures
  const currentVideoIdRef = useRef(initialVideoId);
  
  // Track whether component is mounted
  const isMountedRef = useRef(true);

  // Fetch video list
  const fetchVideoList = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      const response = await fetch('/api/videos/');
      if (!response.ok) throw new Error('Failed to fetch video list');
      const data = await response.json();
      
      if (isMountedRef.current) {
        setVideoList(prevList => {
          // Filter out duplicates when adding new videos
          const newList = [...prevList];
          data.forEach(video => {
            if (!newList.some(v => v.video_id === video.video_id)) {
              newList.push(video);
            }
          });
          return newList;
        });
      }
    } catch (err) {
      console.error('Error fetching video list:', err);
      if (isMountedRef.current) {
        setError(err.message);
      }
    }
  }, []);

  // Fetch single video details with optimistic updates
  const fetchVideoDetails = useCallback(async (videoId) => {
    if (!isMountedRef.current || !videoId) return;
    
    // Set current ID reference
    currentVideoIdRef.current = videoId;
    
    // Check if we already have this video in our list
    const existingVideo = videoList.find(v => v.video_id === videoId);
    
    // Optimistic update if we have the video in the list
    if (existingVideo) {
      setCurrentVideo(existingVideo);
      setLoading(false);
    } else {
      setLoading(true);
    }
    
    try {
      const response = await fetch(`/api/videos/${videoId}`);
      if (!response.ok) throw new Error('Failed to fetch video details');
      const data = await response.json();
      
      // Only update if component is mounted and this is still the current video
      if (isMountedRef.current && currentVideoIdRef.current === videoId) {
        setCurrentVideo(data);
        setLoading(false);
        
        // Update this video in our list if needed
        setVideoList(prevList => {
          const index = prevList.findIndex(v => v.video_id === videoId);
          if (index >= 0) {
            // Replace with updated data
            const newList = [...prevList];
            newList[index] = data;
            return newList;
          } else {
            // Add to list if not present
            return [...prevList, data];
          }
        });
      }
    } catch (err) {
      console.error('Error fetching video details:', err);
      if (isMountedRef.current && currentVideoIdRef.current === videoId) {
        setError(err.message);
        setLoading(false);
      }
    }
  }, [videoList]);

  // Initialize with video list and current video
  useEffect(() => {
    fetchVideoList().then(() => {
      if (initialVideoId) {
        fetchVideoDetails(initialVideoId);
      }
    });
    
    // Cleanup function
    return () => {
      isMountedRef.current = false;
    };
  }, [initialVideoId, fetchVideoList, fetchVideoDetails]);

  // Update current index when video list or current video changes
  useEffect(() => {
    if (currentVideo && videoList.length > 0) {
      const index = videoList.findIndex(v => v.video_id === currentVideo.video_id);
      setCurrentVideoIndex(index);
    }
  }, [currentVideo, videoList]);

  // Check if we need to fetch more videos
  useEffect(() => {
    if (videoList.length > 0 && currentVideoIndex >= videoList.length - 3) {
      fetchVideoList();
    }
  }, [currentVideoIndex, videoList.length, fetchVideoList]);

  const navigateToVideo = useCallback(async (direction) => {
    if (!videoList.length) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = currentVideoIndex + 1;
    } else {
      newIndex = currentVideoIndex - 1;
    }

    // Check bounds
    if (newIndex >= 0 && newIndex < videoList.length) {
      const nextVideo = videoList[newIndex];
      await fetchVideoDetails(nextVideo.video_id);
    }
  }, [currentVideoIndex, videoList, fetchVideoDetails]);

  return {
    currentVideo,
    loading,
    error,
    navigateToNext: () => navigateToVideo('next'),
    navigateToPrevious: () => navigateToVideo('previous'),
    hasNext: currentVideoIndex < videoList.length - 1,
    hasPrevious: currentVideoIndex > 0
  };
};

export default useVideoNavigation; 