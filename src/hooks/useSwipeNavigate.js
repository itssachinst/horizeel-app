import { useState, useCallback } from 'react';

/**
 * Custom hook for handling swipe navigation
 * @param {Function} onNext - Function to call when swiping to next
 * @param {Function} onPrev - Function to call when swiping to previous
 * @param {number} threshold - Minimum swipe distance to trigger (in pixels)
 * @param {boolean} vertical - If true, uses vertical swipe direction
 */
const useSwipeNavigate = (onNext, onPrev, threshold = 50, vertical = false) => {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Reset values when touch is released
  const resetTouch = () => {
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Handle the start of a touch
  const handleTouchStart = useCallback((e) => {
    const touch = e.targetTouches[0];
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    });
    setTouchEnd(null);
  }, []);

  // Handle touch movement
  const handleTouchMove = useCallback((e) => {
    if (!touchStart) return;
    
    const touch = e.targetTouches[0];
    setTouchEnd({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    });
  }, [touchStart]);

  // Handle the end of a touch
  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) {
      resetTouch();
      return;
    }

    // Determine swipe direction and distance
    const distanceX = touchEnd.x - touchStart.x;
    const distanceY = touchEnd.y - touchStart.y;
    const elapsedTime = touchEnd.time - touchStart.time;
    
    // Exit if touch was too short (likely just a tap)
    if (elapsedTime < 100) {
      resetTouch();
      return;
    }

    if (vertical) {
      // Vertical swipe logic
      if (Math.abs(distanceY) > threshold) {
        if (distanceY > 0) {
          // Swipe down
          onPrev?.();
        } else {
          // Swipe up
          onNext?.();
        }
      }
    } else {
      // Horizontal swipe logic
      if (Math.abs(distanceX) > threshold) {
        if (distanceX > 0) {
          // Swipe right
          onPrev?.();
        } else {
          // Swipe left
          onNext?.();
        }
      }
    }

    resetTouch();
  }, [touchStart, touchEnd, onNext, onPrev, threshold, vertical]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
};

export default useSwipeNavigate; 