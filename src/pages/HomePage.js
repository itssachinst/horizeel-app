import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardMedia, 
  Typography, 
  Grid, 
  Container, 
  Box, 
  CircularProgress,
  Chip,
  useTheme
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { fetchVideos, searchVideos } from "../api";
import { Visibility } from "@mui/icons-material";
import { alpha } from '@mui/material/styles';

const HomePage = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  // Effect to handle URL search parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const query = queryParams.get('q');
    
    if (query) {
      setSearchQuery(query);
      setIsSearching(true);
      loadVideos(query);
    } else {
      setSearchQuery('');
      setIsSearching(false);
      loadVideos();
    }
  }, [location.search]);

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
    <Container 
      maxWidth="xl" 
      sx={{ 
        mt: '-16px', // Negative margin to pull content up
        pt: 0, 
        pb: 3, 
        bgcolor: '#000',
        overflow: 'hidden' // Prevent horizontal scrollbar
      }}
      disableGutters // Remove default container padding
    >
      {isSearching && (
        <Box mb={3} mt={2}>
          <Typography variant="h5" color="white" sx={{ mb: 1 }}>
            {searchQuery.startsWith('#') ? (
              <>Results for {searchQuery}</>
            ) : (
              <>Search results for "{searchQuery}"</>
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Found {videos.length} video{videos.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      )}
      
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      ) : videos.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh" flexDirection="column">
          <Typography variant="h5" color="white" sx={{ mb: 2 }}>
            No videos found
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {isSearching ? 
              `We couldn't find any videos matching "${searchQuery}"` : 
              "No videos available at the moment"}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3} sx={{ mt: 0 }}>
          {videos.map((video) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={video.video_id}>
              <Card 
                onClick={() => handleVideoClick(video.video_id)}
                sx={{ 
                  cursor: 'pointer',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
                  },
                  backgroundColor: '#121212',
                  borderRadius: 2,
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <CardMedia
                  component="img"
                  height="180"
                  image={video.thumbnail_url || "https://via.placeholder.com/640x360"}
                  alt={video.title}
                  sx={{ objectFit: 'cover' }}
                />
                
                {/* Overlay with title and views */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                    p: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      color: 'white',
                      maxWidth: '70%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {video.title}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Visibility sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
                    <Typography variant="caption" color="text.secondary">
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
