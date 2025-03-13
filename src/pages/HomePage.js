import React, { useState, useEffect } from "react";
import { Card, CardMedia, Typography, Grid, Container, Box, CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { fetchVideos, searchVideos } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { Visibility } from "@mui/icons-material";

const HomePage = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async (query = "") => {
    setLoading(true);
    try {
      const videosData = query 
        ? await searchVideos(query)
        : await fetchVideos();
      setVideos(videosData);
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = (videoId) => {
    navigate(`/video/${videoId}`);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3, bgcolor: '#000' }}>
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {videos.map((video) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={video.video_id}>
              <Card 
                onClick={() => handleVideoClick(video.video_id)}
                sx={{ 
                  cursor: 'pointer',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.2)'
                  },
                  bgcolor: '#121212',
                  borderRadius: 2,
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <CardMedia
                  component="img"
                  height="200"
                  image={video.thumbnail_url || "https://via.placeholder.com/640x360?text=No+Thumbnail"}
                  alt={video.title}
                />
                {/* Overlay for title and views */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                    p: 1.5,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end'
                  }}
                >
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      color: 'white',
                      fontWeight: 'bold',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                      width: '75%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {video.title}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', color: 'white' }}>
                    <Visibility sx={{ fontSize: 16, mr: 0.5 }} />
                    <Typography variant="body2">
                      {video.views || 0}
                    </Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default HomePage;
