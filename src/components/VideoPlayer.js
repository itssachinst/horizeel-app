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
  Check
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { incrementVideoLike, incrementVideoDislike, saveVideo, checkVideoSaved, deleteVideo, followUser, unfollowUser, checkIsFollowing } from "../api";

const VideoPlayer = ({ videos, currentIndex, setCurrentIndex }) => {
  const videoRef = useRef(null);
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

  useEffect(() => {
    const video = videoRef.current;

    if (video) {
      // Log video source for debugging
      console.log("Video source:", videos[currentIndex]?.video_url);
      
      // Try to play the video when component loads
      try {
        video.play().catch(err => {
          console.warn("Autoplay failed:", err);
          // This is expected on some browsers that block autoplay
        });
      } catch (err) {
        console.warn("Error attempting to play video:", err);
      }
      
      // Update state with the current video's stats
      if (videos[currentIndex]) {
        setLikes(videos[currentIndex].likes || 0);
        setDislikes(videos[currentIndex].dislikes || 0);
        setViews(videos[currentIndex].views || 0);
        
        // Check if video is saved (if user is logged in)
        if (currentUser) {
          checkSavedStatus(videos[currentIndex].video_id);
          // Check if user is following the video creator
          checkFollowStatus(videos[currentIndex].user_id);
        } else {
          // Reset saved and follow status if not logged in
          setIsSaved(false);
          setIsFollowing(false);
        }
      }
      
      // Reset like/dislike status for new video
      setIsLiked(false);
      setIsDisliked(false);

      // Try to enter fullscreen after a short delay on first load
      if (!initialLoadComplete) {
        const timer = setTimeout(() => {
          enterFullScreen();
          setInitialLoadComplete(true);
        }, 500); // Short delay to ensure the browser registers this as user-initiated
        return () => clearTimeout(timer);
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === "ArrowUp" && currentIndex > 0) {
        setCurrentIndex((prevIndex) => prevIndex - 1);
      } else if (event.key === "ArrowDown" && currentIndex < videos.length - 1) {
        setCurrentIndex((prevIndex) => prevIndex + 1);
      } else if (event.key === "Escape") {
        exitFullScreen();
      } else if (event.key === "F11") {
        // Let the browser handle F11 naturally
        event.preventDefault();
      } else if (event.key === " " || event.key === "k") {
        // Space or K key for play/pause
        if (video.paused) {
          video.play().catch(e => console.warn("Could not play video:", e));
        } else {
          video.pause();
        }
        event.preventDefault();
      } else if (event.key === "m") {
        // M key for mute/unmute
        toggleMute();
        event.preventDefault();
      }
    };

    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [currentIndex, setCurrentIndex, videos, initialLoadComplete, currentUser, checkFollowStatus, exitFullScreen]);

  const handleVideoEnd = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex((prevIndex) => prevIndex + 1);
    } else {
      exitFullScreen();
    }
  };

  const enterFullScreen = () => {
    try {
      // Try browser fullscreen API
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen().then(() => {
          setIsFullScreen(true);
        }).catch(err => {
          console.error("Couldn't use fullscreen API:", err);
          
          // Try F11 simulation with user message if API fails
          setSnackbarMessage("Press F11 for best fullscreen experience");
          setShowSnackbar(true);
        });
      } else {
        // Fallback message
        setSnackbarMessage("Press F11 for fullscreen mode");
        setShowSnackbar(true);
      }
    } catch (error) {
      console.error("Error requesting fullscreen:", error);
    }
  };

  const exitFullScreen = () => {
    try {
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.error("Error exiting fullscreen:", err);
        });
      }
      setIsFullScreen(false);
      
      // Navigate away from the video page
      navigate("/");
    } catch (error) {
      console.error("Error exiting fullscreen:", error);
      // Still try to navigate even if exiting fullscreen fails
      navigate("/");
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
    
    if (!isLiked) {
      try {
        // Remove dislike if present
        if (isDisliked) {
          setIsDisliked(false);
          setDislikes(prev => Math.max(0, prev - 1));
        }
        
        // Add like
        const response = await incrementVideoLike(videos[currentIndex].video_id);
        setLikes(response?.likes || likes + 1);
        setIsLiked(true);
      } catch (error) {
        console.error("Error liking video:", error);
      }
    }
  };

  const handleDislike = async () => {
    if (!currentUser) {
      showLoginPrompt("Please log in to dislike videos");
      return;
    }
    
    if (!isDisliked) {
      try {
        // Remove like if present
        if (isLiked) {
          setIsLiked(false);
          setLikes(prev => Math.max(0, prev - 1));
        }
        
        // Add dislike
        const response = await incrementVideoDislike(videos[currentIndex].video_id);
        setDislikes(response?.dislikes || dislikes + 1);
        setIsDisliked(true);
      } catch (error) {
        console.error("Error disliking video:", error);
      }
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
          // Fall back to clipboard on share error
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

  // Navigation controls
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

  // Function to truncate description
  const truncateDescription = (text, maxLength = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Handler for video click - toggles play/pause and tries to go fullscreen
  const handleVideoClick = () => {
    const video = videoRef.current;
    if (video) {
      if (video.paused) {
        video.play().catch(e => console.warn("Play error:", e));
      } else {
        video.pause();
      }
    }
    
    // Try to enter fullscreen if not already in fullscreen
    if (!isFullScreen) {
      enterFullScreen();
    }
  };

  // Add a function to check saved status
  const checkSavedStatus = async (videoId) => {
    try {
      const response = await checkVideoSaved(videoId);
      setIsSaved(response.is_saved);
    } catch (error) {
      console.error("Error checking saved status:", error);
    }
  };

  // Update the handleSaveVideo function to use the API
  const handleSaveVideo = async () => {
    if (!currentUser) {
      showLoginPrompt("Please log in to save videos");
      return;
    }
    
    try {
      const videoId = videos[currentIndex].video_id;
      const shouldSave = !isSaved;
      
      // Call the API to save/unsave the video
      await saveVideo(videoId, shouldSave);
      
      // Update local state
      setIsSaved(shouldSave);
      
      // Show feedback to the user
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

  // Add a function to handle video deletion
  const handleDeleteVideo = async () => {
    if (!currentUser) {
      showLoginPrompt("Please log in to delete videos");
      return;
    }

    // Check if the current user is the video owner
    const currentVideo = videos[currentIndex];
    if (!currentVideo || !currentUser || currentUser?.user_id !== currentVideo?.user_id) {
      setSnackbarMessage("You can only delete your own videos");
      setShowSnackbar(true);
      return;
    }

    // Open confirmation dialog
    setShowDeleteDialog(true);
  };

  // Function to confirm video deletion
  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      const videoId = videos[currentIndex].video_id;
      
      // Call API to delete the video
      await deleteVideo(videoId);
      
      // Close dialog
      setShowDeleteDialog(false);
      setIsDeleting(false);
      
      // Show success message
      setSnackbarMessage("Video deleted successfully");
      setShowSnackbar(true);
      
      // Navigate away if this was the only video, or go to the next video
      if (videos.length <= 1) {
        exitFullScreen();
        navigate("/"); // Go back to home
      } else if (currentIndex === videos.length - 1) {
        setCurrentIndex(currentIndex - 1); // Go to previous if last video
      } else {
        setCurrentIndex(currentIndex); // Reload current index to get updated list
      }
    } catch (error) {
      console.error("Error deleting video:", error);
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setSnackbarMessage("Failed to delete video");
      setShowSnackbar(true);
    }
  };

  // Add a function to check follow status
  const checkFollowStatus = async (creatorId) => {
    // Don't check follow status if the current user is the creator
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

  // Add a function to handle follow/unfollow
  const handleFollowToggle = async () => {
    if (!currentUser) {
      showLoginPrompt("Please log in to follow users");
      return;
    }
    
    // Don't allow users to follow themselves
    if (currentUser.user_id === videos[currentIndex].user_id) {
      setSnackbarMessage("You cannot follow yourself");
      setShowSnackbar(true);
      return;
    }
    
    setFollowLoading(true);
    
    try {
      if (isFollowing) {
        // Unfollow the user
        await unfollowUser(videos[currentIndex].user_id);
        setIsFollowing(false);
        setSnackbarMessage(`Unfollowed @${videos[currentIndex].username}`);
      } else {
        // Follow the user
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

  // If no videos are available
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
        width: "100vw", 
        height: "100vh",
        backgroundColor: "black",
        position: "relative",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      {/* Video Player */}
      <video
        ref={videoRef}
        src={currentVideo?.video_url}
        style={{ 
          width: "100%", 
          height: "100%", 
          objectFit: "contain",
          maxHeight: "100vh"
        }}
        autoPlay
        controls={false}
        onClick={handleVideoClick}
        onEnded={handleVideoEnd}
        muted={isMuted}
        onError={(e) => {
          console.error("Video error:", e);
          setSnackbarMessage("Error loading video. Please try again.");
          setShowSnackbar(true);
        }}
      />

      {/* Right side interaction and navigation controls - Reordered */}
      <Box
        sx={{
          position: "absolute",
          right: "20px",
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: "30px", // Increased spacing
          alignItems: "center",
          zIndex: 10,
        }}
      >
        {/* Next video (up arrow) at the top */}
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

        {/* Views display */}
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

        {/* Likes control */}
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

        {/* Dislikes control */}
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

        {/* Save video button */}
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

        {/* Delete video button - Only show if user is the owner */}
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

        {/* Share button */}
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

        {/* Mute button */}
        <Tooltip title={isMuted ? "Unmute" : "Mute"} placement="left">
          <IconButton 
            onClick={toggleMute} 
            sx={{ 
              color: "white",
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
            }}
          >
            {isMuted ? <VolumeOff /> : <VolumeUp />}
          </IconButton>
        </Tooltip>

        {/* Previous video (down arrow) at the bottom */}
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

      {/* Profile, username, title, and description at bottom left */}
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
              
              {/* Follow button - only show if user is logged in and not the owner */}
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

      {/* Home/Close button */}
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

      {/* Snackbar for notifications */}
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
    </Box>
  );
};

export default VideoPlayer;
