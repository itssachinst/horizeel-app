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
  CardActionArea,
  Link
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { searchVideos } from "../api";
import { Visibility, Person, PlayArrow, ArrowBack } from "@mui/icons-material";
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
  const [isDemo, setIsDemo] = useState(false);
  
  const observer = useRef();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const ITEMS_PER_PAGE = 20;

  // Check if we're in demo mode
  useEffect(() => {
    setIsDemo(location.pathname.startsWith('/demo'));
  }, [location.pathname]);

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
          },
          backgroundColor: '#121212',
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        <CardActionArea 
          onClick={() => handleVideoClick(video.video_id, index)}
          sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}
        >
          <Box sx={{ position: 'relative', width: '100%', paddingTop: '56.25%' /* 16:9 aspect ratio */ }}>
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
                objectFit: 'cover'
              }}
              onError={(e) => {
                e.target.src = `https://picsum.photos/seed/${video.video_id}/640/360`;
              }}
            />
            
            {/* Overlay with title (top left) and views (top right) */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                padding: '8px',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}
            >
              {/* Title on top left */}
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  color: 'white', 
                  fontWeight: 'bold',
                  maxWidth: '70%',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.7)'
                }}
              >
                {video.title || "Untitled Video"}
              </Typography>
              
              {/* Views on top right */}
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                <Visibility sx={{ fontSize: 16, mr: 0.5, color: 'white' }} />
                <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>
                  {formatViewCount(video.views || 0)}
                </Typography>
              </Box>
            </Box>
            
            {/* Video duration overlay - keep this in bottom right corner */}
            {video.duration && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 8,
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
            
            {/* User details at the bottom */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '8px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Avatar 
                src={video.creator_profile_picture}
                alt={video.creator_username}
                sx={{ width: 24, height: 24, mr: 1 }}
              />
              <Typography variant="caption" sx={{ color: 'white', fontWeight: 'medium', flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {video.creator_username || video.username || "Anonymous"}
              </Typography>
            </Box>
            
            {/* Play button overlay */}
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: 0,
                transition: 'opacity 0.3s',
                '&:hover': {
                  opacity: 1
                },
                backgroundColor: 'rgba(0,0,0,0.5)',
                borderRadius: '50%',
                padding: '8px'
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
    <Container maxWidth="xl" sx={{ pt: 2, pb: 8 }}>
      {showMobilePromo && <MobileAppPromo />}
      
      {isSearching && (
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5">
            Search results for: "{searchQuery}"
          </Typography>
          <Button onClick={() => navigate('/demo/')}>
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
            <Grid container spacing={3}>
              {displayVideos.map((video, index) => (
                <Grid item xs={12} sm={6} md={4} key={`${video.video_id}-${index}`}>
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
