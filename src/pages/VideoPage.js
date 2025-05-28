import React, { useState, useEffect, useCallback, useRef } from "react";
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
const PREFETCH_THRESHOLD = 5;  // Load more videos when this many videos from the end

// Define a function to check if a URL is an HLS stream
const isHlsStream = (url) => {
  if (!url) return false;
  return url.toLowerCase().endsWith('.m3u8');
};

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
    setVideos,
    findVideoById
  } = useVideoContext();
  
  // Local state
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  
  // Add ref to track if we've already loaded the initial video
  const initialLoadDoneRef = useRef(false);
  const videoLoadedRef = useRef(false);
  
  // Add a console log to track the VideoPage lifecycle
  useEffect(() => {
    console.log("VideoPage mounted with id:", id);
    console.log("Current videos array:", videos);
    console.log("Current index:", currentIndex);
    
    // This effect runs once when component mounts
    return () => {
      console.log("VideoPage unmounting");
    };
  }, []);

  // Update the loadVideo function to ensure videos play correctly, including HLS streams
  const loadVideo = useCallback(async (videoId) => {
    console.log("loadVideo called with id:", videoId);
    
    if (isLoading || videoLoadedRef.current) {
      console.log("Already loading or loaded, skipping");
      return;
    }
    
    setIsLoading(true);
    videoLoadedRef.current = true;
    
    try {
      // Fast path: First check if the video is already in our array
      console.log("Checking if video already exists in current list");
      const existingVideo = findVideoById(videoId);
      if (existingVideo) {
        console.log("Video found in existing videos array");
        
        // Check if the URL is an HLS stream
        if (existingVideo.video_url && isHlsStream(existingVideo.video_url)) {
          console.log("HLS stream detected in existing video:", existingVideo.video_url);
        }
        
        const videoIndex = videos.findIndex(v => v.video_id === videoId);
        if (videoIndex !== -1) {
          console.log(`Setting current index to ${videoIndex}`);
          setCurrentIndex(videoIndex);
          setIsLoading(false);
          return;
        }
      }
      
      console.log("Video not found in current list, fetching from API");
      if (videos.length === 0) {
        console.log("No videos loaded yet, fetching initial batch");
        const result = await fetchVideos(0);
        console.log("Initial fetch result:", result);
        
        // Wait a moment for the videos state to update
        setTimeout(() => {
          const newIndex = videos.findIndex(v => v.video_id === videoId);
          if (newIndex !== -1) {
            console.log(`Video found after fetch, setting index to ${newIndex}`);
            
            // Check for HLS format
            const video = videos[newIndex];
            if (video && video.video_url && isHlsStream(video.video_url)) {
              console.log("HLS stream detected in fetched video:", video.video_url);
            }
            
            setCurrentIndex(newIndex);
          } else {
            console.log("Video not found in initial batch, trying to fetch it directly");
            fetchSpecificVideo(videoId);
          }
        }, 100);
        } else {
        fetchSpecificVideo(videoId);
        }
      } catch (err) {
      console.error('Error loading video:', err);
      setLocalError('Unable to load the requested video. Please try again.');
      } finally {
      setIsLoading(false);
    }
  }, [findVideoById, videos, currentIndex, setCurrentIndex, fetchVideos, setVideos, isLoading]);
  
  // Helper function to fetch a specific video
  const fetchSpecificVideo = async (videoId) => {
    try {
      console.log(`Fetching specific video with ID: ${videoId}`);
      const specificVideo = await fetchVideoById(videoId);
      
      if (specificVideo) {
        console.log("Successfully fetched specific video:", specificVideo);
        
        // Check if the video is an HLS stream
        if (specificVideo.video_url && isHlsStream(specificVideo.video_url)) {
          console.log("HLS stream detected:", specificVideo.video_url);
        }
        
        // Add to videos array avoiding duplicates
        setVideos(prev => {
          if (prev.some(v => v.video_id === specificVideo.video_id)) {
            console.log("Video already exists in array, not adding duplicate");
            return prev;
          }
          console.log("Adding new video to array");
          return [...prev, specificVideo];
        });
        
        // Wait a moment for the state to update, then set the index
        setTimeout(() => {
          const targetIndex = videos.length;
          console.log(`Setting current index to: ${targetIndex}`);
          setCurrentIndex(targetIndex);
        }, 100);
      } else {
        console.error("Failed to fetch specific video, API returned null/undefined");
      }
    } catch (error) {
      console.error("Error fetching specific video:", error);
    }
  };
  
  // Load video when id changes - but ensure we only do initial load once
  useEffect(() => {
    if (id && !initialLoadDoneRef.current) {
      loadVideo(id);
      initialLoadDoneRef.current = true;
    }
  }, [id, loadVideo]);
  
  // Preload next videos aggressively when approaching the end of the list
  useEffect(() => {
    if (
      videos.length > 0 &&
      currentIndex >= videos.length - PREFETCH_THRESHOLD
    ) {
      loadMoreVideos();
    }
  }, [currentIndex, videos.length, loadMoreVideos]);
  
  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Navigation functions for VideoPlayer
  const goToNextVideo = useCallback(() => {
    if (videos && videos.length > 0) {
      if (currentIndex < videos.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Load more videos if available, otherwise loop to beginning
        if (videos.length > 0) {
          loadMoreVideos();
        }
        setCurrentIndex(0);
      }
    }
  }, [currentIndex, videos, setCurrentIndex, loadMoreVideos]);

  const goToPrevVideo = useCallback(() => {
    if (videos && videos.length > 0) {
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else {
        setCurrentIndex(videos.length - 1);
      }
    }
  }, [currentIndex, videos, setCurrentIndex]);
  
  // Simplified loading state - only show loading indicator initially
  if (videos.length === 0 && (loading || isLoading)) {
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

  // Show error state only if we have no videos
  if ((error || localError) && videos.length === 0) {
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
            onClick={() => navigate('/demo/')}
            sx={{ mt: 2 }}
          >
            Go back to Home
          </Button>
      </Box>
    );
  }

  // Empty state when no videos are available
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
        overflow: 'hidden'
      }}
    >
        <VideoPlayer
          videos={videos}
          currentIndex={currentIndex}
        setCurrentIndex={setCurrentIndex}
          isMobile={isMobile}
          isTablet={isTablet}
          onNextVideo={goToNextVideo}
          onPrevVideo={goToPrevVideo}
        />
      
      {/* Only show snackbar for critical messages */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
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
