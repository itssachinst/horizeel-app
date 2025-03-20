import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconButton, Typography, Box, Avatar, Tooltip, Snackbar, Alert, Dialog, DialogContent, DialogTitle, Button, DialogActions, CircularProgress } from "@mui/material";
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
  Fullscreen
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { incrementVideoLike, incrementVideoDislike, saveVideo, checkVideoSaved, deleteVideo, followUser, unfollowUser, checkIsFollowing } from "../api";

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

const VideoPlayer = ({ videos, currentIndex, setCurrentIndex }) => {
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

  useEffect(() => {
    const video = videoRef.current;
    const videoContainer = videoContainerRef.current;
    
    // Track all the event listeners we add so we can properly clean them up
    const eventListeners = [];
    
    const addEventListenerWithCleanup = (element, event, handler, options) => {
      element.addEventListener(event, handler, options);
      eventListeners.push({ element, event, handler, options });
    };

    if (video) {
      console.log("Video source:", videos[currentIndex]?.video_url);
      
      try {
        video.play().catch(err => {
          console.warn("Autoplay failed:", err);
        });
      } catch (err) {
        console.warn("Error attempting to play video:", err);
      }
      
      if (videos[currentIndex]) {
        setLikes(videos[currentIndex].likes || 0);
        setDislikes(videos[currentIndex].dislikes || 0);
        setViews(videos[currentIndex].views || 0);
        
        if (currentUser) {
          checkSavedStatus(videos[currentIndex].video_id);
          if (videos[currentIndex].user_id) {
            checkFollowStatus(videos[currentIndex].user_id);
          }
        } else {
          setIsSaved(false);
          setIsFollowing(false);
        }
      }
      
      setIsLiked(false);
      setIsDisliked(false);

      if (!initialLoadComplete) {
        const timer = setTimeout(() => {
          enterFullScreen();
          setInitialLoadComplete(true);
        }, 500);
        return () => clearTimeout(timer);
      }

      // Add mouse wheel event listener with proper passive option
      const handleWheel = (event) => {
        // Prevent default scrolling behavior
        event.preventDefault();
        
        // Check if the video is in fullscreen
        if (!fullscreenAPI.isFullscreen()) return;
        
        // Get the scroll direction
        const delta = event.deltaY;
        
        // Add a small delay to prevent rapid scrolling
        if (Math.abs(delta) > 50) {
          if (delta > 0 && currentIndex < videos.length - 1) {
            // Scrolling down - Next video
            setCurrentIndex(currentIndex + 1);
          } else if (delta < 0 && currentIndex > 0) {
            // Scrolling up - Previous video
            setCurrentIndex(currentIndex - 1);
          }
        }
      };

      // Add all event listeners with our tracking function
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
      addEventListenerWithCleanup(video, 'touchend', handleDoubleTap);
      addEventListenerWithCleanup(video, 'dblclick', handleDoubleClick);
      addEventListenerWithCleanup(video, 'wheel', handleWheel, { passive: false });
      
      // Window and document level events
      addEventListenerWithCleanup(window, 'keydown', handleKeyDown);
      
      // Use our custom fullscreen change event
      const fullscreenChangeEvent = fullscreenAPI.fullscreenChangeEventName();
      addEventListenerWithCleanup(document, fullscreenChangeEvent, handleFullscreenChange);
      
      // Cleanup on unmount
    return () => {
        // Clear any active timeouts
        if (controlsTimeout) {
          clearTimeout(controlsTimeout);
        }
        
        // Remove all tracked event listeners
        eventListeners.forEach(({ element, event, handler, options }) => {
          element.removeEventListener(event, handler, options);
        });
      };
    }
  }, [currentIndex, setCurrentIndex, videos, initialLoadComplete, currentUser]);

  const handleVideoEnd = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex((prevIndex) => prevIndex + 1);
    } else {
      exitFullScreen();
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
    setSnackbarMessage(message);
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
    const video = videoRef.current;
    if (video) {
      if (video.paused) {
        video.play().catch(e => console.warn("Play error:", e));
    } else {
        video.pause();
      }
    }
    
    if (!isFullScreen) {
      enterFullScreen();
    }
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

  const handleVolumeChange = (event) => {
    const video = videoRef.current;
    if (video) {
      const newVolume = parseFloat(event.target.value);
      video.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
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

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    const timeout = setTimeout(() => {
      setShowControls(false);
    }, 3000);
    setControlsTimeout(timeout);
  };

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
        } else if (x < width * 0.3) {
          // Left side - Fast backward
          video.currentTime = Math.max(video.currentTime - 10, 0);
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
        } else if (x < width * 0.3) {
          // Left side - Fast backward
          video.currentTime = Math.max(video.currentTime - 10, 0);
        }
      }
    }
    setLastClick(currentTime);
  };

  const handleTouchStart = (event) => {
    setTouchStart(event.touches[0].clientY);
  };

  const handleTouchMove = (event) => {
    setTouchEnd(event.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isSwipe = Math.abs(distance) > 50; // Minimum swipe distance

    if (isSwipe) {
      if (distance > 0 && currentIndex < videos.length - 1) {
        // Swipe up - Next video
        setCurrentIndex(currentIndex + 1);
      } else if (distance < 0 && currentIndex > 0) {
        // Swipe down - Previous video
        setCurrentIndex(currentIndex - 1);
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
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
        position: "relative",
        width: "100%",
        height: "100vh",
        backgroundColor: "#000",
        overflow: "hidden"
      }}
    >
      {/* Video */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
          overflow: "hidden"
      }}
    >
      <video
        ref={videoRef}
        src={videos[currentIndex]?.video_url}
        autoPlay
          muted={isMuted}
          playsInline
          loop={false}
          onClick={handleVideoClick}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleVideoEnd}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            maxHeight: "100vh"
          }}
        />
      </Box>

      {/* Exit Button */}
      <IconButton
        onClick={exitFullScreen}
        sx={{
          position: "absolute",
          top: "10px",
          right: "10px",
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          color: "white",
          "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
          zIndex: 10,
        }}
      >
        <Close />
      </IconButton>

      {/* Right Side Action Buttons */}
      <Box
        sx={{
          position: "absolute",
          right: "20px",
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: "30px",
          alignItems: "center",
          zIndex: 10,
        }}
      >
        {currentIndex > 0 && (
          <IconButton
            onClick={goToPrevious}
            sx={{
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              color: "white",
              "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
            }}
          >
            <ArrowUpward />
          </IconButton>
        )}

        <Tooltip title="Views" placement="left">
          <Box sx={{ textAlign: "center" }}>
            <IconButton 
              sx={{ 
                color: "white",
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
              }}
            >
              <Visibility />
            </IconButton>
            <Typography variant="body2" sx={{ color: "white", mt: 0.5 }}>
              {views}
        </Typography>
          </Box>
        </Tooltip>

        <Tooltip title={isLiked ? "Liked" : "Like"} placement="left">
          <Box sx={{ textAlign: "center" }}>
            <IconButton 
              onClick={handleLike} 
              sx={{ 
                color: isLiked ? "primary.main" : "white",
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
              }}
            >
              {isLiked ? <Favorite /> : <ThumbUp />}
        </IconButton>
            <Typography variant="body2" sx={{ color: "white", mt: 0.5 }}>
          {likes}
        </Typography>
          </Box>
        </Tooltip>
        
        <Tooltip title={isDisliked ? "Disliked" : "Dislike"} placement="left">
          <Box sx={{ textAlign: "center" }}>
            <IconButton 
              onClick={handleDislike} 
              sx={{ 
                color: isDisliked ? "error.main" : "white",
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
              }}
            >
              <ThumbDown />
        </IconButton>
            <Typography variant="body2" sx={{ color: "white", mt: 0.5 }}>
          {dislikes}
        </Typography>
          </Box>
        </Tooltip>

        <Tooltip title={isSaved ? "Remove from saved" : "Save video"} placement="left">
          <IconButton 
            onClick={handleSaveVideo} 
            sx={{ 
              color: isSaved ? "primary.main" : "white",
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
            }}
          >
            {isSaved ? <Bookmark /> : <BookmarkBorder />}
          </IconButton>
        </Tooltip>
        
        {currentUser && videos[currentIndex] && currentUser?.user_id === videos[currentIndex]?.user_id && (
          <Tooltip title="Delete video" placement="left">
            <IconButton 
              onClick={handleDeleteVideo} 
              sx={{ 
                color: "white",
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                "&:hover": { backgroundColor: "rgba(255, 0, 0, 0.2)" },
              }}
            >
              <Delete />
            </IconButton>
          </Tooltip>
        )}
        
        <Tooltip title="Share" placement="left">
          <IconButton 
            onClick={handleShare} 
            sx={{ 
              color: "white",
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
            }}
          >
            <Share />
          </IconButton>
        </Tooltip>
        
        {currentIndex < videos.length - 1 && (
          <IconButton 
            onClick={goToNext}
            sx={{ 
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              color: "white",
              "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
            }}
          >
            <ArrowDownward />
        </IconButton>
        )}
      </Box>

      {/* Bottom User Info & Caption */}
      <Box
        sx={{
          position: "absolute",
          bottom: "30px",
          left: "20px",
          maxWidth: "60%",
          padding: "15px",
          borderRadius: "8px",
          zIndex: 10,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", mb: 1 }}>
          <Avatar 
            src={currentVideo?.profile_picture || ""}
            sx={{ 
              width: 40, 
              height: 40, 
              border: "2px solid white",
              mr: 2
            }}
          />
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: "bold", color: "white", mr: 1 }}>
                @{currentVideo?.username || "Anonymous"}
              </Typography>
              
              {currentUser && currentVideo?.user_id && currentUser.user_id !== currentVideo.user_id && (
                <Tooltip title={isFollowing ? "Unfollow" : "Follow"} placement="top">
                  <IconButton
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    size="small"
                    sx={{ 
                      color: isFollowing ? "primary.main" : "white",
                      bgcolor: isFollowing ? "rgba(25, 118, 210, 0.12)" : "rgba(255, 255, 255, 0.12)",
                      '&:hover': {
                        bgcolor: isFollowing ? "rgba(25, 118, 210, 0.2)" : "rgba(255, 255, 255, 0.2)",
                      },
                      p: 0.5,
                      borderRadius: 1
                    }}
                  >
                    {followLoading ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : isFollowing ? (
                      <Check fontSize="small" />
                    ) : (
                      <PersonAdd fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
              )}
            </Box>
            <Typography variant="h6" sx={{ fontWeight: "bold", color: "white", mb: 1 }}>
              {currentVideo?.title || "Untitled Video"}
        </Typography>
            {currentVideo?.description && (
              <>
                <Typography 
                  variant="body2" 
                  color="lightgray"
                  sx={{ 
                    maxWidth: "500px",
                    lineHeight: 1.3
                  }}
                >
                  {showDescription 
                    ? currentVideo?.description 
                    : truncateDescription(currentVideo?.description, 100)}
        </Typography>
                {currentVideo?.description?.length > 100 && (
                  <Button 
                    onClick={() => setShowDescription(!showDescription)}
                    startIcon={showDescription ? <ExpandLess /> : <ExpandMore />}
                    sx={{ 
                      color: "white", 
                      padding: "4px", 
                      minWidth: "auto",
                      textTransform: "none",
                      "&:hover": { backgroundColor: "transparent", opacity: 0.8 },
                    }}
                  >
                    {showDescription ? "Show less" : "Show more"}
                  </Button>
                )}
              </>
            )}
          </Box>
        </Box>
      </Box>

      {/* Bottom controls for playback */}
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          padding: "10px",
          display: showControls ? "block" : "none",
          transition: "opacity 0.3s",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton onClick={handlePlayPause} sx={{ color: "white" }}>
            {isPlaying ? <Pause /> : <PlayArrow />}
          </IconButton>

          <Box
            sx={{
              flex: 1,
              height: "4px",
              backgroundColor: "rgba(255, 255, 255, 0.3)",
              cursor: "pointer",
              position: "relative",
            }}
            onClick={handleProgressClick}
          >
            <Box
              sx={{
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                backgroundColor: "white",
                width: `${(currentTime / duration) * 100}%`,
              }}
            />
          </Box>
          
          <Typography sx={{ color: "white", minWidth: "100px" }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </Typography>
          
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton onClick={toggleMute} sx={{ color: "white" }}>
              {isMuted ? <VolumeOff /> : <VolumeUp />}
            </IconButton>
            
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              style={{ width: "100px" }}
            />
            
            <select
              value={playbackSpeed}
              onChange={handlePlaybackSpeedChange}
              style={{
                backgroundColor: "transparent",
                color: "white",
                border: "none",
                padding: "5px",
              }}
            >
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
            
            <IconButton onClick={enterFullScreen} sx={{ color: "white" }}>
              <Fullscreen />
      </IconButton>
          </Box>
        </Box>
      </Box>

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

      <Snackbar
        open={showSnackbar}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="info" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Add visual feedback for double tap/click areas */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "30%",
          height: "100%",
          display: showControls ? "block" : "none",
          transition: "opacity 0.3s",
          opacity: 0.3,
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          pointerEvents: "none",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "30%",
          height: "100%",
          display: showControls ? "block" : "none",
          transition: "opacity 0.3s",
          opacity: 0.3,
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          pointerEvents: "none",
        }}
      />
    </Box>
  );
};

export default VideoPlayer;
