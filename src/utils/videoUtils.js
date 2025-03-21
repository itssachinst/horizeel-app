/**
 * Formats a view count with appropriate suffix (K, M) for display
 * @param {number} count - The view count to format
 * @returns {string} Formatted view count (e.g., "1.2K", "3.5M")
 */
export const formatViewCount = (count) => {
  if (!count && count !== 0) return "0";
  
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  } else {
    return count.toString();
  }
};

/**
 * Formats video duration from seconds to MM:SS format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "3:45")
 */
export const formatDuration = (seconds) => {
  if (!seconds) return "0:00";
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};

/**
 * Formats a timestamp to relative time (e.g., "2 days ago")
 * @param {string} timestamp - ISO timestamp or Date object
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return "Recently";
  
  const now = new Date();
  const date = new Date(timestamp);
  const secondsAgo = Math.floor((now - date) / 1000);
  
  if (secondsAgo < 60) {
    return "Just now";
  } else if (secondsAgo < 3600) {
    const minutes = Math.floor(secondsAgo / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (secondsAgo < 86400) {
    const hours = Math.floor(secondsAgo / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else if (secondsAgo < 2592000) {
    const days = Math.floor(secondsAgo / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  } else if (secondsAgo < 31536000) {
    const months = Math.floor(secondsAgo / 2592000);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  } else {
    const years = Math.floor(secondsAgo / 31536000);
    return `${years} ${years === 1 ? 'year' : 'years'} ago`;
  }
};

/**
 * Truncates a string to a maximum length and adds ellipsis if needed
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated text with ellipsis if needed
 */
export const truncateText = (text, maxLength) => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength) + "...";
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