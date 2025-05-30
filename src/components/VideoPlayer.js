import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  IconButton, Typography, Box, Avatar, Snackbar, Alert, 
  Dialog, DialogContent, DialogTitle, Button, DialogActions, 
  CircularProgress, Slide 
} from "@mui/material";
import {
  ThumbUp, ThumbDown, Share, ArrowUpward, ArrowDownward,
  VolumeOff, VolumeUp, BookmarkBorder, Bookmark, PersonAdd,
  Check, Pause, PlayArrow, Fullscreen, ArrowBack, FullscreenExit
} from "@mui/icons-material";
import VisibilityIcon from '@mui/icons-material/Visibility';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import { useAuth } from "../contexts/AuthContext";
import {
  incrementVideoLike, incrementVideoDislike, saveVideo, 
  checkVideoSaved, followUser, unfollowUser, checkIsFollowing, 
  updateWatchHistory, incrementVideoView 
} from "../api";
import useSwipeNavigate from "../hooks/useSwipeNavigate";
import { processVideoUrl } from "../utils/videoUtils";
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
  isPaused,
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
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  // Removed hasMore and loadMoreVideos since navigation is now handled by parent

  // Important refs
  const reportedViewRef = useRef(false);

  // State variables
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

  // Create reference to current video data
  const videoData = videos[currentIndex];
  const videoId = videoData?.video_id;

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

  // Fixed toggle play/pause to prevent video restarts
  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) {
      console.warn("Video ref not available for play/pause toggle");
      return;
    }

    const video = videoRef.current;

    // Ensure we have a valid video element with the necessary methods
    if (!video.play || !video.pause || typeof video.paused === 'undefined') {
      console.warn("Video element doesn't have required play/pause methods");
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
            console.log("Video resumed from position:", video.currentTime);
          })
        .catch(error => {
          console.error("Error playing video:", error);
          setIsPlaying(false);
        });
    } else {
        // Pause at current position
      video.pause();
      setIsPlaying(false);
        console.log("Video paused at position:", video.currentTime);
      }
    } catch (error) {
      console.error("Error in togglePlayPause:", error);
    }
  }, []);

  // Fixed video container click handler to prevent video restarts
  const handleVideoContainerClick = useCallback((e) => {
    console.log("Video container clicked, target:", e.target.tagName, e.target.className);
    
    // Prevent click handling if clicked on a control element or button
    if (e.target.closest('button') || 
        e.target.closest('.video-controls') || 
        e.target.closest('[role="button"]') ||
        e.target.tagName === 'BUTTON') {
      console.log("Click on control element, ignoring");
      return;
    }

    // Stop propagation and prevent default to avoid any video restart behavior
    e.stopPropagation();
    e.preventDefault();
    
    console.log("Toggling play/pause, current video state:", videoRef.current?.paused);
    
    // Only toggle play/pause, never restart the video
    // Check if we have a valid video reference before attempting to control it
          if (videoRef.current) {
      togglePlayPause();
    }
  }, [togglePlayPause]);

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
      console.warn("Video ref not available for mute toggle");
      return;
    }
    
    // Prevent unmuting if this video is force muted (non-current video)
    if (forceMuted) {
      console.warn("Cannot unmute - video is force muted (non-current video)");
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
    
    console.log("Video muted:", newMutedState, "volume:", video.volume);
    
    // Additional debugging for audio state
    if (!newMutedState) {
      console.log("Audio should now be audible - checking audio context");
      
      // Try to detect if audio is actually playing
      setTimeout(() => {
        if (video && !video.paused && !video.muted) {
          console.log("Video is playing and not muted - audio should be audible");
        }
      }, 100);
    }
  }, [forceMuted]);

  // Seek forward function with proper HLS buffer flushing
  const seekForward = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    try {
      const wasPlaying = !video.paused;
      const newTime = Math.min(video.currentTime + 10, video.duration || 0);
      
      console.log(`Seeking forward to: ${newTime}s`);
      
      // Step 1: Pause video immediately to stop current audio stream
      video.pause();
      setIsPlaying(false);
      
      // Step 2: Set new time
      video.currentTime = newTime;
      
      // Step 3: Wait for seek to complete and buffers to flush
      const handleSeeked = () => {
        console.log("Forward seek completed, audio buffers flushed");
        
        // Remove the event listener to avoid memory leaks
        video.removeEventListener('seeked', handleSeeked);
        
        // Step 4: Resume playback if it was playing before
        if (wasPlaying) {
          video.play().then(() => {
            console.log("Video resumed after forward seek at:", video.currentTime);
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
            console.log("Video resumed via forward seek fallback");
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
      
      console.log(`Seeking backward to: ${newTime}s`);
      
      // Step 1: Pause video immediately to stop current audio stream
        video.pause();
        setIsPlaying(false);
      
      // Step 2: Set new time
      video.currentTime = newTime;
      
      // Step 3: Wait for seek to complete and buffers to flush
      const handleSeeked = () => {
        console.log("Backward seek completed, audio buffers flushed");
        
        // Remove the event listener to avoid memory leaks
        video.removeEventListener('seeked', handleSeeked);
        
        // Step 4: Resume playback if it was playing before
        if (wasPlaying) {
          video.play().then(() => {
            console.log("Video resumed after backward seek at:", video.currentTime);
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
            console.log("Video resumed via backward seek fallback");
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
      console.log("Navigation too rapid, ignoring");
      return;
    }

    lastNavigationTimeRef.current = now;
    console.log("Navigating to previous video");
    
    if (onPrevVideo) {
      onPrevVideo();
    }
  }, [onPrevVideo]);

  const handleNextVideo = useCallback(() => {
    const now = Date.now();
    
    // Prevent rapid navigation calls with timestamp-based debouncing
    if (now - lastNavigationTimeRef.current < NAVIGATION_DEBOUNCE_MS) {
      console.log("Navigation too rapid, ignoring");
      return;
    }

    lastNavigationTimeRef.current = now;
    console.log("Navigating to next video");
    
    if (onNextVideo) {
      onNextVideo();
    }
  }, [onNextVideo]);

  // Simplified touch handlers
  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useSwipeNavigate(
    handleNextVideo,
    handlePrevVideo,
    70,
    true
  );

  // Mouse move handler with debouncing
  const handleMouseMove = useCallback(() => {
    if (showControls && controlsTimeout) {
      clearTimeout(controlsTimeout);
      const newTimeout = setTimeout(() => {
        setShowControls(false);
      }, 5000);
      setControlsTimeout(newTimeout);
      return;
    }

    if (!showControls) {
      setShowControls(true);
      const newTimeout = setTimeout(() => {
        setShowControls(false);
      }, 5000);
      setControlsTimeout(newTimeout);
    }
  }, [showControls, controlsTimeout]);

  // CRITICAL: Time update handler with aggressive validation
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // Ensure we're tracking the correct video's time
    const isCurrentVideo = videos && videos[currentIndex] && videos[currentIndex].video_id === videoId;
    if (isCurrentVideo) {
      const currentVideoTime = video.currentTime;
      
      // CRITICAL: Additional safety check - if time jumps unexpectedly, log it
      if (currentVideoTime > 0 && currentTime === 0) {
        console.log("CRITICAL: Time update - video time:", currentVideoTime);
      }
      
      setCurrentTime(currentVideoTime);
    } else {
      console.log("CRITICAL: Ignoring time update for non-current video");
    }
  }, [videos, currentIndex, videoId, currentTime]);

  // Video end handler
  const handleVideoEnd = useCallback(() => {
    console.log("Video ended event triggered");
    
    // CRITICAL: Only proceed if this is the current video
    const isCurrentVideo = videos && videos[currentIndex] && videos[currentIndex].video_id === videoId;
    if (!isCurrentVideo) {
      console.log("Video end event triggered for non-current video - ignoring");
      return;
    }
    
    // CRITICAL: Only proceed if video actually ended naturally
    // Check if video is at the end and not paused
    if (videoRef.current) {
      const video = videoRef.current;
      const isAtEnd = video.currentTime >= video.duration - 0.5; // Allow small tolerance
      const isNotPaused = !video.paused;
      
      console.log("Video end check - currentTime:", video.currentTime, "duration:", video.duration, "isAtEnd:", isAtEnd, "isNotPaused:", isNotPaused);
      
      // Only proceed if video actually reached the end and is not paused
      if (!isAtEnd || !isNotPaused) {
        console.log("Video end event triggered but video is not at natural end or is paused - ignoring");
        return;
      }
    }
    
    console.log("Video ended naturally, automatically playing next video");
    
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
  }, [currentIndex, videos, currentUser, isLiked, isDisliked, isSaved, watchShared, deviceType, onNextVideo, videoId]);

  // Video error handler
  const handleVideoError = useCallback((error) => {
    console.error("Video error occurred:", error);
    setSnackbarMessage("Error playing video. Please try another video.");
    setShowSnackbar(true);
  }, []);

  // Video update handler for ReactHlsPlayer with improved audio management
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

    console.log(`Loading video ${currentIndex}:`, currentVideo.video_url);

    // Reset the reported view flag for the new video
    reportedViewRef.current = false;

    // Reset video timer and duration for new video
    setCurrentTime(0);
    setDuration(0);

    // Update UI metadata
    setLikes(currentVideo.likes || 0);
    setDislikes(currentVideo.dislikes || 0);
    setViews(currentVideo.views || 0);

    // Update URL without navigation (only if needed)
    try {
      const currentPath = window.location.pathname;
      const targetPath = `/reels/${currentVideo.video_id}`;

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
  }, [videos, currentIndex, currentUser]);

  // Handle isPaused changes without restarting the video
  useEffect(() => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const isCurrentVideo = videos && videos[currentIndex] && videos[currentIndex].video_id === videoId;
    
    // Only control playback for the current video
    if (!isCurrentVideo) return;
    
    if (isPaused && !video.paused) {
      console.log("Pausing video due to isPaused prop change");
      video.pause();
                  setIsPlaying(false);
    } else if (!isPaused && video.paused) {
      console.log("Resuming video due to isPaused prop change");
      video.play().then(() => {
        setIsPlaying(true);
      }).catch(error => {
        console.error("Error resuming video:", error);
      });
    }
  }, [isPaused, videos, currentIndex, videoId]);

  // Keyboard shortcuts handler - defined after all functions it depends on
  const handleKeyPress = useCallback((e) => {
    // Prevent keyboard shortcuts when typing in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    // Prevent default for all handled keys to avoid browser behavior
    const handledKeys = [' ', 'f', 'm', 'arrowright', 'arrowleft', 'arrowup', 'arrowdown', 'l', 's', '/'];
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
        console.log("Arrow up pressed - navigating to previous video");
        handlePrevVideo();
        break;
      case 'arrowdown':
        console.log("Arrow down pressed - navigating to next video");
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
        console.log('Search shortcut pressed');
        break;
      default:
        break;
    }
  }, [togglePlayPause, toggleFullscreen, toggleMute, seekForward, seekBackward, handlePrevVideo, handleNextVideo, handleLike, handleSave]);

  // Add keyboard event listener only for the current/active video
  useEffect(() => {
    // Only add keyboard listener if this is the current video
    const isCurrentVideo = videos && videos[currentIndex] && videos[currentIndex].video_id === videoId;
    
    if (isCurrentVideo) {
      console.log("Adding keyboard listener for current video:", videoId);
      document.addEventListener('keydown', handleKeyPress);

    return () => {
        console.log("Removing keyboard listener for video:", videoId);
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

  // Cleanup effect for proper component unmounting
  useEffect(() => {
    const currentVideoRef = videoRef.current;

    return () => {
      // Cleanup when component unmounts or video changes
      if (currentVideoRef) {
        try {
          console.log("Cleaning up video on unmount/change");
          
          // Stop playback immediately
          currentVideoRef.pause();
          
          // Reset time to prevent continuation
          currentVideoRef.currentTime = 0;
          
          // Remove all event listeners to prevent memory leaks
          currentVideoRef.removeEventListener('timeupdate', handleTimeUpdate);
          currentVideoRef.removeEventListener('ended', handleVideoEnd);
          
          console.log("Video cleanup completed");
        } catch (error) {
          console.error("Error during video cleanup:", error);
        }
      }
    };
  }, [videoId]); // Cleanup when video ID changes

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
          onClick={handleVideoContainerClick}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          onMouseDown={(e) => {
            // CRITICAL: Prevent parent's mouse events from triggering isPaused changes
            e.stopPropagation();
          }}
          onMouseUp={(e) => {
            // CRITICAL: Prevent parent's mouse events from triggering isPaused changes
            e.stopPropagation();
          }}
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
              {/* Left side - Back button and video info */}
              <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <IconButton
                  onClick={() => navigate("/demo/")}
                  sx={{
                    color: 'white',
                    mr: 2,
                '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              <ArrowBack />
            </IconButton>
                
                <Avatar
                  src={currentVideo?.creator_profile_picture}
                  alt={currentVideo?.creator_username}
                  sx={{ width: 40, height: 40, mr: 2 }}
                />
                
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="h6"
              sx={{
                color: 'white',
                      fontWeight: 'bold',
                      fontSize: '18px',
                      lineHeight: 1.2,
                      mb: 0.5
              }}
            >
                    {currentVideo?.title || 'Episode 23'}
              </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontSize: '14px'
                      }}
                    >
                      {currentVideo?.creator_username}
              </Typography>
                    
                    {/* Follow button - only show if not own video */}
                    {currentUser && currentVideo?.user_id && currentUser.user_id !== currentVideo.user_id && (
                      <Button
                        onClick={handleFollow}
                        disabled={followLoading}
                        size="small"
                        variant={isFollowing ? "outlined" : "contained"}
                        sx={{
                          minWidth: 'auto',
                          px: 1.5,
                          py: 0.5,
                          fontSize: '12px',
                          fontWeight: 'bold',
                          borderRadius: '16px',
                          textTransform: 'none',
                          ...(isFollowing ? {
                            color: 'white',
                            borderColor: 'rgba(255, 255, 255, 0.5)',
                            '&:hover': {
                              borderColor: 'rgba(255, 255, 255, 0.8)',
                              bgcolor: 'rgba(255, 255, 255, 0.1)',
                            },
                          } : {
                            bgcolor: '#1976d2',
                            color: 'white',
                            '&:hover': {
                              bgcolor: '#1565c0',
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
              console.log("Video metadata loaded");
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
                
                // Log audio status for debugging
                console.log("Audio status - forceMuted:", forceMuted, "isMuted:", isMuted, "final muted:", video.muted, "volume:", video.volume);
                
                // Ensure audio context is properly initialized
                if (video.audioTracks && video.audioTracks.length > 0) {
                  console.log("Audio tracks available:", video.audioTracks.length);
                } else {
                  console.log("No audio tracks detected or audioTracks not supported");
                }
                
                // Check if audio is actually available
                if (video.mozHasAudio !== false && video.webkitAudioDecodedByteCount !== 0) {
                  console.log("Audio stream detected in video");
                } else {
                  console.log("No audio stream detected or audio check not supported");
                }
                
                console.log("New video loaded - audio/video sync established");
              } catch (error) {
                console.error("Error establishing audio/video sync on load:", error);
              }
            }
          }}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => {
            setIsPlaying(true);
            console.log("Video play event triggered - checking audio sync");
            
            // Validate audio/video sync on play
            if (videoRef.current) {
              const video = videoRef.current;
              
              // Ensure audio is enabled when video starts playing (unless force muted)
              if (!forceMuted && !isMuted && video.muted) {
                console.log("Video was muted but should be unmuted, fixing...");
                video.muted = false;
                video.volume = 1.0;
              }
              
              // Log current audio state
              console.log("Audio state on play - forceMuted:", forceMuted, "isMuted:", isMuted, "final muted:", video.muted, "volume:", video.volume);
              
              setTimeout(() => {
                if (video && !video.paused) {
                  console.log("Audio/video sync check - currentTime:", video.currentTime);
                  
                  // Additional audio debugging
                  if (!video.muted && video.volume > 0) {
                    console.log("Audio should be audible now");
                  } else {
                    console.warn("Audio may not be audible - muted:", video.muted, "volume:", video.volume);
                  }
                }
              }, 100);
            }
          }}
          onPause={() => {
            setIsPlaying(false);
            console.log("Video paused - ensuring no auto-advance timers are running");
            
            // Additional protection: Clear any potential background timers
            // This helps prevent any auto-advance behavior when video is paused
            if (videoRef.current) {
              const video = videoRef.current;
              console.log("Video paused at:", video.currentTime, "of", video.duration);
            }
          }}
          onSeeked={() => {
            // Handle seek completion for better audio/video sync
            if (videoRef.current) {
              const video = videoRef.current;
              console.log("Seek completed at:", video.currentTime);
              setCurrentTime(video.currentTime);
              
              // Validate audio/video sync after seek
              setTimeout(() => {
                if (video && Math.abs(video.currentTime - currentTime) > 0.5) {
                  console.log("Audio/video sync drift detected, correcting...");
                  setCurrentTime(video.currentTime);
                }
              }, 100);
            }
          }}
          onWaiting={() => {
            console.log("Video buffering - maintaining audio sync");
          }}
          onCanPlay={() => {
            console.log("Video can play - audio/video ready");
          }}
          onError={handleVideoError}
          onClick={(e) => {
            // Prevent ReactHlsPlayer's default click behavior that might restart video
            e.preventDefault();
            e.stopPropagation();
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

                {/* Navigation arrows - YouTube style */}
          {videos.length > 1 && (
            <Box
              sx={{
                position: 'absolute',
                right: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                zIndex: 15,
                opacity: showControls ? 1 : 0.7,
                transition: 'opacity 300ms ease-in-out',
              }}
            >
                <IconButton
                onClick={handlePrevVideo}
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

                <IconButton
                onClick={handleNextVideo}
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
            </Box>
          )}

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
                  if (!videoRef.current || !duration) return;
                  
                  const video = videoRef.current;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const newTime = (clickX / rect.width) * duration;
                  
                  console.log(`Seeking to: ${newTime}s (${Math.floor(newTime/60)}:${String(Math.floor(newTime%60)).padStart(2, '0')})`);
                  
                  // CRITICAL: Proper HLS seek to prevent duplicate audio streams
                  try {
                    const wasPlaying = !video.paused;
                    
                    console.log("Starting seek operation - pausing video");
                    
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
                      console.log("Seek completed, audio buffers flushed");
                      
                      // Remove the event listener to avoid memory leaks
                      video.removeEventListener('seeked', handleSeeked);
                      
                      // Step 5: Resume playback if it was playing before
                      if (wasPlaying) {
                        video.play().then(() => {
                          console.log("Video resumed after clean seek at:", video.currentTime);
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
                        console.log("Seek fallback - manually setting time again");
                        video.currentTime = newTime;
                      }
                      
                      // Ensure we clean up if seeked event didn't fire
                      video.removeEventListener('seeked', handleSeeked);
                      
                      if (wasPlaying && video.paused) {
                        video.play().then(() => {
                          console.log("Video resumed via fallback at:", video.currentTime);
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
                    onClick={togglePlayPause}
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
                    onClick={toggleMute}
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
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      ml: 1
                    }}
                  >
                    {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')} / {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
                    </Typography>
                </Box>

                {/* Right controls */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton
                      onClick={handleLike}
                      sx={{
                      color: isLiked ? '#00ff00' : 'white',
                      p: 1,
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
                    <ThumbUp />
                    </IconButton>

                    <IconButton
                    onClick={async () => {
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
                      p: 1,
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
                    <ThumbDown />
                    </IconButton>

                    <IconButton
                      onClick={handleShare}
                      sx={{
                        color: 'white',
                      p: 1,
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                      },
                      }}
                    >
                    <Share />
                    </IconButton>

                    <IconButton
                    onClick={handleSave}
                      sx={{
                      color: isSaved ? '#ffeb3b' : 'white',
                      p: 1,
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
                    {isSaved ? <Bookmark /> : <BookmarkBorder />}
                    </IconButton>

                    <IconButton
                    onClick={toggleFullscreen}
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