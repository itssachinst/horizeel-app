import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  IconButton, Typography, Box, Avatar, Snackbar, Alert, 
  Dialog, DialogContent, DialogTitle, Button, DialogActions, 
  CircularProgress, Slide, Tooltip
} from "@mui/material";
import {
  ThumbUp, ThumbDown, Share, ArrowUpward, ArrowDownward,
  VolumeOff, VolumeUp, BookmarkBorder, Bookmark, PersonAdd,
  Check, Pause, PlayArrow, Fullscreen, ArrowBack, FullscreenExit, Visibility
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import {
  incrementVideoLike, incrementVideoDislike, saveVideo, 
  checkVideoSaved, followUser, unfollowUser, checkIsFollowing, 
  updateWatchHistory, incrementVideoView 
} from "../api";
import useSwipeNavigate from "../hooks/useSwipeNavigate";
import useTrackpadGestures from "../hooks/useTrackpadGestures";
import { processVideoUrl } from "../utils/videoUtils";
import { formatViewCount } from "../utils/videoUtils";
import { navigateToHomeWithRefresh } from "../utils/navigation";
import { useVideoContext } from "../contexts/VideoContext";
import ReactHlsPlayer from 'react-hls-player';

// Get the API base URL from environment
const API_BASE_URL = process.env.REACT_APP_API_URL || "https://horizeel.com/api/";

// Define browser-specific fullscreen functions
const fullscreenAPI = {
  enterFullscreen: (element) => {
    if (element.requestFullscreen) {
      return element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
      return element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
      return element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      return element.msRequestFullscreen();
    } else {
      return Promise.reject(new Error("No fullscreen API available"));
    }
  },

  exitFullscreen: () => {
    if (document.exitFullscreen) {
      return document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
      return document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      return document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      return document.msExitFullscreen();
    } else {
      return Promise.reject(new Error("No fullscreen API available"));
    }
  },

  isFullscreen: () => {
    return !!(document.fullscreenElement ||
      document.mozFullScreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement);
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
    return 'fullscreenchange';
  }
};

const VideoPlayer = ({
  videos,
  currentIndex,
  setCurrentIndex,
  isMobile,
  isTablet,
  shouldPreserveFullscreen,
  shouldPreload,
  visibilityState,
  onNextVideo,
  onPrevVideo,
  isFullscreen,
  onToggleFullscreen,
  forceMuted = false
}) => {
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const { currentUser } = useAuth();
  // Removed hasMore and loadMoreVideos since navigation is now handled by parent

  // Important refs
  const reportedViewRef = useRef(false);

  // State variables - INTERNAL PAUSE STATE ONLY
  const [isPaused, setIsPaused] = useState(false); // ✅ Internal state only
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [views, setViews] = useState(0);
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
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState(null);
  const [deviceType, setDeviceType] = useState(isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop');
  const [watchShared, setWatchShared] = useState(false);
  const [orientation, setOrientation] = useState(
    window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
  );
  const [error, setError] = useState('');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Create reference to current video data
  const videoData = videos[currentIndex];
  const videoId = videoData?.video_id;

  // Debug mode for click detection - only in development
  const DEBUG_CLICKS = process.env.NODE_ENV === 'development';

  // CRITICAL: Force unique key for each video change to ensure complete remount
  const videoKey = useMemo(() => {
    return `${videoId}-${currentIndex}`;
  }, [videoId, currentIndex]);

  // Memoize the video source to prevent unnecessary restarts
  const videoSrc = useMemo(() => {
    const currentVideo = videos[currentIndex];
    if (!currentVideo?.video_url) return '';
    return processVideoUrl(currentVideo.video_url, API_BASE_URL);
  }, [videos, currentIndex]);

  // Memoize autoPlay to prevent unnecessary restarts
  // CRITICAL FIX: Never change autoPlay after initial render to prevent restarts
  const shouldAutoPlay = useMemo(() => {
    // Only autoplay for the current video, and only set this once
    const isCurrentVideo = videos && videos[currentIndex] && videos[currentIndex].video_id === videoId;
    return isCurrentVideo;
  }, [videos, currentIndex, videoId]); // Removed isPaused dependency to prevent restarts

  // Memoize hlsConfig with audio/video sync optimizations (fixed)
  const hlsConfig = useMemo(() => ({
            enableWorker: true,
    lowLatencyMode: false,
            maxBufferLength: 30,
    maxBufferSize: 15 * 1000 * 1000,
            startLevel: -1,
            autoStartLoad: true,
    // Audio/video sync optimizations
    liveSyncDurationCount: 3,
    liveMaxLatencyDurationCount: 10,
    // Prevent audio overlap during seeking
    maxSeekHole: 2,
    // Improve audio/video sync
    nudgeOffset: 0.1,
    nudgeMaxRetry: 3,
    // Better error recovery
    maxLoadingDelay: 4,
    maxBufferHole: 0.5
  }), []);

  // Memoize video style to prevent unnecessary restarts
  const videoStyle = useMemo(() => ({
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    background: '#000',
    willChange: 'transform',
    transform: 'translateZ(0)',
    WebkitBackfaceVisibility: 'hidden',
    backfaceVisibility: 'hidden'
  }), []);

  // Enhanced mouse move handler with comprehensive user activity detection
  const showControlsAndResetTimer = useCallback(() => {
    // Clear any existing timeout
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    
    // Show controls if they're hidden
    if (!showControls) {
      setShowControls(true);
    }
    
    // Set new timeout to hide controls after 8 seconds
    const newTimeout = setTimeout(() => {
      setShowControls(false);
    }, 8000);
    
    setControlsTimeout(newTimeout);
  }, [controlsTimeout, showControls]);

  // Mouse move handler
  const handleMouseMove = useCallback((e) => {
    // Only respond to actual mouse movement, not programmatic events
    if (e.isTrusted) {
      showControlsAndResetTimer();
    }
  }, [showControlsAndResetTimer]);

  // Enhanced user interaction handlers
  const handleUserInteraction = useCallback((e) => {
    // Only respond to trusted user events
    if (e.isTrusted) {
      showControlsAndResetTimer();
    }
  }, [showControlsAndResetTimer]);

  // Touch interaction handlers
  const handleTouchInteraction = useCallback((e) => {
    if (e.isTrusted) {
      showControlsAndResetTimer();
    }
  }, [showControlsAndResetTimer]);

  // Keyboard interaction handler
  const handleKeyboardInteraction = useCallback((e) => {
    if (e.isTrusted) {
      showControlsAndResetTimer();
    }
  }, [showControlsAndResetTimer]);

  // Fixed toggle play/pause to prevent video restarts
  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) {
      return;
    }

    const video = videoRef.current;

    // Ensure we have a valid video element with the necessary methods
    if (!video.play || !video.pause || typeof video.paused === 'undefined') {
      return;
    }
    
    try {
      // Store current position to ensure we don't lose it
      const currentPosition = video.currentTime;

    if (video.paused) {
        // Resume from current position, explicitly ensure we don't restart
        video.currentTime = currentPosition; // Ensure position is preserved
      video.play()
          .then(() => {
            setIsPlaying(true);
          })
        .catch(error => {
          console.error("Error playing video:", error);
          setIsPlaying(false);
        });
    } else {
        // Pause at current position
      video.pause();
      setIsPlaying(false);
    }
    } catch (error) {
      console.error("Error in togglePlayPause:", error);
    }
  }, []);

  // Enhanced video container click handler with robust conflict prevention
  const handleVideoContainerClick = useCallback((e) => {
    // Show controls and reset timer on click
    showControlsAndResetTimer();
    
    // Get click coordinates for better detection
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Debug logging for development
    console.log('Click detected on video container', {
      target: e.target.tagName,
      className: e.target.className,
      coordinates: { x: clickX, y: clickY },
      containerSize: { width: rect.width, height: rect.height }
    });
    
    // More specific interactive element detection - reduced false positives
    const interactiveSelectors = [
      '.MuiIconButton-root',
      '.MuiButton-root',
      '.MuiSlider-root',
      '[data-right-buttons] *', // Any child of right buttons
      '[data-user-info] button', // Only buttons in user info
      'input', 'select', 'textarea', 'a'
    ];
    
    // Check if click target or any parent is an interactive element
    const isInteractiveElement = interactiveSelectors.some(selector => {
      return e.target.closest(selector);
    });
    
    // If clicked on interactive element, don't handle play/pause
    if (isInteractiveElement) {
      console.log('Click ignored - interactive element detected');
      return;
    }

    // Coordinate-based exclusion zones (more reliable than CSS)
    const topExclusionZone = clickY < 80; // Top 80px
    const bottomExclusionZone = clickY > rect.height - 120; // Bottom 120px
    const rightExclusionZone = clickX > rect.width - 100; // Right 100px for buttons
    
    if (topExclusionZone || bottomExclusionZone || rightExclusionZone) {
      console.log('Click ignored - exclusion zone', {
        top: topExclusionZone,
        bottom: bottomExclusionZone,
        right: rightExclusionZone
      });
          return;
        }

    console.log('Click accepted - toggling play/pause');
    
    // Immediate action without delay - this was the main issue
    e.stopPropagation();
    e.preventDefault();
    
    // Only toggle play/pause if we have a valid video reference
    if (videoRef.current) {
      togglePlayPause(); // Remove the problematic setTimeout
    }
  }, [togglePlayPause, showControlsAndResetTimer]);

  // Fullscreen toggle function - now uses parent's function
  const toggleFullscreen = useCallback(() => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
    } else {
      console.warn("No fullscreen toggle function provided by parent");
    }
  }, [onToggleFullscreen]);

  // Mute toggle function
  const toggleMute = useCallback(() => {
    if (!videoRef.current) {
      return;
    }
    
    // Prevent unmuting if this video is force muted (non-current video)
    if (forceMuted) {
          return;
        }

    const video = videoRef.current;
    const newMutedState = !video.muted;
    
    video.muted = newMutedState;
    setIsMuted(newMutedState);
    
    // Ensure volume is set correctly when unmuting
    if (!newMutedState && video.volume === 0) {
      video.volume = 1.0;
    }
  }, [forceMuted]);

  // Seek forward function with proper HLS buffer flushing
  const seekForward = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    try {
      const wasPlaying = !video.paused;
      const newTime = Math.min(video.currentTime + 10, video.duration || 0);
      
      // Step 1: Pause video immediately to stop current audio stream
      video.pause();
      setIsPlaying(false);
      
      // Step 2: Set new time
      video.currentTime = newTime;
      
      // Step 3: Wait for seek to complete and buffers to flush
      const handleSeeked = () => {
        // Remove the event listener to avoid memory leaks
        video.removeEventListener('seeked', handleSeeked);
        
        // Step 4: Resume playback if it was playing before
        if (wasPlaying) {
          video.play().then(() => {
            setIsPlaying(true);
          }).catch(error => {
            console.error("Error resuming after forward seek:", error);
            setIsPlaying(false);
          });
        }
        
        setCurrentTime(video.currentTime);
      };
      
      // Listen for seek completion
      video.addEventListener('seeked', handleSeeked);
      
      // Fallback timeout
            setTimeout(() => {
        video.removeEventListener('seeked', handleSeeked);
        if (wasPlaying && video.paused) {
          video.play().then(() => {
            setIsPlaying(true);
          }).catch(error => {
            console.error("Error in forward seek fallback:", error);
                setIsPlaying(false);
          });
        }
        setCurrentTime(video.currentTime);
      }, 200);
      
    } catch (error) {
      console.error("Error in seekForward:", error);
    }
  }, []);

  // Seek backward function with proper HLS buffer flushing
  const seekBackward = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    try {
      const wasPlaying = !video.paused;
      const newTime = Math.max(video.currentTime - 10, 0);
      
      // Step 1: Pause video immediately to stop current audio stream
        video.pause();
        setIsPlaying(false);
      
      // Step 2: Set new time
      video.currentTime = newTime;
      
      // Step 3: Wait for seek to complete and buffers to flush
      const handleSeeked = () => {
        // Remove the event listener to avoid memory leaks
        video.removeEventListener('seeked', handleSeeked);
        
        // Step 4: Resume playback if it was playing before
        if (wasPlaying) {
          video.play().then(() => {
              setIsPlaying(true);
          }).catch(error => {
            console.error("Error resuming after backward seek:", error);
            setIsPlaying(false);
          });
        }
        
        setCurrentTime(video.currentTime);
      };
      
      // Listen for seek completion
      video.addEventListener('seeked', handleSeeked);
      
      // Fallback timeout
            setTimeout(() => {
        video.removeEventListener('seeked', handleSeeked);
        if (wasPlaying && video.paused) {
                video.play().then(() => {
            setIsPlaying(true);
          }).catch(error => {
            console.error("Error in backward seek fallback:", error);
                  setIsPlaying(false);
                });
        }
        setCurrentTime(video.currentTime);
      }, 200);
      
    } catch (error) {
      console.error("Error in seekBackward:", error);
    }
  }, []);

  // Like handler
  const handleLike = useCallback(async () => {
    if (!currentUser) {
      setSnackbarMessage("Please log in to like videos");
            setShowSnackbar(true);
      return;
    }

    const currentVideo = videos[currentIndex];
    if (!currentVideo?.video_id) return;

    try {
      await incrementVideoLike(currentVideo.video_id);
      setIsLiked(!isLiked);
      setLikes(prev => isLiked ? prev - 1 : prev + 1);
      if (isDisliked) {
        setIsDisliked(false);
        setDislikes(prev => prev - 1);
      }
      setSnackbarMessage(isLiked ? "Like removed" : "Video liked!");
      setShowSnackbar(true);
    } catch (error) {
      console.error("Error liking video:", error);
      setSnackbarMessage("Error liking video");
      setShowSnackbar(true);
    }
  }, [currentUser, videos, currentIndex, isLiked, isDisliked]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!currentUser) {
      setSnackbarMessage("Please log in to save videos");
      setShowSnackbar(true);
      return;
    }

    const currentVideo = videos[currentIndex];
    if (!currentVideo?.video_id) return;

    try {
      await saveVideo(currentVideo.video_id);
      setIsSaved(!isSaved);
      setSnackbarMessage(isSaved ? "Video removed from saved" : "Video saved!");
                  setShowSnackbar(true);
    } catch (error) {
      console.error("Error saving video:", error);
      setSnackbarMessage("Error saving video");
      setShowSnackbar(true);
    }
  }, [currentUser, videos, currentIndex, isSaved]);

  // Share handler
  const handleShare = useCallback(async () => {
    const currentVideo = videos[currentIndex];
    if (!currentVideo?.video_id) return;

    const shareUrl = `${window.location.origin}/reels/${currentVideo.video_id}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: currentVideo.title || 'Check out this video',
          text: `Watch "${currentVideo.title}" by ${currentVideo.creator_username}`,
          url: shareUrl,
        });
        setWatchShared(true);
          } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareUrl);
        setSnackbarMessage("Video link copied to clipboard!");
            setShowSnackbar(true);
        setWatchShared(true);
          }
    } catch (error) {
      console.error("Error sharing video:", error);
      setSnackbarMessage("Error sharing video");
      setShowSnackbar(true);
    }
  }, [videos, currentIndex]);

  // Follow handler
  const handleFollow = useCallback(async () => {
    if (!currentUser) {
      setSnackbarMessage("Please log in to follow users");
      setShowSnackbar(true);
      return;
    }

    const currentVideo = videos[currentIndex];
    if (!currentVideo?.user_id) return;

    // Don't allow following yourself
    if (currentUser.user_id === currentVideo.user_id) {
      setSnackbarMessage("You cannot follow yourself");
      setShowSnackbar(true);
      return;
    }

    try {
      setFollowLoading(true);
      
      if (isFollowing) {
        await unfollowUser(currentVideo.user_id);
        setIsFollowing(false);
        setSnackbarMessage(`Unfollowed ${currentVideo.creator_username}`);
          } else {
        await followUser(currentVideo.user_id);
        setIsFollowing(true);
        setSnackbarMessage(`Following ${currentVideo.creator_username}`);
      }
      
          setShowSnackbar(true);
    } catch (error) {
      console.error("Error following/unfollowing user:", error);
      setSnackbarMessage("Error updating follow status");
          setShowSnackbar(true);
    } finally {
      setFollowLoading(false);
    }
  }, [currentUser, videos, currentIndex, isFollowing]);

  // Add more robust navigation control
  const lastNavigationTimeRef = useRef(0);
  const NAVIGATION_DEBOUNCE_MS = 500; // Increased debounce time

  // Use navigation functions from props with debouncing
  const handlePrevVideo = useCallback(() => {
    const now = Date.now();
    
    // Prevent rapid navigation calls with timestamp-based debouncing
    if (now - lastNavigationTimeRef.current < NAVIGATION_DEBOUNCE_MS) {
      return;
    }

    lastNavigationTimeRef.current = now;
    
    if (onPrevVideo) {
      onPrevVideo();
    }
  }, [onPrevVideo]);

  const handleNextVideo = useCallback(() => {
    const now = Date.now();
    
    // Prevent rapid navigation calls with timestamp-based debouncing
    if (now - lastNavigationTimeRef.current < NAVIGATION_DEBOUNCE_MS) {
      return;
    }

    lastNavigationTimeRef.current = now;
    
    if (onNextVideo) {
      onNextVideo();
          } else {
      console.log("onNextVideo is not available - cannot auto-advance");
    }
  }, [onNextVideo]);

  // Simplified touch handlers
  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useSwipeNavigate(
    handleNextVideo,
    handlePrevVideo,
    70,
    true
  );

  // Add trackpad gesture support for desktop users
  const { resetGesture } = useTrackpadGestures(
    handlePrevVideo, // onSwipeUp (previous video) - FIXED
    handleNextVideo, // onSwipeDown (next video) - FIXED
    100, // sensitivity (slightly less sensitive than VerticalVideoFeed)
    true // always enabled for video player
  );

  // CRITICAL: Time update handler with aggressive validation
  const handleTimeUpdate = useCallback(() => {
        const video = videoRef.current;
    if (!video) return;

    // Ensure we're tracking the correct video's time
    const isCurrentVideo = videos && videos[currentIndex] && videos[currentIndex].video_id === videoId;
    if (isCurrentVideo) {
      const currentVideoTime = video.currentTime;
      setCurrentTime(currentVideoTime);
    }
  }, [videos, currentIndex, videoId]);

  // Video end handler
  const handleVideoEnd = useCallback(() => {
    // CRITICAL: Only proceed if this is the current video
    const isCurrentVideo = videos && videos[currentIndex] && videos[currentIndex].video_id === videoId;
    if (!isCurrentVideo) {
      return;
    }
    
    // CRITICAL: Check if user manually paused the video
    // If isPaused is true, the user paused it, so don't auto-advance
    if (isPaused) {
      return;
    }
    
    // CRITICAL: Only proceed if video actually ended naturally
    // Check if video is at the end (don't check video.paused since videos auto-pause when they end)
    if (videoRef.current) {
    const video = videoRef.current;
      const isAtEnd = video.currentTime >= video.duration - 0.5; // Allow small tolerance
      
      // Only proceed if video actually reached the end
      if (!isAtEnd) {
        return;
      }
    }
    
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
    
    // Use parent's navigation function to go to next video
    if (onNextVideo) {
      onNextVideo();
    }
  }, [currentIndex, videos, currentUser, isLiked, isDisliked, isSaved, watchShared, deviceType, onNextVideo, videoId, isPaused]);

  // Video error handler
  const handleVideoError = useCallback((error) => {
    console.error("Video error occurred:", error);
    setSnackbarMessage("Error playing video. Please try another video.");
    setShowSnackbar(true);
  }, []);

  // Video update handler for ReactHlsPlayer with improved audio management
  useEffect(() => {
    if (!videos || videos.length === 0 || currentIndex >= videos.length) {
        return;
      }
      
    const currentVideo = videos[currentIndex];
    if (!currentVideo || !currentVideo.video_url) {
        return;
      }
      
    // Reset the reported view flag for the new video
    reportedViewRef.current = false;

    // Reset video timer and duration for new video
    setCurrentTime(0);
    setDuration(0);

    // Update UI metadata
    setLikes(currentVideo.likes || 0);
    setDislikes(currentVideo.dislikes || 0);
    setViews(currentVideo.views || 0);

    // CRITICAL FIX: Disable URL updates to prevent React Router remounts
    // The URL updates were causing VerticalFeedPage to remount and reset videos
    // TODO: Implement URL updates without causing remounts
    /*
    try {
      const currentPath = window.location.pathname;
      const targetPath = `/reels/${currentVideo.video_id}`;

      // Only update if the path actually changed
      if (!currentPath.includes(currentVideo.video_id)) {
        window.history.replaceState(
          { videoId: currentVideo.video_id },
          '',
          targetPath
        );
      }
    } catch (error) {
      console.error("Error updating URL:", error);
    }
    */

    // Check saved and follow status if user is logged in
    if (currentUser) {
      checkSavedStatus(currentVideo.video_id);
      checkFollowStatus(currentVideo.user_id);
    }
  }, [videos, currentIndex, currentUser]);

  // Keyboard shortcuts handler - defined after all functions it depends on
  const handleKeyPress = useCallback((e) => {
    // Show controls and reset timer on any keyboard interaction
    handleKeyboardInteraction(e);
    
    // Prevent keyboard shortcuts when typing in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    // Prevent default for all handled keys to avoid browser behavior
    const handledKeys = [' ', 'f', 'm', 'arrowright', 'arrowleft', 'arrowup', 'arrowdown', 'l', 's', '/', 't'];
    if (handledKeys.includes(e.key.toLowerCase())) {
      e.preventDefault();
    }

    switch (e.key.toLowerCase()) {
      case ' ':
        togglePlayPause();
        break;
      case 'f':
        toggleFullscreen();
        break;
      case 'm':
        toggleMute();
        break;
      case 'arrowright':
        seekForward();
        break;
      case 'arrowleft':
        seekBackward();
        break;
      case 'arrowup':
        handlePrevVideo();
        break;
      case 'arrowdown':
        handleNextVideo();
        break;
      case 'l':
        handleLike();
        break;
      case 's':
        handleSave();
        break;
      case '/':
        // Focus search bar if available - this would need to be implemented in parent component
        break;
      case 't':
        // Development shortcut to reset swipe tutorial
        if (process.env.NODE_ENV === 'development') {
          localStorage.removeItem('horizeel_swipe_tutorial_completed');
          window.location.reload();
        }
        break;
      default:
        break;
    }
  }, [handleKeyboardInteraction, togglePlayPause, toggleFullscreen, toggleMute, seekForward, seekBackward, handlePrevVideo, handleNextVideo, handleLike, handleSave]);

  // Add keyboard event listener only for the current/active video
  useEffect(() => {
    // Only add keyboard listener if this is the current video
    const isCurrentVideo = videos && videos[currentIndex] && videos[currentIndex].video_id === videoId;
    
    if (isCurrentVideo) {
      document.addEventListener('keydown', handleKeyPress);

    return () => {
        document.removeEventListener('keydown', handleKeyPress);
      };
    }
  }, [handleKeyPress, videos, currentIndex, videoId]);

  // Check if a video is saved by the current user
  const checkSavedStatus = async (videoId) => {
    try {
      const response = await checkVideoSaved(videoId);
      setIsSaved(response.is_saved);
    } catch (error) {
      console.error("Error checking saved status:", error);
    }
  };

  // Check if creator is followed by current user
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

  // Initialize control visibility timer on mount and handle cleanup
  useEffect(() => {
    // Start with controls visible and set initial timer
    setShowControls(true);
    
    // Set initial timeout without using showControlsAndResetTimer to avoid circular dependency
    const initialTimeout = setTimeout(() => {
      setShowControls(false);
    }, 5000);
    
    setControlsTimeout(initialTimeout);
    
    // Cleanup timeout on unmount
    return () => {
      if (initialTimeout) {
        clearTimeout(initialTimeout);
      }
    };
  }, [videoId]); // Reset timer when video changes

  // Cleanup effect for proper component unmounting
  useEffect(() => {
    const currentVideoRef = videoRef.current;

      return () => {
      // Cleanup when component unmounts or video changes
      if (currentVideoRef) {
        try {
          // Stop playback immediately
          currentVideoRef.pause();
          
          // Reset time to prevent continuation
          currentVideoRef.currentTime = 0;
          
          // Remove all event listeners to prevent memory leaks
          currentVideoRef.removeEventListener('timeupdate', handleTimeUpdate);
          currentVideoRef.removeEventListener('ended', handleVideoEnd);
    } catch (error) {
          console.error("Error during video cleanup:", error);
        }
      }
    };
  }, [videoId]); // Cleanup when video ID changes

  // Reset description expansion when video changes
  useEffect(() => {
    setIsDescriptionExpanded(false);
  }, [videoId]);

  // Global click debugging in development mode
  useEffect(() => {
    if (DEBUG_CLICKS) {
      const handleGlobalClick = (e) => {
        const rect = videoContainerRef.current?.getBoundingClientRect();
        if (rect) {
          const clickX = e.clientX - rect.left;
          const clickY = e.clientY - rect.top;
          const isInsidePlayer = clickX >= 0 && clickX <= rect.width && 
                                clickY >= 0 && clickY <= rect.height;
          
          if (isInsidePlayer) {
            console.log('🎯 Global click in player area:', {
              target: e.target.tagName,
              className: e.target.className,
              id: e.target.id,
              coordinates: { x: clickX, y: clickY },
              zIndex: window.getComputedStyle(e.target).zIndex,
              isVideoElement: e.target.tagName === 'VIDEO'
            });
          }
        }
      };
      
      document.addEventListener('click', handleGlobalClick, true);
      return () => document.removeEventListener('click', handleGlobalClick, true);
    }
  }, [DEBUG_CLICKS]);

  // Handle click outside to collapse description
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDescriptionExpanded && !event.target.closest('[data-description-container]')) {
        setIsDescriptionExpanded(false);
      }
    };

    if (isDescriptionExpanded) {
      document.addEventListener('click', handleClickOutside);
    return () => {
        document.removeEventListener('click', handleClickOutside);
    };
    }
  }, [isDescriptionExpanded]);

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
      sx={{
      width: '100%',
      height: '100vh',
      position: 'relative',
      backgroundColor: '#000',
      overflow: 'hidden'
      }}
    >
        <Box
          ref={videoContainerRef}
          sx={{
            width: '100%',
            height: '100vh',
            backgroundColor: '#000',
            overflow: 'hidden',
            position: 'relative',
            willChange: 'transform',
            transform: 'translateZ(0)',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden'
          }}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleUserInteraction}
          onMouseLeave={handleUserInteraction}
          onMouseDown={handleUserInteraction}
          onMouseUp={handleUserInteraction}
          onTouchStart={(e) => {
            handleTouchStart(e);
            handleTouchInteraction(e);
          }}
          onTouchEnd={(e) => {
            handleTouchEnd(e);
            handleTouchInteraction(e);
          }}
          onTouchMove={(e) => {
            handleTouchMove(e);
            handleTouchInteraction(e);
          }}
          onTouchCancel={handleTouchInteraction}
          onWheel={handleUserInteraction}
          onScroll={handleUserInteraction}
          onFocus={handleUserInteraction}
          onBlur={handleUserInteraction}
        >
                {/* Top overlay with video info */}
          <Slide direction="down" in={showControls} timeout={300}>
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0.4) 70%, transparent)',
                padding: '16px',
                zIndex: 1600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {/* Left side - Back button only */}
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton
                  onClick={(e) => {
                    handleUserInteraction(e);
                    navigateToHomeWithRefresh();
                  }}
                  sx={{
                    color: 'white',
                '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              <ArrowBack />
            </IconButton>
              </Box>

              
            </Box>
          </Slide>

        {/* ReactHlsPlayer for better HLS control and no restart issues */}
        <ReactHlsPlayer
          key={videoKey} // CRITICAL: Force remount on every video change
          playerRef={videoRef}
          src={videoSrc}
          autoPlay={shouldAutoPlay}
            controls={false}
          muted={forceMuted || isMuted}
          loop={false}
          playsInline={true}
          style={videoStyle}
            onEnded={handleVideoEnd}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              const video = videoRef.current;
              
              setDuration(video.duration || 0);
              setIsLoading(false);
              
              // CRITICAL: Ensure audio/video sync on new video load
              try {
                // Reset to beginning and ensure sync
                video.currentTime = 0;
                setCurrentTime(0);
                
                // Ensure audio is enabled by default (unless user has muted or video is force muted)
                video.muted = forceMuted || isMuted;
                
                // Set volume to full if not muted and not force muted
                if (!forceMuted && !isMuted) {
                  video.volume = 1.0;
                }
              } catch (error) {
                console.error("Error establishing audio/video sync on load:", error);
              }
            }
          }}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => {
            setIsPlaying(true);
            
            // Report view if needed
            if (!reportedViewRef.current) {
              const currentVideo = videos[currentIndex];
              if (currentVideo && currentVideo.video_id) {
                incrementVideoView(currentVideo.video_id)
                  .then(() => {
                    // Update local view count to reflect the increment
                    setViews(prev => prev + 1);
                  })
                  .catch(err => 
                    console.error("Failed to increment view count:", err)
                  );
                reportedViewRef.current = true;
              }
            }
            
            // Validate audio/video sync on play
            if (videoRef.current) {
              const video = videoRef.current;
              
              // Ensure audio is enabled when video starts playing (unless force muted)
              if (!forceMuted && !isMuted && video.muted) {
                video.muted = false;
                video.volume = 1.0;
              }
            }
          }}
          onPause={() => {
            setIsPlaying(false);
          }}
          onSeeked={() => {
            // Handle seek completion for better audio/video sync
            if (videoRef.current) {
              const video = videoRef.current;
              setCurrentTime(video.currentTime);
              
              // Validate audio/video sync after seek
              setTimeout(() => {
                if (video && Math.abs(video.currentTime - currentTime) > 0.5) {
                  setCurrentTime(video.currentTime);
                }
              }, 100);
            }
          }}
          onWaiting={() => {
            // Video buffering - maintaining audio sync
          }}
          onCanPlay={() => {
            // Video can play - audio/video ready
          }}
          onError={handleVideoError}
          onClick={(e) => {
            // Completely prevent ReactHlsPlayer's default click behavior
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            // Don't handle any click events on the video element itself
            return false;
          }}
          hlsConfig={hlsConfig}
        />

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

          {/* Enhanced click overlay for reliable play/pause detection */}
            <Box
            onClick={handleVideoContainerClick}
            onMouseDown={(e) => {
              // Prevent interference with other mouse handlers
              e.stopPropagation();
            }}
              sx={{
                position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 5, // Above video but below controls
              backgroundColor: 'transparent',
              cursor: 'pointer',
              pointerEvents: 'auto',
              // Remove the problematic CSS pseudo-elements that don't work
            }}
          />

                {/* Right-side button stack with glassy background */}
            <Box
              data-right-buttons
              sx={{
                position: 'absolute',
              right: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              gap: isMobile ? 1 : isTablet ? 1.5 : 2,
                zIndex: 15,
              opacity: showControls ? 1 : 0.7,
              transition: 'all 300ms ease-in-out',
              // Glassy background effect
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(8px)',
              borderRadius: '50px', // Capsule shape - large radius for rounded ends
              padding: isMobile ? '12px 8px' : '10px 6px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.15)',
                transform: 'translateY(-50%) scale(1.02)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
              },
            }}
          >
            {/* Navigation arrows and action buttons */}
            {videos.length > 1 && (
              <>
              {/* Up Arrow */}
                <IconButton
                onClick={(e) => {
                  handleUserInteraction(e);
                  handlePrevVideo();
                }}
                  sx={{
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  width: 48,
                  height: 48,
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                    '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.9)',
                    border: '2px solid rgba(255, 255, 255, 0.4)',
                    transform: 'scale(1.1)',
                    },
                  transition: 'all 0.2s ease',
                  }}
                >
                  <ArrowUpward />
                </IconButton>
              </>
            )}

            {/* Action buttons in between arrows */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: isMobile ? 0.5 : isTablet ? 0.8 : 1, // Reduced spacing between action buttons
                my: videos.length > 1 ? 1 : 0, // Margin only if navigation arrows exist
              }}
            >
              {/* Like */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.2, // Reduced gap between icon and label
                }}
              >
                <IconButton
                  onClick={(e) => {
                    handleUserInteraction(e);
                    handleLike();
                  }}
                  sx={{
                    color: isLiked ? '#00ff00' : 'white',
                    width: isMobile ? 28 : isTablet ? 32 : 40,
                    height: isMobile ? 28 : isTablet ? 32 : 40,
                    '&:hover': {
                      transform: 'scale(1.05)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <ThumbUp fontSize={isMobile ? 'small' : 'medium'} /> {/* Increased icon size */}
                </IconButton>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: isMobile ? '10px' : '13px',
                    textAlign: 'center',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                  }}
                >
                  Like
                </Typography>
            </Box>

              {/* Dislike */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.2, // Reduced gap between icon and label
                }}
              >
                <IconButton
                  onClick={async (e) => {
                    handleUserInteraction(e);
                    if (!currentUser) {
                      setSnackbarMessage("Please log in to dislike videos");
                      setShowSnackbar(true);
                      return;
                    }
                    try {
                      await incrementVideoDislike(currentVideo.video_id);
                      setIsDisliked(!isDisliked);
                      setDislikes(prev => isDisliked ? prev - 1 : prev + 1);
                      if (isLiked) {
                        setIsLiked(false);
                        setLikes(prev => prev - 1);
                      }
                    } catch (error) {
                      console.error("Error disliking video:", error);
                    }
                  }}
                sx={{
                    color: isDisliked ? '#ff0000' : 'white',
                    width: isMobile ? 32 : isTablet ? 36 : 48,
                    height: isMobile ? 32 : isTablet ? 36 : 48,
                    '&:hover': {
                      transform: 'scale(1.05)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <ThumbDown fontSize={isMobile ? 'small' : 'medium'} /> {/* Increased icon size */}
                </IconButton>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: isMobile ? '10px' : '13px',
                    textAlign: 'center',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                  }}
                >
                  Dislike
                </Typography>
              </Box>

              {/* Share */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.2, // Reduced gap between icon and label
                }}
              >
                  <IconButton
                  onClick={(e) => {
                    handleUserInteraction(e);
                    handleShare();
                  }}
                    sx={{
                      color: 'white',
                    width: isMobile ? 32 : isTablet ? 36 : 48,
                    height: isMobile ? 32 : isTablet ? 36 : 48,
                    '&:hover': {
                      transform: 'scale(1.05)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Share fontSize={isMobile ? 'small' : 'medium'} /> {/* Increased icon size */}
                  </IconButton>
                <Typography
                  variant="caption"
                    sx={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: isMobile ? '10px' : '13px',
                    textAlign: 'center',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                  }}
                >
                  Share
                </Typography>
                </Box>

              {/* Save */}
              <Box
                      sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.2, // Reduced gap between icon and label
                }}
              >
                    <IconButton
                  onClick={(e) => {
                    handleUserInteraction(e);
                    handleSave();
                  }}
                      sx={{
                    color: isSaved ? '#ffeb3b' : 'white',
                    width: isMobile ? 32 : isTablet ? 36 : 48,
                    height: isMobile ? 32 : isTablet ? 36 : 48,
                    '&:hover': {
                      transform: 'scale(1.05)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isSaved ? <Bookmark fontSize={isMobile ? 'small' : 'medium'} /> : <BookmarkBorder fontSize={isMobile ? 'medium' : 'large'} />} {/* Increased icon size */}
                    </IconButton>
                <Typography
                  variant="caption"
                      sx={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: isMobile ? '10px' : '13px',
                    textAlign: 'center',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                  }}
                >
                  Save
                </Typography>
              </Box>
            </Box>

            {/* Down Arrow */}
            {videos.length > 1 && (
                    <IconButton
              onClick={(e) => {
                handleUserInteraction(e);
                handleNextVideo();
              }}
                      sx={{
                bgcolor: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                width: 48,
                height: 48,
                border: '2px solid rgba(255, 255, 255, 0.2)',
                  '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.9)',
                  border: '2px solid rgba(255, 255, 255, 0.4)',
                  transform: 'scale(1.1)',
                  },
                transition: 'all 0.2s ease',
                }}
              >
                <ArrowDownward />
                    </IconButton>
            )}
                  </Box>

          {/* User Info Section - Bottom Left */}
          <Slide direction="up" in={showControls} timeout={300}>
            <Box
              data-user-info
              sx={{
                position: 'absolute',
                bottom: 90, // Above the bottom controls
                left: 16,
                right: isMobile ? 80 : 120, // Leave space for action buttons
                zIndex: 12,
                // background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.4) 70%, transparent)',
                // borderRadius: '12px',
                padding: isMobile ? '12px' : '16px',
                // backdropFilter: 'blur(8px)',
              }}
            >
              {/* User Icon + Username */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Avatar
                  src={currentVideo?.profile_picture}
                  alt={currentVideo?.username}
                  sx={{ 
                    width: isMobile ? 32 : 40, 
                    height: isMobile ? 32 : 40, 
                    mr: 1.5 
                  }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                    <Typography
                    variant="body1"
                    sx={{
                      color: 'white',
                      fontFamily: 'Roboto',
                      fontSize: isMobile ? '14px' : '18px',
                      fontWeight: '600',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                    }}
                  >
                    {currentVideo?.username}
                    </Typography>
                  
                  {/* Follow button - only show if not own video */}
                  {currentUser && currentVideo?.user_id && currentUser.user_id !== currentVideo.user_id && (
                  <Button
                      onClick={(e) => {
                        handleUserInteraction(e);
                        handleFollow();
                      }}
                    disabled={followLoading}
                      size="small"
                      variant={isFollowing ? "outlined" : "contained"}
                    sx={{
                      minWidth: 'auto',
                        px: 1.5,
                        py: 0.5,
                        fontSize: '11px',
                        fontWeight: '600',
                        borderRadius: '16px',
                        textTransform: 'none',
                        border: '1px solid',
                        transition: 'all 0.2s ease-in-out',
                        ...(isFollowing ? {
                          color: 'white',
                          borderColor: 'rgba(255, 255, 255, 0.6)',
                          bgcolor: 'transparent',
                          '&:hover': {
                            borderColor: 'rgba(255, 255, 255, 0.9)',
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                            transform: 'scale(1.05)',
                          },
                        } : {
                          bgcolor: 'transparent',
                          color: 'white',
                          borderColor: 'white',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.9)',
                            color: 'black',
                            transform: 'scale(1.05)',
                          },
                        }),
                    }}
                  >
                    {followLoading ? (
                        <CircularProgress size={12} color="inherit" />
                      ) : (
                        <>
                          {isFollowing ? (
                            <>
                              <Check sx={{ fontSize: 14, mr: 0.5 }} />
                              Following
                            </>
                          ) : (
                            <>
                              <PersonAdd sx={{ fontSize: 14, mr: 0.5 }} />
                              Follow
                            </>
                          )}
                        </>
                    )}
                  </Button>
                )}
                </Box>
              </Box>

              {/* Video Title */}
              <Typography
                variant="h6"
                sx={{
                color: 'white',
                  fontFamily: 'Roboto',
                  fontSize: isMobile ? '16px' : '18px',
                  fontWeight: '500',
                  lineHeight: 1.3,
                  mb: 1,
                  textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                }}
              >
                {currentVideo?.title || 'Episode 23'}
                  </Typography>

              {/* Video Description */}
              {currentVideo?.description && (
                <Box sx={{ mb: 1 }} data-description-container>
                  <Typography
                    variant="body2"
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    sx={{
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontFamily: 'Roboto',
                      fontSize: isMobile ? '13px' : '14px',
                      lineHeight: 1.4,
                      cursor: 'pointer',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                      maxWidth: '200px',
                      ...(isDescriptionExpanded ? {
                        whiteSpace: 'normal',
                        overflow: 'visible',
                      } : {
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }),
                      '&:hover': {
                        color: 'white',
                      },
                      transition: 'color 0.2s ease',
                    }}
                  >
                    {isDescriptionExpanded 
                      ? currentVideo.description 
                      : currentVideo.description
                    }
                    {!isDescriptionExpanded && currentVideo.description.length > 50 && (
                      <span style={{ color: 'rgba(255, 255, 255, 0.7)', marginLeft: '4px' }}>
                        ...more
                      </span>
                    )}
                  </Typography>
                  
                  {/* View Count & Like Count - Only show when expanded */}
                  {isDescriptionExpanded && (
                    <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Visibility 
                          sx={{ 
                            fontSize: isMobile ? '16px' : '18px', 
                            color: 'white' 
                          }} 
                        />
                        <Typography
                          variant="body1"
                          sx={{
                            color: 'white',
                            fontFamily: 'Roboto',
                            fontSize: isMobile ? '14px' : '16px',
                            fontWeight: 'bold',
                            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                          }}
                        >
                          {formatViewCount(views)} Views
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ThumbUp 
                          sx={{ 
                            fontSize: isMobile ? '16px' : '18px', 
                            color: isLiked ? '#00ff00' : 'white' 
                          }} 
                        />
                        <Typography
                          variant="body1"
                          sx={{
                            color: 'white',
                            fontFamily: 'Roboto',
                            fontSize: isMobile ? '14px' : '16px',
                            fontWeight: 'bold',
                            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                          }}
                        >
                          {formatViewCount(likes)} Likes
                  </Typography>
                </Box>
              </Box>
                  )}
            </Box>
              )}
        </Box>
          </Slide>

          {/* Bottom controls overlay - YouTube style */}
          <Slide direction="up" in={showControls} timeout={300}>
          <Box
            sx={{
              position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.6) 70%, transparent)',
                padding: '16px',
                zIndex: 10,
                transition: 'opacity 0.3s ease',
                opacity: showControls ? 1 : 0,
              }}
            >
              {/* Progress bar */}
              <Box
                sx={{
                  width: '100%',
                  height: '6px',
                  bgcolor: 'rgba(255,255,255,0.3)',
                  borderRadius: '3px',
                  mb: 2,
                  position: 'relative',
                  cursor: 'pointer',
                  '&:hover': {
                    height: '8px',
                  },
                  transition: 'height 0.2s ease',
                }}
                onClick={(e) => {
                  // Reset control visibility timer on progress bar interaction
                  handleUserInteraction(e);
                  
                  if (!videoRef.current || !duration) return;
                  
                  const video = videoRef.current;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const newTime = (clickX / rect.width) * duration;
                  
                  // CRITICAL: Proper HLS seek to prevent duplicate audio streams
                  try {
                    const wasPlaying = !video.paused;
                    
                    // Step 1: Pause video immediately to stop current audio stream
                    video.pause();
                    setIsPlaying(false);
                    
                    // Step 2: Force buffer flush for HLS streams by briefly loading
                    // This ensures old audio buffers are cleared
                    const originalTime = video.currentTime;
                    
                    // Step 3: Set new time (this may not immediately take effect for HLS)
                    video.currentTime = newTime;
                    
                    // Step 4: Wait for seek to complete and buffers to flush
                    const handleSeeked = () => {
                      // Remove the event listener to avoid memory leaks
                      video.removeEventListener('seeked', handleSeeked);
                      
                      // Step 5: Resume playback if it was playing before
                      if (wasPlaying) {
                        video.play().then(() => {
                          setIsPlaying(true);
                        }).catch(error => {
                          console.error("Error resuming video after seek:", error);
                          setIsPlaying(false);
                        });
                      }
                      
                      // Update current time state
                      setCurrentTime(video.currentTime);
                    };
                    
                    // Step 6: Listen for seek completion
                    video.addEventListener('seeked', handleSeeked);
                    
                    // Fallback: If seeked event doesn't fire within reasonable time
                    setTimeout(() => {
                      if (video.currentTime !== newTime) {
                        video.currentTime = newTime;
                      }
                      
                      // Ensure we clean up if seeked event didn't fire
                      video.removeEventListener('seeked', handleSeeked);
                      
                      if (wasPlaying && video.paused) {
                        video.play().then(() => {
                          setIsPlaying(true);
                        }).catch(error => {
                          console.error("Error in fallback resume:", error);
                          setIsPlaying(false);
                        });
                      }
                      
                      setCurrentTime(video.currentTime);
                    }, 200); // 200ms fallback timeout
                    
                  } catch (error) {
                    console.error("Error during video seek:", error);
                    // Ensure we restore playing state on error
                    if (video && !video.paused) {
                      setIsPlaying(true);
                    }
                  }
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${(currentTime / duration) * 100}%`,
                    bgcolor: '#bdfa03',
                    borderRadius: '3px',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      right: '-6px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '12px',
                      height: '12px',
                      bgcolor: '#bdfa03',
                      borderRadius: '50%',
                      opacity: 0,
                      transition: 'opacity 0.2s ease',
                    },
                    '&:hover::after': {
                      opacity: 1,
                    }
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
                {/* Left controls */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton
                    onClick={(e) => {
                      handleUserInteraction(e);
                      togglePlayPause();
                    }}
                    sx={{
                      color: 'white',
                      p: 1,
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
                    {isPlaying ? <Pause fontSize="large" /> : <PlayArrow fontSize="large" />}
                  </IconButton>

                  <IconButton
                    onClick={(e) => {
                      handleUserInteraction(e);
                      toggleMute();
                    }}
            sx={{
              color: 'white',
                      p: 1,
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
                    {isMuted ? <VolumeOff /> : <VolumeUp />}
                  </IconButton>

                  {/* Time display */}
                  <Typography
                    variant="body2"
                      sx={{
                        color: 'white',
                      fontFamily: 'Roboto',
                      fontSize: '16px',
                      ml: 1
                      }}
                    >
                    {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')} / {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
            </Typography>
          </Box>

                {/* Right controls */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton
                    onClick={(e) => {
                      handleUserInteraction(e);
                      toggleFullscreen();
                    }}
                      sx={{
                        color: 'white',
                      p: 1,
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                      },
                      }}
                    >
                    {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
                    </IconButton>
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
              </Box>
  );
};

export default VideoPlayer;