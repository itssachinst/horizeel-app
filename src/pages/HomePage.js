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
  Button
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { fetchVideos, searchVideos } from "../api";
import { Visibility, Person } from "@mui/icons-material";
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
        position: 'relative',
        overflow: 'hidden' // Prevent overflow of decorative elements
      }}
    >
      {/* Heading with emoji */}
      <Typography
        variant="h4"
        color="white"
        fontWeight="bold"
        sx={{
          mb: 2,
          background: 'linear-gradient(90deg, #FF4081, #FF9100)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textTransform: 'uppercase'
        }}
      >
        🎉 Get Ready for an Unmatched Video Experience!
      </Typography>

      {/* Subheading with emoji */}
      <Typography variant="h5" color="white" gutterBottom fontWeight="600">
        📱 Our Mobile App is Launching Soon!
      </Typography>

      {/* Description with enhanced text */}
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{
          mt: 2,
          mb: 4,
          maxWidth: '90%',
          mx: 'auto',
          fontSize: '1.1rem',
          lineHeight: 1.5
        }}
      >
        Your favorite horizontal video platform is coming to iOS and Android! Get ready to watch, share, and explore stunning videos on the go.
      </Typography>

      {/* Tagline with emoji */}
      <Typography
        variant="h6"
        color="white"
        sx={{
          mb: 4,
          background: 'linear-gradient(90deg, #00E5FF, #2196F3)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 'bold'
        }}
      >
        🔥 Seamless, Immersive, and Built for You!
      </Typography>

      {/* App store indicators */}
      <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="subtitle1" color="white" gutterBottom fontWeight="600">
          Coming Soon To:
        </Typography>
        <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            color: 'white',
            '&::before': {
              content: '"✅"',
              marginRight: '8px'
            }
          }}>
            App Store
          </Box>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            color: 'white',
            '&::before': {
              content: '"✅"',
              marginRight: '8px'
            }
          }}>
            Google Play
          </Box>
        </Box>
      </Box>

      {/* Info message */}
      <Box 
        sx={{ 
          mb: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      >
        <Typography variant="body2" sx={{ 
          color: '#90CAF9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '&::before': {
            content: '"🔹"',
            marginRight: '8px'
          }
        }}>
          For the best experience, visit us on your desktop or laptop.
        </Typography>
        <Typography variant="body2" sx={{ 
          color: '#FFB74D',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '&::before': {
            content: '"🔸"',
            marginRight: '8px'
          }
        }}>
          Or, continue browsing on mobile now!
        </Typography>
      </Box>

      {/* Enhanced CTA button with gradient and hover effect */}
      <Button
        variant="contained"
        size="large"
        onClick={toggleMobilePromo}
        sx={{
          mt: 2,
          py: 1.5,
          px: 4,
          borderRadius: '30px',
          background: 'linear-gradient(90deg, #FF4081, #FF9100)',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '1.1rem',
          boxShadow: '0 4px 20px rgba(255, 64, 129, 0.5)',
          position: 'relative',
          overflow: 'hidden',
          '&:hover': {
            background: 'linear-gradient(90deg, #FF9100, #FF4081)',
            transform: 'translateY(-3px)',
            boxShadow: '0 6px 25px rgba(255, 64, 129, 0.7)',
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            transition: 'all 0.5s',
          },
          '&:hover::before': {
            left: '100%',
          }
        }}
      >
        🔴 Continue to Website
      </Button>

      {/* Decorative elements */}
      <Box
        sx={{
          position: 'absolute',
          top: 20,
          right: 20,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(33,150,243,0.3) 0%, rgba(33,150,243,0) 70%)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          width: 150,
          height: 150,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,64,129,0.2) 0%, rgba(255,64,129,0) 70%)',
        }}
      />

      {/* Additional decorative elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '30%',
          left: '5%',
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: 'rgba(255,145,0,0.5)',
          filter: 'blur(5px)',
          animation: 'float 5s infinite ease-in-out',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '25%',
          right: '10%',
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: 'rgba(0,229,255,0.5)',
          filter: 'blur(4px)',
          animation: 'float 7s infinite ease-in-out',
        }}
      />

      {/* Add keyframe animations to the component */}
      <Box
        sx={{
          '@keyframes pulse': {
            '0%': {
              transform: 'scale(1)',
              opacity: 0.8
            },
            '50%': {
              transform: 'scale(1.1)',
              opacity: 0.4
            },
            '100%': {
              transform: 'scale(1)',
              opacity: 0.8
            }
          },
          '@keyframes float': {
            '0%': {
              transform: 'translateY(0px)'
            },
            '50%': {
              transform: 'translateY(-20px)'
            },
            '100%': {
              transform: 'translateY(0px)'
            }
          }
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
