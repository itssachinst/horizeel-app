import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Box, CircularProgress } from '@mui/material';
import VideoPlayer from './VideoPlayer';
import { useVideoContext } from '../contexts/VideoContext';
import VIDEO_CACHE from '../utils/videoCache';

// Styles for the container and animations
const styles = {
  container: {
    height: '100vh',
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
    // Add transform properties for smoother animations
    transform: 'translateZ(0)',
    willChange: 'transform',
  },
  videosContainer: {
    height: '100%',
    width: '100%',
    position: 'relative',
    transition: 'transform 0.6s cubic-bezier(0.33, 1, 0.68, 1)',
    // Add hardware acceleration
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
  },
  videoItem: {
    height: '100vh',
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    // Add hardware acceleration
    transform: 'translateZ(0)',
    willChange: 'transform',
  },
  fullscreenContainer: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 9999,
  },
  loadingOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    zIndex: 1000,
  },
};

// Configuration for preloading
const PRELOAD_CONFIG = {
  // Number of videos to preload ahead
  PRELOAD_AHEAD: 2,
  // Number of videos to preload behind
  PRELOAD_BEHIND: 1,
  // Threshold to trigger preloading next batch (when within this many videos of the end)
  PRELOAD_TRIGGER_THRESHOLD: 3
};

// Add a preload hook to load videos ahead of time
const usePreloader = (videos, currentIndex) => {
  useEffect(() => {
    if (!videos || videos.length === 0) return;
    
    // Preload the current video if it exists
    const currentVideo = videos[currentIndex];
    if (currentVideo) {
      VIDEO_CACHE.preloadVideo(currentVideo, { isActive: true });
      
      // Preload next 2 videos for smooth navigation
      for (let i = 1; i <= 2; i++) {
        const nextIndex = (currentIndex + i) % videos.length;
        if (videos[nextIndex]) {
          VIDEO_CACHE.preloadVideo(videos[nextIndex]);
        }
      }
      
      // Preload previous video for backward navigation
      if (currentIndex > 0) {
        const prevVideo = videos[currentIndex - 1];
        if (prevVideo) {
          VIDEO_CACHE.preloadVideo(prevVideo);
        }
      }
    }
    
    // Cleanup old cached videos
    return () => {
      if (currentVideo) {
        VIDEO_CACHE.cleanup(currentVideo.video_id);
      }
    };
  }, [videos, currentIndex]);
};

/**
 * VerticalVideoFeed - A TikTok-style vertical scrolling video player
 * Uses custom snap behavior and transitions for a smooth experience
 */
const VerticalVideoFeed = ({ isMobile, isTablet, isFullscreen }) => {
  const {
    videos,
    currentIndex,
    setCurrentIndex,
    hasMore,
    loadMoreVideos,
    loading
  } = useVideoContext();
  
  // Use the preloader to cache videos
  usePreloader(videos, currentIndex);
  
  const containerRef = useRef(null);
  const touchStartRef = useRef(null);
  const touchStartTimeRef = useRef(null);
  const isFullscreenRef = useRef(isFullscreen);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  // Track preloaded videos to avoid redundant preloading
  const preloadedVideosRef = useRef(new Set());
  
  // Compute which videos should be visible or preloaded
  const videoRenderStates = useMemo(() => {
    if (!videos || videos.length === 0) return {};
    
    const states = {};
    
    // Mark videos that should be rendered (visible or adjacent)
    videos.forEach((_, index) => {
      // Determine if the video should be rendered (current or adjacent)
      const shouldRender = Math.abs(currentIndex - index) <= 1;
      
      // Determine if the video should be preloaded (within preload range)
      const shouldPreload = (
        !shouldRender && // Don't need to explicitly preload videos that are rendered
        (
          // Preload ahead videos
          (index > currentIndex && index <= currentIndex + PRELOAD_CONFIG.PRELOAD_AHEAD) ||
          // Preload behind videos
          (index < currentIndex && index >= currentIndex - PRELOAD_CONFIG.PRELOAD_BEHIND)
        )
      );
      
      states[index] = {
        shouldRender,
        shouldPreload
      };
    });
    
    return states;
  }, [videos, currentIndex]);
  
  // Update isFullscreenRef when isFullscreen prop changes
  useEffect(() => {
    isFullscreenRef.current = isFullscreen;
  }, [isFullscreen]);
  
  // Track if we're in fullscreen mode to prevent exiting on swipe
  useEffect(() => {
    const checkFullscreenStatus = () => {
      const isDocumentFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      isFullscreenRef.current = isDocumentFullscreen;
    };
    
    // Add listeners for fullscreen change
    document.addEventListener('fullscreenchange', checkFullscreenStatus);
    document.addEventListener('webkitfullscreenchange', checkFullscreenStatus);
    document.addEventListener('mozfullscreenchange', checkFullscreenStatus);
    document.addEventListener('MSFullscreenChange', checkFullscreenStatus);
    
    return () => {
      // Remove listeners when component unmounts
      document.removeEventListener('fullscreenchange', checkFullscreenStatus);
      document.removeEventListener('webkitfullscreenchange', checkFullscreenStatus);
      document.removeEventListener('mozfullscreenchange', checkFullscreenStatus);
      document.removeEventListener('MSFullscreenChange', checkFullscreenStatus);
    };
  }, []);
  
  // Load more videos when approaching the end
  useEffect(() => {
    if (videos.length > 0 && currentIndex >= videos.length - PRELOAD_CONFIG.PRELOAD_TRIGGER_THRESHOLD && hasMore && !loading) {
      loadMoreVideos();
    }
  }, [currentIndex, videos.length, hasMore, loadMoreVideos, loading]);
  
  // Preload videos when video list or current index changes
  useEffect(() => {
    // Skip if no videos
    if (!videos || videos.length === 0) return;
    
    // Create a list of videos that should be preloaded but haven't been yet
    const videosToPreload = Object.entries(videoRenderStates)
      .filter(([_, state]) => state.shouldPreload)
      .map(([index]) => parseInt(index))
      .filter(index => !preloadedVideosRef.current.has(index));
    
    // Preload these videos
    if (videosToPreload.length > 0) {
      console.log(`Preloading videos: ${videosToPreload.join(', ')}`);
      
      // Mark these videos as preloaded to avoid redundant preloading
      videosToPreload.forEach(index => {
        preloadedVideosRef.current.add(index);
      });
    }
    
    // Clean up preloaded videos that are no longer needed
    // Keep current, preload ahead, and preload behind videos
    const videosToKeep = new Set([
      currentIndex,
      // Next videos
      ...Array.from({length: PRELOAD_CONFIG.PRELOAD_AHEAD}, (_, i) => currentIndex + i + 1),
      // Previous videos
      ...Array.from({length: PRELOAD_CONFIG.PRELOAD_BEHIND}, (_, i) => currentIndex - i - 1)
    ]);
    
    // Remove videos from preloaded set that are outside our range
    preloadedVideosRef.current.forEach(index => {
      if (!videosToKeep.has(index) && index >= 0 && index < videos.length) {
        preloadedVideosRef.current.delete(index);
      }
    });
    
  }, [videos, currentIndex, videoRenderStates]);
  
  // Handle manual navigation
  const goToNextVideo = useCallback(() => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (hasMore) {
      loadMoreVideos();
    }
  }, [currentIndex, videos.length, hasMore, loadMoreVideos, setCurrentIndex]);
  
  const goToPrevVideo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex, setCurrentIndex]);
  
  // Touch handling for swipe navigation
  const handleTouchStart = (e) => {
    // Store starting position and time
    touchStartRef.current = e.touches[0].clientY;
    touchStartTimeRef.current = Date.now();
    setIsDragging(true);
    setDragOffset(0);
    setIsPaused(true); // Pause videos during drag
  };
  
  const handleTouchMove = (e) => {
    if (!touchStartRef.current || !isDragging) return;
    
    // If in fullscreen mode, we need to be careful with preventDefault
    // as it can cause issues with some browser's fullscreen implementation
    if (!isFullscreenRef.current) {
      // Only prevent default scroll if we're not in fullscreen
      e.preventDefault();
    }
    
    const touchY = e.touches[0].clientY;
    const diff = touchY - touchStartRef.current;
    setDragOffset(diff);
  };
  
  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    // Calculate swipe velocity
    const touchEndTime = Date.now();
    const touchTime = touchEndTime - touchStartTimeRef.current;
    const velocity = Math.abs(dragOffset) / touchTime;
    
    // Determine if we should navigate based on the drag distance or velocity
    // Use a lower threshold if the swipe was fast
    const shouldNavigate = 
      (Math.abs(dragOffset) > 100) || // Distance-based threshold
      (Math.abs(dragOffset) > 40 && velocity > 0.5); // Velocity-based threshold
    
    if (shouldNavigate) {
      if (dragOffset > 0) {
        goToPrevVideo();
      } else {
        goToNextVideo();
      }
    }
    
    // Reset drag state
    touchStartRef.current = null;
    touchStartTimeRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
    
    // Resume playback after a short delay to allow navigation to complete
    setTimeout(() => {
      setIsPaused(false);
    }, 100);
  };
  
  // Calculate transform based on current index and drag
  const getTransform = () => {
    const baseTransform = `-${currentIndex * 100}vh`;
    if (!isDragging) return `translateY(${baseTransform})`;
    
    // Apply consistent drag resistance regardless of fullscreen state
    // This ensures animations feel the same in both modes
    const resistance = 0.3;
    const offset = dragOffset * resistance;
    return `translateY(calc(${baseTransform} + ${offset}px))`;
  };

  // Apply zoom effect to videos
  const getVideoScale = (index) => {
    if (!isDragging) return 1;
    
    // Calculate scale based on distance from current video
    const distance = Math.abs(index - currentIndex);
    if (distance === 0) {
      // Current video scales down slightly during drag
      // Increase the scaling effect slightly for more noticeable animation
      return 1 - Math.abs(dragOffset) * 0.0005;
    } else if (distance === 1) {
      // Next/Previous video scales up during drag
      const direction = index > currentIndex ? -1 : 1;
      const dragDirection = dragOffset > 0 ? 1 : -1;
      
      // Only scale the video in the direction we're dragging
      if (direction === dragDirection) {
        // Enhance the scale-up effect
        return 0.85 + Math.abs(dragOffset) * 0.0005;
      }
    }
    
    return 0.85; // Default scale for non-active videos
  };
  
  return (
    <Box 
      ref={containerRef}
      sx={{
        ...(isFullscreenRef.current ? styles.fullscreenContainer : styles.container),
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        userSelect: 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      // Add mouse events for desktop drag support
      onMouseDown={(e) => {
        touchStartRef.current = e.clientY;
        touchStartTimeRef.current = Date.now();
        setIsDragging(true);
        setDragOffset(0);
        setIsPaused(true);
      }}
      onMouseMove={(e) => {
        if (!touchStartRef.current || !isDragging) return;
        
        const mouseY = e.clientY;
        const diff = mouseY - touchStartRef.current;
        setDragOffset(diff);
      }}
      onMouseUp={() => {
        if (!isDragging) return;
        
        // Calculate swipe velocity
        const touchEndTime = Date.now();
        const touchTime = touchEndTime - touchStartTimeRef.current;
        const velocity = Math.abs(dragOffset) / touchTime;
        
        // Determine if we should navigate based on the drag distance or velocity
        const shouldNavigate = 
          (Math.abs(dragOffset) > 100) || // Distance-based threshold
          (Math.abs(dragOffset) > 40 && velocity > 0.5); // Velocity-based threshold
        
        if (shouldNavigate) {
          if (dragOffset > 0) {
            goToPrevVideo();
          } else {
            goToNextVideo();
          }
        }
        
        // Reset drag state
        touchStartRef.current = null;
        touchStartTimeRef.current = null;
        setIsDragging(false);
        setDragOffset(0);
        
        // Resume playback after a short delay
        setTimeout(() => {
          setIsPaused(false);
        }, 100);
      }}
      onMouseLeave={() => {
        if (isDragging) {
          touchStartRef.current = null;
          touchStartTimeRef.current = null;
          setIsDragging(false);
          setDragOffset(0);
          
          // Resume playback
          setTimeout(() => {
            setIsPaused(false);
          }, 100);
        }
      }}
    >
      <Box 
        sx={{
          ...styles.videosContainer,
          transform: getTransform(),
          // Don't show transition during drags
          transition: isDragging ? 'none' : 'transform 0.6s cubic-bezier(0.33, 1, 0.68, 1)',
        }}
      >
        {videos.map((_, index) => {
          const state = videoRenderStates[index] || { shouldRender: false, shouldPreload: false };
          
          // Skip rendering completely for videos outside our range
          if (!state.shouldRender && !state.shouldPreload) {
            return null;
          }
          
          return (
            <Box
              key={`video-item-${index}`}
              sx={{
                ...styles.videoItem,
                transform: `translateY(${index * 100}vh) scale(${getVideoScale(index)})`,
                opacity: state.shouldRender ? 1 : 0, // Only visible for rendered videos
                zIndex: currentIndex === index ? 2 : 1,
                // Apply custom easing for smoother animation
                transition: isDragging 
                  ? 'none' 
                  : 'transform 0.6s cubic-bezier(0.33, 1, 0.68, 1), opacity 0.6s cubic-bezier(0.33, 1, 0.68, 1)',
                pointerEvents: state.shouldRender ? 'auto' : 'none', // Disable interaction with preloaded videos
              }}
            >
              <VideoPlayer
                videos={videos}
                currentIndex={currentIndex}
                setCurrentIndex={setCurrentIndex}
                isMobile={isMobile}
                isTablet={isTablet}
                isPaused={index !== currentIndex || isPaused} // Only play the current video and respect isPaused state
                shouldPreserveFullscreen={isFullscreenRef.current} // Prevent exiting fullscreen on swipe
                shouldPreload={state.shouldPreload} // Indicate if this video should be preloaded
                visibilityState={
                  state.shouldRender 
                    ? (index === currentIndex ? 'active' : 'adjacent') 
                    : 'preload'
                }
                onNextVideo={goToNextVideo}
                onPrevVideo={goToPrevVideo}
              />
            </Box>
          );
        })}
      </Box>
      
      {loading && (
        <Box sx={styles.loadingOverlay}>
          <CircularProgress color="primary" size={30} />
        </Box>
      )}
    </Box>
  );
};

export default VerticalVideoFeed; 