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

// Configuration constants
const ITEMS_PER_PAGE = 20;  // Number of videos to fetch per page
const PREFETCH_THRESHOLD = 3;  // Load more videos when this many videos from the end

const VideoPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Main state
  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMoreVideos, setHasMoreVideos] = useState(true);
  
  // UI state
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  
  // Refs to track state between renders
  const videosRef = useRef([]);
  const fetchingRef = useRef(false);
  const nextBatchLoadedRef = useRef(false);

  // Add a ref to track if component is mounted
  const isMounted = useRef(true);
  // Track if we're setting the index to match the URL param
  const isSettingIndexFromUrl = useRef(false);

  // Function to find the index of a video by its ID
  const findVideoIndexById = useCallback((videos, videoId) => {
    return videos.findIndex(video => video.video_id === videoId);
  }, []);

  // Function to initialize the player with the correct video based on URL
  const initializeWithCorrectVideo = useCallback(async (videosData, urlVideoId) => {
    if (!urlVideoId || !videosData || videosData.length === 0) {
      return 0; // Default to first video if no ID or no videos
    }

    // First check if the requested video is in the initial batch
    const videoIndex = findVideoIndexById(videosData, urlVideoId);
    
    if (videoIndex !== -1) {
      console.log(`Found requested video at index ${videoIndex}`);
      return videoIndex;
    }
    
    // If not found, try to fetch the specific video
    try {
      console.log(`Requested video not in initial batch, fetching video with ID: ${urlVideoId}`);
      const specificVideo = await fetchVideoById(urlVideoId);
      
      if (specificVideo) {
        // Insert the specific video at the beginning and set index to 0
        const updatedVideos = [specificVideo, ...videosData.filter(v => v.video_id !== specificVideo.video_id)];
        setVideos(updatedVideos);
        return 0;
      }
    } catch (err) {
      console.error("Error fetching specific video:", err);
      // Fall back to first video if there's an error
      return 0;
    }
    
    // Default to first video if not found
    return 0;
  }, [findVideoIndexById]);

  // Modified initialization effect
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        setLoading(true);
        
        // Fetch initial set of videos
        const videosData = await fetchVideos(0, ITEMS_PER_PAGE);
        console.log("Fetched initial videos:", videosData);
        
        if (!isMounted.current) return;
        
        if (videosData && videosData.length > 0) {
          // Initialize with correct initial index based on URL
          const initialIndex = await initializeWithCorrectVideo(videosData, id);
          
          setVideos(videosData);
          isSettingIndexFromUrl.current = true;
          setCurrentIndex(initialIndex);
          setHasMoreVideos(videosData.length >= ITEMS_PER_PAGE);
          
          // Increment view count for the initial video
          if (videosData[initialIndex]) {
            incrementVideoView(videosData[initialIndex].video_id).catch(console.error);
          }
          
          // Pre-fetch next batch if close to the end
          if (initialIndex > videosData.length - PREFETCH_THRESHOLD) {
            console.log("Pre-fetching next set of videos");
            fetchMoreVideos(true);
          }
        } else {
          setError("No videos found");
        }
      } catch (err) {
        console.error("Error initializing VideoPage:", err);
        if (isMounted.current) {
          setError("Failed to load videos");
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };
    
    initializeComponent();
    
    return () => {
      isMounted.current = false;
    };
  }, [id]); // Re-run when URL param changes

  // Effect to handle URL updates when current index changes
  useEffect(() => {
    if (isSettingIndexFromUrl.current) {
      // Reset the flag after the index has been set from URL
      isSettingIndexFromUrl.current = false;
      return;
    }
    
    // Don't update URL if we're already on the same video
    if (videos.length > 0 && currentIndex >= 0 && currentIndex < videos.length) {
      const currentVideoId = videos[currentIndex].video_id;
      // Only update URL if not already on that video's URL
      if (id !== currentVideoId) {
        // Update URL without full navigation
        window.history.replaceState({ videoId: currentVideoId }, '', `/video/${currentVideoId}`);
      }
    }
  }, [currentIndex, videos, id]);

  // Update the ref whenever videos state changes
  useEffect(() => {
    videosRef.current = videos;
    // Log any time the videos array changes
    console.log(`Videos array updated - now contains ${videos.length} videos`);
  }, [videos]);

  // Function to force fetch next batch of videos regardless of current state
  const forceLoadNextBatch = useCallback(async () => {
    try {
      console.log("FORCE LOADING next batch of videos");
      const skip = videosRef.current.length;
      const response = await fetchVideos(skip, ITEMS_PER_PAGE);
      
      if (response && Array.isArray(response) && response.length > 0) {
        console.log(`Force loaded ${response.length} more videos`);
        setVideos(prevVideos => [...prevVideos, ...response]);
        
        if (response.length < ITEMS_PER_PAGE) {
          setHasMoreVideos(false);
        } else {
          setHasMoreVideos(true);
        }
        
        return true;
      } else {
        console.log("No more videos available from force load");
        setHasMoreVideos(false);
        return false;
      }
    } catch (error) {
      console.error("Error force loading videos:", error);
      showSnackbar("Failed to load additional videos");
      return false;
    }
  }, []);

  // Function to fetch more videos
  const fetchMoreVideos = useCallback(async (forceFetch = false) => {
    // Use refs to prevent concurrent fetches and check if we have more videos
    if ((fetchingRef.current || !hasMoreVideos) && !forceFetch) {
      console.log("Skipping fetch - already fetching or no more videos");
      return false;
    }
    
    try {
      fetchingRef.current = true;
      setLoadingMore(true);
      
      // Use the ref for most current length value
      const skip = videosRef.current.length;
      console.log(`Fetching more videos: skip=${skip}, limit=${ITEMS_PER_PAGE}`);
      
      const newVideos = await fetchVideos(skip, ITEMS_PER_PAGE);
      
      if (newVideos && Array.isArray(newVideos) && newVideos.length > 0) {
        console.log(`Loaded ${newVideos.length} more videos`);
        
        // Append new videos to the existing list
        setVideos(prevVideos => {
          const updatedVideos = [...prevVideos, ...newVideos];
          console.log(`Updated videos array now contains ${updatedVideos.length} videos`);
          return updatedVideos;
        });
        
        // If we received fewer videos than requested, there are no more to load
        if (newVideos.length < ITEMS_PER_PAGE) {
          console.log("End of video collection reached");
          setHasMoreVideos(false);
        }
        return true;
      } else {
        console.log("No more videos available");
        setHasMoreVideos(false);
        return false;
      }
    } catch (error) {
      console.error("Error loading more videos:", error);
      showSnackbar("Failed to load additional videos");
      return false;
    } finally {
      setLoadingMore(false);
      fetchingRef.current = false;
    }
  }, [hasMoreVideos]);

  // Pre-fetch the next batch of videos as soon as possible
  useEffect(() => {
    if (videos.length === ITEMS_PER_PAGE && !nextBatchLoadedRef.current && hasMoreVideos) {
      console.log("Automatically pre-fetching next batch of videos");
      nextBatchLoadedRef.current = true;
      forceLoadNextBatch();
    }
  }, [videos.length, hasMoreVideos, forceLoadNextBatch]);

  // Handle changing the current index, with pagination logic
  const handleSetCurrentIndex = useCallback((newIndex) => {
    console.log(`Changing to video index ${newIndex} (out of ${videosRef.current.length} videos)`);
    
    // First set the current index
    setCurrentIndex(newIndex);
    
    // Calculate how far we are from the end of the available videos
    const distanceFromEnd = videosRef.current.length - newIndex - 1;
    console.log(`Distance from end: ${distanceFromEnd} videos remaining`);
    
    // Check if we're within threshold or at the last video
    if (distanceFromEnd <= PREFETCH_THRESHOLD && hasMoreVideos) {
      console.log(`Near end of videos (${distanceFromEnd} from end), loading more...`);
      fetchMoreVideos(true);
    }
    
    // Special case: if this is the last video or one before, force a fetch with priority
    if ((newIndex >= videosRef.current.length - 2) && hasMoreVideos) {
      console.log('At or near the last video, forcing immediate fetch');
      forceLoadNextBatch();
    }
    
    // Special case: if we're at index 19 (the last video of the first batch)
    if (newIndex === 19) {
      console.log('At video 20 (index 19), ensuring next batch is loaded');
      forceLoadNextBatch();
    }
  }, [hasMoreVideos, fetchMoreVideos, forceLoadNextBatch]);

  // Show snackbar message
  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };
  
  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // Handler to go back to previous page
  const handleBack = () => {
    navigate(-1);
  };
  
  // Handler to go to home page
  const handleGoHome = () => {
    navigate("/");
  };
  
  // Handler to retry loading
  const handleRetry = () => {
    window.location.reload();
  };

  // Effect to help debug pagination issues
  useEffect(() => {
    if (videos.length > 0) {
      console.log(`Current video index: ${currentIndex}, Total videos: ${videos.length}`);
      if (videos[currentIndex]) {
        console.log(`Current video: ${videos[currentIndex].title}`);
      } else {
        console.log(`Video at index ${currentIndex} not found!`);
      }
    }
  }, [currentIndex, videos]);

  // Debug function to manually load more videos - can be triggered from browser console
  useEffect(() => {
    window.debugLoadMore = () => {
      console.log("Manual debug load triggered");
      forceLoadNextBatch();
    };
    
    return () => {
      delete window.debugLoadMore;
    };
  }, [forceLoadNextBatch]);

  // Loading state
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="#000"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error || videos.length === 0 || currentIndex === -1) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="#000"
        color="white"
        flexDirection="column"
        p={3}
      >
        <Typography variant="h6" align="center" gutterBottom>
          {error || "Video not found"}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Home />}
            onClick={handleGoHome}
          >
            Go Home
          </Button>
          
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<Refresh />}
            onClick={handleRetry}
          >
            Retry
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      bgcolor: '#000', 
      height: '100%',
      width: '100%',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 1300,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Mobile back button (only shown on mobile) */}
      {isMobile && (
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 16, 
            left: 16, 
            zIndex: 1400,
            opacity: 0.9
          }}
        >
          <IconButton 
            onClick={handleBack} 
            sx={{ 
              color: 'white', 
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.7)',
              }
            }}
          >
            <ArrowBack />
          </IconButton>
        </Box>
      )}

      {/* Debugging info (hidden in production) */}
      <Box 
        sx={{ 
          position: 'absolute', 
          top: 16, 
          right: 16, 
          color: 'white',
          zIndex: 1400,
          bgcolor: 'rgba(0,0,0,0.5)',
          p: 1,
          borderRadius: 1,
          fontSize: '10px',
        }}
      >
        {/* Remove video counter */}
        {/* <Box
          sx={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: 'rgba(0,0,0,0.7)',
            px: 2,
            py: 1,
            borderRadius: 2,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <Typography variant="body2" sx={{ color: 'white' }}>
            Video {currentIndex + 1}/{videos.length} {loadingMore ? '(Loading more...)' : ''}
          </Typography>
        </Box> */}
        {hasMoreVideos && (
          <Button 
            variant="outlined" 
            size="small"
            onClick={forceLoadNextBatch}
            sx={{ 
              ml: 1, 
              py: 0, 
              px: 1, 
              fontSize: '8px', 
              minWidth: 0,
              color: 'white',
              borderColor: 'white',
              '&:hover': {
                borderColor: 'primary.main',
                color: 'primary.main'
              }
            }}
          >
            Load More
          </Button>
        )}
      </Box>

      {/* Full-screen video player */}
      <Box sx={{ 
        flex: 1,
        display: 'flex',
        alignItems: 'center', 
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        <VideoPlayer
          videos={videos}
          currentIndex={currentIndex}
          setCurrentIndex={handleSetCurrentIndex}
          isMobile={isMobile}
          isTablet={isTablet}
        />
      </Box>
      
      {/* Loading indicator at bottom when fetching more videos */}
      {loadingMore && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1400,
          }}
        >
          <CircularProgress size={24} color="primary" />
        </Box>
      )}
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
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

export default VideoPage;
