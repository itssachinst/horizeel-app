import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Hls from 'hls.js';
import './VideoPlayer.css';
import fullscreenAPI from '../utils/fullscreenAPI';
import useSwipeNavigate from '../hooks/useSwipeNavigate';
import { formatDuration } from '../utils/videoUtils';
import { incrementVideoView } from '../api';
import { useAuth } from '../contexts/AuthContext';
import VideoControls from './VideoControls';
import VideoInfo from './VideoInfo';

// Icons
import { 
  ArrowBack,
  PlayArrow,
  Pause,
  VolumeUp,
  VolumeOff,
  ThumbUp, 
  ThumbDown, 
  Share, 
  Bookmark,
  BookmarkBorder,
  Fullscreen,
  Visibility,
  KeyboardArrowUp,
  KeyboardArrowDown,
  AccountCircle
} from '@mui/icons-material';

const VideoPlayer = ({ 
  url, 
  videoTitle, 
  views, 
  likes, 
  dislikes, 
  profile_picture,
  videoId,
  creatorId,
  creatorUsername,
  onNextVideo,
  onPreviousVideo
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  
  // States for video functionality
  const [playing, setPlaying] = useState(true);
  const [volume, setVolume] = useState(1);
  const [muted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orientation, setOrientation] = useState(
    window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
  );
  const [viewReported, setViewReported] = useState(false);
  
  // For throttling time updates
  const lastTimeUpdateRef = useRef(null);
  
  // Detect orientation changes
  useEffect(() => {
    const handleResize = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      setOrientation(isPortrait ? 'portrait' : 'landscape');
    };
    
    window.addEventListener('resize', handleResize);
    
    // Initial check
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Handle touch navigation with swipes
  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useSwipeNavigate(
    onNextVideo, 
    onPreviousVideo, 
    70, 
    true
  );

  // Setup HLS for streaming video
  useEffect(() => {
    if (!url || !videoRef.current) return;
    
    const video = videoRef.current;
    setLoading(true);
    
    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    // Reset states
    setProgress(0);
    setCurrentTime(0);
    setViewReported(false);
    
    // Check if this is an HLS stream
    const isHlsStream = url && (url.includes('.m3u8') || url.includes('application/x-mpegURL'));
    
    if (Hls.isSupported() && isHlsStream) {
      console.log('Using HLS.js for playback');
      const hls = new Hls({
        enableWorker: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 60
      });
      
      hls.loadSource(url);
      hls.attachMedia(video);
      
      // Store for cleanup
      hlsRef.current = hls;
      
      // HLS events
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        if (playing) {
          video.play().catch(err => {
            console.warn('Autoplay prevented:', err);
            // Try with muted audio
            video.muted = true;
            setIsMuted(true);
            video.play().catch(mutedErr => {
              console.error('Muted autoplay also prevented:', mutedErr);
              setPlaying(false);
            });
          });
        }
      });
      
      // Error handling
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('HLS network error, trying to recover');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('HLS media error, trying to recover');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal HLS error:', data);
              hls.destroy();
              setLoading(false);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') || !isHlsStream) {
      // For Safari with native HLS support or regular videos
      video.src = url;
      
      video.addEventListener('loadedmetadata', () => {
        setLoading(false);
        if (playing) {
          video.play().catch(err => {
            console.warn('Autoplay prevented:', err);
            // Try with muted audio
            video.muted = true;
            setIsMuted(true);
            video.play().catch(mutedErr => {
              console.error('Muted autoplay also prevented:', mutedErr);
              setPlaying(false);
            });
          });
        }
      }, { once: true });
      
      video.addEventListener('error', () => {
        console.error('Video error:', video.error);
        setLoading(false);
      }, { once: true });
      
      video.load();
    }
    
    return () => {
      // Cleanup
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (video) {
        video.pause();
        video.src = '';
        video.load();
      }
    };
  }, [url, playing]);
  
  // Update volume and muted state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = muted;
    }
  }, [volume, muted]);
  
  // Handle mouse movement to show/hide controls
  const handleMouseMove = useCallback(() => {
    // If controls are already showing, just reset the timeout
    if (showControls && controlsTimeout) {
      clearTimeout(controlsTimeout);
      
      const newTimeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      
      setControlsTimeout(newTimeout);
      return;
    }
    
    // If controls are hidden, show them
    if (!showControls) {
      setShowControls(true);
      
      const newTimeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      
      setControlsTimeout(newTimeout);
    }
  }, [showControls, controlsTimeout]);
  
  // Throttled time update handler
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // Only update React state twice per second to reduce rendering
    const now = Date.now();
    if (!lastTimeUpdateRef.current || now - lastTimeUpdateRef.current > 500) {
      lastTimeUpdateRef.current = now;
      
      // Update progress and current time
      const newProgress = video.currentTime / video.duration;
      setProgress(isNaN(newProgress) ? 0 : newProgress);
      setCurrentTime(video.currentTime);
      
      // Report view once when video is played for a few seconds
      if (!viewReported && video.currentTime > 5 && videoId) {
        setViewReported(true);
        incrementVideoView(videoId).catch(err => {
          console.error('Failed to increment view count:', err);
        });
      }
    }
  }, [videoId, viewReported]);
  
  // Handle video end
  const handleVideoEnd = useCallback(() => {
    if (onNextVideo) {
      onNextVideo();
    } else if (videoRef.current) {
      // Loop current video if no next handler
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(err => {
        console.warn('Play after end prevented:', err);
      });
    }
  }, [onNextVideo]);
  
  // Handle video metadata loaded
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setLoading(false);
    }
  }, []);
  
  // Video container click handler
  const handleVideoContainerClick = useCallback((e) => {
    // Only toggle play/pause if clicking on the video itself or container
    if (e.target === containerRef.current || e.target === videoRef.current) {
      togglePlayPause();
    }
  }, []);
  
  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    if (video.paused || video.ended) {
      video.play().then(() => {
        setPlaying(true);
      }).catch(err => {
        console.warn('Play prevented:', err);
        // Try muted if needed
        if (!video.muted) {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(mutedErr => {
            console.error('Muted play also prevented:', mutedErr);
            setPlaying(false);
          });
        } else {
          setPlaying(false);
        }
      });
    } else {
      video.pause();
      setPlaying(false);
    }
  }, []);
  
  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);
  
  // Handle volume change
  const handleVolumeChange = useCallback((e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    // Auto-unmute when volume is adjusted
    if (newVolume > 0 && muted) {
      setIsMuted(false);
    }
    // Auto-mute when volume is set to 0
    if (newVolume === 0 && !muted) {
      setIsMuted(true);
    }
  }, [muted]);
  
  // Handle seeking
  const handleSeek = useCallback((seconds) => {
    const video = videoRef.current;
    if (!video) return;
    
    const newTime = Math.max(0, Math.min(video.currentTime + seconds, video.duration));
    video.currentTime = newTime;
  }, []);
  
  // Handle progress bar click
  const handleProgressBarClick = useCallback((e) => {
    const video = videoRef.current;
    const progressBar = e.currentTarget;
    
    if (!video || !progressBar) return;
    
    const rect = progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    
    if (!isNaN(video.duration)) {
      video.currentTime = pos * video.duration;
    }
  }, []);
  
  // Enter fullscreen
  const enterFullScreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    fullscreenAPI.enterFullscreen(container)
      .then(() => {
        setIsFullScreen(true);
      })
      .catch(err => {
        console.error('Failed to enter fullscreen:', err);
        // CSS fallback for fullscreen
        if (container) {
          container.style.position = 'fixed';
          container.style.top = '0';
          container.style.left = '0';
          container.style.width = '100vw';
          container.style.height = '100vh';
          container.style.zIndex = '9999';
          document.body.style.overflow = 'hidden';
          setIsFullScreen(true);
        }
      });
  }, []);
  
  // Exit fullscreen
  const exitFullScreen = useCallback(() => {
    if (fullscreenAPI.isFullscreen()) {
      fullscreenAPI.exitFullscreen()
        .catch(err => {
          console.error('Failed to exit fullscreen:', err);
        });
    } else if (containerRef.current && 
               containerRef.current.style.position === 'fixed') {
      // Exit CSS fallback fullscreen
      const container = containerRef.current;
      container.style.position = '';
      container.style.top = '';
      container.style.left = '';
      container.style.width = '';
      container.style.height = '';
      container.style.zIndex = '';
      document.body.style.overflow = '';
    }
    
    setIsFullScreen(false);
  }, []);
  
  // Toggle fullscreen
  const toggleFullScreen = useCallback(() => {
    if (isFullScreen) {
      exitFullScreen();
    } else {
      enterFullScreen();
    }
  }, [isFullScreen, enterFullScreen, exitFullScreen]);
  
  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(fullscreenAPI.isFullscreen());
    };
    
    // Use cross-browser fullscreen change event
    const fsChangeEvent = fullscreenAPI.fullscreenChangeEventName();
    document.addEventListener(fsChangeEvent, handleFullscreenChange);
    
    return () => {
      document.removeEventListener(fsChangeEvent, handleFullscreenChange);
    };
  }, []);
  
  // Setup keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only process if in fullscreen or player has focus
      const isPlayerFocused = 
        containerRef.current?.contains(document.activeElement) || 
        fullscreenAPI.isFullscreen();
      
      if (!isPlayerFocused) return;
      
      // Prevent default browser actions for certain keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'f', 'm'].includes(e.key)) {
        e.preventDefault();
      }
      
      switch (e.key.toLowerCase()) {
        case ' ':  // Space
        case 'k':  // YouTube style
          togglePlayPause();
          break;
        case 'f':
          toggleFullScreen();
          break;
        case 'm':
          toggleMute();
          break;
        case 'arrowleft':
          handleSeek(-10);  // Seek 10 seconds back
          break;
        case 'arrowright':
          handleSeek(10);   // Seek 10 seconds forward
          break;
        case 'arrowup':
          if (onPreviousVideo) onPreviousVideo();
          break;
        case 'arrowdown':
          if (onNextVideo) onNextVideo();
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    togglePlayPause, 
    toggleFullScreen, 
    toggleMute, 
    handleSeek, 
    onNextVideo, 
    onPreviousVideo
  ]);
  
  // Setup video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleVideoEnd);
    video.addEventListener('play', () => setPlaying(true));
    video.addEventListener('pause', () => setPlaying(false));
    video.addEventListener('volumechange', () => setIsMuted(video.muted));
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleVideoEnd);
      video.removeEventListener('play', () => setPlaying(true));
      video.removeEventListener('pause', () => setPlaying(false));
      video.removeEventListener('volumechange', () => setIsMuted(video.muted));
    };
  }, [handleTimeUpdate, handleLoadedMetadata, handleVideoEnd]);

  return (
    <div 
      ref={containerRef}
      className="player-container" 
      tabIndex="0"
      onClick={handleVideoContainerClick}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="video-element"
        playsInline
        preload="auto"
      />
      
      {/* Play/Pause Overlay */}
      {!playing && (
        <div className="play-overlay">
          <div className="play-icon"></div>
        </div>
      )}
      
      {/* Loading Indicator */}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}
      
      {/* Video Information */}
      <VideoInfo 
        visible={showControls}
        videoTitle={videoTitle}
        creatorUsername={creatorUsername}
        creatorId={creatorId}
        profile_picture={profile_picture}
        views={views}
        likes={likes}
        dislikes={dislikes}
        currentUser={currentUser}
        onBackClick={() => navigate('/')}
        videoId={videoId}
      />
      
      {/* Navigation Controls */}
      <div className={`side-navigation ${showControls ? 'visible' : ''}`}>
        <button 
          className="nav-button" 
          onClick={(e) => {
            e.stopPropagation();
            onPreviousVideo?.();
          }}
          aria-label="Previous video"
        >
          <div className="up-arrow-icon"></div>
        </button>
        <button 
          className="nav-button" 
          onClick={(e) => {
            e.stopPropagation();
            onNextVideo?.();
          }}
          aria-label="Next video"
        >
          <div className="down-arrow-icon"></div>
        </button>
      </div>
      
      {/* Video Controls */}
      <VideoControls 
        visible={showControls}
        playing={playing}
        muted={muted}
        duration={duration}
        currentTime={currentTime}
        progress={progress}
        volume={volume}
        isFullScreen={isFullScreen}
        onPlayPauseClick={togglePlayPause}
        onMuteClick={toggleMute}
        onVolumeChange={handleVolumeChange}
        onProgressClick={handleProgressBarClick}
        onFullScreenClick={toggleFullScreen}
        onSeekForward={() => handleSeek(10)}
        onSeekBackward={() => handleSeek(-10)}
        videoId={videoId}
        formatTime={formatDuration}
      />
      
      {/* Keyboard Shortcuts Help */}
      <div className={`keyboard-shortcuts-info ${showControls ? 'visible' : ''}`}>
        Press F: Fullscreen | M: Mute | Space: Play/Pause<br/>
        ←→: Seek 10s | ↑↓: Previous/Next video
      </div>
    </div>
  );
};

export default VideoPlayer;