import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Box, CircularProgress, Container, Typography } from "@mui/material";
import VideoPlayer from "../components/VideoPlayer";
import { fetchVideos, incrementVideoView } from "../api";

const VideoPage = () => {
  const { id } = useParams();
  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all videos
        const videosData = await fetchVideos();
        console.log("Fetched videos:", videosData); // Debug log
        
        if (!videosData || videosData.length === 0) {
          setError("No videos available");
          setLoading(false);
          return;
        }
        
        setVideos(videosData);

        // Find the index of the current video
        const index = videosData.findIndex((video) => video.video_id === id);
        console.log("Video ID:", id, "Found at index:", index); // Debug log
        
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
    <Container maxWidth="xl" disableGutters sx={{ bgcolor: '#000' }}>
      <VideoPlayer
        videos={videos}
        currentIndex={currentIndex}
        setCurrentIndex={setCurrentIndex}
      />
    </Container>
  );
};

export default VideoPage;
