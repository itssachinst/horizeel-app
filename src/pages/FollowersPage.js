import React, { useState, useEffect } from 'react';
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
  IconButton
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
  const API_BASE_URL = "http://192.168.29.199:8000/api";

  useEffect(() => {
    loadUsers();
  }, [userId, activeTab]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 0 ? 'followers' : 'following';
      const response = await axios.get(`${API_BASE_URL}/users/${userId}/${endpoint}`);
      
      // For each user, check if the current user is following them
      const usersWithFollowStatus = await Promise.all(
        response.data.map(async (user) => {
          if (currentUser && currentUser.user_id !== user.user_id) {
            const isFollowing = await checkIsFollowing(user.user_id);
            return { ...user, isFollowing };
          }
          return { ...user, isFollowing: false };
        })
      );
      
      setUsers(usersWithFollowStatus);
    } catch (error) {
      console.error(`Error loading ${activeTab === 0 ? 'followers' : 'following'}:`, error);
      setError(`Failed to load ${activeTab === 0 ? 'followers' : 'following'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    navigate(`/users/${userId}/${newValue === 0 ? 'followers' : 'following'}`);
  };

  const handleFollowToggle = async (targetUserId, isCurrentlyFollowing) => {
    try {
      if (isCurrentlyFollowing) {
        await unfollowUser(targetUserId);
      } else {
        await followUser(targetUserId);
      }
      
      // Update the local state
      setUsers(users.map(user => 
        user.user_id === targetUserId 
          ? { ...user, isFollowing: !isCurrentlyFollowing } 
          : user
      ));
    } catch (error) {
      console.error("Error toggling follow status:", error);
    }
  };

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
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress color="primary" />
            </Box>
          ) : error ? (
            <Typography color="error" align="center" sx={{ p: 4 }}>
              {error}
            </Typography>
          ) : users.length === 0 ? (
            <Typography align="center" sx={{ p: 4, color: 'text.secondary' }}>
              {activeTab === 0 
                ? 'No followers yet' 
                : 'Not following anyone yet'}
            </Typography>
          ) : (
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
                        onClick={() => handleFollowToggle(user.user_id, user.isFollowing)}
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
                        {user.bio ? user.bio.substring(0, 60) + (user.bio.length > 60 ? '...' : '') : 'No bio available'}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default FollowersPage; 