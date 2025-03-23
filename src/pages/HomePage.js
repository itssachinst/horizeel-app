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
  Stack,
  Button
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { fetchVideos, searchVideos } from "../api";
import { Visibility, Person, PhoneIphone, Android } from "@mui/icons-material";
import { alpha } from '@mui/material/styles';
import { formatDistanceToNow } from 'date-fns';

const HomePage = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
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
    setVideos([]);
    setPage(0);
    setHasMore(true);
    
    const queryParams = new URLSearchParams(location.search);
    const query = queryParams.get('q');

    if (query) {
      setSearchQuery(query);
      setIsSearching(true);
      loadVideos(query, 0);
    } else {
      setSearchQuery('');
      setIsSearching(false);
      loadVideos("", 0);
    }
  }, [location.search]);

  const loadVideos = async (query = "", currentPage = page) => {
    if (currentPage === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const skip = currentPage * ITEMS_PER_PAGE;
      let videosData;
      
      if (query) {
        videosData = await searchVideos(query, skip, ITEMS_PER_PAGE);
      } else {
        videosData = await fetchVideos(skip, ITEMS_PER_PAGE);
      }
      
      if (videosData.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }
      
      // Add debug logging to see video object structure
      if (videosData && videosData.length > 0) {
        console.log("Sample video data structure:", videosData[0]);
      }
      
      setVideos(prevVideos => 
        currentPage === 0 ? videosData : [...prevVideos, ...videosData]
      );
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Set up the intersection observer for infinite scrolling
  const lastVideoElementRef = useCallback(node => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
        loadVideos(searchQuery, page + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore, searchQuery, page]);

  const handleVideoClick = (videoId) => {
    navigate(`/video/${videoId}`);
  };

  // Format time since upload
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Recently';
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  // Toggle mobile promo for testing
  const toggleMobilePromo = () => {
    setShowMobilePromo(!showMobilePromo);
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
        position: 'relative'
      }}
    >
      {/* Logo placeholder */}
      <Box 
        sx={{ 
          width: 80, 
          height: 80, 
          borderRadius: '50%',
          background: theme.palette.primary.main,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
          boxShadow: '0 0 20px rgba(0,150,255,0.5)'
        }}
      >
        <Typography variant="h4" color="white" fontWeight="bold">H</Typography>
      </Box>
      
      <Typography 
        variant="h4" 
        color="white" 
        fontWeight="bold" 
        sx={{ 
          mb: 1,
          background: 'linear-gradient(90deg, #2196F3, #00E5FF)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textTransform: 'uppercase'
        }}
      >
        Get Ready
      </Typography>
      
      <Typography variant="h5" color="white" gutterBottom>
        Our Mobile App is Coming Soon!
      </Typography>
      
      <Typography 
        variant="body1" 
        color="text.secondary" 
        sx={{ 
          mt: 2, 
          mb: 4, 
          maxWidth: '90%',
          mx: 'auto' 
        }}
      >
        We're building an amazing mobile experience for you.
        Watch, share, and discover incredible videos on the go!
      </Typography>
      
      {/* App store badges */}
      <Stack 
        direction="row" 
        spacing={2} 
        justifyContent="center"
        sx={{ mt: 3 }}
      >
        <Box
          sx={{
            p: 1.5,
            px: 2,
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.2)'
          }}
        >
          <PhoneIphone sx={{ mr: 1, color: 'white' }} />
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">Available soon on</Typography>
            <Typography variant="body2" color="white">App Store</Typography>
          </Box>
        </Box>
        <Box
          sx={{
            p: 1.5,
            px: 2,
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.2)'
          }}
        >
          <Android sx={{ mr: 1, color: 'white' }} />
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">Available soon on</Typography>
            <Typography variant="body2" color="white">Google Play</Typography>
          </Box>
        </Box>
      </Stack>
      
      <Box
        sx={{
          mt: 6,
          p: 2,
          borderRadius: 2,
          backgroundColor: 'rgba(255,255,255,0.05)',
          maxWidth: '90%'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          For the full experience, please visit us on your desktop or laptop browser.
        </Typography>
        <Button 
          variant="outlined" 
          color="primary" 
          size="small" 
          sx={{ mt: 2 }}
          onClick={toggleMobilePromo}
        >
          Continue to Website Anyway
        </Button>
      </Box>
      
      {/* Decorative elements */}
      <Box
        sx={{
          position: 'absolute',
          top: 20,
          right: 20,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)'
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: 50,
          left: 30,
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)'
        }}
      />
    </Box>
  );

  // Show mobile app promo if on mobile browser
  if (showMobilePromo) {
    return <MobileAppPromo />;
  }

  return (
    <Container 
      maxWidth="xl" 
      sx={{ 
        mt: { xs: '-8px', sm: '-16px' }, // Smaller negative margin on mobile
        pt: 0, 
        pb: { xs: 2, sm: 3 }, 
        bgcolor: '#000',
        overflow: 'hidden', // Prevent horizontal scrollbar
        px: { xs: 1, sm: 2, md: 3 } // Responsive horizontal padding
      }}
      disableGutters // Remove default container padding
    >
      {isSearching && (
        <Box 
          mb={{ xs: 1.5, sm: 3 }} 
          mt={{ xs: 1, sm: 2 }}
          px={{ xs: 1, sm: 0 }}
        >
          <Typography 
            variant={isMobile ? "h6" : "h5"} 
            color="white" 
            sx={{ mb: 0.5 }}
          >
            {searchQuery.startsWith('#') ? (
              <>Results for {searchQuery}</>
            ) : (
              <>Search results for "{searchQuery}"</>
            )}
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary"
            fontSize={{ xs: '0.8rem', sm: '0.875rem' }}
          >
            Found {videos.length} video{videos.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      )}
      
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={{ xs: '40vh', sm: '50vh' }}>
          <CircularProgress />
        </Box>
      ) : videos.length === 0 ? (
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          minHeight={{ xs: '40vh', sm: '50vh' }}
          flexDirection="column"
          px={2}
        >
          <Typography variant={isMobile ? "h6" : "h5"} color="white" sx={{ mb: 1 }}>
            No videos found
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary"
            textAlign="center"
            fontSize={{ xs: '0.9rem', sm: '1rem' }}
          >
            {isSearching ? 
              `We couldn't find any videos matching "${searchQuery}"` : 
              "No videos available at the moment"}
          </Typography>
        </Box>
      ) : (
        <Grid 
          container 
          spacing={{ xs: 2, sm: 3 }} 
          sx={{ mt: 0 }}
        >
          {videos.map((video, index) => (
            <Grid 
              item 
              xs={6} // 2 columns on mobile
              sm={4} // 3 columns on small screens and above
              md={4} // 3 columns on medium screens
              lg={4} // 3 columns on large screens
              key={video.video_id}
              ref={index === videos.length - 1 ? lastVideoElementRef : null}
            >
              <Card
                onClick={() => handleVideoClick(video.video_id)}
                sx={{ 
                  cursor: 'pointer',
                  transition: isMobile ? 'none' : 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: isMobile ? 'none' : 'translateY(-8px)',
                    boxShadow: isMobile ? 'none' : '0 8px 16px rgba(0,0,0,0.2)'
                  },
                  backgroundColor: '#121212',
                  borderRadius: { xs: 1, sm: 2 },
                  overflow: 'hidden',
                  position: 'relative',
                  height: '100%'
                }}
              >
                <CardMedia
                  component="img"
                  height={isMobile ? "180" : "220"}
                  image={video.thumbnail_url || "https://via.placeholder.com/640x360"}
                  alt={video.title}
                  sx={{ 
                    objectFit: 'cover',
                    position: 'relative' 
                  }}
                />

                {/* Overlay information directly on the thumbnail */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.8) 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    p: { xs: 1, sm: 1.5 }
                  }}
                >
                  {/* Top row: Title and views */}
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    {/* Title in top-left */}
                    <Typography
                      variant={isMobile ? "caption" : "body2"}
                      sx={{
                        color: 'white',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: 1.2,
                        fontWeight: 'bold',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                        maxWidth: '70%'
                      }}
                    >
                      {video.title}
                    </Typography>

                    {/* Views in top-right */}
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        bgcolor: 'rgba(0,0,0,0.5)',
                        px: 0.8,
                        py: 0.3,
                        borderRadius: 1
                      }}
                    >
                      <Visibility
                        sx={{
                          fontSize: { xs: 12, sm: 14 },
                          color: 'white',
                          mr: 0.5
                        }}
                      />
                      <Typography
                        variant="caption"
                        color="white"
                        fontSize={{ xs: '0.65rem', sm: '0.7rem' }}
                        sx={{ fontWeight: 'medium' }}
                      >
                        {video.views || 0}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Bottom row: Creator info */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Avatar
                      src={video.profile_picture}
                      alt={video.username}
                      sx={{
                        width: { xs: 24, sm: 28 },
                        height: { xs: 24, sm: 28 },
                        border: '1px solid rgba(255,255,255,0.5)',
                        mr: 1
                      }}
                    >
                      <Person fontSize="small" />
                    </Avatar>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'white',
                        fontSize: { xs: '0.7rem', sm: '0.75rem' },
                        fontWeight: 500,
                        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {video.username || "Anonymous"}
                    </Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>
          ))}
          
          {loadingMore && (
            <Grid item xs={12}>
              <Box display="flex" justifyContent="center" p={{ xs: 1, sm: 2 }}>
                <CircularProgress size={isMobile ? 24 : 30} />
              </Box>
            </Grid>
          )}
        </Grid>
      )}
    </Container>
  );
};

export default HomePage;
