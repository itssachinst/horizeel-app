// Device and input detection utilities

export const getDeviceType = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent);
  const isDesktop = !isMobile && !isTablet;
  
  return {
    isMobile,
    isTablet,
    isDesktop
  };
};

export const getInputCapabilities = () => {
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const hasPointer = window.PointerEvent !== undefined;
  const hasMouse = window.matchMedia('(pointer: fine)').matches;
  const hasTrackpad = hasMouse && !hasTouch; // Approximation
  
  return {
    hasTouch,
    hasPointer,
    hasMouse,
    hasTrackpad
  };
};

export const getNavigationHints = () => {
  const { isDesktop, isMobile, isTablet } = getDeviceType();
  const { hasTouch, hasTrackpad } = getInputCapabilities();
  
  if (isMobile || isTablet) {
    return {
      primary: "Swipe up or down to navigate",
      secondary: "Tap to play/pause",
      gesture: "touch"
    };
  }
  
  if (isDesktop) {
    if (hasTrackpad) {
      return {
        primary: "Two-finger swipe or scroll to navigate",
        secondary: "Use arrow keys or click controls",
        gesture: "trackpad"
      };
    } else {
      return {
        primary: "Scroll or use arrow keys to navigate",
        secondary: "Click to play/pause",
        gesture: "mouse"
      };
    }
  }
  
  // Fallback
  return {
    primary: "Use arrow keys to navigate",
    secondary: "Click to play/pause",
    gesture: "keyboard"
  };
};

export const shouldShowSwipeTutorial = () => {
  const { isMobile, isTablet } = getDeviceType();
  const { hasTouch } = getInputCapabilities();
  
  // Show swipe tutorial primarily for touch devices
  // or desktop devices with touch capability
  return isMobile || isTablet || hasTouch;
};

export default {
  getDeviceType,
  getInputCapabilities,
  getNavigationHints,
  shouldShowSwipeTutorial
}; 