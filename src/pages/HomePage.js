import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Link,
  IconButton,
  Fade,
  Grow
} from "@mui/material";
import {
  PlayArrow,
  Visibility,
  PlayCircleOutline,
  TrendingUp,
  MusicNote,
  Flight,
  Restaurant,
  SportsEsports,
  Movie,
  Palette,
  Nature,
  DirectionsCar,
  School
} from "@mui/icons-material";
import { styled, alpha } from '@mui/material/styles';
import { useNavigate, useLocation } from "react-router-dom";
import { searchVideos } from "../api";
import { formatDistanceToNow } from 'date-fns';
import { useVideoContext } from "../contexts/VideoContext";
import { formatViewCount, formatDuration } from "../utils/videoUtils";
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';

// Styled components for the modern layout
const TopTenSidebar = styled(Box)(({ theme }) => ({
  position: 'fixed',
  left: 0,
  top: 65,
  width: 420,
  height: 'calc(100vh - 80px)',
  background: 'rgba(0, 0, 0, 0.8)',
  backdropFilter: 'blur(20px)',
  borderRight: '1px solid rgba(255, 255, 255, 0.1)',
  padding: theme.spacing(3),
  overflowY: 'auto',
  zIndex: 1000,
  [theme.breakpoints.down('lg')]: {
    display: 'none',
  },
  // Custom scrollbar styling for WebKit browsers (Chrome, Safari, Edge)
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '3px',
    transition: 'background 0.3s ease',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: 'rgba(255, 255, 255, 0.2)',
  },
  '&::-webkit-scrollbar-thumb:active': {
    background: 'rgba(189, 250, 3, 0.3)',
  },
  // Firefox scrollbar styling
  scrollbarWidth: 'thin',
  scrollbarColor: 'rgba(255, 255, 255, 0.1) transparent',
  '&:hover': {
    scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent',
  },
}));

const MainContent = styled(Box)(({ theme }) => ({
  marginLeft: 420,
  paddingTop: theme.spacing(9), // Add padding for fixed header
  paddingLeft: theme.spacing(1),
  paddingRight: theme.spacing(1),
  paddingBottom: theme.spacing(1),
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
  overflowY: 'auto',
  [theme.breakpoints.down('lg')]: {
    marginLeft: 0,
    paddingTop: theme.spacing(9), // Consistent header spacing
  },
  // Custom scrollbar styling for WebKit browsers (Chrome, Safari, Edge)
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '4px',
    transition: 'background 0.3s ease',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: 'rgba(255, 255, 255, 0.15)',
  },
  '&::-webkit-scrollbar-thumb:active': {
    background: 'rgba(189, 250, 3, 0.2)',
  },
  // Firefox scrollbar styling
  scrollbarWidth: 'thin',
  scrollbarColor: 'rgba(255, 255, 255, 0.05) transparent',
  '&:hover': {
    scrollbarColor: 'rgba(255, 255, 255, 0.15) transparent',
  },
}));

const GlassCard = styled(Card)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(15px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '16px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(189, 250, 3, 0.2)',
    border: '1px solid rgba(189, 250, 3, 0.3)',
  },
}));

// Category data with icons
const CATEGORIES = [
  { name: 'Trending', icon: TrendingUp },
  { name: 'Music', icon: MusicNote },
  { name: 'Travel', icon: Flight },
  { name: 'Food', icon: Restaurant },
  { name: 'Gaming', icon: SportsEsports },
  { name: 'Movies', icon: Movie },
  { name: 'Art', icon: Palette },
  { name: 'Nature', icon: Nature },
  { name: 'Cars', icon: DirectionsCar },
  { name: 'Education', icon: School },
];

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

  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);

  const observer = useRef();
  const loadMoreRef = useRef();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg'));

  // Generate top 10 videos from current videos - memoized
  const topVideos = useMemo(() => {
    if (videos.length > 0) {
      return [...videos]
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 10);
    }
    return [];
  }, [videos]);

  // Memoized handlers to prevent unnecessary re-renders
  const handleVideoClick = useCallback((videoId, index) => {
    setCurrentIndex(index);
    navigate(`/reels/${videoId}`);
  }, [setCurrentIndex, navigate]);

  const handleSearch = useCallback(async (query) => {
    if (!query.trim()) return;
    setSearchLoading(true);
    try {
      const results = await searchVideos(query, 0, 20);
      setSearchResults(results || []);
      setIsSearching(true);
    } catch (error) {
      console.error("Error searching videos:", error);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Infinite scroll implementation for homepage
  const lastVideoElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading && !isSearching) {
        console.log('Loading more videos from HomePage...');
            loadMoreVideos();
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, loadMoreVideos, isSearching]);

  // Infinite scroll implementation for home page
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop + 1000 >= document.documentElement.offsetHeight) {
        if (hasMore && !loading && !isSearching) {
          console.log('Loading more videos from HomePage scroll...');
          loadMoreVideos();
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loading, loadMoreVideos, isSearching]);

  // Top 10 Sidebar Component - memoized to prevent unnecessary re-renders
  const TopTenSidebarComponent = useCallback(() => (
    <TopTenSidebar>
      {topVideos.map((video, index) => (
        <Grow key={video.video_id} in timeout={300 + index * 100}>
          <Box
            sx={{
              mb: 2,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
              '&:hover .thumbnail-card': {
                transform: 'translateX(8px)',
                background: 'rgba(255, 255, 255, 0.12)',
              }
            }}
            onClick={() => handleVideoClick(video.video_id, index)}
          >
            {/* Netflix-Style Ranking Number - Left-Center Positioned */}
            <Box
              sx={{
                position: 'absolute',
                left: -15, // Offset to stick out beyond thumbnail
                top: '50%',
                transform: 'translateY(-50%)', // Center vertically
                zIndex: 10,
                width: 60,
                height: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography
                sx={{
                  color: '#BDFA03',
                  fontFamily: 'Roboto',
                  fontWeight: 'bold', // Bold weight as requested
                  fontSize: '6rem',
                  lineHeight: 1,
                  filter: 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.8))',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
                }}
              >
                {index + 1}
              </Typography>
            </Box>

            {/* Thumbnail Card Container */}
            <GlassCard
              className="thumbnail-card"
              sx={{
                flex: 1,
                ml: 2, // Margin to accommodate the ranking number
                background: 'rgba(255, 255, 255, 0.12)',
                transition: 'all 0.3s ease',
                borderRadius: '12px',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5 }}>
                {/* Video Thumbnail */}
                <Box sx={{ position: 'relative', width: 380, height: 160, borderRadius: '12px', overflow: 'hidden' }}>
                  <CardMedia
                    component="img"
                    image={video.thumbnail_url || `https://picsum.photos/seed/${video.video_id}/240/135`}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.3s ease',
                      '&:hover': {
                        transform: 'scale(1.05)',
                      }
                    }}
                  />

                  {/* Play Icon Overlay */}
                  <Box
                sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      opacity: 0,
                      transition: 'opacity 0.3s ease',
                      '&:hover': {
                        opacity: 1,
                      },
                    }}
                  >
                    <PlayCircleOutline
                      sx={{
                        color: 'white',
                        fontSize: 32,
                        filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8))',
                      }}
                    />
            </Box>

                  {/* View Count Badge */}
            <Box
              sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      background: 'rgba(0, 0, 0, 0.8)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '12px',
                      padding: '2px 6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    <Visibility sx={{ fontSize: 10, color: 'white' }} />
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'white',
                        fontFamily: 'Roboto',
                        fontSize: '10px',
                        fontWeight: 500,
                      }}
                    >
                      {formatViewCount(video.views || 0)}
                    </Typography>
                  </Box>
                </Box>
            </Box>
            </GlassCard>
          </Box>
        </Grow>
      ))}
    </TopTenSidebar>
  ), [topVideos, handleVideoClick]);

  // Featured Video Component
  const FeaturedVideo = () => (
    <GlassCard
      sx={{
        mb: 1,
        height: 520,
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
      }}
    >
      <CardMedia
        component="img"
        image="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />

      {/* Overlay */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          textAlign: 'left',
          p: 2,
        }}
      >
      <Typography
          sx={{
            color: 'white',
            fontWeight: 'bold',
            fontFamily: 'Roboto',
            fontSize: '3.2rem',
            paddingBottom: '20px',
            textShadow: '0 4px 20px rgba(0, 0, 0, 0.8)',
            background: 'linear-gradient(90deg, #BDFA03, #BEFF03)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Experience the world's first horizontal reels
      </Typography>

        <Button
          variant="contained"
          size="large"
          startIcon={
        <Box
          sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'inset 0 0 4px rgba(255,255,255,0.6)',
              }}
            >
              <PlayArrow sx={{ color: '#000000' }} />
        </Box>
          }
          onClick={() => videos.length > 0 && handleVideoClick(videos[0].video_id, 0)}
          sx={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.6), rgba(200,200,200,0.3))',
            color: '#000000',
            fontWeight: 'bold',
            fontFamily: 'Roboto',
            px: 1,
            py: 1,
            borderRadius: '50px',
            fontSize: '1.1rem',
            textTransform: 'uppercase',
            width: '170px',
            minWidth: '160px',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
            '&:hover': {
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.7), rgba(180,180,180,0.4))',
              transform: 'translateY(-1px)',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          Watch Now
        </Button>
      </Box>
    </GlassCard>
  );

  // Video Grid Component
  const VideoGrid = () => {
    const displayVideos = isSearching ? searchResults : videos.slice(10); // Skip first video as it's featured

  return (
      <Grid container spacing={3}>
        {displayVideos.map((video, index) => {
          const isLast = index === displayVideos.length - 1;
          return (
            <Grid
              item
              xs={12}
              sm={6}
              md={4}
              key={video.video_id}
              ref={isLast ? lastVideoElementRef : null}
            >
              <GlassCard
                sx={{
                  height: 210, // Match image height only
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onClick={() => handleVideoClick(video.video_id, index + 1)}
              >
                <CardMedia
                  component="img"
                  image={video.thumbnail_url || `https://picsum.photos/seed/${video.video_id}/400/225`}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />

                {/* Views Count - Top Right Overlay */}
        <Box 
          sx={{ 
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '12px',
                    padding: '4px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <Visibility sx={{ fontSize: 12, color: 'white' }} />
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'white',
                      fontFamily: 'Roboto, sans-serif',
                      fontSize: '11px',
                      fontWeight: 500,
                    }}
                  >
                    {formatViewCount(video.views || 0)}
                  </Typography>
        </Box>

                {/* Duration Badge - Top Left */}
                {video.duration && (
        <Box
          sx={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      background: 'rgba(0, 0, 0, 0.7)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: '500',
                      fontFamily: 'Roboto, sans-serif',
                    }}
                  >
                    {formatDuration(video.duration)}
        </Box>
      )}

                {/* Title - Bottom Left Overlay */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.8))',
                    padding: '20px 12px 12px 12px',
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      color: 'white',
                      fontFamily: 'Roboto, sans-serif',
                      fontWeight: 600,
                      fontSize: '14px',
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
                    }}
                  >
                    {video.title || "Untitled Video"}
                  </Typography>
                </Box>
              </GlassCard>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  if (loading && videos.length === 0) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
      }}>
        <CircularProgress sx={{ color: '#BDFA03' }} />
        </Box>
    );
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
    }}>
      <Header 
        variant="home"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearch={handleSearch}
        showSearch={true}
      />

      {!isMobile && !isTablet && <TopTenSidebarComponent />}

      <MainContent>
        <Box sx={{ pt: 2 }}>
          {/* Search Results Header */}
          {isSearching && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', mb: 2 }}>
                Search results for: "{searchQuery}"
              </Typography>
              <Button
                onClick={() => {
                  setIsSearching(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                sx={{
                  background: 'rgba(189, 250, 3, 0.1)',
                  color: '#BDFA03',
                  border: '1px solid rgba(189, 250, 3, 0.3)',
                  '&:hover': {
                    background: 'rgba(189, 250, 3, 0.2)',
                  }
                }}
              >
                Clear Search
              </Button>
            </Box>
          )}

          {/* Featured Video */}
          {!isSearching && <FeaturedVideo />}

          {/* Video Grid */}
          <VideoGrid />

          {/* Load More Videos Button */}
          {!isSearching && hasMore && videos.length > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
              <Button
                variant="contained"
                onClick={() => {
                  console.log('Manual load more videos clicked');
                  loadMoreVideos();
                }}
                disabled={loading}
                sx={{
                  background: 'rgba(189, 250, 3, 0.9)',
                  color: 'black',
                  fontWeight: 'bold',
                  fontFamily: 'Roboto',
                  px: 4,
                  py: 1.5,
                  borderRadius: '25px',
                  fontSize: '1rem',
                  textTransform: 'none',
                  '&:hover': {
                    background: 'rgba(189, 250, 3, 1)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 10px 30px rgba(189, 250, 3, 0.4)',
                  },
                  '&:disabled': {
                    background: 'rgba(189, 250, 3, 0.5)',
                    color: 'rgba(0, 0, 0, 0.5)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                {loading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={20} sx={{ color: 'black' }} />
                    Loading...
                  </Box>
                ) : (
                  `Load More Videos`
                )}
              </Button>
            </Box>
          )}

          {/* Loading indicator */}
          {(loading || searchLoading) && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress sx={{ color: '#BDFA03' }} />
            </Box>
          )}
        </Box>
      </MainContent>
    </Box>
  );
};

export default HomePage;