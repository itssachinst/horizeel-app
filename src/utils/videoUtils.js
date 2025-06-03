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

// Add these utility functions for HLS streams

/**
 * Checks if a URL is an HLS stream based on the extension
 * @param {string} url - The URL to check
 * @returns {boolean} - Whether the URL is an HLS stream
 */
export const isHlsStream = (url) => {
  if (!url) return false;
  return url.toString().toLowerCase().endsWith('.m3u8');
};

/**
 * Processes AWS S3 and other URLs to make them playable
 * @param {string} videoUrl - The original video URL
 * @param {string} apiBaseUrl - Optional API base URL for relative paths
 * @returns {string} - The processed URL
 */
export const processVideoUrl = (videoUrl, apiBaseUrl = '') => {
  if (!videoUrl) return null;
  
  try {
    // Normalize the URL
    let finalUrl = videoUrl.toString().trim();
    
    // Clean up URL - remove quotes and fix double slashes
    finalUrl = finalUrl.replace(/^["'](.*)["']$/, '$1');
    finalUrl = finalUrl.replace(/([^:])\/\//g, '$1/');
    
    // Special handling for AWS S3 URLs - use them directly
    if (finalUrl.includes('s3.') && finalUrl.includes('amazonaws.com')) {
      return finalUrl;
    }
    
    // Handle relative URLs
    if (finalUrl.startsWith('/') && apiBaseUrl) {
      return `${apiBaseUrl}${finalUrl}`;
    }
    
    // Add protocol if missing
    if (!finalUrl.match(/^https?:\/\//i) && !finalUrl.startsWith('/')) {
      finalUrl = `https://${finalUrl}`;
    }
    
    return finalUrl;
  } catch (error) {
    console.error("Error processing video URL:", error);
    return videoUrl; // Return original as fallback
  }
}; 