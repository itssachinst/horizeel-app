/**
 * Formats a number as a view count (e.g., 1200 -> 1.2K)
 * @param {number} count - The number to format
 * @return {string} Formatted count
 */
export const formatViewCount = (count) => {
  if (!count && count !== 0) return '0';
  
  if (count < 1000) {
    return count.toString();
  } else if (count < 1000000) {
    return `${(count / 1000).toFixed(1)}K`;
  } else {
    return `${(count / 1000000).toFixed(1)}M`;
  }
};

/**
 * Formats seconds into MM:SS format
 * @param {number} seconds - Time in seconds
 * @return {string} Formatted time
 */
export const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};

/**
 * Returns a relative time string (e.g., "3 hours ago")
 * @param {string} dateString - ISO date string
 * @return {string} Relative time
 */
export const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000); // difference in seconds
  
  if (diff < 60) {
    return 'just now';
  } else if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diff < 2592000) {
    const days = Math.floor(diff / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (diff < 31536000) {
    const months = Math.floor(diff / 2592000);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(diff / 31536000);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }
};

/**
 * Truncates text to a specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @return {string} Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength) + '...';
};

/**
 * Preprocesses video URL for consistent format
 * @param {string} url - Video URL to process
 * @return {string} Processed URL
 */
export const fixVideoUrl = (url) => {
  if (!url) return '';
  
  // Remove quotes
  url = url.replace(/^["'](.*)["']$/, '$1');
  
  // Fix double slashes (except in protocol)
  url = url.replace(/([^:])\/\//g, '$1/');
  
  // Ensure starts with protocol
  if (!url.match(/^https?:\/\//i) && !url.startsWith('/')) {
    url = `https://${url}`;
  }
  
  return url;
};

/**
 * Gets file extension from URL
 * @param {string} url - URL to extract extension from
 * @return {string} File extension
 */
export const getFileExtension = (url) => {
  if (!url) return '';
  
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
  return match && match[1] ? match[1].toLowerCase() : '';
};

/**
 * Determines MIME type from video URL
 * @param {string} url - Video URL
 * @return {string} MIME type
 */
export const getVideoMimeType = (url) => {
  if (!url) return 'video/mp4';
  
  try {
    const extension = getFileExtension(url);
    
    // Handle HLS format
    if (extension === 'm3u8') {
      return 'application/vnd.apple.mpegurl';
    }
    
    // Handle other formats
    switch (extension) {
      case 'webm': return 'video/webm';
      case 'mov': return 'video/quicktime';
      case 'ogg': return 'video/ogg';
      default: return 'video/mp4';
    }
  } catch (e) {
    console.error('Error determining MIME type:', e);
    return 'video/mp4';
  }
};

/**
 * Gets a random frame from a video URL for thumbnail generation
 * Note: This function requires the video to be loaded in a video element
 * @param {string} videoUrl - URL of the video
 * @returns {Promise<string>} Promise that resolves with a data URL of the thumbnail
 */
export const generateThumbnail = (videoUrl) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = "anonymous";
    video.src = videoUrl;
    
    video.addEventListener('loadeddata', () => {
      // Seek to a random point in the first half of the video
      const randomTime = Math.random() * (video.duration / 2);
      video.currentTime = randomTime;
    });
    
    video.addEventListener('seeked', () => {
      // Create a canvas to draw the video frame
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the video frame on the canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get the data URL and clean up
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      video.pause();
      video.src = '';
      resolve(dataUrl);
    });
    
    video.addEventListener('error', (err) => {
      reject(new Error('Error generating thumbnail: ' + err.message));
    });
    
    // Start loading the video
    video.load();
  });
};

// New utility functions for video URL validation and correction

// Test if a video URL is valid and reachable
export const testVideoUrl = async (url) => {
  if (!url) return { valid: false, error: 'No URL provided' };
  
  try {
    // Try to validate the URL format
    new URL(url);
    
    // Make a HEAD request to check if the resource exists
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        mode: 'cors',
        cache: 'no-cache',
        timeout: 5000 // 5 second timeout
      });
      
      if (response.ok) {
        // Check for valid content type
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('video/')) {
          return { valid: true, url };
        } else {
          return { 
            valid: false, 
            error: `Invalid content type: ${contentType}`, 
            contentType 
          };
        }
      } else {
        return { 
          valid: false, 
          error: `Server responded with status: ${response.status}`, 
          status: response.status 
        };
      }
    } catch (fetchError) {
      return { valid: false, error: `Network error: ${fetchError.message}` };
    }
  } catch (urlError) {
    // Invalid URL format, try to fix it
    return { valid: false, error: `Invalid URL format: ${urlError.message}` };
  }
}; 