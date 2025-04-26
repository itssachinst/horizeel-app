import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Avatar, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText, 
  Button, 
  CircularProgress, 
  Paper, 
  Tabs, 
  Tab,
  Divider,
  IconButton,
  Pagination
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowBack, PersonAdd, PersonRemove } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { followUser, unfollowUser, checkIsFollowing } from '../api';

const FollowersPage = () => {
  const { userId, type } = useParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(type === 'following' ? 1 : 0);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const API_BASE_URL = process.env.REACT_APP_API_URL ||
    (window.location.hostname === 'localhost' ? 'http://localhost:8000/api' 
    : 'https://horizeels.com/api');
  
  // Add pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Wrap loadUsers with useCallback to prevent unnecessary re-creation
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 0 ? 'followers' : 'following';
      const response = await axios.get(`${API_BASE_URL}/users/${userId}/${endpoint}?page=${page}&limit=${limit}`);
      
      // Get users and pagination metadata
      const users = response.data.items || response.data;
      const total = response.data.total || users.length;
      setTotalPages(Math.ceil(total / limit));
      
      // Check follow status efficiently for all users in a batch
      // First, check if we can use a batch API
      try {
        // Try to get follow status for all users at once (requires backend implementation)
        const userIds = users.map(user => user.user_id);
        // Check which users the current user is following in one request
        const followStatusResponse = await axios.post(
          `${API_BASE_URL}/users/batch-follow-status`,
          { user_ids: userIds },
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        const followStatuses = followStatusResponse.data;
        
        // Map the results
        const usersWithFollowStatus = users.map(user => ({
          ...user,
          isFollowing: followStatuses[user.user_id] || false
        }));
        
        setUsers(usersWithFollowStatus);
      } catch (batchError) {
        // Fallback to individual checks if batch API is not available
        console.log("Batch follow status API not available, falling back to individual checks");
        
        const usersWithFollowStatus = await Promise.all(
          users.map(async (user) => {
            if (currentUser && currentUser.user_id !== user.user_id) {
              try {
                const isFollowing = await checkIsFollowing(user.user_id);
                return { ...user, isFollowing };
              } catch (error) {
                console.error(`Error checking follow status for user ${user.user_id}:`, error);
                return { ...user, isFollowing: false };
              }
            }
            return { ...user, isFollowing: false };
          })
        );
        
        setUsers(usersWithFollowStatus);
      }
    } catch (error) {
      console.error(`Error loading ${activeTab === 0 ? 'followers' : 'following'}:`, error);
      setError(`Failed to load ${activeTab === 0 ? 'followers' : 'following'}`);
    } finally {
      setLoading(false);
    }
  }, [userId, activeTab, currentUser, page, limit, API_BASE_URL]);

  useEffect(() => {
    loadUsers();
  }, [userId, activeTab, page, loadUsers]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setPage(1); // Reset to page 1 when changing tabs
    navigate(`/users/${userId}/${newValue === 0 ? 'followers' : 'following'}`);
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
    // Scroll to top when changing pages
    window.scrollTo(0, 0);
  };

  // Memoize the follow toggle handler to prevent unnecessary re-creation
  const handleFollowToggle = useCallback(async (targetUserId, isCurrentlyFollowing) => {
    try {
      if (isCurrentlyFollowing) {
        await unfollowUser(targetUserId);
      } else {
        await followUser(targetUserId);
      }
      
      // Update the local state - use functional update to ensure latest state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.user_id === targetUserId 
            ? { ...user, isFollowing: !isCurrentlyFollowing } 
            : user
        )
      );
    } catch (error) {
      console.error("Error toggling follow status:", error);
    }
  }, []);

  // Memoize the user list rendering for better performance
  const userList = useMemo(() => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress color="primary" />
        </Box>
      );
    }
    
    if (error) {
      return (
        <Typography color="error" align="center" sx={{ p: 4 }}>
          {error}
        </Typography>
      );
    }
    
    if (users.length === 0) {
      return (
        <Typography align="center" sx={{ p: 4, color: 'text.secondary' }}>
          {activeTab === 0 
            ? 'No followers yet' 
            : 'Not following anyone yet'}
        </Typography>
      );
    }
    
    return (
      <List>
        {users.map((user) => (
          <ListItem 
            key={user.user_id}
            secondaryAction={
              currentUser && currentUser.user_id !== user.user_id && (
                <Button
                  variant={user.isFollowing ? "outlined" : "contained"}
                  color={user.isFollowing ? "secondary" : "primary"}
                  size="small"
                  startIcon={user.isFollowing ? <PersonRemove /> : <PersonAdd />}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent navigation when clicking the button
                    handleFollowToggle(user.user_id, user.isFollowing);
                  }}
                  sx={{
                    borderRadius: 4,
                    px: 2,
                    backgroundColor: user.isFollowing 
                      ? 'transparent' 
                      : alpha('#f50057', 0.8),
                    borderColor: user.isFollowing ? alpha('#f50057', 0.8) : 'transparent',
                    '&:hover': {
                      backgroundColor: user.isFollowing 
                        ? alpha('#f50057', 0.1) 
                        : alpha('#f50057', 0.9),
                      borderColor: user.isFollowing ? alpha('#f50057', 0.9) : 'transparent',
                    }
                  }}
                >
                  {user.isFollowing ? 'Unfollow' : 'Follow'}
                </Button>
              )
            }
            sx={{ 
              borderRadius: 2, 
              mb: 1,
              '&:hover': { 
                backgroundColor: alpha('#ffffff', 0.05) 
              },
              cursor: 'pointer'
            }}
            onClick={() => navigate(`/profile/${user.user_id}`)}
          >
            <ListItemAvatar>
              <Avatar 
                src={user.profile_picture || ""} 
                alt={user.username}
                sx={{ 
                  width: 50, 
                  height: 50,
                  border: '2px solid #1e1e1e'
                }}
              />
            </ListItemAvatar>
            <ListItemText 
              primary={
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {user.username}
                </Typography>
              }
              secondary={
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {user.bio 
                    ? user.bio.substring(0, 60) + (user.bio.length > 60 ? '...' : '') 
                    : 'No bio available'}
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>
    );
  }, [users, loading, error, activeTab, currentUser, handleFollowToggle, navigate]);

  return (
    <Container maxWidth="md" sx={{ pt: 4, pb: 8, bgcolor: '#000', minHeight: '100vh' }}>
      <Paper 
        elevation={3}
        sx={{
          borderRadius: 4,
          overflow: 'hidden',
          background: 'rgba(18, 18, 18, 0.95)',
          backdropFilter: 'blur(20px)',
          color: 'white',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
          <IconButton 
            color="primary" 
            onClick={() => navigate(-1)}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h5" component="h1">
            {activeTab === 0 ? 'Followers' : 'Following'}
          </Typography>
        </Box>
        
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            '& .MuiTabs-indicator': {
              backgroundColor: '#f50057',
            },
            '& .MuiTab-root': {
              color: 'rgba(255, 255, 255, 0.7)',
              '&.Mui-selected': {
                color: '#f50057',
              },
            },
          }}
        >
          <Tab label="Followers" />
          <Tab label="Following" />
        </Tabs>
        
        <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
        
        <Box sx={{ p: 2 }}>
          {userList}
          
          {totalPages > 1 && (
            <Pagination 
              count={totalPages} 
              page={page} 
              onChange={handlePageChange} 
              sx={{ 
                mt: 3, 
                display: 'flex', 
                justifyContent: 'center',
                '& .MuiPaginationItem-root': {
                  color: 'white',
                },
                '& .Mui-selected': {
                  backgroundColor: alpha('#f50057', 0.2),
                }
              }}
            />
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default FollowersPage; 