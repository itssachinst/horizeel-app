import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconButton, Typography, Box, Avatar, Tooltip, Snackbar, Alert, Dialog, DialogContent, DialogTitle, Button, DialogActions, CircularProgress, Slide, useTheme } from "@mui/material";
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
  ArrowBack
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { incrementVideoLike, incrementVideoDislike, saveVideo, checkVideoSaved, deleteVideo, followUser, unfollowUser, checkIsFollowing } from "../api";
import useSwipeNavigate from "../hooks/useSwipeNavigate";
import { formatViewCount, formatDuration, formatRelativeTime, truncateText } from "../utils/videoUtils";

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

const VideoPlayer = ({ videos, currentIndex, setCurrentIndex, isMobile, isTablet }) => {
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
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
  const [showDescription, setShowDescription] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [controlsTimeout, setControlsTimeout] = useState(null);
  const [lastTap, setLastTap] = useState(0);
  const [lastClick, setLastClick] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [lastClickPosition, setLastClickPosition] = useState(null);

  // Add swipe navigation handlers
  const handlePrevVideo = () => {
    if (currentIndex > 0) {
      cleanupVideo();
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNextVideo = () => {
    if (currentIndex < videos.length - 1) {
      cleanupVideo();
      setCurrentIndex(currentIndex + 1);
    }
  };

  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useSwipeNavigate(
    handleNextVideo, // on swipe up (reversed from previous config)
    handlePrevVideo, // on swipe down (reversed from previous config)
    70, // min swipe distance
    true // set to true for vertical swipe instead of horizontal
  );

  const checkSavedStatus = async (videoId) => {
    try {
      const response = await checkVideoSaved(videoId);
      setIsSaved(response.is_saved);
    } catch (error) {
      console.error("Error checking saved status:", error);
    }
  };

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
      if (event.key === "ArrowUp" && currentIndex > 0) {
        setCurrentIndex((prevIndex) => prevIndex - 1);
      } else if (event.key === "ArrowDown" && currentIndex < videos.length - 1) {
        setCurrentIndex((prevIndex) => prevIndex + 1);
      } else if (event.key === "Escape") {
        exitFullScreen();
      } else if (event.key === "F11") {
      event.preventDefault();
    } else if (event.key === " " || event.key === "k") {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
      event.preventDefault();
    } else if (event.key === "m") {
      toggleMute();
      event.preventDefault();
    } else if (event.key === "ArrowRight") {
      // Fast forward 10 seconds
      const video = videoRef.current;
      if (video) {
        video.currentTime = Math.min(video.currentTime + 10, video.duration);
        setSnackbarMessage("Fast forward 10s");
        setShowSnackbar(true);
      }
      event.preventDefault();
    } else if (event.key === "ArrowLeft") {
      // Rewind 10 seconds
      const video = videoRef.current;
      if (video) {
        video.currentTime = Math.max(video.currentTime - 10, 0);
        setSnackbarMessage("Rewind 10s");
        setShowSnackbar(true);
      }
      event.preventDefault();
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

  // Add cleanup function for video switching
  const cleanupVideo = () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
      video.src = '';
    }
  };

  // Modify handleVideoEnd to include cleanup
  const handleVideoEnd = () => {
    cleanupVideo();
    if (currentIndex < videos.length - 1) {
      setCurrentIndex((prevIndex) => prevIndex + 1);
    } else {
      // Loop back to the first video instead of exiting fullscreen
      setCurrentIndex(0);
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

  const handleShare = () => {
    try {
      if (navigator.share) {
        navigator.share({
          title: videos[currentIndex]?.title,
          text: videos[currentIndex]?.description,
          url: window.location.href,
        })
        .then(() => console.log('Successful share'))
        .catch((error) => {
          console.log('Error sharing:', error);
          copyToClipboard();
        });
      } else {
        copyToClipboard();
      }
    } catch (error) {
      console.error("Share error:", error);
      setSnackbarMessage("Could not share video");
      setShowSnackbar(true);
    }
  };

  const copyToClipboard = () => {
    try {
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          setSnackbarMessage("Link copied to clipboard!");
          setShowSnackbar(true);
        })
        .catch(() => {
          setSnackbarMessage("Failed to copy link");
          setShowSnackbar(true);
        });
    } catch (error) {
      console.error("Clipboard error:", error);
      setSnackbarMessage("Could not copy link");
      setShowSnackbar(true);
    }
  };

  const showLoginPrompt = (message) => {
    setSnackbarMessage(message || "Please log in to use this feature");
    setShowSnackbar(true);
  };
  
  const handleCloseSnackbar = () => {
    setShowSnackbar(false);
  };

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

  const truncateDescription = (text, maxLength = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleVideoClick = () => {
    const currentTime = new Date().getTime();
    const clickLength = currentTime - lastClick;
    
    // If this is a double-click, let handleDoubleClick handle it
    if (clickLength < 300 && clickLength > 0) {
      return;
    }
    
    // Single click behavior after a short delay to avoid conflicts with double click
    setTimeout(() => {
      // Only proceed if it wasn't part of a double click
      if (new Date().getTime() - lastClick > 300) {
        const video = videoRef.current;
        if (video && document.body.contains(video)) {
          if (video.paused) {
            // Use promise to handle play operation
            video.play().catch(e => console.warn("Play error:", e));
          } else {
            video.pause();
          }
        }
        
        if (!isFullScreen) {
          enterFullScreen();
        }
      }
    }, 300);
    
    setLastClick(currentTime);
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

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (video) {
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
      setIsPlaying(!video.paused);
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
      setPlaybackSpeed(newSpeed);
    }
  };

  const formatTime = (timeInSeconds) => {
    if (!timeInSeconds) return "0:00";
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleMouseMove = () => {
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    
    setShowControls(true);
    
    const newTimeout = setTimeout(() => {
      // Only hide controls if we're not at the start or end of the video
      const video = videoRef.current;
      if (video && video.currentTime > 0 && video.currentTime < video.duration) {
        setShowControls(false);
      }
    }, 5000);
    
    setControlsTimeout(newTimeout);
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

  const handleDoubleTap = (event) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    
    if (tapLength < 500 && tapLength > 0) {
      const video = videoRef.current;
      if (video) {
        const rect = video.getBoundingClientRect();
        const touch = event.changedTouches[0];
        if (!touch) return;
        
        const x = touch.clientX - rect.left;
        const width = rect.width;
        
        if (x > width * 0.7) {
          // Right side - Fast forward
          video.currentTime = Math.min(video.currentTime + 10, video.duration);
          // Show visual feedback
          setSnackbarMessage("Fast forward 10s");
          setShowSnackbar(true);
          setTimeout(() => setShowSnackbar(false), 1000);
        } else if (x < width * 0.3) {
          // Left side - Fast backward
          video.currentTime = Math.max(video.currentTime - 10, 0);
          // Show visual feedback
          setSnackbarMessage("Rewind 10s");
          setShowSnackbar(true);
          setTimeout(() => setShowSnackbar(false), 1000);
        } else {
          // Middle area - Toggle play/pause
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
        }
      }
    }
    setLastTap(currentTime);
  };

  const handleDoubleClick = (event) => {
    const currentTime = new Date().getTime();
    const clickLength = currentTime - lastClick;

    if (clickLength < 500 && clickLength > 0) {
      const video = videoRef.current;
      if (video) {
        const rect = video.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const width = rect.width;

        if (x > width * 0.7) {
          // Right side - Fast forward
          video.currentTime = Math.min(video.currentTime + 10, video.duration);
          // Show visual feedback
          setSnackbarMessage("Fast forward 10s");
          setShowSnackbar(true);
          setTimeout(() => setShowSnackbar(false), 1000);
        } else if (x < width * 0.3) {
          // Left side - Fast backward
          video.currentTime = Math.max(video.currentTime - 10, 0);
          // Show visual feedback
          setSnackbarMessage("Rewind 10s");
          setShowSnackbar(true);
          setTimeout(() => setShowSnackbar(false), 1000);
        } else {
          // Middle area - Toggle fullscreen
    if (isFullScreen) {
      exitFullScreen();
    } else {
      enterFullScreen();
          }
        }
      }
    }
    setLastClick(currentTime);
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

  const togglePlayPause = () => {
    if (!videoRef.current || !document.body.contains(videoRef.current)) return;
    
    const video = videoRef.current;
    
    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
      }).catch(error => {
        console.warn("Error playing video:", error);
        setIsPlaying(false);
      });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  // Handle video container click
  const handleVideoContainerClick = (e) => {
    // Prevent clicks on controls from triggering this
    if (e.target === videoContainerRef.current || e.target === videoRef.current) {
      togglePlayPause();
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
    if (isMobile) {
      return {
        width: '100%',
        height: 'auto',
        aspectRatio: '16/9',
        maxHeight: '100vh'
      };
    } else if (isTablet) {
      return {
        width: '100%',
        maxWidth: '100%',
        height: 'auto',
        aspectRatio: '16/9'
      };
    } else {
      return {
        width: '100%',
        maxWidth: '100%',
        height: 'auto',
        aspectRatio: '16/9'
      };
    }
  };

  const videoStyles = calculateVideoSize();

  // Navigate to home page
  const goToHomePage = () => {
    navigate("/");
  };

  // Add error handling for video loading
  const handleVideoError = (error) => {
    console.error("Video loading error:", error);
    setSnackbarMessage("Error loading video. Please try again.");
    setShowSnackbar(true);
  };

  // Add source validation
  const getVideoSource = (videoUrl) => {
    if (!videoUrl) return null;
    try {
      const url = new URL(videoUrl);
      return url.toString();
    } catch (error) {
      console.error("Invalid video URL:", error);
      return null;
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

  return (
    <Box
      ref={videoContainerRef}
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        bgcolor: '#000',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}
      onClick={handleVideoContainerClick}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      {/* Back button that appears/disappears with controls */}
      <Slide direction="down" in={showControls || !isPlaying} timeout={300}>
        <IconButton
          onClick={goToHomePage}
          sx={{
            position: 'absolute',
            top: 20,
            left: 20,
            bgcolor: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            zIndex: 1600, // Higher z-index to stay above other controls
            '&:hover': {
              bgcolor: 'rgba(0, 0, 0, 0.8)',
            },
          }}
        >
          <ArrowBack />
        </IconButton>
      </Slide>

      {/* Video Element */}
      <video
        ref={videoRef}
        src={getVideoSource(videos[currentIndex]?.video_url)}
        autoPlay
        playsInline
        onEnded={handleVideoEnd}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onVolumeChange={handleVolumeChange}
        onError={handleVideoError}
        style={{
          ...videoStyles,
          objectFit: 'contain',
          zIndex: 1,
          display: getVideoSource(videos[currentIndex]?.video_url) ? 'block' : 'none'
        }}
        muted={isMuted}
      />

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
        <>
          {/* Up Arrow - positioned below follow button */}
          {currentIndex > 0 && (
            <Box
              sx={{
                position: 'absolute',
                right: 20,
                top: { xs: 'auto', sm: '45%' }, // Below follow button on desktop, different on mobile
                display: showControls || !isPlaying ? 'flex' : 'none', // Show/hide without slide animation
                zIndex: 15,
                opacity: showControls || !isPlaying ? 1 : 0,
                transition: 'opacity 300ms ease-in-out', // Fade in/out instead of slide
              }}
            >
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
            </Box>
          )}

          {/* Down Arrow - positioned above player bar */}
          {currentIndex < videos.length - 1 && (
            <Box
              sx={{
                position: 'absolute',
                right: 20,
                bottom: 300, // Just above the player controls
                display: showControls || !isPlaying ? 'flex' : 'none', // Show/hide without slide animation
                zIndex: 15,
                opacity: showControls || !isPlaying ? 1 : 0,
                transition: 'opacity 300ms ease-in-out', // Fade in/out instead of slide
              }}
            >
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
            </Box>
          )}
        </>
      )}

      {/* Mobile-optimized video controls overlay */}
      <Slide direction="up" in={showControls || !isPlaying} timeout={300}>
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
      <Slide direction="down" in={showControls || !isPlaying} timeout={300}>
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

          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, opacity: 0.8 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                <Visibility sx={{ fontSize: 16, color: 'white', mr: 0.5 }} />
                <Typography variant="body2" sx={{ color: 'white' }}>
                  {views} views
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                <ThumbUp sx={{ fontSize: 16, color: 'white', mr: 0.5 }} />
                <Typography variant="body2" sx={{ color: 'white' }}>
                  {likes}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ThumbDown sx={{ fontSize: 16, color: 'white', mr: 0.5 }} />
                <Typography variant="body2" sx={{ color: 'white' }}>
                  {dislikes}
        </Typography>
      </Box>
            </Box>
          )}
        </Box>
      </Slide>

      {/* Mobile swiping indicators for navigation (only shown on mobile) */}
      {isMobile && videos.length > 1 && (
        <Box sx={{ 
          position: 'absolute', 
          bottom: 70, 
          left: 0, 
          right: 0, 
          display: 'flex', 
          justifyContent: 'center', 
          zIndex: 15 
        }}>
          {videos.map((_, idx) => (
            <Box 
              key={idx} 
        sx={{
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                bgcolor: idx === currentIndex ? 'primary.main' : 'rgba(255,255,255,0.5)', 
                mx: 0.5 
              }} 
            />
          ))}
        </Box>
      )}

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
