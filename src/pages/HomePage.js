import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Card, 
  CardMedia, 
  Typography, 
  Grid, 
  Container, 
  Box, 
  CircularProgress,
  Chip,
  useTheme,
  useMediaQuery,
  Avatar,
  Button,
  CardContent,
  CardActionArea
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { searchVideos } from "../api";
import { Visibility, Person, PlayArrow } from "@mui/icons-material";
import { alpha } from '@mui/material/styles';
import { formatDistanceToNow } from 'date-fns';
import { useVideoContext } from "../contexts/VideoContext";
import { formatViewCount, formatDuration } from "../utils/videoUtils";

const HomePage = () => {
  const { 
    videos, 
    loading, 
    hasMore, 
    error, 
    fetchVideos, 
    loadMoreVideos,
    setCurrentIndex
  } = useVideoContext();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showMobilePromo, setShowMobilePromo] = useState(false);
  
  const observer = useRef();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const ITEMS_PER_PAGE = 20;

  // Effect to check if user is on mobile browser
  useEffect(() => {
    // Check if user is on mobile device
    const isMobileBrowser = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setShowMobilePromo(isMobileBrowser && isMobile);
  }, [isMobile]);

  // Effect to handle URL search parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const query = queryParams.get('q');

    if (query) {
      setSearchQuery(query);
      setIsSearching(true);
      handleSearch(query);
    } else {
      setSearchQuery('');
      setIsSearching(false);
      setSearchResults([]);
    }
  }, [location.search]);

  const handleSearch = async (query) => {
    setSearchLoading(true);
    try {
      const results = await searchVideos(query, 0, ITEMS_PER_PAGE);
      setSearchResults(results || []);
    } catch (error) {
      console.error("Error searching videos:", error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Set up the intersection observer for infinite scrolling
  const lastVideoElementRef = useCallback(node => {
    if (loading || searchLoading) return;
    
    // Always disconnect previous observer before creating new one
    if (observer.current) {
      observer.current.disconnect();
    }
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !isSearching) {
        console.log("Last video element is visible, loading more videos");
        loadMoreVideos();
      }
    }, {
      rootMargin: '200px', // Load videos before user reaches the end
      threshold: 0.1 // Trigger when at least 10% of the element is visible
    });
    
    if (node) {
      observer.current.observe(node);
    }
  }, [loading, searchLoading, hasMore, isSearching, loadMoreVideos]);

  // Cleanup observer on component unmount
  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, []);

  const handleVideoClick = (videoId, index) => {
    // Set the current index in the context
    setCurrentIndex(index);
    
    // Navigate to the video page
    navigate(`/video/${videoId}`);
  };

  // Format time since upload
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Recently';
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return 'Recently';
    }
  };

  // Toggle mobile promo for testing
  const toggleMobilePromo = () => {
    setShowMobilePromo(!showMobilePromo);
  };

  // Video Thumbnail Component with placeholder
  const VideoThumbnail = ({ video, index, isLastElement = false }) => {
    const cardRef = isLastElement ? lastVideoElementRef : null;
    
    return (
      <Card 
        ref={cardRef}
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          transition: 'transform 0.2s',
          '&:hover': {
            transform: 'scale(1.02)',
            boxShadow: (theme) => theme.shadows[4]
          }
        }}
      >
        <CardActionArea 
          onClick={() => handleVideoClick(video.video_id, index)}
          sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}
        >
          <Box sx={{ position: 'relative', paddingTop: '56.25%', width: '100%' }}>
            <CardMedia
              component="img"
              image={video.thumbnail_url || `https://picsum.photos/seed/${video.video_id}/640/360`} // Fallback to placeholder
              alt={video.title}
              sx={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%',
                objectFit: 'cover',
                backgroundColor: 'rgba(0,0,0,0.1)'
              }}
              onError={(e) => {
                e.target.src = `https://picsum.photos/seed/${video.video_id}/640/360`;
              }}
            />
            
            {/* Overlay with video info */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '8px',
                transition: 'background-color 0.3s',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                }
              }}
            >
              <Typography variant="subtitle2" noWrap fontWeight="bold">
                {video.title || "Untitled Video"}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                <Avatar 
                  src={video.creator_profile_picture}
                  alt={video.creator_username}
                  sx={{ width: 20, height: 20, mr: 0.5 }}
                />
                <Typography variant="caption" noWrap sx={{ flexGrow: 1 }}>
                  {video.creator_username || video.username || "Anonymous"}
                </Typography>
                
                <Box display="flex" alignItems="center" ml={1}>
                  <Visibility sx={{ fontSize: 16, mr: 0.5 }} />
                  <Typography variant="caption">
                    {formatViewCount(video.views || 0)}
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            {/* Video duration overlay */}
            {video.duration && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  borderRadius: 1,
                  padding: '2px 6px',
                  color: 'white',
                  fontSize: '0.75rem'
                }}
              >
                {formatDuration(video.duration)}
              </Box>
            )}
            
            {/* Play button overlay */}
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: 0,
                transition: 'opacity 0.2s',
                '&:hover': {
                  opacity: 1
                }
              }}
            >
              <PlayArrow sx={{ fontSize: 48, color: 'white' }} />
            </Box>
          </Box>
        </CardActionArea>
      </Card>
    );
  };

  // Mobile app promo component
  const MobileAppPromo = () => (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #121212 0%, #1e1e1e 100%)',
        px: 3,
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden' // Prevent overflow of decorative elements
      }}
    >
      {/* Logo and branding */}
      <Box 
        sx={{ 
          mb: 4,
          width: '80%',
          maxWidth: '300px'
        }}
      >
        <img 
          src="/logo.png" 
          alt="Horizontal Reels" 
          style={{ width: '100%', height: 'auto' }}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      </Box>

      {/* Main Heading */}
      <Typography
        variant="h4"
        color="white"
        fontWeight="bold"
        sx={{
          mb: 4,
          background: 'linear-gradient(90deg, #FF4081, #FF9100)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Welcome to the World's First Horizontal Reels Platform!
      </Typography>

      {/* Description */}
      <Typography
        variant="body1"
        color="white"
        sx={{
          mt: 2,
          mb: 4,
          maxWidth: '90%',
          mx: 'auto',
          fontSize: '1.1rem',
          lineHeight: 1.6
        }}
      >
        Thank you for your interest in exploring Horizontal Reels! To experience the true immersive quality of reels, please visit{' '}
        <Box 
          component="span" 
          sx={{ 
            fontWeight: 'bold',
            color: '#2CFF05',
            textDecoration: 'none'
          }}
          onClick={() => window.open('https://horizontalreels.com', '_blank')}
        >
          horizontalreels.com
        </Box>{' '}
        on a laptop or desktop.
      </Typography>

      {/* Coming soon message */}
      <Typography
        variant="body1"
        color="white"
        sx={{
          mb: 6,
          maxWidth: '90%',
          mx: 'auto',
          fontSize: '1.1rem',
          lineHeight: 1.6
        }}
      >
        We are working on bringing this revolutionary experience to mobile soon! Stay tuned for our app launch on the App Store & Play Store.
      </Typography>

      {/* App store indicators */}
      <Box sx={{ display: 'flex', gap: 3, mt: 1, mb: 4 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          color: 'white',
          padding: '8px 16px',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.05)'
        }}>
          App Store
        </Box>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          color: 'white',
          padding: '8px 16px',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.05)'
        }}>
          Google Play
        </Box>
      </Box>

      {/* Continue to website button */}
      <Button 
        variant="contained"
        sx={{
          mt: 2,
          backgroundColor: '#2CFF05',
          color: '#000',
          fontWeight: 'bold',
          padding: '12px 24px',
          '&:hover': {
            backgroundColor: '#25CC04'
          }
        }}
        onClick={toggleMobilePromo}
      >
        Continue to Website Anyway
      </Button>
    </Box>
  );

  if (showMobilePromo) {
    return <MobileAppPromo />;
  }

  const displayVideos = isSearching ? searchResults : videos;
  const isLoading = isSearching ? searchLoading : loading;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, pb: 8 }}>
      {isSearching && (
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5">
            Search results for: "{searchQuery}"
          </Typography>
          <Button onClick={() => navigate('/')}>
            Clear Search
          </Button>
        </Box>
      )}

      {isLoading && displayVideos.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {displayVideos.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
              <Typography variant="h6" color="text.secondary">
                {isSearching ? "No results found" : "No videos available"}
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {displayVideos.map((video, index) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={`${video.video_id}-${index}`}>
                  <VideoThumbnail 
                    video={video} 
                    index={index}
                    isLastElement={index === displayVideos.length - 1 && !isSearching}
                  />
                </Grid>
              ))}
            </Grid>
          )}
          
          {/* Loading indicator for infinite scroll */}
          {(loading || hasMore) && !isSearching && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
              <CircularProgress size={30} />
            </Box>
          )}
          
          {error && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Typography color="error">{error}</Typography>
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default HomePage;
