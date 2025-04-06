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
  getFileExtension,
  isHlsStream,
  getVideoMimeType,
  processVideoUrl
} from "../utils/videoUtils";
import { useVideoContext } from "../contexts/VideoContext";
import Hls from 'hls.js';

// Get the API base URL from environment
const API_BASE_URL = process.env.REACT_APP_API_URL || "https://api.horizontalreels.com/api/v1";

// Add fallback URLs for different formats
const FALLBACK_VIDEO = '/assets/fallback-video.mp4';
// Add fallback video server for when S3 links are giving 403 Forbidden
const FALLBACK_VIDEO_SERVER = 'https://player.vimeo.com/external/';

// Check if HLS is supported natively
const isHlsNativelySupported = () => {
  const video = document.createElement('video');
  const mimeType = getVideoMimeType();
  return video.canPlayType(mimeType) || 
         video.canPlayType('application/x-mpegURL');
};

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
    video.type = getVideoMimeType();
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

  const hlsRef = useRef(null);

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
          // Cleanup any existing HLS instance
          if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
          }
          
          videoElement.pause();
          videoElement.removeAttribute('src');
          videoElement.load();
        } catch (cleanupError) {
          console.warn("Error during video cleanup:", cleanupError);
        }
        
        // Get video source URL - force .m3u8 extension
        let originalUrl = currentVideo.video_url;
        // If the URL doesn't end with .m3u8, assume it's the base URL and append index.m3u8
        if (!originalUrl.toLowerCase().endsWith('.m3u8')) {
          // Remove any existing extension
          originalUrl = originalUrl.replace(/\.[^/.]+$/, "");
          // Append index.m3u8 to ensure HLS format
          originalUrl = `${originalUrl}/index.m3u8`;
        }
        
        let videoSource = getVideoSource(originalUrl);
        console.log("Using HLS source:", videoSource);
        
        if (!videoSource) {
          console.error("Failed to get valid video source");
          if (isMounted) {
            setSnackbarMessage("Invalid video source. Please try another video.");
            setShowSnackbar(true);
          }
          return;
        }
        
        // Always treat as HLS stream
        const isHlsStream = true;
        console.log(`Treating as HLS stream: ${isHlsStream}`);
        
        if (isHlsStream && Hls.isSupported()) {
          console.log("Using HLS.js for playback");
          
          // Create and configure a new HLS instance
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
            maxBufferLength: 30
          });
          
          hlsRef.current = hls;
          
          // Bind HLS to the video element and load the source
          hls.loadSource(videoSource);
          hls.attachMedia(videoElement);
          
          // Listen for HLS events
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log("HLS manifest parsed, attempting to play");
            if (isMounted) {
              // Try to play after HLS manifest is parsed
              attemptPlayback(videoElement, currentVideo);
            }
          });
          
          hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
              console.error("Fatal HLS error:", data);
              
              switch(data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.log("Network error occurred, trying to recover");
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.log("Media error occurred, trying to recover");
                  hls.recoverMediaError();
                  break;
                default:
                  // Cannot recover
                  console.error("Unrecoverable HLS error");
                  if (isMounted) {
                    setSnackbarMessage("Error loading video stream");
                    setShowSnackbar(true);
                  }
                  break;
              }
            }
          });
        } else if (isHlsStream && isHlsNativelySupported()) {
          console.log("Using native HLS support");
          
          // For Safari and iOS which support HLS natively
          videoElement.src = videoSource;
          videoElement.addEventListener('loadedmetadata', function() {
            if (isMounted) {
              attemptPlayback(videoElement, currentVideo);
            }
          });
          
        } else {
          console.log("HLS is not supported by this browser");
          
          // Show error message to user
          if (isMounted) {
            setSnackbarMessage("Your browser doesn't support HLS streaming. Please try a different browser.");
            setShowSnackbar(true);
          }
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
      } catch (globalError) {
        console.error("Global error in video loading process:", globalError);
        if (isMounted) {
          setSnackbarMessage("Error playing video: " + (globalError.message || "Unknown error"));
          setShowSnackbar(false);
        }
      }
    };
    
    // Helper function to attempt playback with retry logic
    const attemptPlayback = (video, currentVideo) => {
      console.log("Attempting to play video...");
      
      // Set initial muted state to false unless required by browser
      video.muted = false;
      setIsMuted(false);
      
      try {
        const playPromise = video.play();
        
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
              if (!video.muted) {
                console.log("Trying muted autoplay due to browser policy...");
                video.muted = true;
                setIsMuted(true);
                
                video.play().then(() => {
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
      
      // Safely clean up video element and HLS instance on unmount
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.src = '';
          videoRef.current.load();
        } catch (cleanupError) {
          console.warn("Error cleaning up video on unmount:", cleanupError);
        }
      }
      
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
          hlsRef.current = null;
        } catch (hlsError) {
          console.warn("Error cleaning up HLS instance:", hlsError);
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

  // Preload current video when index changes
  useEffect(() => {
    if (!videos || videos.length === 0 || currentIndex >= videos.length) return;
    
    // Function to preload and validate the current video
    const preloadCurrentVideo = async () => {
      try {
        const currentVideo = videos[currentIndex];
        if (!currentVideo || !currentVideo.video_url) return;
        
        console.log("Preloading HLS video:", currentVideo.video_url);
        setIsLoading(true);
        
        // Force HLS format (.m3u8)
        let originalUrl = currentVideo.video_url;
        // If the URL doesn't end with .m3u8, assume it's the base URL and append index.m3u8
        if (!originalUrl.toLowerCase().endsWith('.m3u8')) {
          // Remove any existing extension
          originalUrl = originalUrl.replace(/\.[^/.]+$/, "");
          // Append index.m3u8 to ensure HLS format
          originalUrl = `${originalUrl}/index.m3u8`;
        }
        
        const hlsUrl = getVideoSource(originalUrl);
        
        // For browsers with native HLS support, check if the stream is accessible
        if (isHlsNativelySupported()) {
          const testVideo = document.createElement('video');
          testVideo.muted = true;
          testVideo.preload = 'metadata';
          testVideo.type = getVideoMimeType();
          
          const preloadPromise = new Promise((resolve) => {
            testVideo.src = hlsUrl;
            testVideo.addEventListener('loadedmetadata', () => {
              resolve({ success: true });
            }, { once: true });
            
            testVideo.addEventListener('error', () => {
              resolve({ success: false });
            }, { once: true });
            
            // Start loading
            testVideo.load();
          });
          
          // Set a timeout to avoid waiting too long
          const timeoutPromise = new Promise(resolve => 
            setTimeout(() => resolve({ success: false, timedOut: true }), 5000)
          );
          
          // Race between successful load and timeout
          const result = await Promise.race([preloadPromise, timeoutPromise]);
          
          // Clean up test video
          testVideo.remove();
          
          console.log("HLS preload result:", result);
        } else if (Hls.isSupported()) {
          // For browsers that support HLS.js, just check if the manifest is accessible
          console.log("Browser supports HLS.js, checking manifest accessibility");
        } else {
          console.log("Browser doesn't support HLS, skipping preload");
        }
        
        // Reset loading state
        setIsLoading(false);
      } catch (error) {
        console.error("Error in preloading HLS video:", error);
        setIsLoading(false);
      }
    };
    
    preloadCurrentVideo();
  }, [currentIndex, videos]);

  // Using imported utility functions for videos
  // Replace getVideoSource with processVideoUrl
  const getVideoSource = (videoUrl) => processVideoUrl(videoUrl, API_BASE_URL);

  // Update MIME type function to only return HLS MIME type regardless of extension
  const getVideoMimeType = (url) => 'application/vnd.apple.mpegurl';

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
    console.error("Video error occurred:", error);
    
    // Show error message to user
    setSnackbarMessage("Error playing video. Please try another video.");
    setShowSnackbar(false);
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
            crossOrigin="anonymous"
            style={getVideoStyle()}
            type={getVideoMimeType()}
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
