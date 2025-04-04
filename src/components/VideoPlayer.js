import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { IconButton, Typography, Box, Avatar, Tooltip, Snackbar, Alert, Dialog, DialogContent, DialogTitle, Button, DialogActions, CircularProgress, Slide, useTheme, useMediaQuery } from "@mui/material";
import { 
  ThumbUp, 
  ThumbDown, 
  Share, 
  Close, 
  ArrowUpward, 
  ArrowDownward,
  VolumeOff,
  VolumeUp,
  Favorite,
  Visibility,
  ExpandMore,
  ExpandLess,
  BookmarkBorder,
  Bookmark,
  Delete,
  PersonAdd,
  Check,
  Pause,
  PlayArrow,
  Fullscreen,
  Home,
  ArrowBack,
  FullscreenExit
} from "@mui/icons-material";
import VisibilityIcon from '@mui/icons-material/Visibility';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import { useAuth } from "../contexts/AuthContext";
import { incrementVideoLike, incrementVideoDislike, saveVideo, checkVideoSaved, deleteVideo, followUser, unfollowUser, checkIsFollowing, updateWatchHistory, incrementVideoView } from "../api";
import useSwipeNavigate from "../hooks/useSwipeNavigate";
import { 
  formatViewCount, 
  formatDuration, 
  formatRelativeTime, 
  truncateText,
  fixVideoUrl,
  getFileExtension 
} from "../utils/videoUtils";
import { useVideoContext } from "../contexts/VideoContext";

// Get the API base URL from environment
const API_BASE_URL = process.env.REACT_APP_API_URL || "https://api.horizontalreels.com/api/v1";

// Add fallback URLs for different formats
const FALLBACK_VIDEO = '/assets/fallback-video.mp4';
// Add fallback video server for when S3 links are giving 403 Forbidden
const FALLBACK_VIDEO_SERVER = 'https://player.vimeo.com/external/';

// Define all browser-specific fullscreen functions at component level
const fullscreenAPI = {
  enterFullscreen: (element) => {
    if (element.requestFullscreen) {
      return element.requestFullscreen();
    } else if (element.mozRequestFullScreen) { // Firefox
      return element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) { // Chrome, Safari and Opera
      return element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) { // IE/Edge
      return element.msRequestFullscreen();
    } else {
      return Promise.reject(new Error("No fullscreen API available"));
    }
  },
  
  exitFullscreen: () => {
    if (document.exitFullscreen) {
      return document.exitFullscreen();
    } else if (document.mozCancelFullScreen) { // Firefox
      return document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) { // Chrome, Safari and Opera
      return document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { // IE/Edge
      return document.msExitFullscreen();
    } else {
      return Promise.reject(new Error("No fullscreen API available"));
    }
  },
  
  getFullscreenElement: () => {
    return document.fullscreenElement ||
           document.mozFullScreenElement ||
           document.webkitFullscreenElement ||
           document.msFullscreenElement;
  },
  
  isFullscreen: () => {
    return !!fullscreenAPI.getFullscreenElement();
  },
  
  fullscreenChangeEventName: () => {
    if ('onfullscreenchange' in document) {
      return 'fullscreenchange';
    } else if ('onmozfullscreenchange' in document) {
      return 'mozfullscreenchange';
    } else if ('onwebkitfullscreenchange' in document) {
      return 'webkitfullscreenchange';
    } else if ('onmsfullscreenchange' in document) {
      return 'MSFullscreenChange';
    }
    return 'fullscreenchange'; // Default fallback
  }
};

// Add proxy configuration for CORS issues (if needed)
const VIDEO_PROXY_ENABLED = true; // Set to true if using a proxy for CORS issues
const VIDEO_PROXY_URL = 'https://api.allorigins.win/raw?url='; // More reliable CORS proxy alternative

// Add preload function at the top level
const preloadVideo = (url) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.src = url;
    video.onloadeddata = () => resolve(video);
    video.onerror = reject;
  });
};

const VideoPlayer = ({ videos, currentIndex, setCurrentIndex, isMobile, isTablet }) => {
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { hasMore, loadMoreVideos } = useVideoContext();
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [views, setViews] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState(null);
  const [watchTrackerInterval, setWatchTrackerInterval] = useState(null);
  const [deviceType, setDeviceType] = useState(isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop');
  const [watchShared, setWatchShared] = useState(false);
  const [isUrlUpdating, setIsUrlUpdating] = useState(false);
  const [orientation, setOrientation] = useState(
    window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
  );
  
  // Add refs for tracking time updates without causing re-renders
  const lastTimeUpdateRef = useRef(null);
  const lastTimeValueRef = useRef(null);
  
  // Create a ref to track which videos we've reported views for
  const reportedViewRef = useRef(false);

  // Add orientation change detection
  useEffect(() => {
    const handleResize = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      setOrientation(isPortrait ? 'portrait' : 'landscape');
    };
    
    window.addEventListener('resize', handleResize);
    
    // Initial check
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Simplified handlers for next/previous video
  const handlePrevVideo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (videos && videos.length > 0) {
      setCurrentIndex(videos.length - 1);
    }
  }, [currentIndex, videos, setCurrentIndex]);

  const handleNextVideo = useCallback(() => {
    if (videos && videos.length > 0) {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
        if (hasMore) {
          loadMoreVideos();
        }
      setCurrentIndex(0);
    }
    }
  }, [currentIndex, videos, hasMore, loadMoreVideos, setCurrentIndex]);

  // Simplified touch handlers
  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useSwipeNavigate(
    handleNextVideo,
    handlePrevVideo,
    70,
    true
  );

  // Optimized mouse move handler with debouncing
  const handleMouseMove = useCallback(() => {
    // Return early if we're already showing controls (prevents unnecessary state updates)
    if (showControls && controlsTimeout) {
      // Just reset the timeout without changing state or generating re-renders
      clearTimeout(controlsTimeout);
      
      const newTimeout = setTimeout(() => {
        setShowControls(false);
      }, 5000);
      
      setControlsTimeout(newTimeout);
      return;
    }
    
    // Only update state if we need to show controls
    if (!showControls) {
      setShowControls(true);
      
      const newTimeout = setTimeout(() => {
        setShowControls(false);
      }, 5000);
      
      setControlsTimeout(newTimeout);
    }
  }, [showControls, controlsTimeout]);

  // Throttled time update handler to prevent excessive updates
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // Only update React state twice per second to reduce rendering
    // This ensures the UI stays responsive without excessive re-renders
    const now = Date.now();
    if (!lastTimeUpdateRef.current || now - lastTimeUpdateRef.current > 500) {
      lastTimeUpdateRef.current = now;
      
      // Round the time values to reduce precision and unnecessary updates
      const currentTimeRounded = Math.floor(video.currentTime);
      if (currentTimeRounded !== lastTimeValueRef.current) {
        lastTimeValueRef.current = currentTimeRounded;
        setCurrentTime(currentTimeRounded);
      }
    }
  }, []);

  // Simplified video container click handler
  const handleVideoContainerClick = (e) => {
    if (e.target === videoContainerRef.current || e.target === videoRef.current) {
      togglePlayPause();
    }
  };

  // Simplified toggle play/pause
  const togglePlayPause = () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    
    if (video.paused) {
      video.play()
        .then(() => setIsPlaying(true))
        .catch(error => {
          console.error("Error playing video:", error);
          setIsPlaying(false);
        });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  // Simplified update video handler
  useEffect(() => {
    if (!videos || videos.length === 0 || currentIndex >= videos.length) {
      console.log("No videos available or invalid index");
      return;
    }
    
    const currentVideo = videos[currentIndex];
    if (!currentVideo || !currentVideo.video_url) {
      console.log("Current video or URL is missing");
      return;
    }
    
    const videoElement = videoRef.current;
    if (!videoElement) {
      console.log("Video element reference is missing");
      return;
    }
    
    console.log(`Loading video ${currentIndex}:`, currentVideo.video_url);
    
    // Reset the reported view flag for the new video
    reportedViewRef.current = false;
    
    // Track if component is mounted
    let isMounted = true;
    
    const loadVideo = async () => {
      try {
        // Clean up current video with error handling
        try {
          videoElement.pause();
          
          // Safely remove child elements
          while (videoElement.firstChild) {
            try {
              videoElement.removeChild(videoElement.firstChild);
            } catch (err) {
              console.warn("Error removing video child:", err);
              break; // Prevent infinite loop if removal fails
            }
          }
          
          videoElement.removeAttribute('src');
          videoElement.load();
        } catch (cleanupError) {
          console.warn("Error during video cleanup:", cleanupError);
        }
        
        // Get video source with error handling - directly use S3 URLs
        let videoSource;
        try {
          videoSource = getVideoSource(currentVideo.video_url);
          console.log("Using video source:", videoSource);
          
          if (!videoSource) {
            console.error("Failed to get valid video source");
            if (isMounted) {
              setSnackbarMessage("Invalid video source. Please try another video.");
              setShowSnackbar(true);
            }
            return;
          }
        } catch (sourceError) {
          console.error("Error getting video source:", sourceError);
          if (isMounted) {
            setSnackbarMessage("Error processing video URL");
            setShowSnackbar(true);
          }
          return;
        }
        
        // Get MIME type with error handling - focus on MP4 for S3
        let mimeType;
        try {
          mimeType = getVideoMimeType(currentVideo.video_url);
          console.log("Using MIME type:", mimeType);
        } catch (mimeError) {
          console.warn("Error getting MIME type:", mimeError);
          mimeType = 'video/mp4'; // Default to mp4
        }
        
        // Set sources with error handling
        try {
          // Set the source as MP4 - we know S3 files are MP4
          const sourceElement = document.createElement('source');
          sourceElement.src = videoSource;
          sourceElement.type = mimeType;
          sourceElement.crossOrigin = "anonymous";
          
          try {
            videoElement.appendChild(sourceElement);
            console.log("Added primary source:", videoSource);
          } catch (appendError) {
            console.warn("Error appending source element:", appendError);
          }
          
          // No webm fallback since we only use mp4 on S3
          
          // Set src attribute as a final fallback
          videoElement.src = videoSource;
          
          try {
            videoElement.load();
          } catch (loadError) {
            console.warn("Error during video load():", loadError);
          }
        } catch (setupError) {
          console.error("Error setting up video sources:", setupError);
        }
        
        // Update UI metadata
        if (isMounted) {
          setLikes(currentVideo.likes || 0);
          setDislikes(currentVideo.dislikes || 0);
          setViews(currentVideo.views || 0);
          
          // Update URL without navigation (only if needed)
          try {
            const currentPath = window.location.pathname;
            const targetPath = `/modern-video/${currentVideo.video_id}`;
            
            // Only update if the path actually changed
            if (!currentPath.includes(currentVideo.video_id)) {
              console.log(`Updating URL from ${currentPath} to ${targetPath}`);
              window.history.replaceState(
                { videoId: currentVideo.video_id },
                '',
                targetPath
              );
            }
          } catch (error) {
            console.error("Error updating URL:", error);
          }
          
          // Check saved and follow status if user is logged in
          if (currentUser) {
            checkSavedStatus(currentVideo.video_id);
            checkFollowStatus(currentVideo.user_id);
          }
        }
        
        // Set initial muted state to false unless required by browser
        videoElement.muted = false;
        setIsMuted(false);
        
        // Attempt to play with full error handling
        console.log("Attempting to play video...");
        try {
          const playPromise = videoElement.play();
          
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                if (!isMounted) return;
                console.log("Video playback started successfully");
                setIsPlaying(true);
                
                // Report view if needed
                if (!reportedViewRef.current) {
                  incrementVideoView(currentVideo.video_id).catch(err => 
                    console.error("Failed to increment view count:", err)
                  );
                  reportedViewRef.current = true;
                }
              })
              .catch(err => {
                if (!isMounted) return;
                console.error("Error playing video:", err);
                
                // Try muted playback for autoplay policy only if required by browser
                if (!videoElement.muted) {
                  console.log("Trying muted autoplay due to browser policy...");
                  videoElement.muted = true;
                  setIsMuted(true);
                  
                  videoElement.play().then(() => {
                    console.log("Muted playback started successfully");
                    // Explicitly show message to user about unmuting
                    setSnackbarMessage("Video started muted. Click volume icon to unmute.");
                    setShowSnackbar(true);
                  }).catch(e => {
                    if (!isMounted) return;
                    console.error("Muted autoplay also failed:", e);
                    setIsPlaying(false);
                  });
                } else {
                  setIsPlaying(false);
                }
              });
          }
        } catch (playError) {
          console.error("Exception during play() attempt:", playError);
        }
      } catch (globalError) {
        console.error("Global error in video loading process:", globalError);
        if (isMounted) {
          setSnackbarMessage("Error playing video: " + (globalError.message || "Unknown error"));
          setShowSnackbar(true);
        }
      }
    };

    // Load video with a small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        loadVideo();
      }
    }, 100);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      
      // Safely clean up video element on unmount
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.src = '';
          videoRef.current.load();
        } catch (cleanupError) {
          console.warn("Error cleaning up video on unmount:", cleanupError);
        }
      }
    };
  }, [videos, currentIndex, currentUser]);

  // Check if a video is saved by the current user - used when video changes
  const checkSavedStatus = async (videoId) => {
    try {
      const response = await checkVideoSaved(videoId);
      setIsSaved(response.is_saved);
    } catch (error) {
      console.error("Error checking saved status:", error);
    }
  };

  // Check if creator is followed by current user - used when video changes
  const checkFollowStatus = async (creatorId) => {
    if (!currentUser || currentUser.user_id === creatorId) {
      setIsFollowing(false);
      return;
    }
    
    try {
      const isFollowing = await checkIsFollowing(creatorId);
      setIsFollowing(isFollowing);
    } catch (error) {
      console.error("Error checking follow status:", error);
    }
  };

  const enterFullScreen = () => {
    try {
      const videoContainer = videoContainerRef.current;
      if (!videoContainer) return;
      
      // First try using our unified API
      fullscreenAPI.enterFullscreen(videoContainer)
        .then(() => {
          setIsFullScreen(true);
        })
        .catch((err) => {
          console.error("Failed to enter fullscreen:", err);
          
          // Fallback: try to simulate fullscreen with CSS
          if (videoContainer) {
            videoContainer.style.position = 'fixed';
            videoContainer.style.top = '0';
            videoContainer.style.left = '0';
            videoContainer.style.width = '100vw';
            videoContainer.style.height = '100vh';
            videoContainer.style.zIndex = '9999';
            document.body.style.overflow = 'hidden';
            setIsFullScreen(true);
          } else {
            // Last resort fallback
            setSnackbarMessage("Fullscreen not supported by your browser. Try pressing F11.");
            setShowSnackbar(true);
          }
        });
    } catch (error) {
      console.error("Error requesting fullscreen:", error);
      setSnackbarMessage("Fullscreen mode is not supported on this device.");
      setShowSnackbar(true);
    }
  };

  const exitFullScreen = () => {
    try {
      // Check if we're in browser fullscreen mode
      if (fullscreenAPI.isFullscreen()) {
        fullscreenAPI.exitFullscreen()
          .catch(err => {
            console.error("Error exiting fullscreen:", err);
          });
      } else if (videoContainerRef.current && 
                 videoContainerRef.current.style.position === 'fixed') {
        // We're in CSS simulated fullscreen
        const videoContainer = videoContainerRef.current;
        videoContainer.style.position = '';
        videoContainer.style.top = '';
        videoContainer.style.left = '';
        videoContainer.style.width = '';
        videoContainer.style.height = '';
        videoContainer.style.zIndex = '';
        document.body.style.overflow = '';
      }
      
      setIsFullScreen(false);
      
      // Don't navigate away unnecessarily - we're already in the video player
    } catch (error) {
      console.error("Error exiting fullscreen:", error);
      setIsFullScreen(false);
    }
  };

  // Define handleKeyDown before using it in useEffect
    const handleKeyDown = (event) => {
    // Prevent default behavior for arrow keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }

    switch (event.key) {
      case "ArrowUp":
          handlePrevVideo();
        break;
      case "ArrowDown":
          handleNextVideo();
        break;
      case "ArrowLeft":
        // Fast backward 10 seconds
        const video = videoRef.current;
        if (video) {
          video.currentTime = Math.max(video.currentTime - 10, 0);
          setSnackbarMessage("Rewind 10s");
          setShowSnackbar(true);
        }
        break;
      case "ArrowRight":
        // Fast forward 10 seconds
        if (videoRef.current) {
          videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, videoRef.current.duration);
          setSnackbarMessage("Fast forward 10s");
          setShowSnackbar(true);
        }
        break;
      case " ":
      case "k":
        togglePlayPause();
        break;
      case "m":
        toggleMute();
        break;
      case "Escape":
        exitFullScreen();
        break;
      case "f":
        toggleFullScreen();
        break;
      default:
        // Do nothing for other keys
        break;
      }
    };

  // Define handleFullscreenChange before using it in useEffect
    const handleFullscreenChange = () => {
    // Use our unified API to check fullscreen state
    setIsFullScreen(fullscreenAPI.isFullscreen());
    
    // If we exited fullscreen through browser controls (not our button)
    // but we're in a CSS simulated fullscreen mode, also exit that
    if (!fullscreenAPI.isFullscreen() && 
        videoContainerRef.current && 
        videoContainerRef.current.style.position === 'fixed') {
      const videoContainer = videoContainerRef.current;
      videoContainer.style.position = '';
      videoContainer.style.top = '';
      videoContainer.style.left = '';
      videoContainer.style.width = '';
      videoContainer.style.height = '';
      videoContainer.style.zIndex = '';
      document.body.style.overflow = '';
      setIsFullScreen(false);
    }
  };

  // Add event listeners in useEffect - optimized to prevent duplicates
  useEffect(() => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    console.log("Setting up video event listeners");
    
    // Define all handler functions inside the effect to access latest state
    const timeUpdateHandler = () => {
      if (!video) return;
      
      // Only update React state twice per second to reduce rendering
      const now = Date.now();
      if (!lastTimeUpdateRef.current || now - lastTimeUpdateRef.current > 500) {
        lastTimeUpdateRef.current = now;
        
        // Round the time values to reduce precision and unnecessary updates
        const currentTimeRounded = Math.floor(video.currentTime);
        if (currentTimeRounded !== lastTimeValueRef.current) {
          lastTimeValueRef.current = currentTimeRounded;
          setCurrentTime(currentTimeRounded);
        }
      }
    };
    
    const loadedMetadataHandler = () => {
      if (video) {
        console.log("Video metadata loaded, duration:", video.duration);
        setDuration(video.duration);
      }
    };
    
    // This is where 'ended' event handler was being added multiple times
    const videoEndHandler = () => {
      console.log("Video ended, handling progression");
      
      // Update watch history with completed flag if user is logged in
      if (currentUser && videos && videos.length > 0 && currentIndex < videos.length) {
        const currentVideo = videos[currentIndex];
        
        if (video && currentVideo) {
          const watchData = {
            video_id: currentVideo.video_id,
            watch_time: video.duration || 0,
            watch_percentage: 100,
            completed: true,
            last_position: video.duration || 0,
            like_flag: isLiked,
            dislike_flag: isDisliked,
            saved_flag: isSaved,
            shared_flag: watchShared,
            device_type: deviceType
          };
          
          updateWatchHistory(watchData).catch(err => {
            console.error("Failed to update watch history on video end:", err);
          });
        }
      }
      
      // Reset the reportedView flag to ensure next video gets a view count
      reportedViewRef.current = false;
      
      // Check if we're near the end of our current video list and need to fetch more
      if (videos && videos.length > 0 && currentIndex >= videos.length - 3 && hasMore) {
        console.log("Near end of video list, triggering load more videos");
        loadMoreVideos();
      }
  
      // Determine the next video index
      let nextIndex;
      if (currentIndex >= videos.length - 1) {
        console.log("Reached end of video list, looping to first video");
        nextIndex = 0;
      } else {
        nextIndex = currentIndex + 1;
        console.log(`Moving to next video (index ${nextIndex})`);
      }
      
      // Set the next video index
      setCurrentIndex(nextIndex);
    };
    
    const playHandler = () => setIsPlaying(true);
    const pauseHandler = () => setIsPlaying(false);
    const volumeChangeHandler = () => setIsMuted(video.muted);
    const mouseMoveHandler = handleMouseMove;
    const touchStartHandler = handleTouchStart;
    const touchMoveHandler = handleTouchMove;
    const touchEndHandler = handleTouchEnd;
    
    const errorHandler = (event) => {
      console.error("Video error event triggered");
      
      // Safely log video URL
      const videoUrl = videos && currentIndex < videos.length && videos[currentIndex] 
        ? videos[currentIndex].video_url 
        : 'unknown video URL';
      console.error("Video URL:", videoUrl);
      
      // Create a safe error object
      const safeError = { 
        type: 'videoerrorevent',
        timestamp: Date.now(),
        url: videoUrl
      };
      
      // Call error handler
      handleVideoError(safeError);
    };
    
    // Clear any previous listeners before adding new ones
    video.removeEventListener('timeupdate', timeUpdateHandler);
    video.removeEventListener('loadedmetadata', loadedMetadataHandler);
    video.removeEventListener('ended', videoEndHandler);
    video.removeEventListener('play', playHandler);
    video.removeEventListener('pause', pauseHandler);
    video.removeEventListener('volumechange', volumeChangeHandler);
    video.removeEventListener('error', errorHandler);
    video.removeEventListener('mousemove', mouseMoveHandler);
    video.removeEventListener('touchstart', touchStartHandler);
    video.removeEventListener('touchmove', touchMoveHandler);
    video.removeEventListener('touchend', touchEndHandler);
    
    // Log event listeners being added to help with debugging
    console.log("Adding event listeners to video element");
    
    // Add all event listeners
    video.addEventListener('timeupdate', timeUpdateHandler);
    video.addEventListener('loadedmetadata', loadedMetadataHandler);
    video.addEventListener('ended', videoEndHandler);
    video.addEventListener('play', playHandler);
    video.addEventListener('pause', pauseHandler);
    video.addEventListener('volumechange', volumeChangeHandler);
    video.addEventListener('error', errorHandler);
    
    // Mouse and touch events
    video.addEventListener('mousemove', mouseMoveHandler);
    video.addEventListener('touchstart', touchStartHandler);
    video.addEventListener('touchmove', touchMoveHandler);
    video.addEventListener('touchend', touchEndHandler);
    
    // Cleanup on unmount or when dependencies change
    return () => {
      console.log("Removing video event listeners");
      
      // Remove all event listeners to prevent duplicates
      video.removeEventListener('timeupdate', timeUpdateHandler);
      video.removeEventListener('loadedmetadata', loadedMetadataHandler);
      video.removeEventListener('ended', videoEndHandler);
      video.removeEventListener('play', playHandler);
      video.removeEventListener('pause', pauseHandler);
      video.removeEventListener('volumechange', volumeChangeHandler);
      video.removeEventListener('error', errorHandler);
      
      video.removeEventListener('mousemove', mouseMoveHandler);
      video.removeEventListener('touchstart', touchStartHandler);
      video.removeEventListener('touchmove', touchMoveHandler);
      video.removeEventListener('touchend', touchEndHandler);
    };
  }, [
    // Include all dependencies that these handlers need
    currentIndex,
    videos, 
    hasMore, 
    loadMoreVideos, 
    currentUser, 
    isLiked, 
    isDisliked, 
    isSaved, 
    watchShared, 
    deviceType,
    handleMouseMove,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  ]);

  // Add separate useEffect for window and document level events
  useEffect(() => {
    console.log("Adding window and document event listeners");
    
    // Add window and document level events
    window.addEventListener('keydown', handleKeyDown);
    
    // Use our custom fullscreen change event
    const fullscreenChangeEvent = fullscreenAPI.fullscreenChangeEventName();
    document.addEventListener(fullscreenChangeEvent, handleFullscreenChange);
    
    return () => {
      console.log("Removing window and document event listeners");
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener(fullscreenChangeEvent, handleFullscreenChange);
    };
  }, [handleKeyDown, handleFullscreenChange]);

  // Update the tryFallbackFormats function to focus on mp4 only
  const tryFallbackFormats = () => {
    console.log("Attempting to find alternative video formats...");
    
    // Show a subtle loading indicator instead of an error message
    setIsLoading(true);
    
    try {
      // Safe check for required references
      if (!videos || videos.length === 0 || currentIndex < 0 || currentIndex >= videos.length) {
        console.warn("Cannot try fallback formats: videos array or currentIndex is invalid");
        setIsLoading(false);
        return;
      }
      
      if (!videoRef || !videoRef.current) {
        console.warn("Cannot try fallback formats: video element reference is null");
        setIsLoading(false);
        return;
      }
      
      const videoToTry = videos[currentIndex];
      if (!videoToTry || !videoToTry.video_url) {
        console.warn("Cannot try fallback formats: current video or URL is missing");
        setIsLoading(false);
        return;
      }
      
      const video = videoRef.current;
      
      // First pause the video to stop any ongoing playback
      try {
        video.pause();
      } catch (pauseErr) {
        console.warn("Error pausing video:", pauseErr);
      }
      
      // Keep track of source URLs we've already tried
      const triedSources = new Set();
      
      // Store a reference to the original video source for checking
      if (video.src) {
        triedSources.add(video.src);
      }
      
      // Add each source element's URL to the tried sources set
      Array.from(video.querySelectorAll('source')).forEach(source => {
        if (source.src) {
          triedSources.add(source.src);
        }
      });
      
      // Clear existing sources
      while (video.firstChild) {
        video.removeChild(video.firstChild);
      }
      
      // Try static fallback video as a last resort
      try {
        const fallbackUrl = '/assets/fallback-video.mp4';
        if (!triedSources.has(fallbackUrl)) {
          const fallbackSource = document.createElement('source');
          fallbackSource.src = fallbackUrl;
          fallbackSource.type = 'video/mp4';
          video.appendChild(fallbackSource);
          console.log("Added static fallback video source");
        }
      } catch (fallbackErr) {
        console.warn("Error adding static fallback:", fallbackErr);
      }
      
      // Try to extract the base URL
      let originalUrl = '';
      
      try {
        originalUrl = videoToTry.video_url.toString();
        
        // Try direct URL first without any format changes
        const directUrl = getVideoSource(originalUrl);
        if (directUrl && !triedSources.has(directUrl)) {
          console.log("Trying original URL format:", originalUrl);
          const directSource = document.createElement('source');
          directSource.src = directUrl;
          directSource.crossOrigin = "anonymous";
          directSource.type = getVideoMimeType(originalUrl);
          video.appendChild(directSource);
          triedSources.add(directUrl);
        }
        
        // For S3 URLs, we only need to try MP4
        // No need to test multiple formats since we know S3 only has MP4
        if (originalUrl.includes('s3.') && originalUrl.includes('amazonaws.com')) {
          console.log("S3 URL detected, using only MP4 format");
          // No additional sources needed for S3
        } else {
          // Only try MP4 format as fallback for non-S3 URLs
          const mp4Url = originalUrl.replace(/\.[^.]+$/, '.mp4');
          if (mp4Url !== originalUrl) {
            const processedUrl = getVideoSource(mp4Url);
            if (processedUrl && !triedSources.has(processedUrl)) {
              console.log("Trying MP4 fallback:", mp4Url);
              const source = document.createElement('source');
              source.src = processedUrl;
              source.crossOrigin = "anonymous";
              source.type = 'video/mp4';
              video.appendChild(source);
            }
          }
        }
        
        // Set src attribute as a final fallback
        video.src = directUrl || originalUrl;
      } catch (urlErr) {
        console.warn("Error processing video URL:", urlErr);
      }
      
      // Start without muting if possible
      video.muted = false;
      setIsMuted(false);
      
      // Try to load and play with proper error handling
      try {
        console.log("Loading video with fallback sources");
        video.load();
        
        // Set a timeout to attempt playback
        setTimeout(() => {
          try {
            console.log("Attempting to play fallback video");
            setIsLoading(false); // Hide loading indicator once we attempt playback
            if (videoRef && videoRef.current) {
              const playPromise = videoRef.current.play();
              
              if (playPromise !== undefined) {
                playPromise.catch(playErr => {
                  console.error("Error playing fallback format:", playErr);
                  
                  // Check if video element still exists before trying muted autoplay
                  if (videoRef.current) {
                    // Try muted autoplay if normal playback fails (helps with autoplay restrictions)
                    if (!videoRef.current.muted) {
                      console.log("Trying muted playback");
                      videoRef.current.muted = true;
                      setIsMuted(true);
                      videoRef.current.play().then(() => {
                        setSnackbarMessage("Video started muted. Click volume icon to unmute.");
                        setShowSnackbar(true);
                      }).catch(mutedErr => {
                        console.error("Muted fallback playback also failed:", mutedErr);
                        
                        // If all else fails, show an error message to the user
                        setSnackbarMessage("Unable to play video. Please try a different video.");
                        setShowSnackbar(true);
                      });
                    }
                  } else {
                    console.warn("Video element is no longer available after play attempt");
                  }
                });
              }
            } else {
              console.warn("Video reference no longer available for playback");
              setIsLoading(false);
            }
          } catch (timeoutPlayErr) {
            console.error("Error attempting playback after timeout:", timeoutPlayErr);
            setIsLoading(false);
          }
        }, 1000);
      } catch (loadErr) {
        console.error("Error loading fallback formats:", loadErr);
        setIsLoading(false);
      }
    } catch (globalErr) {
      console.error("Global error in fallback format handling:", globalErr);
      setIsLoading(false);
    }
  };

  // Preload current video when index changes
  useEffect(() => {
    if (!videos || videos.length === 0 || currentIndex >= videos.length) return;
    
    // Function to preload and validate the current video
    const preloadCurrentVideo = async () => {
      try {
        const currentVideo = videos[currentIndex];
        if (!currentVideo || !currentVideo.video_url) return;
        
        console.log("Preloading video:", currentVideo.video_url);
        setIsLoading(true);
        
        // Try to preload video to detect format issues early
        const videoElement = videoRef.current;
        if (!videoElement) return;
        
        // Create a temporary video element to test the format
        const testVideo = document.createElement('video');
        testVideo.muted = true;
        testVideo.preload = 'metadata';
        
        // Add sources in preferred order
        const sources = [
          { src: getVideoSource(currentVideo.video_url), type: getVideoMimeType(currentVideo.video_url) },
          { src: getVideoSource(currentVideo.video_url.replace(/\.[^.]+$/, '.mp4')), type: 'video/mp4' },
          { src: getVideoSource(currentVideo.video_url.replace(/\.[^.]+$/, '.webm')), type: 'video/webm' }
        ];
        
        // Create a promise to check which format loads first
        const loadPromises = sources.map((source, index) => {
          return new Promise((resolve) => {
            if (!source.src) {
              resolve({ success: false, index });
      return;
    }
    
            const sourceElement = document.createElement('source');
            sourceElement.src = source.src;
            sourceElement.type = source.type;
            testVideo.appendChild(sourceElement);
            
            // This format loaded successfully
            testVideo.addEventListener('loadedmetadata', () => {
              resolve({ success: true, index, src: source.src, type: source.type });
            }, { once: true });
          });
        });
        
        // Add error handler
        testVideo.addEventListener('error', () => {
          console.log("Test video failed to load, will try fallback formats");
        }, { once: true });
        
        // Start loading
        testVideo.load();
        
        // Wait for any format to load successfully or all to fail
        // Set a timeout to avoid waiting too long
        const timeoutPromise = new Promise(resolve => 
          setTimeout(() => resolve({ success: false, timedOut: true }), 5000)
        );
        
        // Race between successful load and timeout
        const result = await Promise.race([Promise.all(loadPromises), timeoutPromise]);
        
        // Clean up test video
        testVideo.remove();
        
        // If we found a working format, use it directly
        if (result.success) {
          console.log("Found working video format:", result);
          // Use this format in the main video element
          videoElement.src = result.src;
          
          // Reset loading state
          setIsLoading(false);
        } else {
          console.log("Could not preload video, will try fallback formats");
          // We'll let the regular video element handle fallbacks
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error in preloading video:", error);
        setIsLoading(false);
      }
    };
    
    preloadCurrentVideo();
  }, [currentIndex, videos]);

  // Update getVideoSource to better handle S3 URLs
  const getVideoSource = (videoUrl) => {
    if (!videoUrl) {
      console.error("Video URL is null or undefined");
      return null;
    }
    
    try {
      // First normalize the URL
      let finalUrl = videoUrl.toString().trim();
      
      // Clean up URL - remove any quotes and fix double slashes
      finalUrl = finalUrl.replace(/^["'](.*)["']$/, '$1');
      finalUrl = finalUrl.replace(/([^:])\/\//g, '$1/');
      
      // Special handling for S3 URLs - use them directly without modification
      if (finalUrl.includes('s3.') && finalUrl.includes('amazonaws.com')) {
        console.log("Using S3 URL directly:", finalUrl);
        return finalUrl;
      }
      
      // Handle relative URLs from our API
      if (finalUrl.startsWith('/')) {
        const baseUrl = API_BASE_URL || "https://api.horizontalreels.com/api/v1";
        finalUrl = `${baseUrl}${finalUrl}`;
        return finalUrl;
      }
      
      // If URL is already absolute with a protocol
      if (finalUrl.match(/^https?:\/\//i)) {
        // Only apply CORS proxy if needed and not an S3 URL
        if (VIDEO_PROXY_ENABLED && !finalUrl.includes('amazonaws.com')) {
          const currentDomain = window.location.hostname;
          
          try {
            const urlObj = new URL(finalUrl);
            const videoDomain = urlObj.hostname;
            
            if (videoDomain !== currentDomain && 
                !videoDomain.includes('localhost') && 
                !videoDomain.includes('127.0.0.1')) {
              return `${VIDEO_PROXY_URL}${encodeURIComponent(finalUrl)}`;
            }
          } catch (urlError) {
            console.warn("Error parsing URL for CORS check:", urlError);
          }
        }
        
        return finalUrl;
      }
      
      // If URL is missing protocol but isn't relative
      if (!finalUrl.startsWith('/')) {
        finalUrl = `http://${finalUrl}`;
        
        if (VIDEO_PROXY_ENABLED) {
          return `${VIDEO_PROXY_URL}${encodeURIComponent(finalUrl)}`;
        }
        
        return finalUrl;
      }
      
      return finalUrl;
    } catch (error) {
      console.error("Error processing video URL:", error);
      return videoUrl; // Return original URL as fallback
    }
  };

  // Simplified MIME type function since we only use MP4
  const getVideoMimeType = (url) => {
    if (!url) return 'video/mp4';
    
    try {
      // Extract extension from URL
      const match = url.toString().match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
      const extension = match && match[1] ? match[1].toLowerCase() : '';
      
      // Since we only have mp4 files in S3, we'll default to mp4 for most cases
      if (!extension || extension === 'mp4') {
        return 'video/mp4';
      }
      
      // Add a few other types for compatibility with existing files
      switch (extension) {
        case 'webm': return 'video/webm';
        case 'mov': return 'video/quicktime';
        case 'ogg': return 'video/ogg';
        default: return 'video/mp4'; // Default to mp4
      }
    } catch (e) {
      return 'video/mp4'; // Safe fallback
    }
  };

  // Add toggleMute function
  const toggleMute = () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  // Add toggleFullScreen function
  const toggleFullScreen = () => {
    if (isFullScreen) {
      exitFullScreen();
    } else {
      enterFullScreen();
    }
  };

  // Add handleVideoError function
  const handleVideoError = (error) => {
    console.error("Video error:", error);
    
    // Get error code if available
    let errorMessage = "Error playing video. Trying alternative format...";
    let errorCode = null;
    
    if (error && error.type === 'videoerrorevent' && videoRef.current) {
      const videoError = videoRef.current.error;
      
      if (videoError && typeof videoError.code === 'number') {
        errorCode = videoError.code;
        
        // Only proceed with switch if we have a valid error code
        switch (errorCode) {
          case 1: // MEDIA_ERR_ABORTED
            errorMessage = "Video playback was aborted.";
            break;
          case 2: // MEDIA_ERR_NETWORK
            errorMessage = "Network error occurred while loading the video.";
            break;
          case 3: // MEDIA_ERR_DECODE
            errorMessage = "Video decoding error. Trying alternate format...";
            tryFallbackFormats();
            // Suppress this message to prevent user confusion
            return;
          case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
            errorMessage = "This video format is not supported by your browser. Trying alternate format...";
            tryFallbackFormats();
            // Suppress this message to prevent user confusion
            return;
          default:
            errorMessage = `Unknown video error (code: ${errorCode}).`;
        }
        
        // Log the detailed error information
        console.error("Video error details:", {
          code: errorCode,
          message: videoError.message || 'No detailed error message available',
          errorMessage: errorMessage
        });
      } else {
        console.error("Video element has error object but code is not available or not a number");
        tryFallbackFormats();
      }
    } else {
      console.error("Video element doesn't have an error object");
      tryFallbackFormats();
    }
    
    // Log error information if we have a passed error object
    if (error) {
      console.error("Error passed to handler:", error);
    }
    
    // Always try fallback formats for any error
    if (!errorCode) {
      tryFallbackFormats();
      // Also suppress generic errors when trying fallback formats
      return;
    }
    
    // Show error message to user (only for errors we haven't suppressed)
    setSnackbarMessage(errorMessage);
    setShowSnackbar(true);
  };

  // Add goToHomePage function
  const goToHomePage = () => {
    navigate("/demo/");
  };

  // Add handleSeekChange function
  const handleSeekChange = (e) => {
    if (!videoRef.current || duration === 0) return;
    
    const video = videoRef.current;
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const percentage = relativeX / rect.width;
    
    // Set the video's current time based on the percentage
    const newTime = percentage * video.duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Add formatTime helper function
  const formatTime = (timeInSeconds) => {
    if (!timeInSeconds || isNaN(timeInSeconds)) return "0:00";
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Add handleLike function
  const handleLike = async () => {
    if (!currentUser) {
      setSnackbarMessage("Please log in to like videos");
      setShowSnackbar(true);
      return;
    }
    
    try {
      const videoId = videos[currentIndex].video_id;
      
      if (isLiked) {
        // Unlike video (toggle off)
        setIsLiked(false);
      } else {
        // Like video
        setIsLiked(true);
        // If video was previously disliked, remove dislike
        if (isDisliked) {
          setIsDisliked(false);
        }
        
        // Update likes count on server
        const response = await incrementVideoLike(videoId);
        
        if (response && typeof response.likes === 'number') {
          setLikes(response.likes);
        }
      }
    } catch (error) {
      console.error("Error liking video:", error);
      setSnackbarMessage("Failed to update like status");
      setShowSnackbar(true);
    }
  };

  // Add handleDislike function
  const handleDislike = async () => {
    if (!currentUser) {
      setSnackbarMessage("Please log in to dislike videos");
      setShowSnackbar(true);
      return;
    }
    
    try {
      const videoId = videos[currentIndex].video_id;
      
      if (isDisliked) {
        // Remove dislike (toggle off)
        setIsDisliked(false);
      } else {
        // Dislike video
        setIsDisliked(true);
        // If video was previously liked, remove like
        if (isLiked) {
          setIsLiked(false);
        }
        
        // Update dislikes count on server
        const response = await incrementVideoDislike(videoId);
        
        if (response && typeof response.dislikes === 'number') {
          setDislikes(response.dislikes);
        }
      }
    } catch (error) {
      console.error("Error disliking video:", error);
      setSnackbarMessage("Failed to update dislike status");
      setShowSnackbar(true);
    }
  };

  // Add handleShare function
  const handleShare = async () => {
    if (!videos || videos.length === 0 || currentIndex >= videos.length) {
      return;
    }
    
    try {
      const currentVideo = videos[currentIndex];
      const shareUrl = `${window.location.origin}/modern-video/${currentVideo.video_id}`;
      
      // Set flag that we've shared this video
      setWatchShared(true);
      
      // Update watch history with shared flag if user is logged in
      if (currentUser && videos && videos.length > 0 && currentIndex < videos.length) {
        const videoElement = videoRef.current;
        const currentTime = videoElement ? videoElement.currentTime : 0;
        const duration = videoElement ? videoElement.duration : 0;
        const watchPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
        
        const watchData = {
          video_id: currentVideo.video_id,
          watch_time: currentTime,
          watch_percentage: watchPercentage,
          completed: false,
          last_position: currentTime,
          like_flag: isLiked,
          dislike_flag: isDisliked,
          saved_flag: isSaved,
          shared_flag: true,
          device_type: deviceType
        };
        
        updateWatchHistory(watchData).catch(err => {
          console.error("Failed to update watch history for share:", err);
        });
      }
      
      // Share the URL
      if (navigator.clipboard && window.isSecureContext) {
        // Use clipboard API if available
        await navigator.clipboard.writeText(shareUrl);
        setSnackbarMessage("Link copied to clipboard");
        setShowSnackbar(true);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          setSnackbarMessage("Link copied to clipboard");
          setShowSnackbar(true);
        } catch (err) {
          console.error("Failed to copy link:", err);
          setSnackbarMessage("Failed to copy link");
          setShowSnackbar(true);
        }
        
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error("Error sharing video:", error);
      setSnackbarMessage("Failed to share video");
      setShowSnackbar(true);
    }
  };

  // Add handleSaveVideo function
  const handleSaveVideo = async () => {
    if (!currentUser) {
      setSnackbarMessage("Please log in to save videos");
      setShowSnackbar(true);
      return;
    }
    
    try {
      const videoId = videos[currentIndex].video_id;
      
      // Toggle saved status
      const newSavedStatus = !isSaved;
      setIsSaved(newSavedStatus);
      
      // Update on server
      await saveVideo(videoId, newSavedStatus);
      
      // Show confirmation to user
      setSnackbarMessage(newSavedStatus ? "Video saved" : "Video removed from saved");
      setShowSnackbar(true);
    } catch (error) {
      console.error("Error saving video:", error);
      // Revert UI state on error
      setIsSaved(!isSaved);
      setSnackbarMessage("Failed to update saved status");
      setShowSnackbar(true);
    }
  };

  // Add handleFollowToggle function
  const handleFollowToggle = async () => {
    if (!currentUser) {
      setSnackbarMessage("Please log in to follow creators");
      setShowSnackbar(true);
      return;
    }
    
    // Get creator ID
    const creatorId = videos[currentIndex].creator_id;
    
    // Prevent following yourself
    if (currentUser.user_id === creatorId) {
      setSnackbarMessage("You cannot follow yourself");
      setShowSnackbar(true);
      return;
    }
    
    setFollowLoading(true);
    
    try {
      if (isFollowing) {
        // Unfollow
        await unfollowUser(creatorId);
        setIsFollowing(false);
        setSnackbarMessage("Unfollowed creator");
      } else {
        // Follow
        await followUser(creatorId);
        setIsFollowing(true);
        setSnackbarMessage("Following creator");
      }
      setShowSnackbar(true);
    } catch (error) {
      console.error("Error toggling follow status:", error);
      setSnackbarMessage("Failed to update follow status");
      setShowSnackbar(true);
    } finally {
      setFollowLoading(false);
    }
  };

  // Add confirmDelete function
  const confirmDelete = async () => {
    // Only allow creator to delete their own video
    if (!currentUser || currentUser.user_id !== videos[currentIndex].user_id) {
      setSnackbarMessage("You can only delete your own videos");
      setShowSnackbar(true);
      setShowDeleteDialog(false);
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const videoId = videos[currentIndex].video_id;
      await deleteVideo(videoId);
      
      setSnackbarMessage("Video deleted successfully");
      setShowSnackbar(true);
      
      // Close dialog
      setShowDeleteDialog(false);
      
      // Navigate to next video if available
      if (videos.length > 1) {
        if (currentIndex < videos.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else if (currentIndex === videos.length - 1) {
          setCurrentIndex(0);
        }
      } else {
        // If this was the last video, navigate home
        navigate("/");
      }
    } catch (error) {
      console.error("Error deleting video:", error);
      setSnackbarMessage("Failed to delete video");
      setShowSnackbar(true);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (!videos || videos.length === 0 || currentIndex >= videos.length) {
  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
          bgcolor: "black", 
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
          color: "white" 
        }}
      >
        <Typography variant="h5">No videos available</Typography>
      </Box>
    );
  }

  const currentVideo = videos[currentIndex];

  // Calculate appropriate video dimensions based on orientation
  const getVideoContainerStyle = () => {
    // For mobile in portrait mode
    if (isMobile && orientation === 'portrait') {
      return {
        width: '100%',
        height: 'auto',
        maxHeight: '80vh',
        position: 'relative',
        backgroundColor: '#000',
        overflow: 'hidden',
        borderRadius: 0,
        boxShadow: 'none',
        margin: 0
      };
    }
    
    // For fullscreen or landscape
    return {
      width: '100%',
      height: '100vh',
      position: 'relative',
      backgroundColor: '#000',
      overflow: 'hidden'
    };
  };
  
  // Style for the video element
  const getVideoStyle = () => {
    // For mobile in portrait mode
    if (isMobile && orientation === 'portrait') {
      return {
        width: '100%',
        height: 'auto',
        aspectRatio: '16/9',
        objectFit: 'contain',
        background: '#000'
      };
    }
    
    // For fullscreen or landscape
    return {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      background: '#000'
    };
  };
  
  // Get page container style
  const getPageContainerStyle = () => {
    // For mobile in portrait mode
    if (isMobile && orientation === 'portrait') {
      return {
        width: '100%',
        height: '100vh',
        backgroundColor: '#000',
        padding: 0,
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      };
    }
    
    // For fullscreen or landscape
    return {
      width: '100%',
      height: '100vh',
      position: 'relative',
      backgroundColor: '#000',
      overflow: 'hidden'
    };
  };

  return (
    <React.Fragment>
      <Box sx={getPageContainerStyle()}>
        <Box
          ref={videoContainerRef}
          sx={getVideoContainerStyle()}
          onClick={handleVideoContainerClick}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
        >
          {/* Back button that appears/disappears with controls */}
          <Slide direction="down" in={showControls} timeout={300}>
            <IconButton
              onClick={goToHomePage}
              sx={{ 
                position: 'absolute',
                top: 20,
                left: 20,
                bgcolor: 'rgba(0, 0, 0, 0.6)',
                color: 'white',
                zIndex: 1600,
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.8)',
                },
              }}
            >
              <ArrowBack />
            </IconButton>
          </Slide>

          <video
            ref={videoRef}
            playsInline={true}
            muted={isMuted}
            autoPlay={true}
            loop={false}
            preload="auto"
            poster={videos[currentIndex]?.thumbnail_url}
            crossOrigin="anonymous"
            style={getVideoStyle()}
          >
            {/* Sources will be added dynamically in useEffect */}
            Your browser does not support the video tag.
          </video>

          {/* Show error message when video source is invalid */}
          {!getVideoSource(videos[currentIndex]?.video_url) && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: 'white',
                zIndex: 2
              }}
            >
              <Typography variant="h6">
                Video not available
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                Please try another video
              </Typography>
            </Box>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: 'white',
                zIndex: 3
              }}
            >
              <CircularProgress color="primary" />
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                Loading video...
        </Typography>
      </Box>
      )}

      {/* Up/Down Navigation repositioned - Up arrow below follow button, Down arrow above player bar */}
      {videos.length > 1 && (
      <Box
        sx={{
                position: 'absolute',
                right: 20,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '200px',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                zIndex: 15,
                    opacity: showControls ? 1 : 0,
                    transition: 'opacity 300ms ease-in-out',
              }}
            >
                  {/* Up Arrow */}
                  {currentIndex > 0 && (
              <IconButton
                onClick={() => setCurrentIndex(currentIndex - 1)}
                sx={{
                  bgcolor: 'rgba(0, 0, 0, 0.6)',
                  color: '#2CFF05', // Using the neon green from theme
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.8)',
                    boxShadow: '0 0 8px rgba(44, 255, 5, 0.6)', // Neon glow effect
                  },
                }}
              >
                <ArrowUpward />
        </IconButton>
          )}

                  {/* Down Arrow */}
          {currentIndex < videos.length - 1 && (
              <IconButton
                onClick={() => setCurrentIndex(currentIndex + 1)}
                sx={{
                  bgcolor: 'rgba(0, 0, 0, 0.6)',
                  color: '#2CFF05', // Using the neon green from theme
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.8)',
                    boxShadow: '0 0 8px rgba(44, 255, 5, 0.6)', // Neon glow effect
                  },
                }}
              >
                <ArrowDownward />
        </IconButton>
                  )}
            </Box>
      )}

      {/* Mobile-optimized video controls overlay */}
          <Slide direction="up" in={showControls} timeout={300}>
      <Box
        sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.6) 50%, transparent)',
            padding: isMobile ? '8px 12px' : '16px',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            transition: 'opacity 0.3s ease',
            opacity: showControls ? 1 : 0,
          }}
        >
          {/* Progress bar */}
          <Box
            sx={{
              width: '100%',
              height: isMobile ? '3px' : '4px',
              bgcolor: 'rgba(255,255,255,0.3)',
              borderRadius: '2px',
              mb: isMobile ? 1 : 2,
              position: 'relative',
              cursor: 'pointer'
            }}
            onClick={handleSeekChange}
          >
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${(currentTime / duration) * 100}%`,
                bgcolor: 'primary.main',
                borderRadius: '2px'
              }}
            />
      </Box>

          {/* Control buttons */}
      <Box
        sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton
                onClick={togglePlayPause}
                sx={{ 
                  color: 'white',
                  p: isMobile ? 0.5 : 1 
                }}
              >
                {isPlaying ? <Pause /> : <PlayArrow />}
        </IconButton>

              <IconButton
                onClick={toggleMute}
                sx={{ 
                  color: 'white',
                  p: isMobile ? 0.5 : 1,
                  display: { xs: 'none', sm: 'inline-flex' }
                }}
              >
                {isMuted ? <VolumeOff /> : <VolumeUp />}
        </IconButton>
      </Box>

            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {!isMobile && (
                <Typography variant="caption" sx={{ color: 'white', mr: 1 }}>
                  {formatTime(currentTime)} / {formatTime(duration)}
        </Typography>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton
                  onClick={handleLike}
                  sx={{ 
                    color: isLiked ? 'primary.main' : 'white',
                    p: isMobile ? 0.5 : 1
                  }}
                >
                  <ThumbUp fontSize={isMobile ? 'small' : 'medium'} />
                </IconButton>

                <IconButton
                  onClick={handleDislike}
                  sx={{ 
                    color: isDisliked ? 'error.main' : 'white',
                    p: isMobile ? 0.5 : 1
                  }}
                >
                  <ThumbDown fontSize={isMobile ? 'small' : 'medium'} />
                </IconButton>

                <IconButton
                  onClick={handleShare}
                  sx={{ 
                    color: 'white',
                    p: isMobile ? 0.5 : 1
                  }}
                >
                  <Share fontSize={isMobile ? 'small' : 'medium'} />
                </IconButton>

                <IconButton
                  onClick={handleSaveVideo}
                  sx={{ 
                    color: isSaved ? 'primary.main' : 'white',
                    p: isMobile ? 0.5 : 1,
                    display: { xs: 'none', sm: 'inline-flex' }
                  }}
                >
                  {isSaved ? <Bookmark fontSize={isMobile ? 'small' : 'medium'} /> : <BookmarkBorder fontSize={isMobile ? 'small' : 'medium'} />}
                </IconButton>

                <IconButton
                  onClick={toggleFullScreen}
                  sx={{ 
                    color: 'white',
                    p: isMobile ? 0.5 : 1
                  }}
                >
                  <Fullscreen fontSize={isMobile ? 'small' : 'medium'} />
        </IconButton>
      </Box>
            </Box>
          </Box>
        </Box>
      </Slide>

      {/* Video Info Overlay */}
          <Slide direction="down" in={showControls} timeout={300}>
      <Box
        sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0.6) 50%, transparent)',
            padding: isMobile ? '12px' : '16px',
            paddingLeft: isMobile ? '60px' : '80px', // Increased left padding to make room for back button
            zIndex: 10,
            transition: 'opacity 0.3s ease',
            opacity: showControls ? 1 : 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar 
                src={videos[currentIndex]?.creator_profile_picture} 
                alt={videos[currentIndex]?.creator_username}
                sx={{ width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, mr: 1 }} 
              />
              <Box>
                <Typography 
                  variant={isMobile ? "body1" : "h6"} 
                  sx={{ color: 'white', fontWeight: 'bold', lineHeight: 1.2 }}
                >
          {videos[currentIndex]?.title}
        </Typography>
                <Typography 
                  variant={isMobile ? "caption" : "body2"} 
                  sx={{ color: 'white', opacity: 0.8 }}
                >
                  {videos[currentIndex]?.creator_username}
        </Typography>
              </Box>
      </Box>

            {currentUser && currentUser.user_id !== videos[currentIndex]?.creator_id && (
              <Button
                variant={isFollowing ? "outlined" : "contained"}
                size={isMobile ? "small" : "medium"}
                color="primary"
                startIcon={isFollowing ? <Check /> : <PersonAdd />}
                onClick={handleFollowToggle}
                disabled={followLoading}
        sx={{
                  minWidth: 'auto', 
                  px: isMobile ? 1 : 2,
                  display: { xs: 'none', sm: 'flex' }
                }}
              >
                {followLoading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  isFollowing ? "Following" : "Follow"
                )}
              </Button>
            )}
          </Box>

          {/* Below the video title and user profile section */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2,
            color: 'white',
            mt: 1
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <VisibilityIcon sx={{ fontSize: 20 }} />
              <Typography variant="body2">
                {videos[currentIndex]?.views || 0}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ThumbUpIcon sx={{ fontSize: 20 }} />
              <Typography variant="body2">
                {videos[currentIndex]?.likes || 0}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ThumbDownIcon sx={{ fontSize: 20 }} />
              <Typography variant="body2">
                {videos[currentIndex]?.dislikes || 0}
        </Typography>
      </Box>
          </Box>
        </Box>
      </Slide>
        </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={showSnackbar}
        autoHideDuration={3000}
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowSnackbar(false)} severity="info" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Delete confirmation dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
      >
        <DialogTitle>Delete Video</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this video? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowDeleteDialog(false)} 
            color="primary"
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmDelete} 
            color="error" 
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </React.Fragment>
  );
};

export default VideoPlayer;
