import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Box, useTheme, useMediaQuery, CircularProgress } from '@mui/material';
import VerticalVideoFeed from '../components/VerticalVideoFeed';
import { useVideoContext } from '../contexts/VideoContext';
import VIDEO_CACHE from '../utils/videoCache';

const VerticalFeedPage = () => {
  const { id } = useParams(); // Optional video ID to start with
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Track if user has manually exited fullscreen to prevent auto re-entry
  const userExitedFullscreenRef = useRef(false);
  const hasAutoEnteredFullscreenRef = useRef(false);
  
  const { 
    videos, 
    loading, 
    currentIndex, 
    setCurrentIndex,
    resetVideos
  } = useVideoContext();
  
  // Handle toggling fullscreen mode - moved earlier to avoid using before definition
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      // Enter fullscreen
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if (containerRef.current.webkitRequestFullscreen) {
        containerRef.current.webkitRequestFullscreen();
      } else if (containerRef.current.mozRequestFullScreen) {
        containerRef.current.mozRequestFullScreen();
      } else if (containerRef.current.msRequestFullscreen) {
        containerRef.current.msRequestFullscreen();
      }
    } else {
      // Exit fullscreen - mark that user manually exited
      userExitedFullscreenRef.current = true;
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }, [isFullscreen]);
  
  // Reset videos on mount to clear any previous feeds
  useEffect(() => {
    resetVideos();
    
    // Reset fullscreen tracking on fresh page load
    userExitedFullscreenRef.current = false;
    hasAutoEnteredFullscreenRef.current = false;
  }, [resetVideos]);
  
  // Improve handling of video ID
  useEffect(() => {
    if (id && videos.length > 0) {
      console.log(`Looking for video with ID: ${id} in ${videos.length} videos`);
      const videoIndex = videos.findIndex(video => video.video_id === id);
      
      if (videoIndex !== -1) {
        console.log(`Found video at index ${videoIndex}, setting as current`);
        setCurrentIndex(videoIndex);
      } else {
        console.log(`Video ID ${id} not found in loaded videos`);
        // If the video is not found, we will stay at index 0
        // This could potentially be enhanced to fetch the specific video
      }
    }
  }, [id, videos, setCurrentIndex]);
  
  // Add auto-fullscreen for better experience on direct access - but respect user choice
  useEffect(() => {
    // Only auto-enter fullscreen if:
    // 1. Coming directly to reels with a video ID
    // 2. Haven't already auto-entered fullscreen
    // 3. User hasn't manually exited fullscreen
    // 4. Not currently in fullscreen
    if (id && 
        videos.length > 0 && 
        !hasAutoEnteredFullscreenRef.current && 
        !userExitedFullscreenRef.current && 
        !isFullscreen && 
        containerRef.current) {
      
      const timer = setTimeout(() => {
        toggleFullscreen();
        hasAutoEnteredFullscreenRef.current = true; // Mark that we've auto-entered
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [id, videos.length, isFullscreen, toggleFullscreen]);
  
  // Preload videos for faster navigation
  useEffect(() => {
    if (!videos || videos.length === 0) return;
    
    // Preload the current video if it exists
    const currentVideo = videos[currentIndex];
    if (currentVideo) {
      VIDEO_CACHE.preloadVideo(currentVideo, { isActive: true });
      
      // Preload next 2 videos
      const preloadNextCount = Math.min(2, videos.length - currentIndex - 1);
      for (let i = 1; i <= preloadNextCount; i++) {
        const nextVideo = videos[currentIndex + i];
        if (nextVideo) {
          VIDEO_CACHE.preloadVideo(nextVideo);
        }
      }
      
      // Preload previous video
      if (currentIndex > 0) {
        const prevVideo = videos[currentIndex - 1];
        if (prevVideo) {
          VIDEO_CACHE.preloadVideo(prevVideo);
        }
      }
    }
  }, [videos, currentIndex]);
  
  // Monitor fullscreen changes
  useEffect(() => {
    const checkFullscreen = () => {
      const isDocumentFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      
      // If we were in fullscreen and now we're not, user exited fullscreen
      if (isFullscreen && !isDocumentFullscreen) {
        userExitedFullscreenRef.current = true;
      }
      
      setIsFullscreen(isDocumentFullscreen);
    };
    
    // Add event listeners for fullscreen changes
    document.addEventListener('fullscreenchange', checkFullscreen);
    document.addEventListener('webkitfullscreenchange', checkFullscreen);
    document.addEventListener('mozfullscreenchange', checkFullscreen);
    document.addEventListener('MSFullscreenChange', checkFullscreen);
    
    return () => {
      // Clean up event listeners
      document.removeEventListener('fullscreenchange', checkFullscreen);
      document.removeEventListener('webkitfullscreenchange', checkFullscreen);
      document.removeEventListener('mozfullscreenchange', checkFullscreen);
      document.removeEventListener('MSFullscreenChange', checkFullscreen);
    };
  }, []);
  
  // Enhanced keyboard support with proper navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Use 'f' key to toggle fullscreen
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
      
      // Use Escape key to exit fullscreen
      if (e.key === 'Escape' && isFullscreen) {
        userExitedFullscreenRef.current = true; // Mark user intent to exit
        toggleFullscreen();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, toggleFullscreen]);
  
  // Show loading state if no videos are loaded yet
  if (loading && videos.length === 0) {
    return (
      <Box 
        sx={{ 
          width: '100%', 
          height: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#000'
        }}
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }
  
  return (
    <Box 
      ref={containerRef}
      sx={{ 
        width: '100%', 
        height: '100vh', 
        overflow: 'hidden',
        backgroundColor: '#000',
        position: 'relative'
      }}
    >
      {/* Fullscreen functionality remains but button is removed */}
      
      <VerticalVideoFeed 
        isMobile={false} // Force desktop mode
        isTablet={false} // Force desktop mode
        isFullscreen={isFullscreen}
      />
    </Box>
  );
};

export default VerticalFeedPage; 