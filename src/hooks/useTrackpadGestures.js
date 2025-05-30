import { useEffect, useRef, useCallback } from 'react';

const useTrackpadGestures = (onSwipeUp, onSwipeDown, sensitivity = 100, enabled = true) => {
  const gestureStartRef = useRef(null);
  const accumulatedDeltaRef = useRef(0);
  const lastGestureTimeRef = useRef(0);
  const isGestureActiveRef = useRef(false);
  
  // Debounce settings
  const GESTURE_DEBOUNCE_MS = 500;
  const GESTURE_THRESHOLD = sensitivity;
  const TRACKPAD_SENSITIVITY = 0.5; // Trackpad gestures are more sensitive
  const MOUSE_SENSITIVITY = 1.0; // Mouse wheel needs more movement

  const handleWheel = useCallback((e) => {
    if (!enabled) return;
    
    // Prevent default scrolling behavior
    e.preventDefault();
    
    const now = Date.now();
    const timeSinceLastGesture = now - lastGestureTimeRef.current;
    
    // Reset accumulated delta if too much time has passed
    if (timeSinceLastGesture > 200) {
      accumulatedDeltaRef.current = 0;
      isGestureActiveRef.current = false;
    }
    
    // Detect if this is a trackpad gesture (smaller, more frequent events)
    // or mouse wheel (larger, less frequent events)
    const isTrackpad = Math.abs(e.deltaY) < 50 && e.deltaMode === 0;
    const sensitivity = isTrackpad ? TRACKPAD_SENSITIVITY : MOUSE_SENSITIVITY;
    
    // Accumulate delta with sensitivity adjustment
    accumulatedDeltaRef.current += e.deltaY * sensitivity;
    
    console.log('Wheel event:', {
      deltaY: e.deltaY,
      isTrackpad,
      accumulated: accumulatedDeltaRef.current,
      threshold: GESTURE_THRESHOLD
    });
    
    // Check if we've crossed the threshold for navigation
    if (Math.abs(accumulatedDeltaRef.current) >= GESTURE_THRESHOLD) {
      // Prevent rapid successive gestures
      if (timeSinceLastGesture < GESTURE_DEBOUNCE_MS && isGestureActiveRef.current) {
        return;
      }
      
      const direction = accumulatedDeltaRef.current > 0 ? 'down' : 'up';
      
      console.log(`Trackpad/Mouse gesture detected: ${direction}`);
      
      // Execute navigation
      if (direction === 'up' && onSwipeUp) {
        onSwipeUp();
      } else if (direction === 'down' && onSwipeDown) {
        onSwipeDown();
      }
      
      // Reset state
      accumulatedDeltaRef.current = 0;
      lastGestureTimeRef.current = now;
      isGestureActiveRef.current = true;
      
      // Reset gesture active flag after debounce period
      setTimeout(() => {
        isGestureActiveRef.current = false;
      }, GESTURE_DEBOUNCE_MS);
    }
  }, [enabled, onSwipeUp, onSwipeDown, sensitivity]);

  // Handle pointer events for more precise trackpad detection
  const handlePointerMove = useCallback((e) => {
    if (!enabled) return;
    
    // This helps distinguish between trackpad and mouse movements
    // Trackpad movements typically have different pressure/tilt characteristics
    if (e.pointerType === 'pen' || e.pointerType === 'touch') {
      // These are likely trackpad gestures on some systems
      console.log('Pointer move detected:', e.pointerType);
    }
  }, [enabled]);

  // Enhanced wheel event detection for better trackpad recognition
  const handleWheelStart = useCallback((e) => {
    if (!enabled) return;
    
    gestureStartRef.current = {
      timeStamp: e.timeStamp,
      deltaY: e.deltaY,
      deltaMode: e.deltaMode
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const options = { passive: false }; // Allow preventDefault
    
    // Add wheel event listener to document for global capture
    document.addEventListener('wheel', handleWheel, options);
    document.addEventListener('pointermove', handlePointerMove, { passive: true });
    
    return () => {
      document.removeEventListener('wheel', handleWheel, options);
      document.removeEventListener('pointermove', handlePointerMove);
    };
  }, [handleWheel, handlePointerMove, enabled]);

  // Return methods for manual control if needed
  return {
    resetGesture: () => {
      accumulatedDeltaRef.current = 0;
      isGestureActiveRef.current = false;
    }
  };
};

export default useTrackpadGestures; 