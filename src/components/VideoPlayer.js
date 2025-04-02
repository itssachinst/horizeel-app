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
const VIDEO_PROXY_ENABLED = false; // Set to true if using a proxy for CORS issues
const VIDEO_PROXY_URL = 'https://cors-anywhere.herokuapp.com/'; // Example proxy - you would need a real proxy service

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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState(null);
  const [watchTrackerInterval, setWatchTrackerInterval] = useState(null);
  const [deviceType, setDeviceType] = useState(isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop');
  const [watchShared, setWatchShared] = useState(false);
  const [isUrlUpdating, setIsUrlUpdating] = useState(false);
  
  // Remove preloading states that aren't being used
  // const [preloadedVideos, setPreloadedVideos] = useState(new Map());
  // const [isPreloading, setIsPreloading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Create a ref to track which videos we've reported views for
  const reportedViewRef = useRef(false);

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

  // Simplified mouse move handler
  const handleMouseMove = () => {
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    
    setShowControls(true);
    
    const newTimeout = setTimeout(() => {
      setShowControls(false);
    }, 5000);
    
    setControlsTimeout(newTimeout);
  };

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
    
    console.log("Loading video:", currentVideo.video_url);
    
    let isMounted = true;
    // Reset the reported view flag for the new video
    reportedViewRef.current = false;
    
    const loadVideo = async () => {
      try {
        // Clean up current video with error handling
        try {
          videoElement.pause();
          videoElement.removeAttribute('src');
          
          // Safely remove child elements
          while (videoElement.firstChild) {
            try {
              videoElement.removeChild(videoElement.firstChild);
            } catch (err) {
              console.warn("Error removing video child:", err);
              break; // Prevent infinite loop if removal fails
            }
          }
          
          videoElement.load();
        } catch (cleanupError) {
          console.warn("Error during video cleanup:", cleanupError);
          // Continue despite cleanup errors
        }
        
        // Get video source with error handling
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
        
        // Set sources with error handling
        try {
          // Set the source with multiple format support
          const sourceElement = document.createElement('source');
          sourceElement.src = videoSource;
          
          // Get MIME type with error handling
          let mimeType;
          try {
            mimeType = getVideoMimeType(currentVideo.video_url);
          } catch (mimeError) {
            console.warn("Error getting MIME type:", mimeError);
            mimeType = 'video/mp4'; // Default fallback
          }
          
          sourceElement.type = mimeType;
          console.log("Using MIME type:", mimeType);
          
          try {
            videoElement.appendChild(sourceElement);
          } catch (appendError) {
            console.warn("Error appending source element:", appendError);
          }
          
          // Add MP4 fallback source if the original isn't mp4
          if (mimeType !== 'video/mp4' && currentVideo.video_url) {
            try {
              // Try to create a fallback MP4 URL if we have alternate sources
              if (currentVideo.alternate_urls && currentVideo.alternate_urls.mp4) {
                const mp4Source = document.createElement('source');
                mp4Source.src = getVideoSource(currentVideo.alternate_urls.mp4);
                mp4Source.type = 'video/mp4';
                videoElement.appendChild(mp4Source);
                console.log("Added MP4 fallback source");
              }
            } catch (err) {
              console.warn("Failed to add fallback source:", err);
            }
          }
          
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
          
          // Update URL without navigation
          try {
            window.history.replaceState(
              { videoId: currentVideo.video_id },
              '',
              `/video/${currentVideo.video_id}`
            );
          } catch (error) {
            console.error("Error updating URL:", error);
          }
          
          // Check saved and follow status if user is logged in
          if (currentUser) {
            checkSavedStatus(currentVideo.video_id);
            checkFollowStatus(currentVideo.user_id);
          }
        }
        
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
                
                // Try muted playback for autoplay policy
                if (!videoElement.muted) {
                  videoElement.muted = true;
                  setIsMuted(true);
                  
                  videoElement.play().catch(e => {
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
      
      // Only navigate away if we're in a dedicated video player route
      if (window.location.pathname.includes('/video/')) {
        navigate("/");
      }
    } catch (error) {
      console.error("Error exiting fullscreen:", error);
      setIsFullScreen(false);
      // Only navigate away if needed
      if (window.location.pathname.includes('/video/')) {
        navigate("/");
      }
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

  // Modify handleVideoEnd to properly handle video progression
  const handleVideoEnd = () => {
    console.log("Video ended, handling progression");
    
    // Update watch history with completed flag if user is logged in
    if (currentUser && videos && videos.length > 0 && currentIndex < videos.length) {
      const video = videoRef.current;
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

  // Add cleanup function for video switching
  const cleanupVideo = () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
      video.src = '';
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  };

  const handleLike = async () => {
    if (!currentUser) {
      showLoginPrompt("Please log in to like videos");
      return;
    }
    
    try {
      if (isLiked) {
        // If already liked, just remove the like (toggle behavior)
        setIsLiked(false);
        setLikes(prev => Math.max(0, prev - 1));
        return;
      }
      
      // If disliked, remove the dislike
      if (isDisliked) {
        setIsDisliked(false);
        setDislikes(prev => Math.max(0, prev - 1));
      }
      
      // Show optimistic UI update
      setIsLiked(true);
      setLikes(prev => prev + 1);
      
      // Make API call
      const response = await incrementVideoLike(videos[currentIndex].video_id);
      
      // Update with server response or keep optimistic update if no response
      if (response && typeof response.likes === 'number') {
        setLikes(response.likes);
      }
    } catch (error) {
      // Revert optimistic update on error
      setIsLiked(false);
      setLikes(prev => Math.max(0, prev - 1));
      console.error("Error liking video:", error);
      setSnackbarMessage("Failed to like video. Please try again.");
      setShowSnackbar(true);
    }
  };

  const handleDislike = async () => {
    if (!currentUser) {
      showLoginPrompt("Please log in to dislike videos");
      return;
    }
    
    try {
      if (isDisliked) {
        // If already disliked, just remove the dislike (toggle behavior)
        setIsDisliked(false);
        setDislikes(prev => Math.max(0, prev - 1));
        return;
      }
      
      // If liked, remove the like
      if (isLiked) {
        setIsLiked(false);
        setLikes(prev => Math.max(0, prev - 1));
      }
      
      // Show optimistic UI update
      setIsDisliked(true);
      setDislikes(prev => prev + 1);
      
      // Make API call
      const response = await incrementVideoDislike(videos[currentIndex].video_id);
      
      // Update with server response or keep optimistic update if no response
      if (response && typeof response.dislikes === 'number') {
        setDislikes(response.dislikes);
      }
    } catch (error) {
      // Revert optimistic update on error
      setIsDisliked(false);
      setDislikes(prev => Math.max(0, prev - 1));
      console.error("Error disliking video:", error);
      setSnackbarMessage("Failed to dislike video. Please try again.");
      setShowSnackbar(true);
    }
  };

  const handleShare = async () => {
    try {
      // Try Web Share API first
      if (navigator.share) {
        try {
          await navigator.share({
            title: videos[currentIndex]?.title,
            text: videos[currentIndex]?.description,
            url: window.location.href,
          });
          console.log('Successfully shared');
          
          // Update share flag for watch history
          setWatchShared(true);
          
          // Update watch history with shared flag if user is logged in
          if (currentUser && videos && videos.length > 0 && currentIndex < videos.length) {
            const video = videoRef.current;
            if (video) {
              const watchData = {
                video_id: videos[currentIndex].video_id,
                watch_time: video.currentTime || 0,
                watch_percentage: video.duration ? ((video.currentTime / video.duration) * 100) : 0,
                completed: false,
                last_position: video.currentTime || 0,
                like_flag: isLiked,
                dislike_flag: isDisliked,
                saved_flag: isSaved,
                shared_flag: true,
                device_type: deviceType
              };
              updateWatchHistory(watchData).catch(err => {
                console.error("Failed to update watch history after share:", err);
              });
            }
          }
          
          return;
        } catch (error) {
          console.log('Web Share API error:', error);
          // Fall through to clipboard method
        }
      }

      // Fallback to clipboard API with multiple methods
      await copyToClipboard();
      
      // Update share flag for watch history
      setWatchShared(true);
      
      // Update watch history with shared flag if user is logged in
      if (currentUser && videos && videos.length > 0 && currentIndex < videos.length) {
        const video = videoRef.current;
        if (video) {
          const watchData = {
            video_id: videos[currentIndex].video_id,
            watch_time: video.currentTime || 0,
            watch_percentage: video.duration ? ((video.currentTime / video.duration) * 100) : 0,
            completed: false,
            last_position: video.currentTime || 0,
            like_flag: isLiked,
            dislike_flag: isDisliked,
            saved_flag: isSaved,
            shared_flag: true,
            device_type: deviceType
          };
          updateWatchHistory(watchData).catch(err => {
            console.error("Failed to update watch history after share:", err);
          });
        }
      }
    } catch (error) {
      console.error("Share error:", error);
      setSnackbarMessage("Could not share video");
      setShowSnackbar(true);
    }
  };

  const copyToClipboard = async () => {
    const urlToCopy = window.location.href;
    
    try {
      // Try the modern Clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(urlToCopy);
        setSnackbarMessage("Link copied to clipboard!");
        setShowSnackbar(true);
        return;
      }

      // Fallback to older execCommand method
      const textArea = document.createElement("textarea");
      textArea.value = urlToCopy;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        const successful = document.execCommand('copy');
        textArea.remove();
        
        if (successful) {
          setSnackbarMessage("Link copied to clipboard!");
          setShowSnackbar(true);
          return;
        }
      } catch (err) {
        console.error('execCommand Error:', err);
        textArea.remove();
        throw new Error('Copy failed');
      }

      // If all methods fail, show manual copy message
      setSnackbarMessage(`Please copy this link manually: ${urlToCopy}`);
      setShowSnackbar(true);
      setTimeout(() => setShowSnackbar(false), 5000); // Show message longer for manual copy

    } catch (error) {
      console.error("Clipboard error:", error);
      // Show the URL in a snackbar as a last resort
      setSnackbarMessage(`Please copy this link manually: ${urlToCopy}`);
      setShowSnackbar(true);
      setTimeout(() => setShowSnackbar(false), 5000);
    }
  };

  const showLoginPrompt = (message) => {
    setSnackbarMessage(message || "Please log in to use this feature");
    setShowSnackbar(true);
  };
  
  // Used when the user clicks the snackbar close button
  const handleCloseSnackbar = () => {
    setShowSnackbar(false);
  };

  // Navigation functions used by UI controls and keyboard shortcuts
  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Helper function used for truncating text in the UI
  const truncateDescription = (text, maxLength = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Legacy click handler - maintained for compatibility
  const handleVideoClick = (e) => {
    handleVideoContainerClick(e);
  };

  const handleSaveVideo = async () => {
    if (!currentUser) {
      showLoginPrompt("Please log in to save videos");
      return;
    }
    
    try {
      const videoId = videos[currentIndex].video_id;
      const shouldSave = !isSaved;
      
      await saveVideo(videoId, shouldSave);
      
      setIsSaved(shouldSave);
      
      if (shouldSave) {
        setSnackbarMessage("Video saved to your profile");
      } else {
        setSnackbarMessage("Video removed from saved videos");
      }
      setShowSnackbar(true);
    } catch (error) {
      console.error("Error saving video:", error);
      setSnackbarMessage("Could not save video");
      setShowSnackbar(true);
    }
  };

  const handleDeleteVideo = async () => {
    if (!currentUser) {
      showLoginPrompt("Please log in to delete videos");
      return;
    }

    const currentVideo = videos[currentIndex];
    if (!currentVideo || !currentUser || currentUser?.user_id !== currentVideo?.user_id) {
      setSnackbarMessage("You can only delete your own videos");
      setShowSnackbar(true);
      return;
    }

    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      const videoId = videos[currentIndex].video_id;
      
      await deleteVideo(videoId);
      
      setShowDeleteDialog(false);
      setIsDeleting(false);
      
      setSnackbarMessage("Video deleted successfully");
      setShowSnackbar(true);
      
      if (videos.length <= 1) {
        exitFullScreen();
    navigate("/");
      } else if (currentIndex === videos.length - 1) {
        setCurrentIndex(currentIndex - 1);
      } else {
        // Force reload of current index
        const newIndex = currentIndex;
        setCurrentIndex(0);
        setTimeout(() => setCurrentIndex(newIndex), 10);
      }
    } catch (error) {
      console.error("Error deleting video:", error);
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setSnackbarMessage("Failed to delete video");
      setShowSnackbar(true);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser) {
      showLoginPrompt("Please log in to follow users");
      return;
    }
    
    if (currentUser.user_id === videos[currentIndex].user_id) {
      setSnackbarMessage("You cannot follow yourself");
      setShowSnackbar(true);
      return;
    }
    
    setFollowLoading(true);
    
    try {
      if (isFollowing) {
        await unfollowUser(videos[currentIndex].user_id);
        setIsFollowing(false);
        setSnackbarMessage(`Unfollowed @${videos[currentIndex].username}`);
      } else {
        await followUser(videos[currentIndex].user_id);
        setIsFollowing(true);
        setSnackbarMessage(`Now following @${videos[currentIndex].username}`);
      }
      setShowSnackbar(true);
    } catch (error) {
      console.error("Error toggling follow:", error);
      setSnackbarMessage("Failed to update follow status");
      setShowSnackbar(true);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
    }
  };

  const handleProgressClick = (event) => {
    const video = videoRef.current;
    if (video) {
      const progressBar = event.currentTarget;
      const clickPosition = event.nativeEvent.offsetX;
      const progressBarWidth = progressBar.offsetWidth;
      const newTime = (clickPosition / progressBarWidth) * duration;
      video.currentTime = newTime;
    }
  };

  const handleVolumeChange = () => {
    const video = videoRef.current;
    if (video) {
      setVolume(video.volume);
      setIsMuted(video.muted);
    }
  };

  const handlePlaybackSpeedChange = (event) => {
    const video = videoRef.current;
    if (video) {
      const newSpeed = parseFloat(event.target.value);
      video.playbackRate = newSpeed;
    }
  };

  const formatTime = (timeInSeconds) => {
    if (!timeInSeconds) return "0:00";
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Handle mouse wheel events for volume control
  const handleWheel = (e) => {
    // This entire function will be removed
  };

  // Add effect to show controls at video start and end
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const handleTimeUpdate = () => {
        // Show controls if video is at start or end
        if (video.currentTime < 1 || video.currentTime > video.duration - 1) {
          setShowControls(true);
        }
      };

      video.addEventListener('timeupdate', handleTimeUpdate);
      return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }
  }, []);

  const handleDoubleClick = (event) => {
    // This entire function will be removed
  };

  const handleDoubleTap = (event) => {
    // This entire function will be removed
  };

  const handleSeekChange = (e) => {
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const seekPos = (e.clientX - rect.left) / rect.width;
    
    if (videoRef.current) {
      const newTime = seekPos * videoRef.current.duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Toggle fullscreen mode
  const toggleFullScreen = () => {
    if (isFullScreen) {
      exitFullScreen();
    } else {
      enterFullScreen();
    }
  };

  // Add responsive layout calculations
  const theme = useTheme();
  const calculateVideoSize = () => {
    // Use 16:9 aspect ratio for all screen sizes
    return {
      width: '100%',
      height: 'auto',
      aspectRatio: '16/9',
      maxWidth: '100%',
      objectFit: 'contain',
      margin: '0 auto' // Center the video
    };
  };

  const videoStyles = calculateVideoSize();

  // Navigate to home page
  const goToHomePage = () => {
    navigate("/");
  };

  // Update getVideoSource to handle URLs properly for local development
  const getVideoSource = (videoUrl) => {
    console.log("Original video URL:", videoUrl);
    if (!videoUrl) {
      console.error("Video URL is null or undefined");
      return null;
    }
    
    try {
      // First normalize the URL
      let finalUrl = videoUrl;
      
      // Clean up URL - sometimes APIs return URLs with escaped characters or extra quotes
      if (typeof finalUrl === 'string') {
        // Remove any quotes that might surround the URL
        finalUrl = finalUrl.replace(/^["'](.*)["']$/, '$1');
        
        // Fix any double slashes (except after protocol)
        finalUrl = finalUrl.replace(/([^:])\/\//g, '$1/');
        
        // Remove trailing parameters if they're causing problems
        if (finalUrl.includes('?') && finalUrl.includes('format=')) {
          const urlParts = finalUrl.split('?');
          const extension = urlParts[0].split('.').pop().toLowerCase();
          
          // If URL has a valid extension, we can safely remove params
          if (['mp4', 'webm', 'mov', 'ogg', 'mkv'].includes(extension)) {
            finalUrl = urlParts[0];
            console.log("Removed URL parameters to fix format issues");
          }
        }
      }
      
      // Handle relative URLs from our API
      if (finalUrl.startsWith('/')) {
        const baseUrl = API_BASE_URL || "http://127.0.0.1:8000/api";
        finalUrl = `${baseUrl}${finalUrl}`;
        console.log("Converted relative URL to:", finalUrl);
        return finalUrl;
      }
      
      // If URL is already absolute with a protocol, return it directly
      if (finalUrl.match(/^https?:\/\//i)) {
        console.log("Using direct URL:", finalUrl);
        return finalUrl;
      }
      
      // If URL is missing protocol but isn't relative
      if (!finalUrl.startsWith('/')) {
        finalUrl = `http://${finalUrl}`;
        console.log("Added http protocol to URL:", finalUrl);
        return finalUrl;
      }
      
      console.log("Final video URL:", finalUrl);
      return finalUrl;
    } catch (error) {
      console.error("Error processing video URL:", error);
      // Return original URL as fallback
      return videoUrl;
    }
  };
  
  // Update the MIME type function to better handle video formats
  const getVideoMimeType = (url) => {
    if (!url) return 'video/mp4'; // Default
    
    // Improved extension detection
    let extension = "";
    
    try {
      // Extract extension from URL
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const lastDotIndex = pathname.lastIndexOf('.');
      
      if (lastDotIndex !== -1) {
        extension = pathname.substring(lastDotIndex + 1).toLowerCase();
      }
    } catch (e) {
      // If URL parsing fails, try simple regex
      const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
      if (match && match[1]) {
        extension = match[1].toLowerCase();
      }
    }
    
    // Default to mp4 if no extension found
    if (!extension) {
      console.log("No file extension found in URL, defaulting to mp4");
      return 'video/mp4';
    }
    
    console.log(`Detected file extension: ${extension}`);
    
    // Map extensions to MIME types
    switch (extension) {
      case 'mp4':
        return 'video/mp4';
      case 'webm':
        return 'video/webm';
      case 'ogg':
      case 'ogv':
        return 'video/ogg';
      case 'mov':
        return 'video/quicktime';
      case 'avi':
        return 'video/x-msvideo';
      case 'wmv':
        return 'video/x-ms-wmv';
      case 'm4v':
        return 'video/x-m4v';
      case 'mkv':
        return 'video/x-matroska';
      case '3gp':
        return 'video/3gpp';
      case 'ts':
        return 'video/mp2t';
      case 'flv':
        return 'video/x-flv';
      default:
        console.log(`Unknown extension: ${extension}, defaulting to mp4`);
        return 'video/mp4';
    }
  };

  // Update the video error handler
  const handleVideoError = (error) => {
    const video = videoRef.current;
    let errorMessage = "Error loading video. Please try again.";
    
    // Add proper null checks to prevent "Cannot read properties of null (reading 'code')" errors
    if (video && video.error && typeof video.error.code === 'number') {
      // Check for specific error codes
      switch (video.error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = "Video playback was aborted.";
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = "Network error occurred while loading the video.";
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = "Video decoding error. Trying alternate format...";
          // Automatically try fallback format
          tryFallbackFormats();
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = "This video format is not supported by your browser. Trying alternate format...";
          // Automatically try fallback format
          tryFallbackFormats();
          break;
        default:
          errorMessage = `Unknown video error (code: ${video.error.code}).`;
      }
      
      console.error("Video error details:", {
        code: video.error.code,
        message: video.error.message || 'No detailed error message available',
        errorMessage: errorMessage,
        videoUrl: videos && currentIndex < videos.length ? videos[currentIndex]?.video_url : 'unknown'
      });
    } else {
      console.error("Video error occurred, but error details are not available:", error);
      // Still try fallback formats in case it's a MIME type issue
      tryFallbackFormats();
    }
    
    setSnackbarMessage(errorMessage);
    setShowSnackbar(true);
  };
  
  // Add function to try loading different video formats as fallback
  const tryFallbackFormats = () => {
    if (!videos || !videos[currentIndex] || !videoRef.current) return;
    
    const currentVideo = videos[currentIndex];
    console.log("Attempting to find alternative video formats...");
    
    const video = videoRef.current;
    
    // Create a list of potential formats to try
    const tryFormats = ['mp4', 'webm', 'mov'];
    
    // Clear existing sources
    while (video.firstChild) {
      video.removeChild(video.firstChild);
    }
    
    // Always try MP4 as first fallback
    const baseUrl = currentVideo.video_url.split('.').slice(0, -1).join('.');
    
    let formatAttempted = false;
    
    // Try to append each format extension
    for (const format of tryFormats) {
      try {
        const formatUrl = `${baseUrl}.${format}`;
        console.log(`Trying fallback format: ${format}, URL: ${formatUrl}`);
        
        const source = document.createElement('source');
        source.src = getVideoSource(formatUrl);
        source.type = `video/${format === 'mov' ? 'quicktime' : format}`;
        video.appendChild(source);
        formatAttempted = true;
      } catch (err) {
        console.warn(`Failed to add ${format} source:`, err);
      }
    }
    
    // If no formats were successfully attempted, fall back to the original URL
    if (!formatAttempted) {
      video.src = getVideoSource(currentVideo.video_url);
    }
    
    // Try to load and play
    try {
      video.load();
      video.play().catch(err => console.error("Fallback playback failed:", err));
    } catch (err) {
      console.error("Failed to play fallback format:", err);
    }
  };

  // Add event listeners in useEffect
  useEffect(() => {
    const video = videoRef.current;
    const videoContainer = videoContainerRef.current;
    
    // Track all the event listeners we add so we can properly clean them up
    const eventListeners = [];
    
    const addEventListenerWithCleanup = (element, event, handler, options) => {
      if (event === 'ended') {
        console.log("Adding 'ended' event listener to video element");
      }
      element.addEventListener(event, handler, options);
      eventListeners.push({ element, event, handler, options });
    };

    if (video) {
      // Add all event listeners
      addEventListenerWithCleanup(video, 'timeupdate', handleTimeUpdate);
      addEventListenerWithCleanup(video, 'loadedmetadata', handleLoadedMetadata);
      addEventListenerWithCleanup(video, 'ended', handleVideoEnd);
      addEventListenerWithCleanup(video, 'play', () => setIsPlaying(true));
      addEventListenerWithCleanup(video, 'pause', () => setIsPlaying(false));
      addEventListenerWithCleanup(video, 'volumechange', () => setIsMuted(video.muted));
      
      // Mouse and touch events
      addEventListenerWithCleanup(video, 'mouseover', handleMouseMove);
      addEventListenerWithCleanup(video, 'mousemove', handleMouseMove);
      addEventListenerWithCleanup(video, 'touchstart', handleTouchStart);
      addEventListenerWithCleanup(video, 'touchmove', handleTouchMove);
      addEventListenerWithCleanup(video, 'touchend', handleTouchEnd);
      
      // Window and document level events
      addEventListenerWithCleanup(window, 'keydown', handleKeyDown);
      
      // Use our custom fullscreen change event
      const fullscreenChangeEvent = fullscreenAPI.fullscreenChangeEventName();
      addEventListenerWithCleanup(document, fullscreenChangeEvent, handleFullscreenChange);
    }

    // Cleanup on unmount
    return () => {
      // Remove all tracked event listeners
      eventListeners.forEach(({ element, event, handler, options }) => {
        element.removeEventListener(event, handler, options);
      });
    };
  }, [
    currentIndex,
    videos.length,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleVideoEnd,
    handleMouseMove,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleKeyDown,
    handleFullscreenChange
  ]);

  // Add a separate useEffect for watch history tracking
  useEffect(() => {
    if (!currentUser || !videos || videos.length === 0 || currentIndex >= videos.length) {
      return; // Exit if user not logged in or no videos available
    }

    const currentVideo = videos[currentIndex];
    const video = videoRef.current;
    
    if (!video) return;

    // Function to track watch time periodically
    const trackWatchTime = async () => {
      if (!video) return;
      
      const watchTime = video.currentTime;
      const duration = video.duration || 1; // Prevent division by zero
      const watchPercentage = (watchTime / duration) * 100;
      
      // Create watch data object
      const watchData = {
        video_id: currentVideo.video_id,
        watch_time: watchTime,
        watch_percentage: watchPercentage,
        completed: false, // Only mark completed in handleVideoEnd
        last_position: watchTime,
        like_flag: isLiked,
        dislike_flag: isDisliked,
        saved_flag: isSaved,
        shared_flag: watchShared,
        device_type: deviceType
      };

      try {
        await updateWatchHistory(watchData);
      } catch (error) {
        console.error("Failed to update watch history:", error);
      }
    };

    // Set interval to track every 15 seconds
    const intervalId = setInterval(() => {
      if (isPlaying && video.currentTime > 0) {
        trackWatchTime();
      }
    }, 15000);
    
    // Store interval ID for cleanup
    setWatchTrackerInterval(intervalId);

    // Send initial watch data when starting a video
    if (video.currentTime > 0) {
      trackWatchTime();
    }

    // Cleanup on unmount or video change
    return () => {
      clearInterval(intervalId);
      
      // Send final watch data when changing videos
      if (video.currentTime > 0) {
        trackWatchTime();
      }
    };
  }, [currentUser, videos, currentIndex, isPlaying, isLiked, isDisliked, isSaved, watchShared, deviceType]);

  // Reset the reported view flag when video changes
  useEffect(() => {
    reportedViewRef.current = false;
  }, [currentIndex]);

  // Add watch history tracking when component mounts and on video changes
  useEffect(() => {
    // Check saved status and follow status for current video
    if (videos && videos.length > 0 && currentIndex >= 0 && currentIndex < videos.length) {
      const currentVideo = videos[currentIndex];
      if (currentVideo) {
        if (currentUser) {
          checkSavedStatus(currentVideo.video_id);
          checkFollowStatus(currentVideo.user_id);
        }
        
        // Update the page URL without navigation
        try {
          if (window.history.state?.videoId !== currentVideo.video_id) {
            window.history.replaceState(
              { videoId: currentVideo.video_id },
              '',
              `/video/${currentVideo.video_id}`
            );
          }
        } catch (error) {
          console.error("Error updating URL:", error);
        }
        
        // Set video metadata
        setLikes(currentVideo.likes || 0);
        setDislikes(currentVideo.dislikes || 0);
        setViews(currentVideo.views || 0);
        
        // Update device type based on screen size
        setDeviceType(isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop');
      }
    }
  }, [currentUser, videos, currentIndex, isMobile, isTablet]);

  // Add a useEffect to handle component cleanup
  useEffect(() => {
    return () => {
      // Cleanup function for when component unmounts
      console.log("VideoPlayer component unmounting, cleaning up resources");
      
      // Cleanup any video resources
      if (videoRef.current) {
        const video = videoRef.current;
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      
      // Clear any intervals or timeouts
      if (watchTrackerInterval) {
        clearInterval(watchTrackerInterval);
      }
      
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, [watchTrackerInterval, controlsTimeout]);

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

  return (
    <Box
      ref={videoContainerRef}
      sx={{
        width: '100%',
        height: '100vh',
        position: 'relative',
        bgcolor: '#000',
        overflow: 'hidden'
      }}
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

      {/* Video element - directly in the container */}
      <video
        ref={videoRef}
        playsInline={true}
        muted={isMuted}
        autoPlay={true}
        loop={false}
        preload="auto"
        poster={videos[currentIndex]?.thumbnail_url}
        onEnded={handleVideoEnd}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onVolumeChange={handleVolumeChange}
        onCanPlay={() => {
          console.log("Video can now play");
          const video = videoRef.current;
          if (video) {
            video.play()
              .then(() => console.log("Auto play started successfully"))
              .catch(e => {
                console.error("Error auto-playing:", e);
                if (!video.muted) {
                  console.log("Trying muted autoplay...");
                  video.muted = true;
                  setIsMuted(true);
                  video.play().catch(err => console.error("Muted autoplay also failed:", err));
                }
              });
          }
        }}
        onError={(e) => {
          // Safe error handling with null checks
          console.error("Video error event triggered");
          
          // Safely log video URL
          const videoUrl = videos && currentIndex < videos.length && videos[currentIndex] 
            ? videos[currentIndex].video_url 
            : 'unknown video URL';
          console.error("Video URL:", videoUrl);
          
          // Safely check for error details with null guards
          if (videoRef.current) {
            const videoError = videoRef.current.error;
            if (videoError) {
              console.error("Video error code:", videoError.code || 'No error code available');
              console.error("Video error message:", videoError.message || 'No error message available');
            } else {
              console.error("Video error occurred but error object is null");
            }
          } else {
            console.error("Video ref is null when error occurred");
          }
          
          // Call error handler with the event
          handleVideoError(e);
        }}
        crossOrigin="anonymous"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          background: '#000'
        }}
      >
        {/* Adding fallback source types by default */}
        <source 
          src={getVideoSource(videos[currentIndex]?.video_url)} 
          type={getVideoMimeType(videos[currentIndex]?.video_url)}
        />
        {/* MP4 Fallback */}
        <source 
          src={getVideoSource(videos[currentIndex]?.video_url.replace(/\.[^.]+$/, '.mp4'))} 
          type="video/mp4"
        />
        {/* WebM Fallback */}
        <source 
          src={getVideoSource(videos[currentIndex]?.video_url.replace(/\.[^.]+$/, '.webm'))} 
          type="video/webm"
        />
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
  );
};

export default VideoPlayer;
