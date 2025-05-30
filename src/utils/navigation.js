// Navigation utilities

/**
 * Navigate to home page with forced refresh
 * This ensures the home page is completely reloaded when coming from video player
 */
export const navigateToHomeWithRefresh = () => {
  window.location.href = "/demo/";
};

/**
 * Navigate to home page without refresh (standard React Router navigation)
 * Use this for internal navigation within the app
 */
export const navigateToHome = (navigate) => {
  navigate("/demo/");
};

/**
 * Check if current path is a video/reels page
 */
export const isVideoPage = (pathname) => {
  return pathname.startsWith('/reels') || pathname.startsWith('/video');
};

/**
 * Check if current path is home page
 */
export const isHomePage = (pathname) => {
  return pathname === '/' || pathname === '/demo/' || pathname.startsWith('/demo/');
};

export default {
  navigateToHomeWithRefresh,
  navigateToHome,
  isVideoPage,
  isHomePage
}; 