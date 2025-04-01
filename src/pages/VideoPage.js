import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Box, 
  CircularProgress, 
  Container, 
  Typography, 
  IconButton, 
  useTheme, 
  useMediaQuery,
  Button,
  Snackbar,
  Alert
} from "@mui/material";
import { ArrowBack, Refresh, Home } from "@mui/icons-material";
import VideoPlayer from "../components/VideoPlayer";
import { fetchVideos, incrementVideoView, fetchVideoById } from "../api";
import { useVideoContext } from "../contexts/VideoContext";

// Configuration constants
const ITEMS_PER_PAGE = 20;  // Number of videos to fetch per page
const PREFETCH_THRESHOLD = 3;  // Load more videos when this many videos from the end

const VideoPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  // Get videos and state management from context
  const { 
    videos, 
    loading, 
    error,
    currentIndex,
    setCurrentIndex,
    fetchVideos,
    loadMoreVideos,
    setVideos
  } = useVideoContext();
  
  // Local state
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  
  // Find video index in the videos array
  const findVideoIndexById = useCallback((videoId) => {
    return videos.findIndex(video => video.video_id === videoId);
  }, [videos]);
  
  // Load a specific video if it's not already in the videos array
  const loadVideo = useCallback(async (videoId) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      // First check if the video is already in our array
      const videoIndex = findVideoIndexById(videoId);
      
      if (videoIndex !== -1) {
        // Video is already loaded, just set the index
        setCurrentIndex(videoIndex);
        return;
      }
      
      // If we have videos but the requested one isn't found, try to load it specifically
      if (videos.length > 0) {
        const specificVideo = await fetchVideoById(videoId);
        
        if (specificVideo) {
          // Add to videos array avoiding duplicates
          setVideos(prev => {
            // Check if video already exists
            if (prev.some(v => v.video_id === specificVideo.video_id)) {
              return prev;
            }
            
            return [...prev, specificVideo];
          });
          
          // Update the index after adding
          setTimeout(() => {
            const newIndex = findVideoIndexById(videoId);
            if (newIndex !== -1) {
              setCurrentIndex(newIndex);
            }
          }, 0);
          
          return;
        }
      } else {
        // No videos loaded yet, fetch initial batch
        await fetchVideos(0);
        
        // Check if our target video is in the initial batch
        const newIndex = findVideoIndexById(videoId);
        if (newIndex !== -1) {
          setCurrentIndex(newIndex);
          return;
        }
        
        // Still not found, try fetching it specifically
        const specificVideo = await fetchVideoById(videoId);
        
        if (specificVideo) {
          setVideos(prev => {
            if (prev.some(v => v.video_id === specificVideo.video_id)) {
              return prev;
            }
            
            return [...prev, specificVideo];
          });
          
          // Update the index after adding
          setTimeout(() => {
            const newIndex = findVideoIndexById(videoId);
            if (newIndex !== -1) {
              setCurrentIndex(newIndex);
            }
          }, 0);
          
          return;
        }
      }
      
      throw new Error('Video not found');
    } catch (err) {
      console.error('Error loading video:', err);
      setLocalError('Unable to load the requested video. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [findVideoIndexById, videos, setCurrentIndex, fetchVideos, setVideos, isLoading]);
  
  // Load video when id changes
  useEffect(() => {
    if (id) {
      loadVideo(id);
    }
  }, [id, loadVideo]);
  
  // Preload next videos when user approaches the end of current videos list
  useEffect(() => {
    const preloadThreshold = 3; // Preload when within 3 videos of the end
    
    if (
      videos.length > 0 &&
      currentIndex >= videos.length - preloadThreshold
    ) {
      loadMoreVideos();
    }
  }, [currentIndex, videos.length, loadMoreVideos]);
  
  // Handle snackbar close
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };
  
  // Show loading state
  if ((loading && videos.length === 0) || isLoading) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: 'black',
        }}
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }
  
  // Show error state
  if (error || localError) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: 'black',
          color: 'white',
          textAlign: 'center',
          p: 3
        }}
      >
        <Typography variant="h6" gutterBottom>
          {error || localError}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/')}
          sx={{ mt: 2 }}
        >
          Go back to Home
        </Button>
      </Box>
    );
  }
  
  // Show empty state
  if (!videos || videos.length === 0) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: 'black',
          color: 'white',
        }}
      >
        <Typography variant="h6">No videos available</Typography>
      </Box>
    );
  }
  
  return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        bgcolor: 'black',
        overflow: 'hidden',
      }}
    >
      <VideoPlayer
        videos={videos}
        currentIndex={currentIndex}
        setCurrentIndex={setCurrentIndex}
        isMobile={isMobile}
        isTablet={isTablet}
      />
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity="info">
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default VideoPage;
