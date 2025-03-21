import { useState, useCallback } from 'react';

/**
 * Custom hook to handle swipe navigation on mobile devices
 * @param {Function} onSwipeUp callback when user swipes up 
 * @param {Function} onSwipeDown callback when user swipes down
 * @param {number} minSwipeDistance minimum swipe distance to trigger callbacks (in pixels)
 * @param {boolean} isVertical whether to detect vertical (true) or horizontal (false) swipes
 * @returns {Object} handlers for touch events
 */
const useSwipeNavigate = (onSwipeUp, onSwipeDown, minSwipeDistance = 50, isVertical = false) => {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Reset touch positions when touch starts
  const handleTouchStart = useCallback((e) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
      time: Date.now()
    });
  }, []);

  // Update touch end position
  const handleTouchMove = useCallback((e) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
      time: Date.now()
    });
  }, []);

  // Process swipe when touch ends
  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const time = touchEnd.time - touchStart.time;
    
    if (isVertical) {
      // For vertical swipes
      // Only trigger if movement is mostly vertical (to avoid scroll conflicts)
      const isVerticalSwipe = Math.abs(distanceY) > Math.abs(distanceX) * 1.5;
      
      // Check if swipe is fast enough (under 500ms) and long enough
      const isValidSwipe = time < 500 && isVerticalSwipe && Math.abs(distanceY) > minSwipeDistance;
      
      if (isValidSwipe) {
        if (distanceY > 0) {
          // Swiped up
          onSwipeUp?.();
        } else {
          // Swiped down
          onSwipeDown?.();
        }
      }
    } else {
      // For horizontal swipes (original behavior)
      // Only trigger if movement is mostly horizontal
      const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY) * 1.5;
      
      // Check if swipe is fast enough and long enough
      const isValidSwipe = time < 500 && isHorizontalSwipe && Math.abs(distanceX) > minSwipeDistance;
      
      if (isValidSwipe) {
        if (distanceX > 0) {
          // Swiped left
          onSwipeUp?.(); // Using the same parameters but for horizontal
        } else {
          // Swiped right
          onSwipeDown?.(); // Using the same parameters but for horizontal
        }
      }
    }
  }, [touchStart, touchEnd, onSwipeUp, onSwipeDown, minSwipeDistance, isVertical]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
};

export default useSwipeNavigate; 