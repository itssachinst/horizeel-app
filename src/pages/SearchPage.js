import React, { useState, useEffect, useMemo } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Grid, 
  Card, 
  CardMedia, 
  CardContent, 
  Chip,
  CircularProgress,
  Divider,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { searchVideos } from '../api';
import { 
  Visibility, 
  Tag, 
  SortRounded, 
  FilterList, 
  Search as SearchIcon 
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';

const SearchPage = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('relevance');
  const [relatedHashtags, setRelatedHashtags] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  
  // Extract the search query from URL
  const query = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const searchQuery = params.get('q') || '';
    // Decode the URI component to handle special characters
    return decodeURIComponent(searchQuery);
  }, [location.search]);
  
  // Check if searching for a hashtag
  const isHashtagSearch = query.startsWith('#');
  
  // Function to load search results
  const loadSearchResults = async () => {
    if (!query.trim()) {
      setVideos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const results = await searchVideos(query);
      
      // Check if results is an array
      if (Array.isArray(results)) {
        setVideos(results);
        
        // Extract and count all hashtags from the results
        if (results.length > 0) {
          const hashtagCounts = {};
          
          results.forEach(video => {
            if (!video.description) return;
            
            const hashtagRegex = /#[\w]+/g;
            const matches = video.description.match(hashtagRegex) || [];
            
            matches.forEach(hashtag => {
              // Don't include the current search hashtag in related
              if (hashtag.toLowerCase() !== query.toLowerCase()) {
                hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + 1;
              }
            });
          });
          
          // Convert to array and sort by frequency
          const sortedHashtags = Object.entries(hashtagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10) // Limit to top 10
            .map(([tag]) => tag);
            
          setRelatedHashtags(sortedHashtags);
        }
      } else {
        console.error('Invalid search results format:', results);
        setError('Invalid response format from server');
        setVideos([]);
      }
    } catch (err) {
      console.error('Error searching videos:', err);
      setError(err.message || 'Failed to load search results. Please try again.');
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Load results when query changes
  useEffect(() => {
    loadSearchResults();
  }, [query]);
  
  // Function to handle video click
  const handleVideoClick = (videoId) => {
    navigate(`/video/${videoId}`);
  };
  
  // Function to handle hashtag click
  const handleHashtagClick = (hashtag) => {
    navigate(`/search?q=${encodeURIComponent(hashtag)}`);
  };
  
  // Function to sort videos
  const sortedVideos = useMemo(() => {
    if (!videos.length) return [];
    
    let sorted = [...videos];
    switch (sortBy) {
      case 'views':
        sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'likes':
        sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        break;
      case 'newest':
        sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      default:
        // relevance is default, keep original ordering
        break;
    }
    
    return sorted;
  }, [videos, sortBy]);
  
  // Function to render hashtags from description
  const renderDescriptionWithHashtags = (description) => {
    if (!description) return null;
    
    // Regular expression to find hashtags
    const hashtagRegex = /#[\w]+/g;
    const matches = description.match(hashtagRegex) || [];
    
    if (matches.length === 0) {
      return <span>{description}</span>;
    }
    
    // Extract hashtags and split description into segments
    let lastIndex = 0;
    const segments = [];
    
    matches.forEach(match => {
      const index = description.indexOf(match, lastIndex);
      if (index > lastIndex) {
        segments.push({
          type: 'text',
          content: description.substring(lastIndex, index)
        });
      }
      segments.push({
        type: 'hashtag',
        content: match
      });
      lastIndex = index + match.length;
    });
    
    // Add remaining text
    if (lastIndex < description.length) {
      segments.push({
        type: 'text',
        content: description.substring(lastIndex)
      });
    }
    
    // Render the segments
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 }}>
        {segments.map((segment, index) => (
          segment.type === 'hashtag' ? (
            <Chip
              key={index}
              size="small"
              label={segment.content}
              icon={<Tag fontSize="small" />}
              onClick={(e) => {
                e.stopPropagation();
                handleHashtagClick(segment.content);
              }}
              sx={{
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.2),
                }
              }}
            />
          ) : (
            <span key={index}>{segment.content}</span>
          )
        ))}
      </Box>
    );
  };
  
  return (
    <Container maxWidth="xl" sx={{ py: 3, bgcolor: '#000', minHeight: '100vh' }}>
      {/* Search header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" color="white" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
          {isHashtagSearch ? (
            <>
              <Tag sx={{ mr: 1, color: theme.palette.primary.main }} />
              {query}
            </>
          ) : (
            <>
              <SearchIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
              Search results for "{query}"
            </>
          )}
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Found {videos.length} video{videos.length !== 1 ? 's' : ''}
        </Typography>
        
        {relatedHashtags.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" color="white" sx={{ mb: 1 }}>
              Related Hashtags
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {relatedHashtags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  icon={<Tag fontSize="small" />}
                  onClick={() => handleHashtagClick(tag)}
                  color="primary"
                  variant="outlined"
                  sx={{
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    }
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
        
        <Divider sx={{ my: 2, backgroundColor: alpha('#fff', 0.1) }} />
        
        {/* Sort options */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="sort-label" sx={{ color: 'text.secondary' }}>Sort By</InputLabel>
            <Select
              labelId="sort-label"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              label="Sort By"
              startAdornment={<SortRounded sx={{ mr: 1, color: 'text.secondary' }} />}
              sx={{ color: 'white' }}
            >
              <MenuItem value="relevance">Relevance</MenuItem>
              <MenuItem value="views">Most Views</MenuItem>
              <MenuItem value="likes">Most Likes</MenuItem>
              <MenuItem value="newest">Newest</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>
      
      {/* Results */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <Typography color="error" align="center">
            {error}
          </Typography>
        </Box>
      ) : videos.length === 0 ? (
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="300px">
          <Typography variant="h5" color="white" sx={{ mb: 2 }}>
            No videos found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            We couldn't find any videos matching "{query}"
          </Typography>
          <Button variant="contained" color="primary" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {sortedVideos.map((video) => (
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

export default SearchPage; 