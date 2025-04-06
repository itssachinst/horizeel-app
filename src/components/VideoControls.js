import React, { useCallback, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  incrementVideoLike, 
  incrementVideoDislike, 
  saveVideo 
} from '../api';
import './VideoControls.css';

const VideoControls = ({ 
  visible,
  playing,
  muted,
  duration,
  currentTime,
  progress,
  volume,
  isFullScreen,
  onPlayPauseClick,
  onMuteClick,
  onVolumeChange,
  onProgressClick,
  onFullScreenClick,
  onSeekForward,
  onSeekBackward,
  videoId,
  formatTime
}) => {
  const { currentUser } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);

  // Format time helper function
  const formatTimeDisplay = (timeInSeconds) => {
    return formatTime ? formatTime(timeInSeconds) : '0:00';
  };

  // Handle like/dislike actions
  const handleLike = useCallback(async (e) => {
    e.stopPropagation();
    
    if (!currentUser) {
      showMessage('Please log in to like videos');
      return;
    }
    
    try {
      if (isLiked) {
        // Unlike (toggle off)
        setIsLiked(false);
      } else {
        // Like video
        setIsLiked(true);
        
        // If previously disliked, remove dislike
        if (isDisliked) {
          setIsDisliked(false);
        }
        
        // Update server
        const response = await incrementVideoLike(videoId);
        showMessage('Video liked');
      }
    } catch (error) {
      console.error('Error liking video:', error);
      showMessage('Failed to update like status');
    }
  }, [currentUser, videoId, isLiked, isDisliked]);

  const handleDislike = useCallback(async (e) => {
    e.stopPropagation();
    
    if (!currentUser) {
      showMessage('Please log in to dislike videos');
      return;
    }
    
    try {
      if (isDisliked) {
        // Undislike (toggle off)
        setIsDisliked(false);
      } else {
        // Dislike video
        setIsDisliked(true);
        
        // If previously liked, remove like
        if (isLiked) {
          setIsLiked(false);
        }
        
        // Update server
        const response = await incrementVideoDislike(videoId);
        showMessage('Video disliked');
      }
    } catch (error) {
      console.error('Error disliking video:', error);
      showMessage('Failed to update dislike status');
    }
  }, [currentUser, videoId, isLiked, isDisliked]);

  // Save video
  const handleSave = useCallback(async (e) => {
    e.stopPropagation();
    
    if (!currentUser) {
      showMessage('Please log in to save videos');
      return;
    }
    
    try {
      // Toggle saved status
      const newSavedStatus = !isSaved;
      setIsSaved(newSavedStatus);
      
      // Update server
      await saveVideo(videoId, newSavedStatus);
      
      // Show message
      showMessage(newSavedStatus ? 'Video saved' : 'Video removed from saved');
    } catch (error) {
      console.error('Error saving video:', error);
      setIsSaved(!isSaved); // Revert on error
      showMessage('Failed to update saved status');
    }
  }, [currentUser, videoId, isSaved]);

  // Share video
  const handleShare = useCallback(async (e) => {
    e.stopPropagation();
    
    try {
      // Generate shareable URL
      const shareUrl = `${window.location.origin}/video/${videoId}`;
      
      // Use Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title: 'Check out this video',
          url: shareUrl
        });
        showMessage('Shared successfully');
      } else if (navigator.clipboard) {
        // Fall back to clipboard
        await navigator.clipboard.writeText(shareUrl);
        showMessage('Link copied to clipboard');
      } else {
        // Manual fallback
        const input = document.createElement('input');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showMessage('Link copied to clipboard');
      }
    } catch (error) {
      console.error('Error sharing video:', error);
      showMessage('Failed to share video');
    }
  }, [videoId]);

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
      <div className={`bottom-controls ${visible ? 'visible' : ''}`}>
        {/* Progress bar */}
        <div 
          className="progress-bar" 
          onClick={onProgressClick}
        >
          <div 
            className="progress-bar-filled" 
            style={{ width: `${progress * 100}%` }}
          />
          <div className="progress-handle"></div>
        </div>
        
        {/* Controls row */}
        <div className="controls-row">
          {/* Left controls */}
          <div className="left-controls">
            <button 
              className="control-button" 
              onClick={onPlayPauseClick}
              aria-label={playing ? 'Pause' : 'Play'}
              title={playing ? 'Pause (Space)' : 'Play (Space)'}
            >
              <div className={playing ? 'pause-icon' : 'play-icon'}></div>
            </button>
            
            <button 
              className="control-button" 
              onClick={onMuteClick}
              aria-label={muted ? 'Unmute' : 'Mute'}
              title={muted ? 'Unmute (M)' : 'Mute (M)'}
            >
              <div className={muted ? 'volume-off-icon' : 'volume-up-icon'}></div>
            </button>
            
            <input
              type="range"
              className="volume-slider"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={onVolumeChange}
              aria-label="Volume"
            />
            
            <span className="time-display">
              {formatTimeDisplay(currentTime)} / {formatTimeDisplay(duration)}
            </span>
          </div>
          
          {/* Right controls */}
          <div className="right-controls">
            <button 
              className={`control-button ${isLiked ? 'active' : ''}`} 
              onClick={handleLike}
              aria-label="Like"
              title="Like"
            >
              <div className="like-icon"></div>
            </button>
            
            <button 
              className={`control-button ${isDisliked ? 'active' : ''}`} 
              onClick={handleDislike}
              aria-label="Dislike"
              title="Dislike"
            >
              <div className="dislike-icon"></div>
            </button>
            
            <button 
              className="control-button" 
              onClick={handleShare}
              aria-label="Share"
              title="Share"
            >
              <div className="share-icon"></div>
            </button>
            
            <button 
              className={`control-button ${isSaved ? 'active' : ''}`}
              onClick={handleSave}
              aria-label={isSaved ? 'Unsave' : 'Save'}
              title={isSaved ? 'Unsave' : 'Save'}
            >
              <div className={isSaved ? 'bookmark-icon' : 'bookmark-outline-icon'}></div>
            </button>
            
            <button 
              className="control-button" 
              onClick={onFullScreenClick}
              aria-label={isFullScreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              title={isFullScreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen (F)'}
            >
              <div className={isFullScreen ? 'fullscreen-exit-icon' : 'fullscreen-icon'}></div>
            </button>
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

export default VideoControls; 