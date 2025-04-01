/**
 * Formats a view count with appropriate suffix (K, M) for display
 * @param {number} count - The view count to format
 * @returns {string} Formatted view count (e.g., "1.2K", "3.5M")
 */
export const formatViewCount = (count) => {
  if (!count) return '0';
  
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1000000).toFixed(1)}M`;
};

/**
 * Formats video duration from seconds to MM:SS format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "3:45")
 */
export const formatDuration = (seconds) => {
  if (!seconds) return '00:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Formats a timestamp to relative time (e.g., "2 days ago")
 * @param {string} timestamp - ISO timestamp or Date object
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  return `${Math.floor(diffInSeconds / 31536000)} years ago`;
};

/**
 * Truncates a string to a maximum length and adds ellipsis if needed
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated text with ellipsis if needed
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength) + '...';
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

// Try to fix common video URL issues
export const fixVideoUrl = (url) => {
  if (!url) return null;
  
  try {
    // Check if it's already a valid URL
    new URL(url);
    return url;
  } catch (error) {
    // Fix relative URLs
    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    
    // If it's a path without domain, we can't fix it without knowing the base URL
    if (url.startsWith('/')) {
      console.warn("Cannot fix URL without knowing base domain:", url);
      return null;
    }
    
    // If it's just a string with no protocol, try adding https://
    if (!url.includes('://')) {
      return `https://${url}`;
    }
    
    console.warn("Unable to fix invalid video URL:", url);
    return null;
  }
};

// Get file extension from URL
export const getFileExtension = (url) => {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('.');
    if (pathParts.length > 1) {
      return pathParts.pop().toLowerCase();
    }
    return null;
  } catch (error) {
    // Try a simpler approach if URL parsing fails
    const parts = url.split('.');
    if (parts.length > 1) {
      const extension = parts.pop().toLowerCase();
      // Only return if it looks like a valid video extension
      if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv', 'm4v'].includes(extension)) {
        return extension;
      }
    }
    return null;
  }
}; 