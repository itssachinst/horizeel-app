import React, { useState, useEffect } from 'react';
import { Box, Typography, Fade, IconButton } from '@mui/material';
import { KeyboardArrowUp, Close } from '@mui/icons-material';
import { getNavigationHints } from '../utils/deviceDetection';

const SwipeTutorial = ({ onDismiss, onFirstSwipe }) => {
  const [showTutorial, setShowTutorial] = useState(true);
  const [animationPhase, setAnimationPhase] = useState(0); // 0: fade in, 1: animate, 2: fade out
  
  // Get device-specific navigation hints
  const navigationHints = getNavigationHints();

  useEffect(() => {
    // Auto-dismiss after 5 seconds if user doesn't interact
    const autoHideTimer = setTimeout(() => {
      handleDismiss();
    }, 10000);

    // Start the animation cycle
    const animationTimer = setTimeout(() => {
      setAnimationPhase(1);
    }, 500);

    return () => {
      clearTimeout(autoHideTimer);
      clearTimeout(animationTimer);
    };
  }, []);

  const handleDismiss = () => {
    setShowTutorial(false);
    setTimeout(() => {
      onDismiss();
    }, 300); // Wait for fade out animation
  };

  const handleSwipeDetected = () => {
    handleDismiss();
    onFirstSwipe();
  };

  if (!showTutorial) return null;

  return (
    <Fade in={showTutorial} timeout={300}>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 2000,
          pointerEvents: 'auto',
        }}
        onClick={handleDismiss}
        onTouchStart={(e) => {
          // Detect touch start for swipe detection
          const startY = e.touches[0].clientY;
          
          const handleTouchMove = (moveEvent) => {
            const currentY = moveEvent.touches[0].clientY;
            const deltaY = startY - currentY;
            
            // If user swipes up more than 50px, consider it a swipe
            if (deltaY > 50) {
              handleSwipeDetected();
              document.removeEventListener('touchmove', handleTouchMove);
              document.removeEventListener('touchend', handleTouchEnd);
            }
          };
          
          const handleTouchEnd = () => {
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
          };
          
          document.addEventListener('touchmove', handleTouchMove);
          document.addEventListener('touchend', handleTouchEnd);
        }}
      >
        {/* Close button */}
        <IconButton
          onClick={handleDismiss}
          sx={{
            position: 'absolute',
            top: 20,
            right: 20,
            color: 'white',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
            },
          }}
        >
          <Close />
        </IconButton>

        {/* Tutorial content */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            color: 'white',
            maxWidth: '300px',
            px: 3,
          }}
        >
          {/* Animated hand icon */}
          <Box
            sx={{
              position: 'relative',
              width: '80px',
              height: '120px',
              mb: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Hand icon with swipe animation */}
            <Box
              sx={{
                fontSize: '48px',
                animation: animationPhase === 1 ? 'swipeUpAnimation 2s ease-in-out infinite' : 'none',
                transform: animationPhase === 0 ? 'translateY(20px)' : 'translateY(0px)',
                transition: 'transform 0.5s ease-out',
                '@keyframes swipeUpAnimation': {
                  '0%': {
                    transform: 'translateY(20px)',
                    opacity: 0.7,
                  },
                  '50%': {
                    transform: 'translateY(-20px)',
                    opacity: 1,
                  },
                  '100%': {
                    transform: 'translateY(20px)',
                    opacity: 0.7,
                  },
                },
              }}
            >
              <img
                src="/assets/hand-swipe-gesture.png"
                alt="Swipe up gesture"
                style={{
                  width: '48px',
                  height: '48px',
                  filter: 'brightness(0) invert(1)', // Makes the image white
                  objectFit: 'contain',
                }}
                onError={(e) => {
                  // Fallback to emoji if image fails to load
                  e.target.style.display = 'none';
                  e.target.parentNode.innerHTML = '👆';
                }}
              />
            </Box>

            {/* Arrow indicator */}
            <KeyboardArrowUp
              sx={{
                position: 'absolute',
                top: -10,
                fontSize: '32px',
                animation: animationPhase === 1 ? 'arrowPulse 2s ease-in-out infinite' : 'none',
                opacity: animationPhase === 0 ? 0 : 1,
                transition: 'opacity 0.5s ease-out',
                '@keyframes arrowPulse': {
                  '0%': {
                    opacity: 0.5,
                    transform: 'translateY(5px)',
                  },
                  '50%': {
                    opacity: 1,
                    transform: 'translateY(-5px)',
                  },
                  '100%': {
                    opacity: 0.5,
                    transform: 'translateY(5px)',
                  },
                },
              }}
            />
          </Box>

          {/* Tutorial text */}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 'bold',
              mb: 1,
              fontSize: { xs: '18px', sm: '20px' },
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            }}
          >
            {navigationHints.gesture === 'touch' 
              ? 'Swipe up for next video'
              : navigationHints.gesture === 'trackpad'
              ? 'Two-finger swipe up for next video'
              : 'Scroll up for next video'
            }
          </Typography>

          {/* <Typography
            variant="body2"
            sx={{
              opacity: 0.9,
              fontSize: { xs: '14px', sm: '16px' },
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              lineHeight: 1.4,
              textAlign: 'center',
            }}
          >
            {navigationHints.primary}
          </Typography> */}

          {/* Progress indicator */}
          <Box
            sx={{
              mt: 3,
              width: '60px',
              height: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                width: '100%',
                height: '100%',
                backgroundColor: '#bdfa03',
                borderRadius: '2px',
                animation: 'progressBar 10s linear forwards',
                '@keyframes progressBar': {
                  '0%': {
                    transform: 'translateX(-100%)',
                  },
                  '100%': {
                    transform: 'translateX(0%)',
                  },
                },
              }}
            />
          </Box>
        </Box>
      </Box>
    </Fade>
  );
};

export default SwipeTutorial; 