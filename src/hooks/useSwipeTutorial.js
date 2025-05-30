import { useState, useEffect } from 'react';
import { shouldShowSwipeTutorial } from '../utils/deviceDetection';

const TUTORIAL_STORAGE_KEY = 'horizeel_swipe_tutorial_completed';

export const useSwipeTutorial = () => {
  const [showTutorial, setShowTutorial] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    // Check if user has already seen the tutorial
    const hasSeenTutorial = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    
    // Only show tutorial if device supports gestures and user hasn't seen it
    if (!hasSeenTutorial && shouldShowSwipeTutorial()) {
      setIsFirstTime(true);
      // Show tutorial after a short delay to let the video load
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissTutorial = () => {
    setShowTutorial(false);
    // Mark tutorial as completed in localStorage
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
  };

  const handleFirstSwipe = () => {
    // User has successfully swiped, mark tutorial as completed
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    setIsFirstTime(false);
  };

  const resetTutorial = () => {
    // For testing purposes - reset the tutorial
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    setIsFirstTime(true);
    setShowTutorial(true);
  };

  return {
    showTutorial,
    isFirstTime,
    dismissTutorial,
    handleFirstSwipe,
    resetTutorial, // For development/testing
  };
};

export default useSwipeTutorial; 