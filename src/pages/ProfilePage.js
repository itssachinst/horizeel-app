import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container, Typography, Box, Paper, Avatar, Button, Grid, Card,
  CardMedia, CardContent, IconButton, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Snackbar, Alert, Tabs,
  Tab, Chip, Badge, Stack, CircularProgress
} from '@mui/material';
import {
  Edit, Save, Cancel, Delete, VideoLibrary,
  VideoCall, ThumbUp, Visibility, DateRange, Instagram,
  Twitter, Facebook, LinkedIn, Error, Refresh,
  Bookmark, Person, PhotoCamera, Close
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useVideoContext } from '../contexts/VideoContext';
import { deleteVideo, getSavedVideos, getFollowStats, uploadProfileImage, updateUserProfile } from '../api';
import { useNavigate } from 'react-router-dom';
import { alpha } from '@mui/material/styles';

const ProfilePage = () => {
  const { currentUser, logout, updateAuthUser } = useAuth();
  const { fetchVideos } = useVideoContext();
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
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Dummy data for enhancing UI (would come from the API in a real app)
  const joinDate = new Date(currentUser?.created_at || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const totalLikes = userVideos.reduce((sum, video) => sum + (video.likes || 0), 0);
  const totalViews = userVideos.reduce((sum, video) => sum + (video.views || 0), 0);

  const loadUserData = useCallback(() => {
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

      // Reset image preview when user data changes
      setImagePreview(currentUser.profile_picture || null);
      setSelectedImage(null);

      // Load user data
      loadUserVideos();
      loadSavedVideos();
      loadFollowerCounts();
    }
  }, [currentUser]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const loadUserVideos = async () => {
    setLoadingUserVideos(true);
    try {
      console.log("Fetching user videos...");
      // Check if currentUser is available
      if (!currentUser || !currentUser.user_id) {
        console.error("Current user is not available");
        setError("User not authenticated");
        setLoadingUserVideos(false);
        return;
      }

      console.log("Current user ID:", currentUser.user_id);

      // Use the updated fetchVideos function from VideoContext
      const videos = await fetchVideos(0, 20, currentUser.user_id);
      console.log(`Fetched ${videos.length} videos for user ${currentUser.user_id}`);

      setUserVideos(videos);
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

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file type
      if (!file.type.match('image.*')) {
        showSnackbarMessage("Please select an image file (JPEG, PNG, etc.)", "error");
        return;
      }

      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showSnackbarMessage("Image size should be less than 5MB", "error");
        return;
      }

      setSelectedImage(file);

      // Create image preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(currentUser?.profile_picture || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsUploading(true);
      let profileImageUrl = currentUser?.profile_picture;

      // Upload image if selected
      if (selectedImage) {
        profileImageUrl = await uploadProfileImage(selectedImage);
      }

      // Update profile data
      const updatedData = {
        ...updatedProfile,
        profile_picture: profileImageUrl
      };

      const updatedUser = await updateUserProfile(updatedData);

      // Update auth context with new user data
      if (updateAuthUser) {
        updateAuthUser({
          ...currentUser,
          ...updatedUser
        });
      }

      setIsEditing(false);
      showSnackbarMessage("Profile updated successfully", "success");
    } catch (error) {
      console.error('Error updating profile:', error);
      showSnackbarMessage(error.message || "Failed to update profile", "error");
    } finally {
      setIsUploading(false);
    }
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
      showSnackbarMessage(`Video "${selectedVideo.title}" deleted successfully`, "success");

      // Refresh the user videos list after a short delay
      setTimeout(() => {
        loadUserVideos();
      }, 1000);
    } catch (error) {
      console.error("Error deleting video:", error);
      showSnackbarMessage(error.message || "Failed to delete video", "error");
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

  // Apply global styles to fix scrolling
  useEffect(() => {
    // Save original styles to restore when component unmounts
    const originalStyle = document.body.style.cssText;

    // Apply styles needed for proper scrolling
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    document.documentElement.style.height = 'auto';
    document.documentElement.style.overflow = 'auto';

    // Cleanup function to restore original styles when component unmounts
    return () => {
      document.body.style.cssText = originalStyle;
    };
  }, []);

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
    <Container maxWidth="lg" sx={{
      pt: 2,
      pb: 8,
      bgcolor: '#000',
      position: 'relative',
      height: 'auto',
      minHeight: '100vh',
    }}>
      <Box sx={{
        display: 'flex',
        justifyContent: 'flex-end',
        mb: 3
      }}>
        {!isEditing && (
          <Button
            variant="contained"
            color="error"
            onClick={confirmLogout}
            sx={{
              zIndex: 2,
              borderRadius: '28px',
              background: 'rgba(244, 67, 54, 0.8)',
              backdropFilter: 'blur(8px)',
              '&:hover': {
                background: 'rgba(244, 67, 54, 0.9)',
              },
              textTransform: 'none',
              fontWeight: 600,
              px: 3
            }}
          >
            Logout
          </Button>
        )}
      </Box>

      {/* Profile Section */}
      <Paper
        elevation={3}
        sx={{
          borderRadius: 4,
          p: 4,
          background: 'rgba(18, 18, 18, 0.90)',
          backdropFilter: 'blur(20px)',
          color: 'white',
          position: 'relative',
          zIndex: 10,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(80, 80, 80, 0.2)',
          mb: 4,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Background light effects */}
        <Box
          sx={{
            position: 'absolute',
            top: -100,
            left: -100,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(80,80,255,0.15) 0%, rgba(80,80,255,0) 70%)',
            filter: 'blur(30px)',
            zIndex: 0
          }}
        />

        <Box
          sx={{
            position: 'absolute',
            bottom: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,80,100,0.1) 0%, rgba(255,80,100,0) 70%)',
            filter: 'blur(30px)',
            zIndex: 0
          }}
        />

        <Grid container spacing={3} sx={{ position: 'relative', zIndex: 1 }}>
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
                <Box
                  sx={{
                    position: 'relative',
                    width: 130,
                    height: 130,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  {/* Glow effect */}
                  <Box
                    sx={{
                      position: 'absolute',
                      width: 130,
                      height: 130,
                      borderRadius: '50%',
                      background: 'rgba(10, 10, 10, 0.8)',
                      boxShadow:
                        '0 0 15px rgba(80, 105, 255, 0.5), ' +
                        '0 0 30px rgba(80, 105, 255, 0.3)',
                      animation: 'borderPulse 3s ease infinite',
                      '@keyframes borderPulse': {
                        '0%': { boxShadow: '0 0 15px rgba(80, 105, 255, 0.5), 0 0 30px rgba(80, 105, 255, 0.3)' },
                        '50%': { boxShadow: '0 0 20px rgba(110, 140, 255, 0.7), 0 0 40px rgba(110, 140, 255, 0.5)' },
                        '100%': { boxShadow: '0 0 15px rgba(80, 105, 255, 0.5), 0 0 30px rgba(80, 105, 255, 0.3)' }
                      }
                    }}
                  />

                  {/* Neon border */}
                  <Box
                    sx={{
                      position: 'absolute',
                      width: 124,
                      height: 124,
                      borderRadius: '50%',
                      border: '2px solid rgba(80, 105, 255, 0.8)'
                    }}
                  />

                  <Avatar
                    src={isEditing ? imagePreview : (currentUser?.profile_picture || "")}
                    alt={currentUser?.username}
                    sx={{
                      width: 120,
                      height: 120,
                      border: '3px solid #0a0a0a',
                      zIndex: 1
                    }}
                  />

                  {/* Image upload controls when editing */}
                  {isEditing && (
                    <Box sx={{
                      position: 'absolute',
                      top: -10,
                      right: -10,
                      zIndex: 2,
                      display: 'flex',
                      gap: 1
                    }}>
                      <input
                        accept="image/*"
                        type="file"
                        id="profile-image-upload"
                        onChange={handleImageChange}
                        style={{ display: 'none' }}
                        ref={fileInputRef}
                      />
                      <label htmlFor="profile-image-upload">
                        <IconButton
                          color="primary"
                          component="span"
                          size="small"
                          sx={{
                            backgroundColor: alpha('#3f51b5', 0.8),
                            '&:hover': { backgroundColor: '#3f51b5' }
                          }}
                        >
                          <PhotoCamera fontSize="small" />
                        </IconButton>
                      </label>

                      {selectedImage && (
                        <IconButton
                          color="error"
                          size="small"
                          onClick={handleRemoveImage}
                          sx={{
                            backgroundColor: alpha('#f44336', 0.8),
                            '&:hover': { backgroundColor: '#f44336' }
                          }}
                        >
                          <Close fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  )}
                </Box>
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
                    <Typography variant="h4" sx={{
                      fontWeight: 'bold',
                      mb: 0.5,
                      background: 'linear-gradient(90deg, #ffffff 0%, #e0e0e0 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      letterSpacing: '0.5px'
                    }}>
                      {currentUser?.username}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 1, letterSpacing: '0.3px' }}>
                      {currentUser?.email}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{
                      mb: 2,
                      lineHeight: 1.6,
                      color: 'rgba(255, 255, 255, 0.7)'
                    }}>
                      {updatedProfile.bio || "No bio available"}
                    </Typography>

                    <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      <Chip
                        icon={<DateRange fontSize="small" />}
                        label={`Joined ${joinDate}`}
                        size="small"
                        sx={{
                          backgroundColor: 'rgba(30, 30, 30, 0.8)',
                          color: 'white',
                          border: '1px solid rgba(80, 80, 80, 0.3)',
                          borderRadius: '16px',
                        }}
                      />

                      <Chip
                        icon={<VideoLibrary fontSize="small" />}
                        label={`${userVideos.length} Videos`}
                        size="small"
                        sx={{
                          backgroundColor: 'rgba(30, 30, 30, 0.8)',
                          color: 'white',
                          border: '1px solid rgba(80, 80, 80, 0.3)',
                          borderRadius: '16px',
                        }}
                      />

                      <Chip
                        icon={<ThumbUp fontSize="small" />}
                        label={`${totalLikes} Likes`}
                        size="small"
                        sx={{
                          backgroundColor: 'rgba(30, 30, 30, 0.8)',
                          color: 'white',
                          border: '1px solid rgba(80, 80, 80, 0.3)',
                          borderRadius: '16px',
                        }}
                      />

                      <Chip
                        icon={<Visibility fontSize="small" />}
                        label={`${totalViews} Views`}
                        size="small"
                        sx={{
                          backgroundColor: 'rgba(30, 30, 30, 0.8)',
                          color: 'white',
                          border: '1px solid rgba(80, 80, 80, 0.3)',
                          borderRadius: '16px',
                        }}
                      />
                    </Box>
                  </>
                )}
              </Box>
            </Box>
          </Grid>

          {/* Right column - Social links and stats */}
          <Grid item xs={12} md={4}>
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              p: 2,
              backgroundColor: 'rgba(30, 30, 30, 0.5)',
              borderRadius: 2,
              border: '1px solid rgba(80, 80, 80, 0.2)'
            }}>
              <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
                Social Links
              </Typography>
              {isEditing ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {Object.keys(socialIcons).map((platform) => (
                    <TextField
                      key={platform}
                      label={platform.charAt(0).toUpperCase() + platform.slice(1)}
                      name={`social.${platform}`}
                      value={updatedProfile.social[platform]}
                      onChange={handleInputChange}
                      fullWidth
                      size="small"
                      InputLabelProps={{ style: { color: 'gray' } }}
                      InputProps={{
                        style: { color: 'white' },
                        startAdornment: React.cloneElement(socialIcons[platform], {
                          style: { marginRight: 8, color: 'gray' }
                        })
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  ))}
                </Box>
              ) : (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {Object.entries(updatedProfile.social).map(([platform, link]) => (
                    link && (
                      <IconButton
                        key={platform}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          color: 'white',
                          '&:hover': { color: '#3f51b5' }
                        }}
                      >
                        {socialIcons[platform]}
                      </IconButton>
                    )
                  ))}
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>

        {/* Edit/Save buttons */}
        {isEditing && (
          <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={handleEditToggle}
              startIcon={<Cancel />}
              sx={{
                color: 'white',
                borderColor: 'white',
                '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255, 255, 255, 0.1)' }
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveProfile}
              startIcon={<Save />}
              disabled={isUploading}
              sx={{
                backgroundColor: '#3f51b5',
                '&:hover': { backgroundColor: '#303f9f' }
              }}
            >
              {isUploading ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        )}
      </Paper>

      {/* Tabs and Videos Section */}
      <Paper
        elevation={3}
        sx={{
          borderRadius: 4,
          background: 'rgba(18, 18, 18, 0.90)',
          backdropFilter: 'blur(20px)',
          color: 'white',
          overflow: 'hidden'
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              color: 'rgba(255, 255, 255, 0.7)',
              '&.Mui-selected': {
                color: 'white'
              }
            }
          }}
        >
          <Tab
            icon={<VideoLibrary />}
            label="My Videos"
            sx={{ textTransform: 'none' }}
          />
          <Tab
            icon={<Bookmark />}
            label="Saved Videos"
            sx={{ textTransform: 'none' }}
          />
          <Tab
            icon={<Person />}
            label="About Me"
            sx={{ textTransform: 'none' }}
          />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* My Videos Tab */}
          {activeTab === 0 && (
            <>
              {isLoading ? (
                renderLoading()
              ) : error ? (
                renderError(error)
              ) : userVideos.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <VideoLibrary sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No videos uploaded yet
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<VideoCall />}
                    onClick={() => navigate('/upload')}
                    sx={{ mt: 2 }}
                  >
                    Upload Your First Video
                  </Button>
                </Box>
              ) : (
                <Grid container spacing={3}>
                  {userVideos.map(video => renderVideoCard(video, true))}
                </Grid>
              )}
            </>
          )}

          {/* Saved Videos Tab */}
          {activeTab === 1 && (
            <>
              {loadingSavedVideos ? (
                renderLoading()
              ) : error ? (
                renderError(error)
              ) : savedVideos.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Bookmark sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No saved videos yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Videos you save will appear here
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={3}>
                  {savedVideos.map(video => renderVideoCard(video, false))}
                </Grid>
              )}
            </>
          )}

          {/* About Me Tab */}
          {activeTab === 2 && (
            <Box sx={{ maxWidth: 800, mx: 'auto' }}>
              <Typography variant="h5" gutterBottom sx={{ color: 'white', mb: 3 }}>
                About {currentUser?.username}
              </Typography>
              
              <Paper sx={{
                p: 3,
                mb: 3,
                backgroundColor: 'rgba(30, 30, 30, 0.5)',
                borderRadius: 2,
                border: '1px solid rgba(80, 80, 80, 0.2)'
              }}>
                <Typography variant="body1" paragraph sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                  {updatedProfile.bio || "No bio available"}
                </Typography>
              </Paper>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{
                    p: 3,
                    backgroundColor: 'rgba(30, 30, 30, 0.5)',
                    borderRadius: 2,
                    border: '1px solid rgba(80, 80, 80, 0.2)'
                  }}>
                    <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
                      Stats
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography color="text.secondary">Videos</Typography>
                        <Typography color="white">{userVideos.length}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography color="text.secondary">Total Views</Typography>
                        <Typography color="white">{totalViews}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography color="text.secondary">Total Likes</Typography>
                        <Typography color="white">{totalLikes}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography color="text.secondary">Member Since</Typography>
                        <Typography color="white">{joinDate}</Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Paper sx={{
                    p: 3,
                    backgroundColor: 'rgba(30, 30, 30, 0.5)',
                    borderRadius: 2,
                    border: '1px solid rgba(80, 80, 80, 0.2)'
                  }}>
                    <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
                      Social Links
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {Object.entries(updatedProfile.social).map(([platform, link]) => (
                        link && (
                          <Box key={platform} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {socialIcons[platform]}
                            <Typography
                              component="a"
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                color: 'white',
                                textDecoration: 'none',
                                '&:hover': { textDecoration: 'underline' }
                              }}
                            >
                              {platform.charAt(0).toUpperCase() + platform.slice(1)}
                            </Typography>
                          </Box>
                        )
                      ))}
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Dialogs and Snackbars */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Confirm Logout</DialogTitle>
        <DialogContent>
          Are you sure you want to logout?
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleLogout} color="error">Logout</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete Video</DialogTitle>
        <DialogContent>
          Are you sure you want to delete "{selectedVideo?.title}"? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button
            onClick={handleDeleteVideo}
            color="error"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={showSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ProfilePage;