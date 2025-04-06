import React, { useState, useCallback, useEffect } from 'react';
import { formatViewCount } from '../utils/videoUtils';
import { followUser, unfollowUser, checkIsFollowing } from '../api';
import './VideoInfo.css';

const VideoInfo = ({ 
  visible,
  videoTitle,
  creatorUsername,
  creatorId,
  profile_picture,
  views,
  likes,
  dislikes,
  currentUser,
  onBackClick,
  videoId
}) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Check follow status when component mounts
  useEffect(() => {
    if (!currentUser || !creatorId || currentUser.user_id === creatorId) {
      return;
    }
    
    const checkFollowStatus = async () => {
      try {
        const following = await checkIsFollowing(creatorId);
        setIsFollowing(following);
      } catch (error) {
        console.error('Error checking follow status:', error);
      }
    };
    
    checkFollowStatus();
  }, [currentUser, creatorId]);

  // Handle follow/unfollow
  const handleFollowToggle = useCallback(async () => {
    if (!currentUser) {
      showMessage('Please log in to follow creators');
      return;
    }
    
    // Prevent following yourself
    if (currentUser.user_id === creatorId) {
      showMessage('You cannot follow yourself');
      return;
    }
    
    setFollowLoading(true);
    
    try {
      if (isFollowing) {
        // Unfollow
        await unfollowUser(creatorId);
        setIsFollowing(false);
        showMessage(`Unfollowed ${creatorUsername}`);
      } else {
        // Follow
        await followUser(creatorId);
        setIsFollowing(true);
        showMessage(`Following ${creatorUsername}`);
      }
    } catch (error) {
      console.error('Error toggling follow status:', error);
      showMessage('Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  }, [currentUser, creatorId, creatorUsername, isFollowing]);

  // Show snackbar message
  const showMessage = (message) => {
    setSnackbarMessage(message);
    setShowSnackbar(true);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setShowSnackbar(false);
    }, 3000);
  };

  return (
    <>
      <div className={`top-info ${visible ? 'visible' : ''}`}>
        <button 
          className="back-button" 
          onClick={onBackClick}
          aria-label="Go back"
          title="Go back"
        >
          <div className="back-icon"></div>
        </button>
        
        <div className="video-metadata">
          <div className="creator-info">
            {profile_picture ? (
              <img 
                src={profile_picture} 
                alt={creatorUsername || 'Creator'} 
                className="creator-avatar"
              />
            ) : (
              <div className="avatar-placeholder"></div>
            )}
            
            <div className="text-info">
              <h3 className="video-title">{videoTitle}</h3>
              <p className="creator-name">{creatorUsername}</p>
            </div>
          </div>
          
          {creatorId && currentUser && currentUser.user_id !== creatorId && (
            <button 
              className={`follow-button ${isFollowing ? 'following' : ''}`}
              onClick={handleFollowToggle}
              disabled={followLoading}
            >
              {followLoading ? (
                <div className="loading-spinner-small"></div>
              ) : isFollowing ? (
                <>
                  <div className="check-icon"></div>
                  <span>Following</span>
                </>
              ) : (
                <>
                  <div className="follow-icon"></div>
                  <span>Follow</span>
                </>
              )}
            </button>
          )}
        </div>
        
        <div className="stats-bar">
          <div className="stat">
            <div className="views-icon"></div>
            <span>{formatViewCount(views)}</span>
          </div>
          
          <div className="stat">
            <div className="like-icon"></div>
            <span>{formatViewCount(likes)}</span>
          </div>
          
          <div className="stat">
            <div className="dislike-icon"></div>
            <span>{formatViewCount(dislikes)}</span>
          </div>
        </div>
      </div>
      
      {/* Snackbar for messages */}
      {showSnackbar && (
        <div className="snackbar">
          {snackbarMessage}
        </div>
      )}
    </>
  );
};

export default VideoInfo; 