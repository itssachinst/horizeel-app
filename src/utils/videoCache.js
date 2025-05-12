import Hls from 'hls.js';
import { processVideoUrl, getVideoMimeType } from './videoUtils';

// Get the API base URL from environment
const API_BASE_URL = process.env.REACT_APP_API_URL || "https://horizeel.com/api/";

// Global video cache for faster loading
const VIDEO_CACHE = {
  cachedVideos: new Map(),
  maxCacheSize: 10,

  // Add a video to the cache
  addVideo: function(videoId, cacheObj) {
    if (!videoId) return;
    
    console.log(`Adding video ${videoId} to cache`);
    this.cachedVideos.set(videoId, {
      ...cacheObj,
      lastAccessed: Date.now()
    });
    
    // Clean up cache if it's getting too large
    this.cleanup();
  },
  
  // Get a cached video
  getVideo: function(videoId) {
    if (!videoId || !this.cachedVideos.has(videoId)) return null;
    
    // Update last accessed time
    const video = this.cachedVideos.get(videoId);
    this.cachedVideos.set(videoId, {
      ...video,
      lastAccessed: Date.now()
    });
    
    return video;
  },
  
  // Check if a video is in the cache
  hasVideo: function(videoId) {
    return this.cachedVideos.has(videoId);
  },
  
  // Remove a video from the cache
  removeVideo: function(videoId) {
    if (!this.cachedVideos.has(videoId)) return;
    
    const cacheObj = this.cachedVideos.get(videoId);
    console.log(`Removing video ${videoId} from cache`);
    
    // Clean up HLS resources
    if (cacheObj.hls) {
      cacheObj.hls.stopLoad();
      cacheObj.hls.destroy();
    }
    
    // Remove element from DOM
    if (cacheObj.element && cacheObj.element.parentNode) {
      cacheObj.element.parentNode.removeChild(cacheObj.element);
    }
    
    this.cachedVideos.delete(videoId);
  },
  
  // Clean up old cache entries
  cleanup: function(currentVideoId = null) {
    if (this.cachedVideos.size <= this.maxCacheSize) return;
    
    // Sort by last accessed (oldest first)
    const sortedEntries = Array.from(this.cachedVideos.entries())
      .filter(([id]) => id !== currentVideoId) // Don't remove current video
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Remove oldest entries until we're under the max size
    const entriesToRemove = sortedEntries.slice(0, this.cachedVideos.size - this.maxCacheSize + 1);
    
    for (const [id] of entriesToRemove) {
      this.removeVideo(id);
    }
  },
  
  // Preload a video for faster access later
  preloadVideo: function(video, options = {}) {
    if (!video || !video.video_url || !video.video_id) return null;
    
    // Skip if already cached
    if (this.hasVideo(video.video_id)) {
      console.log(`Video ${video.video_id} already in cache`);
      return this.getVideo(video.video_id);
    }
    
    console.log(`Preloading video: ${video.video_id}`);
    
    // Check if this is an HLS stream
    const isHlsStream = video.video_url.toLowerCase().endsWith('.m3u8') || 
                       video.video_format === 'hls';
    
    // Process video URL
    const videoSource = processVideoUrl(video.video_url, API_BASE_URL);
    
    const cacheObj = {
      videoId: video.video_id,
      source: videoSource,
      isHls: isHlsStream,
      lastAccessed: Date.now(),
      element: null,
      hls: null,
      metadata: {
        loaded: false,
        loadStartTime: Date.now(),
        duration: null
      }
    };
    
    // Add to cache immediately to prevent duplicate preloading attempts
    this.addVideo(video.video_id, cacheObj);
    
    if (isHlsStream && typeof Hls !== 'undefined' && Hls.isSupported()) {
      try {
        // Create optimized HLS instance for preloading
        const hls = new Hls({
          maxBufferSize: 10 * 1000 * 1000, // 10MB buffer - optimized for preloading
          maxBufferLength: 15,             // 15 seconds is enough for preloading
          enableWorker: true,              // Use web workers for better performance
          startLevel: 0,                   // Start with lowest quality for faster loading
          abrEwmaDefaultEstimate: 1000000, // 1Mbps initial bitrate estimate
          testBandwidth: false,            // Skip bandwidth test for faster start
          lowLatencyMode: false,           // Not needed for VOD
          backBufferLength: 0,             // Don't keep buffer behind playback position
          fragLoadingMaxRetry: 4,          // More retries
          manifestLoadingMaxRetry: 4,      // More manifest retries
          levelLoadingMaxRetry: 4,         // More level retries
        });
        
        // Create hidden video element for preloading
        const preloadElement = document.createElement('video');
        preloadElement.muted = true;
        preloadElement.preload = 'auto';
        preloadElement.playsInline = true;
        preloadElement.crossOrigin = 'anonymous';
        preloadElement.style.display = 'none';
        preloadElement.style.width = '0px';
        preloadElement.style.height = '0px';
        
        // Append to body for better browser handling
        document.body.appendChild(preloadElement);
        
        // Store references
        cacheObj.element = preloadElement;
        cacheObj.hls = hls;
        
        // Update the cache entry
        this.addVideo(video.video_id, cacheObj);
        
        // Start loading
        hls.loadSource(videoSource);
        hls.attachMedia(preloadElement);
        
        // Handle manifest loaded
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          cacheObj.metadata.loaded = true;
          
          // Start loading data
          hls.startLoad();
          
          // Update the cache with loaded info
          this.addVideo(video.video_id, cacheObj);
          
          // After loading initial segments, pause loading to conserve bandwidth
          setTimeout(() => {
            // Only stop loading if it's not the current video
            if (!options.isActive) {
              hls.stopLoad();
            }
          }, 2000); // Load for 2 seconds to get initial segments
        });
        
        // Handle errors
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            console.error(`Error preloading HLS video ${video.video_id}:`, data);
            cacheObj.metadata.error = data;
            this.addVideo(video.video_id, cacheObj);
            
            // Clean up on fatal errors
            hls.destroy();
            if (preloadElement.parentNode) {
              preloadElement.parentNode.removeChild(preloadElement);
            }
          }
        });
      } catch (error) {
        console.error(`Failed to preload HLS video ${video.video_id}:`, error);
        cacheObj.metadata.error = error;
        this.addVideo(video.video_id, cacheObj);
      }
    } else {
      // For non-HLS videos (MP4, etc)
      try {
        // Create preload element
        const preloadElement = document.createElement('video');
        preloadElement.muted = true;
        preloadElement.preload = 'auto';
        preloadElement.playsInline = true;
        preloadElement.crossOrigin = 'anonymous';
        preloadElement.style.display = 'none';
        preloadElement.style.width = '0px';
        preloadElement.style.height = '0px';
        
        // Add to DOM
        document.body.appendChild(preloadElement);
        
        // Store element
        cacheObj.element = preloadElement;
        
        // Set up event listeners
        preloadElement.addEventListener('loadedmetadata', () => {
          cacheObj.metadata.duration = preloadElement.duration;
          this.addVideo(video.video_id, cacheObj);
        });
        
        preloadElement.addEventListener('canplaythrough', () => {
          cacheObj.metadata.loaded = true;
          this.addVideo(video.video_id, cacheObj);
        });
        
        preloadElement.addEventListener('error', (e) => {
          console.error(`Error preloading video ${video.video_id}:`, e);
          cacheObj.metadata.error = e.error || new Error('Video loading error');
          this.addVideo(video.video_id, cacheObj);
        });
        
        // Set source and load
        preloadElement.src = videoSource;
        preloadElement.load();
      } catch (error) {
        console.error(`Failed to preload video ${video.video_id}:`, error);
        cacheObj.metadata.error = error;
        this.addVideo(video.video_id, cacheObj);
      }
    }
    
    return cacheObj;
  }
};

export default VIDEO_CACHE; 