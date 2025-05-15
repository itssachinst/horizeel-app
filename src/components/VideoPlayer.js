import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { IconButton, Typography, Box, Avatar, Tooltip, Snackbar, Alert, Dialog, DialogContent, DialogTitle, Button, DialogActions, CircularProgress, Slide, useTheme, useMediaQuery } from "@mui/material";
import {
  ThumbUp,
  ThumbDown,
  Share,
  Close,
  ArrowUpward,
  ArrowDownward,
  VolumeOff,
  VolumeUp,
  Favorite,
  Visibility,
  ExpandMore,
  ExpandLess,
  BookmarkBorder,
  Bookmark,
  Delete,
  PersonAdd,
  Check,
  Pause,
  PlayArrow,
  Fullscreen,
  Home,
  ArrowBack,
  FullscreenExit,
  HighQuality,
  Settings
} from "@mui/icons-material";
import VisibilityIcon from '@mui/icons-material/Visibility';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import { useAuth } from "../contexts/AuthContext";
import { incrementVideoLike, incrementVideoDislike, saveVideo, checkVideoSaved, deleteVideo, followUser, unfollowUser, checkIsFollowing, updateWatchHistory, incrementVideoView } from "../api";
import useSwipeNavigate from "../hooks/useSwipeNavigate";
import {
  formatViewCount,
  formatDuration,
  formatRelativeTime,
  truncateText,
  fixVideoUrl,
  getFileExtension,
  isHlsStream,
  getVideoMimeType,
  processVideoUrl
} from "../utils/videoUtils";
import { useVideoContext } from "../contexts/VideoContext";
import Hls from 'hls.js';
import VIDEO_CACHE from '../utils/videoCache';

// Get the API base URL from environment
const API_BASE_URL = process.env.REACT_APP_API_URL || "https://horizeel.com/api/";

// Add fallback URLs for different formats
const FALLBACK_VIDEO = '/assets/fallback-video.mp4';
// Add fallback video server for when S3 links are giving 403 Forbidden
const FALLBACK_VIDEO_SERVER = 'https://player.vimeo.com/external/';

// Check if HLS is supported natively
const isHlsNativelySupported = () => {
  const video = document.createElement('video');
  const mimeType = getVideoMimeType();
  return video.canPlayType(mimeType) ||
    video.canPlayType('application/x-mpegURL');
};

// Define all browser-specific fullscreen functions at component level
const fullscreenAPI = {
  enterFullscreen: (element) => {
    if (element.requestFullscreen) {
      return element.requestFullscreen();
    } else if (element.mozRequestFullScreen) { // Firefox
      return element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) { // Chrome, Safari and Opera
      return element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) { // IE/Edge
      return element.msRequestFullscreen();
    } else {
      return Promise.reject(new Error("No fullscreen API available"));
    }
  },

  exitFullscreen: () => {
    if (document.exitFullscreen) {
      return document.exitFullscreen();
    } else if (document.mozCancelFullScreen) { // Firefox
      return document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) { // Chrome, Safari and Opera
      return document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { // IE/Edge
      return document.msExitFullscreen();
    } else {
      return Promise.reject(new Error("No fullscreen API available"));
    }
  },

  getFullscreenElement: () => {
    return document.fullscreenElement ||
      document.mozFullScreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement;
  },

  isFullscreen: () => {
    return !!fullscreenAPI.getFullscreenElement();
  },

  fullscreenChangeEventName: () => {
    if ('onfullscreenchange' in document) {
      return 'fullscreenchange';
    } else if ('onmozfullscreenchange' in document) {
      return 'mozfullscreenchange';
    } else if ('onwebkitfullscreenchange' in document) {
      return 'webkitfullscreenchange';
    } else if ('onmsfullscreenchange' in document) {
      return 'MSFullscreenChange';
    }
    return 'fullscreenchange'; // Default fallback
  }
};

// Add proxy configuration for CORS issues (if needed)
const VIDEO_PROXY_ENABLED = true; // Set to true if using a proxy for CORS issues
const VIDEO_PROXY_URL = 'https://api.allorigins.win/raw?url='; // More reliable CORS proxy alternative

// Add a segment loading tracker
const segmentLoadingStats = {
  totalSegments: 0,
  loadedSegments: 0,
  loadingStartTime: 0,
  totalBytesLoaded: 0,
  segmentsLoading: {},
  averageSegmentDuration: 0
};

// Add before VideoPlayer component
const resetSegmentStats = () => {
  segmentLoadingStats.totalSegments = 0;
  segmentLoadingStats.loadedSegments = 0;
  segmentLoadingStats.loadingStartTime = Date.now();
  segmentLoadingStats.totalBytesLoaded = 0;
  segmentLoadingStats.segmentsLoading = {};
  segmentLoadingStats.averageSegmentDuration = 0;
};

// Monitor HLS segment loading
const setupHlsEventListeners = (hls, setAvailableQualities, setCurrentQuality) => {
  if (!hls) return;

  resetSegmentStats();

  // Log manifest parsing
  hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
    console.log('HLS Manifest parsed:', data);
    // Get segment details from the first level
    if (data.levels && data.levels.length > 0 && data.levels[0].details) {
      const firstLevel = data.levels[0];
      const fragments = firstLevel.details.fragments || [];
      const segmentDuration = firstLevel.details.targetduration || 0;

      segmentLoadingStats.totalSegments = fragments.length;
      segmentLoadingStats.averageSegmentDuration = segmentDuration;

      console.log(`HLS stream: ${fragments.length} segments, ~${segmentDuration.toFixed(1)}s each`);
      console.log(`Total segments in manifest: ~${segmentLoadingStats.totalSegments}`);

      // Calculate optimal buffering based on segment size
      const targetBuffer = Math.min(3 * segmentDuration, 15); // Buffer 3 segments or max 15 seconds
      hls.config.maxBufferLength = targetBuffer;
      console.log(`Set target buffer to ${targetBuffer.toFixed(1)}s based on segment size`);

      // Get available quality levels
      if (data.levels && data.levels.length > 0) {
        const qualities = data.levels.map((level, index) => ({
          index,
          height: level.height || 0,
          width: level.width || 0,
          bitrate: level.bitrate || 0,
          name: level.height ? `${level.height}p` : `Quality ${index + 1}`
        }));

        // Add auto quality option
        qualities.unshift({
          index: -1,
          name: 'Auto'
        });

        if (setAvailableQualities) {
          setAvailableQualities(qualities);
        }

        // Set to highest quality by default
        if (data.levels.length > 0 && setCurrentQuality) {
          // Find the highest quality level
          let highestLevelIndex = 0;
          let highestHeight = 0;

          for (let i = 0; i < data.levels.length; i++) {
            if (data.levels[i].height > highestHeight) {
              highestHeight = data.levels[i].height;
              highestLevelIndex = i;
            }
          }

          // Set to highest quality
          hls.currentLevel = highestLevelIndex;
          setCurrentQuality(highestLevelIndex);
          console.log(`Setting default quality to highest: Level ${highestLevelIndex} (${highestHeight}p)`);
        }
      }
    }
  });

  // Log fragment loading
  hls.on(Hls.Events.FRAG_LOADING, (event, data) => {
    const fragId = data.frag.sn;
    const fragDuration = data.frag.duration;
    const fragLevel = data.frag.level;

    segmentLoadingStats.segmentsLoading[fragId] = {
      startTime: Date.now(),
      url: data.frag.url,
      loaded: false,
      duration: fragDuration,
      level: fragLevel
    };

    // Add level info
    const levelInfo = hls.levels && hls.levels[fragLevel] ?
      `L${fragLevel}(${hls.levels[fragLevel].width}x${hls.levels[fragLevel].height})` : `L${fragLevel}`;

    console.log(`Loading segment ${fragId} (${fragDuration.toFixed(1)}s, ${levelInfo}) from ${data.frag.url.split('/').pop()}`);
  });

  // Log fragment loaded
  hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
    const fragId = data.frag.sn;
    segmentLoadingStats.loadedSegments++;
    segmentLoadingStats.totalBytesLoaded += data.stats.total;

    if (segmentLoadingStats.segmentsLoading[fragId]) {
      const loadTime = Date.now() - segmentLoadingStats.segmentsLoading[fragId].startTime;
      segmentLoadingStats.segmentsLoading[fragId].loaded = true;
      segmentLoadingStats.segmentsLoading[fragId].loadTime = loadTime;
      segmentLoadingStats.segmentsLoading[fragId].bytes = data.stats.total;

      // Calculate segment bitrate
      const durationSec = data.frag.duration;
      const bytesLoaded = data.stats.total;
      const bitrate = (bytesLoaded * 8) / durationSec; // in bits per second

      console.log(`Segment ${fragId} loaded: ${(bytesLoaded / 1024).toFixed(1)}KB in ${loadTime}ms, bitrate: ${(bitrate / 1000).toFixed(0)}kbps`);
      console.log(`Progress: ${segmentLoadingStats.loadedSegments}/${segmentLoadingStats.totalSegments} segments loaded`);
    }
  });

  // Log buffer status
  hls.on(Hls.Events.BUFFER_APPENDING, (event, data) => {
    console.log(`Appending ${data.type} buffer: ${(data.data.byteLength / 1024).toFixed(1)}KB`);
  });

  // Log level switching
  hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
    if (hls.levels && hls.levels[data.level]) {
      const level = hls.levels[data.level];
      console.log(`HLS quality switched to level ${data.level}: ${level.width}x${level.height}, ${(level.bitrate / 1000).toFixed(0)}kbps`);

      // Update current quality state
      if (setCurrentQuality) {
        setCurrentQuality(data.level);
      }
    } else {
      console.log(`HLS quality level switched to ${data.level}`);
    }
  });

  // Monitor for stalls
  let lastCurrentTime = 0;
  let stallCount = 0;
  const stallCheckInterval = setInterval(() => {
    const video = document.querySelector('video');
    if (!video || !hls.media) {
      clearInterval(stallCheckInterval);
      return;
    }

    // If video is playing but time isn't advancing, might be stalling
    if (!video.paused && video.currentTime === lastCurrentTime) {
      stallCount++;
      console.log(`Potential stall detected #${stallCount}: Time stuck at ${video.currentTime.toFixed(1)}s`);

      // If stalled for several checks, try recovery
      if (stallCount >= 3) {
        console.log('Stall recovery: attempting to resolve playback issue');

        // Strategy 1: Skip ahead slightly if we have buffer
        if (video.buffered.length > 0 &&
          video.currentTime < video.buffered.end(video.buffered.length - 1)) {
          const skipAmount = 0.1; // Skip 100ms forward
          console.log(`Trying micro-skip ahead by ${skipAmount}s`);
          video.currentTime += skipAmount;
        }
        // Strategy 2: Reduce buffer and reload segment
        else if (stallCount >= 5) {
          console.log('Advanced stall recovery: reducing buffer and reloading current fragment');
          // Temporarily reduce buffer target
          hls.config.maxBufferLength = 5;
          // Try to recover media error
          hls.recoverMediaError();
        }
        // Strategy 3: Last resort - reload stream at current position
        if (stallCount >= 8) {
          console.log('Critical stall: reloading stream at current position');
          const currentTime = video.currentTime;
          hls.startLoad();
          // After reloading, seek back to where we were
          hls.once(Hls.Events.FRAG_LOADED, () => {
            video.currentTime = currentTime;
          });
        }
      }
    } else {
      // Reset stall count when time advances
      if (stallCount > 0) {
        console.log('Playback resumed normally');
        stallCount = 0;
        // Restore normal buffer settings if they were reduced
        if (hls.config.maxBufferLength < 30) {
          hls.config.maxBufferLength = 30;
        }
      }
      lastCurrentTime = video.currentTime;
    }
  }, 1000);

  // Clean up interval on destroy
  hls.on(Hls.Events.DESTROYING, () => {
    clearInterval(stallCheckInterval);
  });
};

// Add playback monitoring function
const startPlaybackMonitoring = (videoElement, hls) => {
  if (!videoElement || !hls) return;

  // Initialize metrics
  const metrics = {
    startTime: Date.now(),
    firstSegmentLoadedAt: 0,
    playbackStartedAt: 0,
    bufferedRanges: [],
    bitrateHistory: [],
    bandwidth: 0,
    estimatedBandwidth: 0,
    droppedFrames: 0,
    stallEvents: 0,
  };

  // Update metrics periodically
  const metricsInterval = setInterval(() => {
    if (!videoElement || !hls || !hls.media) {
      clearInterval(metricsInterval);
      return;
    }

    // Get buffer status
    const buffered = videoElement.buffered;
    metrics.bufferedRanges = [];
    for (let i = 0; i < buffered.length; i++) {
      metrics.bufferedRanges.push({
        start: buffered.start(i),
        end: buffered.end(i)
      });
    }

    // Get bandwidth estimates
    if (hls.bandwidthEstimate) {
      metrics.estimatedBandwidth = hls.bandwidthEstimate;
    }

    // Get current bitrate
    if (hls.currentLevel >= 0 && hls.levels && hls.levels[hls.currentLevel]) {
      const currentBitrate = hls.levels[hls.currentLevel].bitrate;
      metrics.bitrateHistory.push({
        timestamp: Date.now(),
        bitrate: currentBitrate,
        level: hls.currentLevel
      });
      // Keep history at max 20 entries
      if (metrics.bitrateHistory.length > 20) {
        metrics.bitrateHistory.shift();
      }
    }

    // Check for dropped frames (if available)
    if (videoElement.getVideoPlaybackQuality) {
      const quality = videoElement.getVideoPlaybackQuality();
      metrics.droppedFrames = quality.droppedVideoFrames;
    }

    // Debug log every 10 seconds
    if (Date.now() % 10000 < 1000) {
      console.log("Playback Metrics:", {
        currentTime: videoElement.currentTime.toFixed(1),
        buffered: metrics.bufferedRanges.map(r => `${r.start.toFixed(1)}-${r.end.toFixed(1)}`).join(', '),
        bandwidth: `${(metrics.estimatedBandwidth / 1000).toFixed(0)} kbps`,
        currentBitrate: metrics.bitrateHistory.length > 0
          ? `${(metrics.bitrateHistory[metrics.bitrateHistory.length - 1].bitrate / 1000).toFixed(0)} kbps`
          : 'unknown',
        droppedFrames: metrics.droppedFrames
      });
    }

    // Update metrics in component state if needed
    return metrics;
  }, 1000);

  // Track video events
  videoElement.addEventListener('playing', () => {
    if (!metrics.playbackStartedAt) {
      metrics.playbackStartedAt = Date.now();
      console.log(`Playback started in ${(metrics.playbackStartedAt - metrics.startTime)}ms`);
    }
  });

  // First segment loaded
  hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
    if (!metrics.firstSegmentLoadedAt && data.frag.sn === 0) {
      metrics.firstSegmentLoadedAt = Date.now();
      console.log(`First segment loaded in ${(metrics.firstSegmentLoadedAt - metrics.startTime)}ms`);
    }

    // Track actual bandwidth from segment loading
    const loadTime = data.stats.loading.end - data.stats.loading.start;
    const bytes = data.stats.total;
    if (loadTime > 0 && bytes > 0) {
      // Calculate bandwidth in bits per second
      const bandwidthBps = (bytes * 8) / (loadTime / 1000);
      metrics.bandwidth = bandwidthBps;
    }
  });

  // Track stalls
  let lastTime = 0;
  let lastTimeUpdate = Date.now();
  const stallCheckInterval = setInterval(() => {
    if (!videoElement || videoElement.paused || !hls.media) {
      clearInterval(stallCheckInterval);
      return;
    }

    const now = Date.now();
    const timeDiff = now - lastTimeUpdate;

    // If more than 200ms has passed and video time hasn't changed (while playing)
    if (timeDiff > 200 && videoElement.currentTime === lastTime && !videoElement.paused) {
      metrics.stallEvents++;
    }

    lastTime = videoElement.currentTime;
    lastTimeUpdate = now;
  }, 200);

  // Clean up
  const cleanup = () => {
    clearInterval(metricsInterval);
    clearInterval(stallCheckInterval);
  };

  return {
    getMetrics: () => ({ ...metrics }),
    cleanup
  };
};

// Global cache for preloaded videos
const videoCache = new Map();

// Enhanced video preloader with metadata and source selection
const preloadVideo = (video, quality = 'auto') => {
  if (!video || !video.video_url) return null;

  // Check if this video is already cached
  const cachedVideo = videoCache.get(video.video_id);
  if (cachedVideo) {
    console.log(`Using cached video for ${video.video_id}`);
    return cachedVideo;
  }

  console.log(`Preloading video: ${video.video_id}`);

  // Create new preload object
  const preloadObj = {
    videoId: video.video_id,
    sources: [],
    metadata: {
      duration: null,
      loaded: false,
      loadStartTime: Date.now(),
      error: null
    },
    element: null,
    hls: null
  };

  // Determine if this is an HLS stream
  const isHlsStream = video.video_url.toLowerCase().endsWith('.m3u8') ||
    video.video_format === 'hls';

  // Process the URL based on the video format
  let videoSource;
  if (isHlsStream) {
    videoSource = processVideoUrl(video.video_url, API_BASE_URL);
    preloadObj.isHls = true;

    // Preload HLS with optimized settings for TikTok-style feed
    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
      try {
        // Create a new HLS instance with optimized settings
        const hls = new Hls({
          // Core settings
          enableWorker: true,
          lowLatencyMode: false,

          // Aggressive short-form video settings
          manifestLoadingMaxRetry: 6,
          levelLoadingMaxRetry: 6,
          fragLoadingMaxRetry: 6,

          // Buffer optimization for short videos
          maxBufferSize: 12 * 1000 * 1000, // 12MB buffer for high-quality short content
          maxBufferLength: 20,             // 20 seconds buffer for smooth scrolling

          // Optimize memory usage
          backBufferLength: 0,             // Don't keep buffer behind playback position

          // Performance settings
          startLevel: -1,                  // Auto level selection
          abrBandWidthFactor: 0.95,        // Conservative bandwidth estimation
          abrMaxWithRealBitrate: true,     // Use real bitrate for ABR decisions

          // Optimize caching
          xhrSetup: function (xhr, url) {
            xhr.responseType = 'arraybuffer';

            // Optimized caching based on content type
            if (url.endsWith('.m3u8')) {
              xhr.setRequestHeader('Cache-Control', 'max-age=1');
            } else if (url.endsWith('.ts')) {
              xhr.setRequestHeader('Cache-Control', 'public, max-age=31536000');
            }
          }
        });

        // Create a hidden video element for preloading
        const preloadElement = document.createElement('video');
        preloadElement.muted = true;
        preloadElement.preload = 'auto';
        preloadElement.playsInline = true;
        preloadElement.style.display = 'none';
        preloadElement.style.width = '0px';
        preloadElement.style.height = '0px';

        // Attach to DOM temporarily for better browser handling
        document.body.appendChild(preloadElement);

        // Add element reference
        preloadObj.element = preloadElement;
        preloadObj.hls = hls;

        // Load the source
        hls.loadSource(videoSource);
        hls.attachMedia(preloadElement);

        // Track metadata when ready
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          preloadObj.metadata.loaded = true;

          // Preload initial segments
          hls.startLoad();

          // Store in global cache
          videoCache.set(video.video_id, preloadObj);

          // After loading a portion, pause loading to conserve bandwidth 
          // but keep enough for instant playback
          setTimeout(() => {
            // Check if video is now active before stopping load
            if (!preloadObj.isActive) {
              hls.stopLoad();
            }
          }, 2000); // Allow 2s of loading for initial segments
        });

        // Handle errors
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            preloadObj.metadata.error = data;
            console.error(`Error preloading HLS video ${video.video_id}:`, data);
            hls.destroy();
          }
        });

        return preloadObj;
      } catch (error) {
        console.error(`Failed to preload HLS video ${video.video_id}:`, error);
        preloadObj.metadata.error = error;
      }
    }
  } else {
    // For non-HLS videos (MP4, etc)
    videoSource = processVideoUrl(video.video_url, API_BASE_URL);

    try {
      // Create and configure preload element
      const preloadElement = document.createElement('video');
      preloadElement.muted = true;
      preloadElement.preload = 'auto';
      preloadElement.playsInline = true;
      preloadElement.style.display = 'none';
      preloadElement.style.width = '0px';
      preloadElement.style.height = '0px';
      preloadElement.crossOrigin = 'anonymous';

      // Set up event listeners
      preloadElement.addEventListener('loadedmetadata', () => {
        preloadObj.metadata.duration = preloadElement.duration;
      });

      preloadElement.addEventListener('canplaythrough', () => {
        preloadObj.metadata.loaded = true;
        // Store in global cache
        videoCache.set(video.video_id, preloadObj);
      });

      preloadElement.addEventListener('error', (e) => {
        preloadObj.metadata.error = e.error || new Error('Video loading error');
        console.error(`Error preloading video ${video.video_id}:`, e);
      });

      // Add source
      preloadElement.src = videoSource;
      document.body.appendChild(preloadElement);

      // Store element reference
      preloadObj.element = preloadElement;

      // Trigger load
      preloadElement.load();

      return preloadObj;
    } catch (error) {
      console.error(`Failed to preload video ${video.video_id}:`, error);
      preloadObj.metadata.error = error;
    }
  }

  // Store even in case of error (to prevent retry attempts)
  videoCache.set(video.video_id, preloadObj);
  return preloadObj;
};

// Manage the video cache size
const cleanupVideoCache = (currentVideoId, maxCacheSize = 10) => {
  // Always keep current video and adjacent videos
  if (videoCache.size <= maxCacheSize) return;

  // Get list of videos sorted by last access time (oldest first)
  const videoEntries = Array.from(videoCache.entries());
  const videoIdsToRemove = videoEntries
    // Filter out current video
    .filter(([id]) => id !== currentVideoId)
    // Sort by access time (oldest first)
    .sort((a, b) => a[1].metadata?.lastAccessed || 0 - b[1].metadata?.lastAccessed || 0)
    // Take only the excess videos
    .slice(0, videoCache.size - maxCacheSize)
    // Get just the IDs
    .map(([id]) => id);

  // Remove excess videos from cache
  videoIdsToRemove.forEach(id => {
    const cachedVideo = videoCache.get(id);
    console.log(`Removing video ${id} from cache`);

    // Clean up HLS resources
    if (cachedVideo?.hls) {
      cachedVideo.hls.stopLoad();
      cachedVideo.hls.destroy();
    }

    // Remove element from DOM
    if (cachedVideo?.element && cachedVideo.element.parentNode) {
      cachedVideo.element.parentNode.removeChild(cachedVideo.element);
    }

    // Remove from cache
    videoCache.delete(id);
  });
};

// Global video cache for faster loading
// Using VIDEO_CACHE imported from '../utils/videoCache' - removed duplicate declaration

const VideoPlayer = ({
  videos,
  currentIndex,
  setCurrentIndex,
  isMobile,
  isTablet,
  isPaused,
  shouldPreserveFullscreen,
  shouldPreload,
  visibilityState
}) => {
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { hasMore, loadMoreVideos } = useVideoContext();

  // Important refs
  const hlsRef = useRef(null);
  const lastTimeUpdateRef = useRef(null);
  const lastTimeValueRef = useRef(null);
  const reportedViewRef = useRef(false);
  const preloadedVideosRef = useRef(new Set());
  const metricsRef = useRef(null);

  // State variables
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [views, setViews] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState(null);
  const [watchTrackerInterval, setWatchTrackerInterval] = useState(null);
  const [deviceType, setDeviceType] = useState(isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop');
  const [watchShared, setWatchShared] = useState(false);
  const [isUrlUpdating, setIsUrlUpdating] = useState(false);
  const [orientation, setOrientation] = useState(
    window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
  );
  const [error, setError] = useState(''); // Added missing error state

  // Quality selection state
  const [availableQualities, setAvailableQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState(-1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  // Metrics state
  const [connectionSpeed, setConnectionSpeed] = useState('');
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // Add this function to handle quality changes
  const handleQualityChange = (level) => {
    if (!hlsRef.current) return;

    console.log(`Manually changing quality to level: ${level}`);
    hlsRef.current.currentLevel = level;
    setCurrentQuality(level);
    setShowQualityMenu(false);
  };

  // Create reference to current video data
  const videoData = videos[currentIndex];
  const videoId = videoData?.video_id;

  // Add effect for video cache integration
  useEffect(() => {
    if (!videos || !videos[currentIndex]) return;

    const currentVideo = videos[currentIndex];
    const videoId = currentVideo?.video_id;

    if (!videoId) return;

    // If this video should be visible and played
    if (visibilityState === 'active') {
      // Mark the current video as active in the cache
      const cachedVideo = VIDEO_CACHE.getVideo(videoId);
      if (cachedVideo && cachedVideo.hls) {
        cachedVideo.hls.startLoad();
      }

      // Also preload adjacent videos for smooth navigation
      if (currentIndex + 1 < videos.length) {
        const nextVideo = videos[currentIndex + 1];
        VIDEO_CACHE.preloadVideo(nextVideo);
      }

      if (currentIndex > 0) {
        const prevVideo = videos[currentIndex - 1];
        VIDEO_CACHE.preloadVideo(prevVideo);
      }
    }
    // If this video should be preloaded but not visible
    else if (visibilityState === 'preload' && shouldPreload) {
      // Preload this video if not already in cache
      if (!VIDEO_CACHE.hasVideo(videoId)) {
        VIDEO_CACHE.preloadVideo(currentVideo);
      }
    }

    // Clean up cache
    VIDEO_CACHE.cleanup(videoId);

  }, [videos, currentIndex, visibilityState, shouldPreload]);

  // Replace loadVideo with cached version
  const loadVideo = useCallback(async () => {
    if (!videos || !videos[currentIndex]) {
      setIsLoading(false);
      return;
    }

    const videoToLoad = videos[currentIndex];
    const videoId = videoToLoad?.video_id;

    if (!videoToLoad || !videoToLoad.video_url || !videoId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Check for cached video first
      const cachedVideo = VIDEO_CACHE.getVideo(videoId);

      // Determine if this is an HLS stream
      const isHlsStream = videoToLoad.video_url.toLowerCase().endsWith('.m3u8') ||
        videoToLoad.video_format === 'hls';

      // Get video source
      const videoSource = processVideoUrl(videoToLoad.video_url, API_BASE_URL);

      if (isHlsStream && typeof Hls !== 'undefined' && Hls.isSupported()) {
        console.log("Using HLS.js for playback");

        let hls;

        // Try to use cached HLS instance first
        if (cachedVideo && cachedVideo.hls && cachedVideo.isHls) {
          console.log(`Using cached HLS for ${videoId}`);

          // Use the cached HLS instance
          hls = cachedVideo.hls;

          // Detach from preload element
          hls.detachMedia();

          // Attach to the player element
          if (videoRef.current) {
            hls.attachMedia(videoRef.current);
            hls.startLoad();

            // Set up play when ready
            videoRef.current.addEventListener('canplay', async () => {
              if (videoRef.current && !isPaused) {
                try {
                  await videoRef.current.play();
                  setIsLoading(false);
                } catch (error) {
                  console.warn('Auto-play failed:', error);
                  setIsLoading(false);
                }
              } else {
                setIsLoading(false);
              }
            }, { once: true });
          }
        } else {
          // Create a new HLS instance
          hls = new Hls({
            // Core settings
            enableWorker: true,
            maxBufferLength: 30,
            maxBufferSize: 15 * 1000 * 1000, // 15MB buffer for high quality

            // Faster startup
            startLevel: -1,
            abrEwmaDefaultEstimate: 3000000, // Higher initial bitrate (3Mbps)

            // Immediate start
            autoStartLoad: true,
          });

          // Load the source
          hls.loadSource(videoSource);

          if (videoRef.current) {
            hls.attachMedia(videoRef.current);

            // Add to cache
            VIDEO_CACHE.addVideo(videoId, {
              videoId: videoId,
              source: videoSource,
              isHls: true,
              hls: hls,
              element: videoRef.current,
              metadata: {
                loaded: true,
                loadStartTime: Date.now()
              }
            });

            // Handle manifest loaded
            hls.on(Hls.Events.MANIFEST_PARSED, async () => {
              if (videoRef.current && !isPaused) {
                try {
                  await videoRef.current.play();
                  setIsLoading(false);
                } catch (error) {
                  console.warn('Auto-play failed:', error);
                  setIsLoading(false);
                }
              } else {
                setIsLoading(false);
              }
            });
          }
        }

        // Store the HLS instance for cleanup
        hlsRef.current = hls;  // Fixed: Using hlsRef instead of hlsInstance

        // Handle errors
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            console.error('HLS Error:', data);
            setError('Failed to load video stream');
            setIsLoading(false);
            hls.destroy();
          }
        });
      } else {
        // Standard HTML5 Video
        console.log("Using standard HTML5 video");

        if (videoRef.current) {
          if (cachedVideo && !cachedVideo.isHls) {
            // Use cached video source
            console.log(`Using cached standard video for ${videoId}`);
            videoRef.current.src = cachedVideo.source;
          } else {
            // Use direct source
            videoRef.current.src = videoSource;

            // Add to cache
            VIDEO_CACHE.addVideo(videoId, {
              videoId: videoId,
              source: videoSource,
              isHls: false,
              element: videoRef.current,
              metadata: {
                loaded: false,
                loadStartTime: Date.now()
              }
            });
          }

          // Load the video
          videoRef.current.load();

          // Set up play when ready
          videoRef.current.addEventListener('canplaythrough', async () => {
            if (videoRef.current && !isPaused) {
              try {
                await videoRef.current.play();
                setIsLoading(false);
              } catch (error) {
                console.warn('Auto-play failed:', error);
                setIsLoading(false);
              }
            } else {
              setIsLoading(false);
            }
          }, { once: true });

          // Handle errors
          videoRef.current.addEventListener('error', () => {
            console.error('Video loading error');
            setError('Failed to load video');
            setIsLoading(false);
          }, { once: true });
        }
      }
    } catch (error) {
      console.error('Video loading error:', error);
      setError('Failed to load video');
      setIsLoading(false);
    }
  }, [videos, currentIndex, isPaused]);

  // Add cleanup for cache
  useEffect(() => {
    return () => {
      // When component unmounts, keep cache size small
      VIDEO_CACHE.maxCacheSize = 5;
      VIDEO_CACHE.cleanup();
    };
  }, []);

  // Simplified handlers for next/previous video
  const handlePrevVideo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (videos && videos.length > 0) {
      setCurrentIndex(videos.length - 1);
    }
  }, [currentIndex, videos, setCurrentIndex]);

  const handleNextVideo = useCallback(() => {
    if (videos && videos.length > 0) {
      if (currentIndex < videos.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        if (hasMore) {
          loadMoreVideos();
        }
        setCurrentIndex(0);
      }
    }
  }, [currentIndex, videos, hasMore, loadMoreVideos, setCurrentIndex]);

  // Simplified touch handlers
  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useSwipeNavigate(
    handleNextVideo,
    handlePrevVideo,
    70,
    true
  );

  // Optimized mouse move handler with debouncing
  const handleMouseMove = useCallback(() => {
    // Return early if we're already showing controls (prevents unnecessary state updates)
    if (showControls && controlsTimeout) {
      // Just reset the timeout without changing state or generating re-renders
      clearTimeout(controlsTimeout);

      const newTimeout = setTimeout(() => {
        setShowControls(false);
      }, 5000);

      setControlsTimeout(newTimeout);
      return;
    }

    // Only update state if we need to show controls
    if (!showControls) {
      setShowControls(true);

      const newTimeout = setTimeout(() => {
        setShowControls(false);
      }, 5000);

      setControlsTimeout(newTimeout);
    }
  }, [showControls, controlsTimeout]);

  // Throttled time update handler to prevent excessive updates
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // Only update React state twice per second to reduce rendering
    // This ensures the UI stays responsive without excessive re-renders
    const now = Date.now();
    if (!lastTimeUpdateRef.current || now - lastTimeUpdateRef.current > 500) {
      lastTimeUpdateRef.current = now;

      // Round the time values to reduce precision and unnecessary updates
      const currentTimeRounded = Math.floor(video.currentTime);
      if (currentTimeRounded !== lastTimeValueRef.current) {
        lastTimeValueRef.current = currentTimeRounded;
        setCurrentTime(currentTimeRounded);
      }
    }
  }, []);

  // Simplified video container click handler
  const handleVideoContainerClick = (e) => {
    if (e.target === videoContainerRef.current || e.target === videoRef.current) {
      togglePlayPause();
    }
  };

  // Simplified toggle play/pause
  const togglePlayPause = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    if (video.paused) {
      video.play()
        .then(() => setIsPlaying(true))
        .catch(error => {
          console.error("Error playing video:", error);
          setIsPlaying(false);
        });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  // Simplified update video handler
  useEffect(() => {
    if (!videos || videos.length === 0 || currentIndex >= videos.length) {
      console.log("No videos available or invalid index");
      return;
    }

    const currentVideo = videos[currentIndex];
    if (!currentVideo || !currentVideo.video_url) {
      console.log("Current video or URL is missing");
      return;
    }

    const videoElement = videoRef.current;
    if (!videoElement) {
      console.log("Video element reference is missing");
      return;
    }

    console.log(`Loading video ${currentIndex}:`, currentVideo.video_url);

    // Reset the reported view flag for the new video
    reportedViewRef.current = false;

    // Track if component is mounted
    let isMounted = true;

    const loadVideo = async () => {
      try {
        // Clean up current video with error handling
        try {
          // Cleanup any existing HLS instance
          if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
          }

          videoElement.pause();
          videoElement.removeAttribute('src');
          videoElement.load();
        } catch (cleanupError) {
          console.warn("Error during video cleanup:", cleanupError);
        }

        // Get video source URL - force .m3u8 extension
        let originalUrl = currentVideo.video_url;
        // If the URL doesn't end with .m3u8, assume it's the base URL and append index.m3u8
        if (!originalUrl.toLowerCase().endsWith('.m3u8')) {
          // Remove any existing extension
          originalUrl = originalUrl.replace(/\.[^/.]+$/, "");
          // Append index.m3u8 to ensure HLS format
          originalUrl = `${originalUrl}/index.m3u8`;
        }

        let videoSource = getVideoSource(originalUrl);
        console.log("Using HLS source:", videoSource);

        if (!videoSource) {
          console.error("Failed to get valid video source");
          if (isMounted) {
            setSnackbarMessage("Invalid video source. Please try another video.");
            setShowSnackbar(true);
          }
          return;
        }

        // Always treat as HLS stream
        const isHlsStream = true;
        console.log(`Treating as HLS stream: ${isHlsStream}`);

        // Check if we have this video preloaded
        const videoId = currentVideo.video_id;
        const preloadedVideo = preloadedVideosRef.current[videoId];

        if (isHlsStream && Hls.isSupported()) {
          console.log("Using HLS.js for playback");

          let hls;

          // Use preloaded HLS instance if available
          if (preloadedVideo && preloadedVideo.loaded) {
            console.log("Using preloaded HLS instance");
            hls = preloadedVideo.hls;

            // Detach from preload element
            if (preloadedVideo.element) {
              hls.detachMedia();
              if (preloadedVideo.element.parentNode) {
                preloadedVideo.element.parentNode.removeChild(preloadedVideo.element);
              }
            }
          } else {
            // Create a new HLS instance
            hls = new Hls({
              // Core settings
              enableWorker: true,
              lowLatencyMode: false,
              debug: false,

              // Short-form video optimization - smaller buffers, faster startup
              backBufferLength: 30,        // 30 seconds back buffer for smoother replay
              maxBufferLength: 15,         // 15 seconds ahead - reduced for short videos
              maxBufferSize: 12 * 1000 * 1000, // 12MB buffer (optimized for high-quality short clips)
              maxMaxBufferLength: 30,      // Reduced maximum buffer for short videos

              // Aggressive ABR for faster quality switches in short content
              startLevel: -1,               // Auto start level
              abrEwmaDefaultEstimate: 2000000, // Higher initial bitrate estimate (2Mbps)
              abrBandWidthFactor: 0.95,     // More conservative bandwidth estimate for stability
              abrBandWidthUpFactor: 0.85,   // More aggressive upswitch for short videos
              abrMaxWithRealBitrate: true,

              // Segment loading optimization for immediate playback
              liveSyncDurationCount: 2,     // Sync to 2 segments for faster start
              fragLoadingTimeOut: 4000,     // Shorter timeout for fragment loading
              fragLoadingMaxRetry: 6,       // More retries for short content
              fragLoadingRetryDelay: 300,   // Faster retry for fragments
              manifestLoadingMaxRetry: 4,   // More manifest retries
              manifestLoadingTimeOut: 3000, // Faster manifest timeout

              // Instant start settings
              autoStartLoad: true,         // Auto-start loading (changed from false)
              startFragPrefetch: true,     // Prefetch first fragment
              testBandwidth: false,        // Skip initial bandwidth test for faster start

              // Optimized for S3 hosted content
              xhrSetup: function (xhr, url) {
                xhr.responseType = 'arraybuffer';

                // Apply optimal Cache-Control headers based on content type
                if (url.endsWith('.m3u8')) {
                  // Minimal caching for playlists - allows for dynamic updates
                  xhr.setRequestHeader('Cache-Control', 'max-age=1');
                } else if (url.endsWith('.ts')) {
                  // Aggressive caching for segments - they never change
                  xhr.setRequestHeader('Cache-Control', 'public, max-age=31536000');
                }

                // Add AWS specific optimizations
                if (url.includes('amazonaws.com')) {
                  // Add range request capabilities
                  xhr.setRequestHeader('Range', 'bytes=0-');

                  // Ensure connection is kept alive between segment requests
                  xhr.setRequestHeader('Connection', 'keep-alive');
                }

                // Log requests for debugging
                console.log(`Loading HLS chunk: ${url.split('/').pop()}`);
              }
            });

            // Load source
            hls.loadSource(videoSource);

            // Setup event tracking
            setupHlsEventListeners(hls, setAvailableQualities, setCurrentQuality);
          }

          hlsRef.current = hls;

          // Attach to actual video element
          hls.attachMedia(videoElement);

          // Listen for HLS events
          hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            console.log("HLS manifest parsed, analyzing quality levels:", data.levels.length);

            // Log available bitrates to help with debugging
            data.levels.forEach((level, index) => {
              console.log(`Level ${index}: ${level.bitrate / 1000} Kbps, resolution: ${level.width}x${level.height}`);
            });

            // Choose optimal level based on device and connection
            let startLevel = -1; // Auto by default

            // On mobile devices, prefer lower quality to start playback faster
            if (isMobile) {
              // Find a level with resolution <= 720p for faster initial load
              const mediumQualityIndex = data.levels.findIndex(level => level.height <= 720);
              if (mediumQualityIndex !== -1) {
                startLevel = mediumQualityIndex;
                console.log(`Selected medium quality level ${startLevel} for faster mobile start`);
              }
            }

            // Set the start level
            hls.startLevel = startLevel;

            // Start loading fragments from the beginning
            hls.startLoad(-1);

            // Only load what we need initially
            setTimeout(() => {
              if (videoRef.current && videoRef.current.currentTime < 5) {
                console.log("Initial buffer established, switching to progressive loading");
                // After getting initial buffer, let HLS.js manage loading based on playback
                hls.config.maxBufferLength = 15; // Increase slightly after initial load
              }
            }, 3000);

            if (isMounted) {
              // Set initial play position to beginning
              videoRef.current.currentTime = 0;

              // Only attempt playback if this video is current and not paused
              if (!isPaused) {
                attemptPlayback(videoRef.current, currentVideo);
              } else {
                console.log("Video loaded but paused because it's not the current video");
                videoRef.current.pause();
                setIsPlaying(false);
              }

              // Start playback monitoring
              startPlaybackMonitoring(videoRef.current, hls);
            }
          });

          // Add fragment loaded event for bandwidth monitoring
          hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
            // Calculate bandwidth from segment loading
            const loadTime = data.stats.loading.end - data.stats.loading.start;
            const bytes = data.stats.total;
            if (loadTime > 0 && bytes > 0) {
              // Calculate bandwidth in kbps
              const bandwidthKbps = Math.round((bytes * 8) / (loadTime / 1000) / 1000);

              // Get connection speed description
              let speedDescription = 'Unknown';
              if (bandwidthKbps > 5000) speedDescription = 'Excellent';
              else if (bandwidthKbps > 2000) speedDescription = 'Good';
              else if (bandwidthKbps > 800) speedDescription = 'Fair';
              else speedDescription = 'Poor';

              setConnectionSpeed(`${speedDescription} (${bandwidthKbps} kbps)`);
            }
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
              console.error("Fatal HLS error:", data);

              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.log("Network error occurred, trying to recover");
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.log("Media error occurred, trying to recover");
                  hls.recoverMediaError();
                  break;
                default:
                  // Cannot recover
                  console.error("Unrecoverable HLS error");
                  if (isMounted) {
                    setSnackbarMessage("Error loading video stream");
                    setShowSnackbar(true);
                  }
                  break;
              }
            }
          });
        } else if (isHlsStream && isHlsNativelySupported()) {
          console.log("Using native HLS support");

          // For Safari and iOS which support HLS natively
          videoElement.src = videoSource;
          videoElement.addEventListener('loadedmetadata', function () {
            if (isMounted) {
              attemptPlayback(videoElement, currentVideo);
            }
          });

        } else {
          console.log("HLS is not supported by this browser");

          // Show error message to user
          if (isMounted) {
            setSnackbarMessage("Your browser doesn't support HLS streaming. Please try a different browser.");
            setShowSnackbar(true);
          }
        }

        // Update UI metadata
        if (isMounted) {
          setLikes(currentVideo.likes || 0);
          setDislikes(currentVideo.dislikes || 0);
          setViews(currentVideo.views || 0);

          // Update URL without navigation (only if needed)
          try {
            const currentPath = window.location.pathname;
            const targetPath = `/video/${currentVideo.video_id}`;

            // Only update if the path actually changed
            if (!currentPath.includes(currentVideo.video_id)) {
              console.log(`Updating URL from ${currentPath} to ${targetPath}`);
              window.history.replaceState(
                { videoId: currentVideo.video_id },
                '',
                targetPath
              );
            }
          } catch (error) {
            console.error("Error updating URL:", error);
          }

          // Check saved and follow status if user is logged in
          if (currentUser) {
            checkSavedStatus(currentVideo.video_id);
            checkFollowStatus(currentVideo.user_id);
          }
        }
      } catch (globalError) {
        console.error("Global error in video loading process:", globalError);
        if (isMounted) {
          setSnackbarMessage("Error playing video: " + (globalError.message || "Unknown error"));
          setShowSnackbar(false);
        }
      }
    };

    // Helper function to attempt playback with retry logic
    const attemptPlayback = (video, currentVideo) => {
      // If this video should be paused, don't attempt playback
      if (isPaused) {
        console.log("Not attempting playback because video should be paused");
        video.pause();
        setIsPlaying(false);
        return;
      }

      console.log("Attempting to play video...");

      // Set initial muted state to false unless required by browser
      video.muted = false;
      setIsMuted(false);

      try {
        const playPromise = video.play();

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              if (!isMounted) return;
              console.log("Video playback started successfully");
              setIsPlaying(true);

              // Report view if needed
              if (!reportedViewRef.current) {
                incrementVideoView(currentVideo.video_id).catch(err =>
                  console.error("Failed to increment view count:", err)
                );
                reportedViewRef.current = true;
              }
            })
            .catch(err => {
              if (!isMounted) return;
              console.error("Error playing video:", err);

              // Try muted playback for autoplay policy only if required by browser
              if (!video.muted) {
                console.log("Trying muted autoplay due to browser policy...");
                video.muted = true;
                setIsMuted(true);

                video.play().then(() => {
                  console.log("Muted playback started successfully");
                  // Explicitly show message to user about unmuting
                  setSnackbarMessage("Video started muted. Click volume icon to unmute.");
                  setShowSnackbar(true);
                }).catch(e => {
                  if (!isMounted) return;
                  console.error("Muted autoplay also failed:", e);
                  setIsPlaying(false);
                });
              } else {
                setIsPlaying(false);
              }
            });
        }
      } catch (playError) {
        console.error("Exception during play() attempt:", playError);
      }
    };

    // Load video with a small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        loadVideo();
      }
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);

      // Safely clean up video element and HLS instance on unmount
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.src = '';
          videoRef.current.load();
        } catch (cleanupError) {
          console.warn("Error cleaning up video on unmount:", cleanupError);
        }
      }

      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
          hlsRef.current = null;
        } catch (hlsError) {
          console.warn("Error cleaning up HLS instance:", hlsError);
        }
      }
    };
  }, [videos, currentIndex, currentUser, setAvailableQualities, setCurrentQuality, isPaused]);

  // Check if a video is saved by the current user - used when video changes
  const checkSavedStatus = async (videoId) => {
    try {
      const response = await checkVideoSaved(videoId);
      setIsSaved(response.is_saved);
    } catch (error) {
      console.error("Error checking saved status:", error);
    }
  };

  // Check if creator is followed by current user - used when video changes
  const checkFollowStatus = async (creatorId) => {
    if (!currentUser || currentUser.user_id === creatorId) {
      setIsFollowing(false);
      return;
    }

    try {
      const isFollowing = await checkIsFollowing(creatorId);
      setIsFollowing(isFollowing);
    } catch (error) {
      console.error("Error checking follow status:", error);
    }
  };

  // Update to recognize external fullscreen control
  useEffect(() => {
    // Sync fullscreen state with external controls
    if (shouldPreserveFullscreen && !isFullScreen) {
      setIsFullScreen(true);
    }
  }, [shouldPreserveFullscreen]);

  // Modify the enterFullScreen function to make it more reliable
  const enterFullScreen = () => {
    try {
      const videoContainer = videoContainerRef.current;
      if (!videoContainer) return;

      // First try using our unified API
      fullscreenAPI.enterFullscreen(videoContainer)
        .then(() => {
          setIsFullScreen(true);
        })
        .catch((err) => {
          console.error("Failed to enter fullscreen:", err);

          // Fallback: try to simulate fullscreen with CSS
          if (videoContainer) {
            videoContainer.style.position = 'fixed';
            videoContainer.style.top = '0';
            videoContainer.style.left = '0';
            videoContainer.style.width = '100vw';
            videoContainer.style.height = '100vh';
            videoContainer.style.zIndex = '9999';
            document.body.style.overflow = 'hidden';
            setIsFullScreen(true);

            // Add the fullscreen class to help with CSS targeting
            videoContainer.classList.add('video-fullscreen');
          } else {
            // Last resort fallback
            setSnackbarMessage("Fullscreen not supported by your browser. Try pressing F11.");
            setShowSnackbar(true);
          }
        });
    } catch (error) {
      console.error("Error requesting fullscreen:", error);
      setSnackbarMessage("Fullscreen mode is not supported on this device.");
      setShowSnackbar(true);
    }
  };

  const exitFullScreen = () => {
    try {
      // Check if we're in browser fullscreen mode
      if (fullscreenAPI.isFullscreen()) {
        fullscreenAPI.exitFullscreen()
          .catch(err => {
            console.error("Error exiting fullscreen:", err);
          });
      } else if (videoContainerRef.current &&
        videoContainerRef.current.style.position === 'fixed') {
        // We're in CSS simulated fullscreen
        const videoContainer = videoContainerRef.current;
        videoContainer.style.position = '';
        videoContainer.style.top = '';
        videoContainer.style.left = '';
        videoContainer.style.width = '';
        videoContainer.style.height = '';
        videoContainer.style.zIndex = '';
        document.body.style.overflow = '';
      }

      setIsFullScreen(false);

      // Don't navigate away unnecessarily - we're already in the video player
    } catch (error) {
      console.error("Error exiting fullscreen:", error);
      setIsFullScreen(false);
    }
  };

  // Define handleKeyDown before using it in useEffect
  const handleKeyDown = (event) => {
    // Prevent default behavior for arrow keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }

    switch (event.key) {
      case "ArrowUp":
        handlePrevVideo();
        break;
      case "ArrowDown":
        handleNextVideo();
        break;
      case "ArrowLeft":
        // Fast backward 10 seconds
        const video = videoRef.current;
        if (video) {
          video.currentTime = Math.max(video.currentTime - 10, 0);
          setSnackbarMessage("Rewind 10s");
          setShowSnackbar(true);
        }
        break;
      case "ArrowRight":
        // Fast forward 10 seconds
        if (videoRef.current) {
          videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, videoRef.current.duration);
          setSnackbarMessage("Fast forward 10s");
          setShowSnackbar(true);
        }
        break;
      case " ":
      case "k":
        togglePlayPause();
        break;
      case "m":
        toggleMute();
        break;
      case "Escape":
        exitFullScreen();
        break;
      case "f":
        toggleFullScreen();
        break;
      default:
        // Do nothing for other keys
        break;
    }
  };

  // Define handleFullscreenChange before using it in useEffect
  const handleFullscreenChange = () => {
    // Check if we should prevent fullscreen exit
    if (shouldPreserveFullscreen) {
      // Keep fullscreen state as is - don't exit fullscreen during swipes
      return;
    }

    // Temporarily add transition to make fullscreen changes smoother
    if (videoContainerRef.current) {
      videoContainerRef.current.style.transition = 'all 0.3s ease-out';

      // Remove the transition after animation completes
      setTimeout(() => {
        if (videoContainerRef.current) {
          videoContainerRef.current.style.transition = '';
        }
      }, 300);
    }

    // Use our unified API to check fullscreen state
    setIsFullScreen(fullscreenAPI.isFullscreen());

    // If we exited fullscreen through browser controls (not our button)
    // but we're in a CSS simulated fullscreen mode, also exit that
    if (!fullscreenAPI.isFullscreen() &&
      videoContainerRef.current &&
      videoContainerRef.current.style.position === 'fixed') {
      const videoContainer = videoContainerRef.current;
      videoContainer.style.position = '';
      videoContainer.style.top = '';
      videoContainer.style.left = '';
      videoContainer.style.width = '';
      videoContainer.style.height = '';
      videoContainer.style.zIndex = '';
      document.body.style.overflow = '';
      setIsFullScreen(false);
    }
  };

  // Add separate useEffect for document level events without keyboard handling
  useEffect(() => {
    console.log("Adding document level event listeners for fullscreen changes");

    // Use our custom fullscreen change event
    const fullscreenChangeEvent = fullscreenAPI.fullscreenChangeEventName();
    document.addEventListener(fullscreenChangeEvent, handleFullscreenChange);

    return () => {
      console.log("Removing document level event listeners");
      document.removeEventListener(fullscreenChangeEvent, handleFullscreenChange);
    };
  }, [handleFullscreenChange]);

  // Using imported utility functions for videos
  // Replace getVideoSource with processVideoUrl
  const getVideoSource = (videoUrl) => processVideoUrl(videoUrl, API_BASE_URL);

  // Update MIME type function to only return HLS MIME type regardless of extension
  const getVideoMimeType = (url) => 'application/vnd.apple.mpegurl';

  // Add toggleMute function
  const toggleMute = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  // Add toggleFullScreen function
  const toggleFullScreen = () => {
    if (isFullScreen) {
      exitFullScreen();
    } else {
      enterFullScreen();
    }
  };

  // Add handleVideoError function
  const handleVideoError = (error) => {
    console.error("Video error occurred:", error);

    // Show error message to user
    setSnackbarMessage("Error playing video. Please try another video.");
    setShowSnackbar(false);
  };

  // Add goToHomePage function
  const goToHomePage = () => {
    navigate("/demo/");
  };

  // Add handleSeekChange function
  const handleSeekChange = (e) => {
    if (!videoRef.current || duration === 0) return;

    const video = videoRef.current;
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const percentage = relativeX / rect.width;

    // Set the video's current time based on the percentage
    const newTime = percentage * video.duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Add formatTime helper function
  const formatTime = (timeInSeconds) => {
    if (!timeInSeconds || isNaN(timeInSeconds)) return "0:00";

    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);

    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Add handleLike function
  const handleLike = async () => {
    if (!currentUser) {
      setSnackbarMessage("Please log in to like videos");
      setShowSnackbar(true);
      return;
    }

    try {
      const videoId = videos[currentIndex].video_id;

      if (isLiked) {
        // Unlike video (toggle off)
        setIsLiked(false);
      } else {
        // Like video
        setIsLiked(true);
        // If video was previously disliked, remove dislike
        if (isDisliked) {
          setIsDisliked(false);
        }

        // Update likes count on server
        const response = await incrementVideoLike(videoId);

        if (response && typeof response.likes === 'number') {
          setLikes(response.likes);
        }
      }
    } catch (error) {
      console.error("Error liking video:", error);
      setSnackbarMessage("Failed to update like status");
      setShowSnackbar(true);
    }
  };

  // Add handleDislike function
  const handleDislike = async () => {
    if (!currentUser) {
      setSnackbarMessage("Please log in to dislike videos");
      setShowSnackbar(true);
      return;
    }

    try {
      const videoId = videos[currentIndex].video_id;

      if (isDisliked) {
        // Remove dislike (toggle off)
        setIsDisliked(false);
      } else {
        // Dislike video
        setIsDisliked(true);
        // If video was previously liked, remove like
        if (isLiked) {
          setIsLiked(false);
        }

        // Update dislikes count on server
        const response = await incrementVideoDislike(videoId);

        if (response && typeof response.dislikes === 'number') {
          setDislikes(response.dislikes);
        }
      }
    } catch (error) {
      console.error("Error disliking video:", error);
      setSnackbarMessage("Failed to update dislike status");
      setShowSnackbar(true);
    }
  };

  // Add handleShare function
  const handleShare = async () => {
    if (!videos || videos.length === 0 || currentIndex >= videos.length) {
      return;
    }

    try {
      const currentVideo = videos[currentIndex];
      const shareUrl = `${window.location.origin}/video/${currentVideo.video_id}`;

      // Set flag that we've shared this video
      setWatchShared(true);

      // Update watch history with shared flag if user is logged in
      if (currentUser && videos && videos.length > 0 && currentIndex < videos.length) {
        const videoElement = videoRef.current;
        const currentTime = videoElement ? videoElement.currentTime : 0;
        const duration = videoElement ? videoElement.duration : 0;
        const watchPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

        const watchData = {
          video_id: currentVideo.video_id,
          watch_time: currentTime,
          watch_percentage: watchPercentage,
          completed: false,
          last_position: currentTime,
          like_flag: isLiked,
          dislike_flag: isDisliked,
          saved_flag: isSaved,
          shared_flag: true,
          device_type: deviceType
        };

        updateWatchHistory(watchData).catch(err => {
          console.error("Failed to update watch history for share:", err);
        });
      }

      // Share the URL
      if (navigator.clipboard && window.isSecureContext) {
        // Use clipboard API if available
        await navigator.clipboard.writeText(shareUrl);
        setSnackbarMessage("Link copied to clipboard");
        setShowSnackbar(true);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          document.execCommand('copy');
          setSnackbarMessage("Link copied to clipboard");
          setShowSnackbar(true);
        } catch (err) {
          console.error("Failed to copy link:", err);
          setSnackbarMessage("Failed to copy link");
          setShowSnackbar(true);
        }

        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error("Error sharing video:", error);
      setSnackbarMessage("Failed to share video");
      setShowSnackbar(true);
    }
  };

  // Add handleSaveVideo function
  const handleSaveVideo = async () => {
    if (!currentUser) {
      setSnackbarMessage("Please log in to save videos");
      setShowSnackbar(true);
      return;
    }

    try {
      const videoId = videos[currentIndex].video_id;

      // Toggle saved status
      const newSavedStatus = !isSaved;
      setIsSaved(newSavedStatus);

      // Update on server
      await saveVideo(videoId, newSavedStatus);

      // Show confirmation to user
      setSnackbarMessage(newSavedStatus ? "Video saved" : "Video removed from saved");
      setShowSnackbar(true);
    } catch (error) {
      console.error("Error saving video:", error);
      // Revert UI state on error
      setIsSaved(!isSaved);
      setSnackbarMessage("Failed to update saved status");
      setShowSnackbar(true);
    }
  };

  // Add handleFollowToggle function
  const handleFollowToggle = async () => {
    if (!currentUser) {
      setSnackbarMessage("Please log in to follow creators");
      setShowSnackbar(true);
      return;
    }

    // Get creator ID
    const creatorId = videos[currentIndex].creator_id;

    // Prevent following yourself
    if (currentUser.user_id === creatorId) {
      setSnackbarMessage("You cannot follow yourself");
      setShowSnackbar(true);
      return;
    }

    setFollowLoading(true);

    try {
      if (isFollowing) {
        // Unfollow
        await unfollowUser(creatorId);
        setIsFollowing(false);
        setSnackbarMessage("Unfollowed creator");
      } else {
        // Follow
        await followUser(creatorId);
        setIsFollowing(true);
        setSnackbarMessage("Following creator");
      }
      setShowSnackbar(true);
    } catch (error) {
      console.error("Error toggling follow status:", error);
      setSnackbarMessage("Failed to update follow status");
      setShowSnackbar(true);
    } finally {
      setFollowLoading(false);
    }
  };

  // Add confirmDelete function
  const confirmDelete = async () => {
    // Only allow creator to delete their own video
    if (!currentUser || currentUser.user_id !== videos[currentIndex].user_id) {
      setSnackbarMessage("You can only delete your own videos");
      setShowSnackbar(true);
      setShowDeleteDialog(false);
      return;
    }

    setIsDeleting(true);

    try {
      const videoId = videos[currentIndex].video_id;
      await deleteVideo(videoId);

      setSnackbarMessage("Video deleted successfully");
      setShowSnackbar(true);

      // Close dialog
      setShowDeleteDialog(false);

      // Navigate to next video if available
      if (videos.length > 1) {
        if (currentIndex < videos.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else if (currentIndex === videos.length - 1) {
          setCurrentIndex(0);
        }
      } else {
        // If this was the last video, navigate home
        navigate("/");
      }
    } catch (error) {
      console.error("Error deleting video:", error);
      setSnackbarMessage("Failed to delete video");
      setShowSnackbar(true);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Add this useEffect to start and cleanup the metrics monitoring
  useEffect(() => {
    if (videoRef.current && hlsRef.current) {
      // Clean up any existing metrics monitoring
      if (metricsRef.current) {
        metricsRef.current.cleanup();
      }

      // Start new monitoring
      metricsRef.current = startPlaybackMonitoring(videoRef.current, hlsRef.current);
    }

    return () => {
      if (metricsRef.current) {
        metricsRef.current.cleanup();
      }
    };
  }, [currentIndex]);

  // Add effect to handle isPaused prop changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPaused && !video.paused) {
      video.pause();
      setIsPlaying(false);
    } else if (!isPaused && video.paused && isPlaying) {
      video.play()
        .catch(error => {
          console.error("Error resuming video:", error);
        });
    }
  }, [isPaused, isPlaying]);

  // Add an effect to handle fullscreen preservation
  useEffect(() => {
    if (shouldPreserveFullscreen && isFullScreen) {
      // If we're in fullscreen and should preserve it, don't allow exiting
      const preventExitFullscreen = (e) => {
        if (isFullScreen) {
          e.stopPropagation();
        }
      };

      // Add listeners to prevent fullscreen exit
      document.addEventListener('fullscreenchange', preventExitFullscreen, true);
      document.addEventListener('webkitfullscreenchange', preventExitFullscreen, true);
      document.addEventListener('mozfullscreenchange', preventExitFullscreen, true);
      document.addEventListener('MSFullscreenChange', preventExitFullscreen, true);

      return () => {
        // Clean up when component unmounts
        document.removeEventListener('fullscreenchange', preventExitFullscreen, true);
        document.removeEventListener('webkitfullscreenchange', preventExitFullscreen, true);
        document.removeEventListener('mozfullscreenchange', preventExitFullscreen, true);
        document.removeEventListener('MSFullscreenChange', preventExitFullscreen, true);
      };
    }
  }, [shouldPreserveFullscreen, isFullScreen]);

  // Add a useEffect to attach event listeners for the video timing
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    // Handler for when metadata is loaded - this sets the duration
    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0);
    };

    // Add event listeners
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    // Clean up event listeners when component unmounts
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [handleTimeUpdate]); // Only handleTimeUpdate is a dependency since it's memoized

  if (!videos || videos.length === 0 || currentIndex >= videos.length) {
    return (
      <Box
        sx={{
          width: "100vw",
          height: "100vh",
          bgcolor: "black",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "white"
        }}
      >
        <Typography variant="h5">No videos available</Typography>
      </Box>
    );
  }

  const currentVideo = videos[currentIndex];

  // Calculate appropriate video dimensions based on orientation
  const getVideoContainerStyle = () => {
    // Shared styles for all modes
    const baseStyles = {
      backgroundColor: '#000',
      overflow: 'hidden',
      position: 'relative',
      // Add hardware acceleration to improve animation performance
      willChange: 'transform',
      transform: 'translateZ(0)',
      WebkitBackfaceVisibility: 'hidden',
      backfaceVisibility: 'hidden'
    };

    // For mobile in portrait mode
    if (isMobile && orientation === 'portrait') {
      return {
        ...baseStyles,
        width: '100%',
        height: 'auto',
        maxHeight: '80vh',
        borderRadius: 0,
        boxShadow: 'none',
        margin: 0
      };
    }

    // For fullscreen or landscape
    return {
      ...baseStyles,
      width: '100%',
      height: '100vh'
    };
  };

  // Style for the video element
  const getVideoStyle = () => {
    // Shared styles for all modes
    const baseStyles = {
      background: '#000',
      // Add hardware acceleration to improve animation performance
      willChange: 'transform',
      transform: 'translateZ(0)',
      WebkitBackfaceVisibility: 'hidden',
      backfaceVisibility: 'hidden'
    };

    // For mobile in portrait mode
    if (isMobile && orientation === 'portrait') {
      return {
        ...baseStyles,
        width: '100%',
        height: 'auto',
        aspectRatio: '16/9',
        objectFit: 'contain'
      };
    }

    // For fullscreen or landscape
    return {
      ...baseStyles,
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    };
  };

  // Get page container style
  const getPageContainerStyle = () => {
    // For mobile in portrait mode
    if (isMobile && orientation === 'portrait') {
      return {
        width: '100%',
        height: '100vh',
        backgroundColor: '#000',
        padding: 0,
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      };
    }

    // For fullscreen or landscape
    return {
      width: '100%',
      height: '100vh',
      position: 'relative',
      backgroundColor: '#000',
      overflow: 'hidden'
    };
  };

  return (
    <React.Fragment>
      <Box sx={getPageContainerStyle()}>
        <Box
          ref={videoContainerRef}
          sx={getVideoContainerStyle()}
          onClick={handleVideoContainerClick}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
        >
          {/* Back button that appears/disappears with controls */}
          <Slide direction="down" in={showControls} timeout={300}>
            <IconButton
              onClick={goToHomePage}
              sx={{
                position: 'absolute',
                top: 20,
                left: 20,
                bgcolor: 'rgba(0, 0, 0, 0.6)',
                color: 'white',
                zIndex: 1600,
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.8)',
                },
              }}
            >
              <ArrowBack />
            </IconButton>
          </Slide>

          {/* Video element */}
          <video
            ref={videoRef}
            playsInline={true}
            muted={isMuted}
            autoPlay={true}
            loop={false}
            preload="auto"
            crossOrigin="anonymous"
            style={getVideoStyle()}
            type={getVideoMimeType()}
            controlsList="nodownload nofullscreen noremoteplayback"
            disablePictureInPicture
            disableRemotePlayback
            controls={false}
          >
            {/* Sources will be added dynamically in useEffect */}
            Your browser does not support the video tag.
          </video>

          {/* Show error message when video source is invalid */}
          {!getVideoSource(videos[currentIndex]?.video_url) && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: 'white',
                zIndex: 2
              }}
            >
              <Typography variant="h6">
                Video not available
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                Please try another video
              </Typography>
            </Box>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: 'white',
                zIndex: 3
              }}
            >
              <CircularProgress color="primary" />
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                Loading video...
              </Typography>
            </Box>
          )}

          {/* Up/Down Navigation arrows - without count indicator */}
          {videos.length > 1 && (
            <Box
              sx={{
                position: 'absolute',
                right: 20,
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                flexDirection: 'column',
                height: '140px',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 15,
                opacity: showControls ? 1 : 0,
                transition: 'opacity 300ms ease-in-out',
              }}
            >
              {/* Up Arrow */}
              {currentIndex > 0 && (
                <IconButton
                  onClick={() => setCurrentIndex(currentIndex - 1)}
                  sx={{
                    bgcolor: 'rgba(0, 0, 0, 0.6)',
                    color: '#2CFF05', // Using the neon green from theme
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.8)',
                      boxShadow: '0 0 8px rgba(44, 255, 5, 0.6)', // Neon glow effect
                    },
                  }}
                >
                  <ArrowUpward />
                </IconButton>
              )}

              {/* Down Arrow */}
              {currentIndex < videos.length - 1 && (
                <IconButton
                  onClick={() => setCurrentIndex(currentIndex + 1)}
                  sx={{
                    bgcolor: 'rgba(0, 0, 0, 0.6)',
                    color: '#2CFF05', // Using the neon green from theme
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.8)',
                      boxShadow: '0 0 8px rgba(44, 255, 5, 0.6)', // Neon glow effect
                    },
                  }}
                >
                  <ArrowDownward />
                </IconButton>
              )}
            </Box>
          )}

          {/* Mobile-optimized video controls overlay */}
          <Slide direction="up" in={showControls} timeout={300}>
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.6) 50%, transparent)',
                padding: isMobile ? '8px 12px' : '16px',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                transition: 'opacity 0.3s ease',
                opacity: showControls ? 1 : 0,
              }}
            >
              {/* Progress bar */}
              <Box
                sx={{
                  width: '100%',
                  height: isMobile ? '3px' : '4px',
                  bgcolor: 'rgba(255,255,255,0.3)',
                  borderRadius: '2px',
                  mb: isMobile ? 1 : 2,
                  position: 'relative',
                  cursor: 'pointer'
                }}
                onClick={handleSeekChange}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${(currentTime / duration) * 100}%`,
                    bgcolor: 'primary.main',
                    borderRadius: '2px'
                  }}
                />
              </Box>

              {/* Control buttons */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton
                    onClick={togglePlayPause}
                    sx={{
                      color: 'white',
                      p: isMobile ? 0.5 : 1
                    }}
                  >
                    {isPlaying ? <Pause /> : <PlayArrow />}
                  </IconButton>

                  <IconButton
                    onClick={toggleMute}
                    sx={{
                      color: 'white',
                      p: isMobile ? 0.5 : 1,
                      display: { xs: 'none', sm: 'inline-flex' }
                    }}
                  >
                    {isMuted ? <VolumeOff /> : <VolumeUp />}
                  </IconButton>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {!isMobile && (
                    <Typography variant="caption" sx={{ color: 'white', mr: 1 }}>
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton
                      onClick={handleLike}
                      sx={{
                        color: isLiked ? 'primary.main' : 'white',
                        p: isMobile ? 0.5 : 1
                      }}
                    >
                      <ThumbUp fontSize={isMobile ? 'small' : 'medium'} />
                    </IconButton>

                    <IconButton
                      onClick={handleDislike}
                      sx={{
                        color: isDisliked ? 'error.main' : 'white',
                        p: isMobile ? 0.5 : 1
                      }}
                    >
                      <ThumbDown fontSize={isMobile ? 'small' : 'medium'} />
                    </IconButton>

                    <IconButton
                      onClick={handleShare}
                      sx={{
                        color: 'white',
                        p: isMobile ? 0.5 : 1
                      }}
                    >
                      <Share fontSize={isMobile ? 'small' : 'medium'} />
                    </IconButton>

                    <IconButton
                      onClick={handleSaveVideo}
                      sx={{
                        color: isSaved ? 'primary.main' : 'white',
                        p: isMobile ? 0.5 : 1,
                        display: { xs: 'none', sm: 'inline-flex' }
                      }}
                    >
                      {isSaved ? <Bookmark fontSize={isMobile ? 'small' : 'medium'} /> : <BookmarkBorder fontSize={isMobile ? 'small' : 'medium'} />}
                    </IconButton>

                    <IconButton
                      onClick={toggleFullScreen}
                      sx={{
                        color: 'white',
                        p: isMobile ? 0.5 : 1
                      }}
                    >
                      <Fullscreen fontSize={isMobile ? 'small' : 'medium'} />
                    </IconButton>


                  </Box>
                </Box>
              </Box>
            </Box>
          </Slide>

          {/* Video Info Overlay */}
          <Slide direction="down" in={showControls} timeout={300}>
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0.6) 50%, transparent)',
                padding: isMobile ? '12px' : '16px',
                paddingLeft: isMobile ? '60px' : '80px', // Increased left padding to make room for back button
                zIndex: 10,
                transition: 'opacity 0.3s ease',
                opacity: showControls ? 1 : 0,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar
                    src={videos[currentIndex]?.creator_profile_picture}
                    alt={videos[currentIndex]?.creator_username}
                    sx={{ width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, mr: 1 }}
                  />
                  <Box>
                    <Typography
                      variant={isMobile ? "body1" : "h6"}
                      sx={{ color: 'white', fontWeight: 'bold', lineHeight: 1.2 }}
                    >
                      {videos[currentIndex]?.title}
                    </Typography>
                    <Typography
                      variant={isMobile ? "caption" : "body2"}
                      sx={{ color: 'white', opacity: 0.8 }}
                    >
                      {videos[currentIndex]?.creator_username}
                    </Typography>
                  </Box>
                </Box>

                {currentUser && currentUser.user_id !== videos[currentIndex]?.creator_id && (
                  <Button
                    variant={isFollowing ? "outlined" : "contained"}
                    size={isMobile ? "small" : "medium"}
                    color="primary"
                    startIcon={isFollowing ? <Check /> : <PersonAdd />}
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    sx={{
                      minWidth: 'auto',
                      px: isMobile ? 1 : 2,
                      display: { xs: 'none', sm: 'flex' }
                    }}
                  >
                    {followLoading ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      isFollowing ? "Following" : "Follow"
                    )}
                  </Button>
                )}
              </Box>

              {/* Below the video title and user profile section */}
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                color: 'white',
                mt: 1
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <VisibilityIcon sx={{ fontSize: 20 }} />
                  <Typography variant="body2">
                    {videos[currentIndex]?.views || 0}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ThumbUpIcon sx={{ fontSize: 20 }} />
                  <Typography variant="body2">
                    {videos[currentIndex]?.likes || 0}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ThumbDownIcon sx={{ fontSize: 20 }} />
                  <Typography variant="body2">
                    {videos[currentIndex]?.dislikes || 0}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Slide>
        </Box>

        {/* Snackbar for notifications */}
        <Snackbar
          open={showSnackbar}
          autoHideDuration={3000}
          onClose={() => setShowSnackbar(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setShowSnackbar(false)} severity="info" sx={{ width: '100%' }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>

        {/* Delete confirmation dialog */}
        <Dialog
          open={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
        >
          <DialogTitle>Delete Video</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this video? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setShowDeleteDialog(false)}
              color="primary"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              color="error"
              variant="contained"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Quality selector menu */}
        {showQualityMenu && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 60,
              right: 10,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              borderRadius: 1,
              padding: 1,
              zIndex: 1000,
            }}
          >
            <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
              Quality
            </Typography>
            {availableQualities.map((quality) => (
              <Box
                key={quality.index}
                onClick={() => handleQualityChange(quality.index)}
                sx={{
                  py: 0.5,
                  px: 2,
                  cursor: 'pointer',
                  backgroundColor: currentQuality === quality.index ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  },
                  borderRadius: 1,
                  mb: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Typography variant="body2" sx={{ color: 'white' }}>
                  {quality.name}
                </Typography>
                {currentQuality === quality.index && (
                  <HighQuality fontSize="small" sx={{ color: 'white', ml: 1 }} />
                )}
              </Box>
            ))}
          </Box>
        )}

        {/* Connection quality indicator (optional) */}
        {connectionSpeed && (
          <Tooltip title={`Connection Speed: ${connectionSpeed}`}>
            <Box
              sx={{
                position: 'absolute',
                top: 10,
                right: 10,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                padding: '2px 8px',
                borderRadius: 1,
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                cursor: 'pointer'
              }}
              onClick={() => setShowDebugInfo(!showDebugInfo)}
            >
              <HighQuality fontSize="small" />
              {connectionSpeed.split(' ')[0]} {/* Just show "Excellent", "Good", etc. */}
            </Box>
          </Tooltip>
        )}

        {/* Debug info panel (can be toggled on/off) */}
        {showDebugInfo && (
          <Box
            sx={{
              position: 'absolute',
              top: 40,
              right: 10,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              padding: 1,
              borderRadius: 1,
              fontSize: '0.75rem',
              maxWidth: 250,
              zIndex: 1000
            }}
          >
            <Typography variant="caption" component="div" sx={{ mb: 0.5, fontWeight: 'bold' }}>
              Playback Info
            </Typography>
            <Typography variant="caption" component="div">
              Speed: {connectionSpeed}
            </Typography>
            <Typography variant="caption" component="div">
              Quality: {hlsRef.current && hlsRef.current.currentLevel >= 0 && hlsRef.current.levels
                ? `${hlsRef.current.levels[hlsRef.current.currentLevel].height}p`
                : 'Auto'}
            </Typography>
            <Typography variant="caption" component="div">
              Buffer: {videoRef.current && videoRef.current.buffered.length > 0
                ? `${(videoRef.current.buffered.end(videoRef.current.buffered.length - 1) - videoRef.current.currentTime).toFixed(1)}s`
                : '0s'}
            </Typography>
          </Box>
        )}
      </Box>
    </React.Fragment>
  );
};

export default VideoPlayer;
