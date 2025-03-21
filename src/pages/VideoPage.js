import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Box, 
  CircularProgress, 
  Container, 
  Typography, 
  IconButton, 
  useTheme, 
  useMediaQuery 
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import VideoPlayer from "../components/VideoPlayer";
import { fetchVideos, incrementVideoView } from "../api";

const VideoPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // Effect to load videos and find the current video
  useEffect(() => {
    const loadVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all videos
        const videosData = await fetchVideos();
        console.log("Fetched videos:", videosData); 
        
        if (!videosData || videosData.length === 0) {
          setError("No videos available");
          setLoading(false);
          return;
        }
        
        setVideos(videosData);

        // Find the index of the current video
        const index = videosData.findIndex((video) => video.video_id === id);
        console.log("Video ID:", id, "Found at index:", index);
        
        if (index !== -1) {
          setCurrentIndex(index);
          
          // Increment view count
          await incrementVideoView(id);
        } else {
          setError(`Video with ID ${id} not found`);
        }
      } catch (error) {
        console.error("Error loading videos:", error);
        setError("Failed to load videos. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    loadVideos();
  }, [id]);

  // Handler to go back to previous page
  const handleBack = () => {
    navigate(-1);
  };

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
          setCurrentIndex={setCurrentIndex}
          isMobile={isMobile}
          isTablet={isTablet}
        />
      </Box>
    </Box>
  );
};

export default VideoPage;
