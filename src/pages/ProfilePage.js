import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, Paper, Avatar, Button, Grid, Card, 
  CardMedia, CardContent, IconButton, TextField, Dialog, DialogTitle, 
  DialogContent, DialogActions, Snackbar, Alert, Tabs, 
  Tab, Divider, Chip, Tooltip, Badge, Stack, CircularProgress
} from '@mui/material';
import { 
  Edit, Save, Cancel, Delete, Bookmark, VideoLibrary, 
  VideoCall, ThumbUp, Visibility, DateRange, Instagram, 
  Twitter, Facebook, LinkedIn, BookmarkBorder, Error, Refresh
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { fetchVideos, deleteVideo, getSavedVideos, getFollowStats } from '../api';
import { useNavigate } from 'react-router-dom';
import { alpha } from '@mui/material/styles';

const ProfilePage = () => {
  const { currentUser, logout } = useAuth();
  const [userVideos, setUserVideos] = useState([]);
  const [savedVideos, setSavedVideos] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [updatedProfile, setUpdatedProfile] = useState({
    username: '',
    email: '',
    bio: '',
    social: {
      instagram: '',
      twitter: '',
      facebook: '',
      linkedin: ''
    }
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingUserVideos, setLoadingUserVideos] = useState(true);
  const [loadingSavedVideos, setLoadingSavedVideos] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const navigate = useNavigate();

  // Dummy data for enhancing UI (would come from the API in a real app)
  const joinDate = new Date(currentUser?.created_at || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const totalLikes = userVideos.reduce((sum, video) => sum + (video.likes || 0), 0);
  const totalViews = userVideos.reduce((sum, video) => sum + (video.views || 0), 0);

  useEffect(() => {
    if (currentUser) {
      console.log("Current user data:", currentUser);
      setUpdatedProfile({
        username: currentUser.username || '',
        email: currentUser.email || '',
        bio: currentUser.bio || "Hey there! I'm sharing my favorite videos here.",
        social: {
          instagram: currentUser.social?.instagram || '',
          twitter: currentUser.social?.twitter || '',
          facebook: currentUser.social?.facebook || '',
          linkedin: currentUser.social?.linkedin || ''
        }
      });
      
      // Load user data
      loadUserVideos();
      loadSavedVideos();
      loadFollowerCounts();
    }
  }, [currentUser]);

  const loadUserVideos = async () => {
    setLoadingUserVideos(true);
    try {
      console.log("Fetching user videos...");
      const allVideos = await fetchVideos();
      console.log("All videos fetched:", allVideos);
      
      // Check if currentUser is available
      if (!currentUser) {
        console.error("Current user is not available");
        setError("User not authenticated");
        setLoadingUserVideos(false);
        return;
      }
      
      console.log("Current user:", currentUser);
      console.log("Current user ID:", currentUser.user_id);
      
      // Log each video's user_id to check format
      console.log("Video user_ids:", allVideos.map(video => ({
        video_id: video.video_id,
        user_id: video.user_id,
        matches: video.user_id === currentUser.user_id
      })));
      
      // Filter videos belonging to the current user
      const filteredVideos = allVideos.filter(video => {
        // Check for strict equality
        const isMatch = video.user_id === currentUser.user_id;
        console.log(`Video ${video.video_id} user_id: ${video.user_id}, currentUser.user_id: ${currentUser.user_id}, match: ${isMatch}`);
        return isMatch;
      });
      
      console.log("Filtered user videos:", filteredVideos);
      setUserVideos(filteredVideos);
    } catch (error) {
      console.error("Error loading user videos:", error);
      setError("Failed to load your videos");
      showSnackbarMessage("Failed to load your videos", "error");
    } finally {
      setLoadingUserVideos(false);
    }
  };

  const loadSavedVideos = async () => {
    setLoadingSavedVideos(true);
    try {
      if (currentUser) {
        console.log("Fetching saved videos...");
        const videos = await getSavedVideos();
        console.log("Saved videos fetched:", videos);
        setSavedVideos(videos);
      } else {
        console.error("Cannot fetch saved videos - user not logged in");
      }
    } catch (error) {
      console.error("Error loading saved videos:", error);
      setError("Failed to load your saved videos");
      showSnackbarMessage("Failed to load your saved videos", "error");
    } finally {
      setLoadingSavedVideos(false);
    }
  };

  const loadFollowerCounts = async () => {
    try {
      if (currentUser) {
        const stats = await getFollowStats(currentUser.user_id);
        setFollowerCount(stats.followers_count);
        setFollowingCount(stats.following_count);
      }
    } catch (error) {
      console.error("Error loading follower counts:", error);
    }
  };

  // This effect updates isLoading based on the active tab
  useEffect(() => {
    if (activeTab === 0) {
      setIsLoading(loadingUserVideos);
    } else {
      setIsLoading(loadingSavedVideos);
    }
  }, [activeTab, loadingUserVideos, loadingSavedVideos]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested social object
    if (name.startsWith('social.')) {
      const socialField = name.split('.')[1];
      setUpdatedProfile({
        ...updatedProfile,
        social: {
          ...updatedProfile.social,
          [socialField]: value
        }
      });
    } else {
      setUpdatedProfile({
        ...updatedProfile,
        [name]: value,
      });
    }
  };

  const handleSaveProfile = () => {
    // TODO: Implement profile update
    console.log('Profile updated:', updatedProfile);
    setIsEditing(false);
    showSnackbarMessage("Profile updated successfully", "success");
    // This would make an API call to update the profile
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const confirmLogout = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleDeleteClick = (video) => {
    setSelectedVideo(video);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedVideo(null);
  };

  const handleDeleteVideo = async () => {
    if (!selectedVideo) return;
    
    setIsDeleting(true);
    try {
      await deleteVideo(selectedVideo.video_id);
      
      // Update the local state to remove the deleted video
      setUserVideos(userVideos.filter(video => video.video_id !== selectedVideo.video_id));
      showSnackbarMessage("Video deleted successfully", "success");
    } catch (error) {
      console.error("Error deleting video:", error);
      showSnackbarMessage("Failed to delete video", "error");
    } finally {
      setIsDeleting(false);
      handleCloseDeleteDialog();
    }
  };

  const handleRetry = () => {
    if (activeTab === 0) {
      loadUserVideos();
    } else {
      loadSavedVideos();
    }
  };

  const showSnackbarMessage = (message, severity = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setShowSnackbar(true);
  };

  const handleCloseSnackbar = () => {
    setShowSnackbar(false);
  };

  // Function to handle card click without triggering when delete button is clicked
  const handleCardClick = (event, videoId) => {
    // Only navigate if the click is not on a button or icon
    if (!event.target.closest('button') && !event.target.closest('svg')) {
      navigate(`/video/${videoId}`);
    }
  };

  // Render a video card
  const renderVideoCard = (video, showDeleteButton = false) => (
    <Grid item xs={12} sm={6} md={4} key={video.video_id}>
      <Card 
        sx={{ 
          borderRadius: 3,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: '0 12px 24px rgba(0,0,0,0.2)',
          },
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <CardMedia
            component="img"
            height="180"
            image={video.thumbnail_url || 'https://via.placeholder.com/640x360?text=Video+Thumbnail'}
            alt={video.title}
            onClick={(e) => handleCardClick(e, video.video_id)}
            sx={{ 
              transition: 'transform 0.5s ease',
              '&:hover': {
                transform: 'scale(1.05)'
              }
            }}
          />
          <Box 
            sx={{ 
              position: 'absolute', 
              bottom: 0, 
              left: 0, 
              right: 0, 
              background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
              p: 1,
              display: 'flex',
              justifyContent: 'flex-end'
            }}
          >
            <Chip 
              size="small" 
              label={video.duration || "3:45"} 
              sx={{ 
                backgroundColor: 'rgba(0,0,0,0.6)', 
                color: 'white',
                fontSize: '0.7rem'
              }} 
            />
          </Box>
        </Box>

        <CardContent 
          sx={{ color: 'white', flexGrow: 1, p: 2 }}
          onClick={(e) => handleCardClick(e, video.video_id)}
        >
          <Typography 
            variant="h6" 
            sx={{
              fontWeight: 'bold',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: 1.2,
              mb: 1
            }}
          >
            {video.title}
          </Typography>
          
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              mb: 2
            }}
          >
            {video.description}
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={1.5}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Visibility fontSize="small" sx={{ color: 'text.secondary', mr: 0.5 }} />
                <Typography variant="caption" color="text.secondary">
                  {video.views || 0}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ThumbUp fontSize="small" sx={{ color: 'text.secondary', mr: 0.5 }} />
                <Typography variant="caption" color="text.secondary">
                  {video.likes || 0}
                </Typography>
              </Box>
            </Stack>
            
            {showDeleteButton && (
              <IconButton 
                onClick={() => handleDeleteClick(video)}
                color="error"
                size="small"
                sx={{ 
                  backgroundColor: alpha('#f44336', 0.1),
                  '&:hover': { backgroundColor: alpha('#f44336', 0.2) }
                }}
              >
                <Delete fontSize="small" />
              </IconButton>
            )}
            
            {!showDeleteButton && (
              <IconButton
                size="small"
                sx={{ 
                  color: '#f50057',
                  backgroundColor: alpha('#f50057', 0.1),
                  '&:hover': { backgroundColor: alpha('#f50057', 0.2) }
                }}
              >
                <Bookmark fontSize="small" />
              </IconButton>
            )}
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );

  // Render Loading UI
  const renderLoading = () => (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px', 
        width: '100%' 
      }}
    >
      <CircularProgress color="primary" />
    </Box>
  );

  // Render Error UI
  const renderError = (message) => (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        py: 4,
        px: 2,
        backgroundColor: alpha('#f44336', 0.05),
        borderRadius: 2,
        border: `1px solid ${alpha('#f44336', 0.2)}`
      }}
    >
      <Error color="error" sx={{ fontSize: 60, mb: 2 }} />
      <Typography variant="h6" color="error" gutterBottom>
        Something went wrong
      </Typography>
      <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
        {message || "We couldn't load your content. Please try again."}
      </Typography>
      <Button 
        variant="contained" 
        color="primary" 
        onClick={handleRetry}
        startIcon={<Refresh />}
      >
        Try Again
      </Button>
    </Box>
  );

  const socialIcons = {
    instagram: <Instagram />,
    twitter: <Twitter />,
    facebook: <Facebook />,
    linkedin: <LinkedIn />
  };

  // Check if user is not authenticated
  if (!currentUser) {
    return (
      <Container maxWidth="md" sx={{ pt: 8, pb: 8, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Please log in to view your profile
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => navigate('/login')}
          sx={{ mt: 2 }}
        >
          Go to Login
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ pt: 4, pb: 8, bgcolor: '#000' }}>
      {/* Profile Header with Cover Image */}
      <Paper 
        elevation={0} 
        sx={{ 
          borderRadius: 4,
          overflow: 'hidden',
          mb: 4,
          background: 'transparent',
          boxShadow: 'none',
          position: 'relative',
        }}
      >
        {/* Cover image background */}
        <Box
          sx={{
            height: 200,
            width: '100%',
            background: 'linear-gradient(135deg, #3f51b5 0%, #f50057 100%)',
            position: 'relative',
            borderRadius: 4,
            mb: 10,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            p: 2
          }}
        >
          {/* Pattern overlay */}
          <Box 
            sx={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.1,
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10s-10-4.477-10-10 4.477-10 10-10zM10 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10S0 25.523 0 20s4.477-10 10-10zm10 8c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm40 40c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          
          {!isEditing && (
            <Button 
              variant="contained" 
              color="error" 
              onClick={confirmLogout}
              sx={{ 
                zIndex: 2,
                background: 'rgba(244, 67, 54, 0.8)',
                backdropFilter: 'blur(8px)',
                '&:hover': {
                  background: 'rgba(244, 67, 54, 0.9)',
                }
              }}
            >
              Logout
            </Button>
          )}
        </Box>

        {/* Profile info card overlay */}
        <Paper
          elevation={3}
          sx={{
            borderRadius: 4,
            p: 3,
            mx: 4,
            mt: -10,
            background: 'rgba(18, 18, 18, 0.95)',
            backdropFilter: 'blur(20px)',
            color: 'white',
            position: 'relative',
            zIndex: 10,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
          }}
        >
          <Grid container spacing={3}>
            {/* Left column - avatar and profile info */}
            <Grid item xs={12} md={8}>
              <Box sx={{ display: 'flex', gap: 3 }}>
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  badgeContent={
                    !isEditing ? (
                      <IconButton 
                        color="primary" 
                        onClick={handleEditToggle}
                        size="small"
                        sx={{ 
                          backgroundColor: '#3f51b5',
                          '&:hover': { backgroundColor: '#303f9f' } 
                        }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    ) : null
                  }
                >
                  <Avatar 
                    src={currentUser?.profile_picture || ""} 
                    alt={currentUser?.username}
                    sx={{ 
                      width: 120, 
                      height: 120, 
                      border: '4px solid #1e1e1e',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                    }}
                  />
                </Badge>
                
                <Box sx={{ flexGrow: 1 }}>
                  {isEditing ? (
                    <Box>
                      <TextField
                        label="Username"
                        name="username"
                        value={updatedProfile.username}
                        onChange={handleInputChange}
                        fullWidth
                        margin="normal"
                        InputLabelProps={{ style: { color: 'gray' } }}
                        InputProps={{ style: { color: 'white' } }}
                        sx={{ mb: 2 }}
                        variant="outlined"
                      />
                      <TextField
                        label="Email"
                        name="email"
                        value={updatedProfile.email}
                        onChange={handleInputChange}
                        fullWidth
                        margin="normal"
                        InputLabelProps={{ style: { color: 'gray' } }}
                        InputProps={{ style: { color: 'white' } }}
                        sx={{ mb: 2 }}
                        variant="outlined"
                      />
                      <TextField
                        label="Bio"
                        name="bio"
                        value={updatedProfile.bio}
                        onChange={handleInputChange}
                        multiline
                        rows={3}
                        fullWidth
                        margin="normal"
                        InputLabelProps={{ style: { color: 'gray' } }}
                        InputProps={{ style: { color: 'white' } }}
                        variant="outlined"
                      />
                    </Box>
                  ) : (
                    <>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                        {currentUser?.username}
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                        {currentUser?.email}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {updatedProfile.bio || "No bio available"}
                      </Typography>

                      <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        <Chip
                          icon={<DateRange fontSize="small" />}
                          label={`Joined ${joinDate}`}
                          size="small"
                          sx={{ 
                            backgroundColor: alpha('#ffffff', 0.1),
                            color: 'white' 
                          }}
                        />
                        
                        <Chip
                          icon={<VideoLibrary fontSize="small" />}
                          label={`${userVideos.length} Videos`}
                          size="small"
                          sx={{ 
                            backgroundColor: alpha('#3f51b5', 0.2),
                            color: 'white' 
                          }}
                        />
                        
                        <Chip
                          icon={<Bookmark fontSize="small" />}
                          label={`${savedVideos.length} Saved`}
                          size="small"
                          sx={{ 
                            backgroundColor: alpha('#f50057', 0.2),
                            color: 'white' 
                          }}
                        />
                      </Box>
                    </>
                  )}
                </Box>
              </Box>
            </Grid>
            
            {/* Right column - stats */}
            <Grid item xs={12} md={4}>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 2, 
                  background: alpha('#ffffff', 0.05),
                  borderRadius: 3,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}
              >
                <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
                  Channel Stats
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 1 }}>
                      <Typography variant="h4" color="primary">
                        {totalViews}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Views
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 1 }}>
                      <Typography variant="h4" color="primary">
                        {totalLikes}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Likes
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Box 
                      sx={{ 
                        textAlign: 'center', 
                        p: 1,
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: alpha('#ffffff', 0.05),
                          borderRadius: 1
                        }
                      }}
                      onClick={() => navigate(`/users/${currentUser.user_id}/followers`)}
                    >
                      <Typography variant="h4" color="primary">
                        {followerCount}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Followers
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Box 
                      sx={{ 
                        textAlign: 'center', 
                        p: 1,
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: alpha('#ffffff', 0.05),
                          borderRadius: 1
                        }
                      }}
                      onClick={() => navigate(`/users/${currentUser.user_id}/following`)}
                    >
                      <Typography variant="h4" color="primary">
                        {followingCount}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Following
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                
                {isEditing ? (
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      startIcon={<Save />}
                      onClick={handleSaveProfile}
                    >
                      Save Profile
                    </Button>
                    <Button 
                      variant="outlined" 
                      color="error" 
                      startIcon={<Cancel />}
                      onClick={handleEditToggle}
                    >
                      Cancel
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ mt: 2 }}>
                    <Button 
                      variant="contained" 
                      color="primary"
                      fullWidth
                      startIcon={<VideoCall />}
                      onClick={() => navigate('/upload')}
                    >
                      Upload Video
                    </Button>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
          
          {/* Social Media (Only visible when editing or if social links exist) */}
          {isEditing && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Social Media
              </Typography>
              <Grid container spacing={2}>
                {Object.keys(updatedProfile.social).map(platform => (
                  <Grid item xs={12} sm={6} key={platform}>
                    <TextField
                      label={platform.charAt(0).toUpperCase() + platform.slice(1)}
                      name={`social.${platform}`}
                      value={updatedProfile.social[platform]}
                      onChange={handleInputChange}
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <Box sx={{ mr: 1, color: 'text.secondary' }}>
                            {socialIcons[platform]}
                          </Box>
                        ),
                        style: { color: 'white' }
                      }}
                      InputLabelProps={{ style: { color: 'gray' } }}
                      variant="outlined"
                      placeholder={`Your ${platform} profile URL`}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Paper>
      </Paper>

      {/* Tabs for My Videos and Saved Videos */}
      <Box sx={{ mb: 4 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          aria-label="profile tabs"
          textColor="primary"
          indicatorColor="primary"
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              fontWeight: 'bold',
              fontSize: '1rem',
              textTransform: 'none',
              py: 2
            }
          }}
        >
          <Tab 
            label="My Videos" 
            icon={<VideoLibrary />} 
            iconPosition="start"
          />
          <Tab 
            label="Saved Videos" 
            icon={<Bookmark />} 
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* My Videos Tab Content */}
      {activeTab === 0 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white' }}>
              My Videos
            </Typography>
            
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => navigate('/upload')}
              startIcon={<VideoCall />}
              sx={{
                borderRadius: 2,
                px: 3
              }}
            >
              Upload New Video
            </Button>
          </Box>
          
          {loadingUserVideos ? (
            renderLoading()
          ) : error ? (
            renderError(error)
          ) : userVideos.length > 0 ? (
            <Grid container spacing={3}>
              {userVideos.map(video => renderVideoCard(video, true))}
            </Grid>
          ) : (
            <Paper 
              elevation={2}
              sx={{ 
                py: 6,
                px: 4, 
                textAlign: 'center',
                borderRadius: 4,
                background: 'linear-gradient(135deg, rgba(26,26,26,0.8) 0%, rgba(40,40,40,0.8) 100%)',
                backdropFilter: 'blur(10px)',
                color: 'white'
              }}
            >
              <VideoCall fontSize="large" sx={{ fontSize: 60, color: alpha('#3f51b5', 0.7), mb: 2 }} />
              <Typography variant="h5" sx={{ mb: 2 }}>
                Your channel is empty
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
                You haven't uploaded any videos yet. Start sharing your content with the world!
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                size="large"
                onClick={() => navigate('/upload')}
                startIcon={<VideoCall />}
                sx={{ borderRadius: 2, px: 4 }}
              >
                Upload Your First Video
              </Button>
            </Paper>
          )}
        </>
      )}

      {/* Saved Videos Tab Content */}
      {activeTab === 1 && (
        <>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white' }}>
              Saved Videos
            </Typography>
          </Box>
          
          {loadingSavedVideos ? (
            renderLoading()
          ) : error ? (
            renderError(error)
          ) : savedVideos.length > 0 ? (
            <Grid container spacing={3}>
              {savedVideos.map(video => renderVideoCard(video, false))}
            </Grid>
          ) : (
            <Paper 
              elevation={2}
              sx={{ 
                py: 6,
                px: 4, 
                textAlign: 'center',
                borderRadius: 4,
                background: 'linear-gradient(135deg, rgba(26,26,26,0.8) 0%, rgba(40,40,40,0.8) 100%)',
                backdropFilter: 'blur(10px)',
                color: 'white'
              }}
            >
              <Bookmark fontSize="large" sx={{ fontSize: 60, color: alpha('#f50057', 0.7), mb: 2 }} />
              <Typography variant="h5" sx={{ mb: 2 }}>
                No saved videos yet
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
                Browse videos and click the save button to add them to your collection.
              </Typography>
              <Button 
                variant="contained" 
                color="secondary" 
                size="large"
                onClick={() => navigate('/')}
                sx={{ borderRadius: 2, px: 4 }}
              >
                Browse Videos
              </Button>
            </Paper>
          )}
        </>
      )}

      {/* Logout Confirmation Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        PaperProps={{
          style: {
            backgroundColor: '#212121',
            color: 'white',
            borderRadius: '16px',
            padding: '8px',
          },
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>Confirm Logout</DialogTitle>
        <DialogContent>
          <Typography align="center" variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to logout from your account?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button 
            onClick={handleCloseDialog} 
            color="primary"
            variant="outlined"
            sx={{ borderRadius: 2, px: 3 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleLogout} 
            color="error" 
            variant="contained"
            autoFocus
            sx={{ borderRadius: 2, px: 3 }}
          >
            Logout
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Video Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        PaperProps={{
          style: {
            backgroundColor: '#212121',
            color: 'white',
            borderRadius: '16px',
            padding: '8px',
          },
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>Delete Video</DialogTitle>
        <DialogContent>
          <Typography align="center" variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete "{selectedVideo?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button 
            onClick={handleCloseDeleteDialog} 
            color="primary"
            variant="outlined"
            disabled={isDeleting}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteVideo} 
            color="error" 
            variant="contained"
            autoFocus
            disabled={isDeleting}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={showSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbarSeverity} 
          sx={{ 
            width: '100%',
            borderRadius: 2,
            backdropFilter: 'blur(8px)'
          }}
          variant="filled"
          elevation={6}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ProfilePage; 