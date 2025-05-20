import React, { useState, useRef } from 'react';
import { Box, Typography, IconButton, Button, useTheme, useMediaQuery } from '@mui/material';
import { PlayArrow, KeyboardArrowRight, Pause } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Styled components
const ThumbnailContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  maxWidth: '1200px',
  margin: '0 auto',
  borderRadius: '12px',
  overflow: 'hidden',
  marginBottom: theme.spacing(4),
  cursor: 'pointer',
  transition: 'transform 0.3s ease',
  '&:hover': {
    transform: 'scale(1.01)',
  }
}));

const ThumbnailImage = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

const OverlayContent = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  padding: theme.spacing(3),
  background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)',
  zIndex: 2,
}));

const PlayButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  color: '#fff',
  padding: theme.spacing(2),
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    transform: 'translate(-50%, -50%) scale(1.1)',
  },
  zIndex: 2,
}));

const ClickHereButton = styled(Button)(({ theme }) => ({
  backgroundColor: 'rgba(189, 250, 3, 0.9)',
  color: 'black',
  fontWeight: 'bold',
  borderRadius: '30px',
  padding: '10px 20px',
  marginTop: theme.spacing(2),
  '&:hover': {
    backgroundColor: 'rgba(189, 250, 3, 1)',
  },
  '& .MuiButton-endIcon': {
    marginLeft: theme.spacing(1),
  }
}));

const VideoTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  color: '#BDFA03',
  marginBottom: theme.spacing(1),
}));

const CurtainContainer = styled(Box)({
  position: 'absolute',
  top: 0,
  bottom: 0,
  width: '100%',
  pointerEvents: 'none',
  display: 'flex',
  justifyContent: 'space-between',
  zIndex: 3,
});

const Curtain = styled(Box)(({ side, theme }) => ({
  width: '15%',
  height: '100%',
  background: 'linear-gradient(to right, rgba(18, 18, 18, 0.9), rgba(18, 18, 18, 0.7) 70%, rgba(18, 18, 18, 0))',
  transform: side === 'right' ? 'scaleX(-1)' : 'none',
}));

const HeroThumbnail = ({ 
  thumbnailUrl = "/assets/hero-thumbnail.jpg", 
  videoUrl = "https://horizeel.s3.ap-south-1.amazonaws.com/hzeel.mp4",
  title = "Start watching horizontal reels",
  subtitle = "Discover the new way to watch short-form videos"
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const videoRef = useRef(null);

  // Fallback video URL in case the provided one doesn't work
  const fallbackVideoUrl = "https://horizeel.s3.ap-south-1.amazonaws.com/hzeel.mp4";
  
  // Use the fallback if video error occurs
  const [currentVideoUrl, setCurrentVideoUrl] = useState(videoUrl);

  // Fallback image URL using Lorem Picsum
  const fallbackImage = `https://picsum.photos/id/${Math.floor(Math.random() * 1000)}/1200/400`;

  const togglePlayback = () => {
    try {
      setIsPlaying(true);
      
      // Use setTimeout to ensure state update before accessing the ref
      setTimeout(() => {
        if (videoRef.current) {
          const playPromise = videoRef.current.play();
          
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log("Video playback started successfully");
              })
              .catch(err => {
                console.error("Video playback error:", err);
                // Try one more time with the fallback URL
                if (currentVideoUrl !== fallbackVideoUrl) {
                  setCurrentVideoUrl(fallbackVideoUrl);
                  setTimeout(() => {
                    if (videoRef.current) {
                      videoRef.current.play().catch(e => {
                        setVideoError(true);
                        setIsPlaying(false);
                      });
                    }
                  }, 100);
                } else {
                  setVideoError(true);
                  setIsPlaying(false);
                }
              });
          }
        } else {
          console.error("Video element not found");
          setVideoError(true);
          setIsPlaying(false);
        }
      }, 0);
    } catch (err) {
      console.error("Error in togglePlayback:", err);
      setVideoError(true);
      setIsPlaying(false);
    }
  };

  const handlePause = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleVideoError = (e) => {
    console.error("Video playback error:", e);
    
    // If we're already using the fallback URL, show error
    if (currentVideoUrl === fallbackVideoUrl) {
      setVideoError(true);
      setIsPlaying(false);
    } else {
      // Try the fallback URL
      console.log("Trying fallback video URL");
      setCurrentVideoUrl(fallbackVideoUrl);
    }
  };
  
  // When video loads successfully, clear error state
  const handleVideoLoad = () => {
    console.log("Video loaded successfully");
    setVideoError(false);
  };

  return (
    <ThumbnailContainer 
      sx={{
        height: isMobile ? '280px' : '500px',
        marginBottom: isMobile ? 2 : 4,
        cursor: isPlaying ? 'default' : 'pointer',
      }}
    >
      {!isPlaying ? (
        <>
          <ThumbnailImage 
            src={imgError ? fallbackImage : thumbnailUrl} 
            alt={title}
            onClick={togglePlayback}
            onError={(e) => {
              if (!imgError) {
                console.log("Image failed to load, using fallback");
                setImgError(true);
              }
            }} 
          />
          <PlayButton 
            aria-label="play"
            onClick={togglePlayback}
            sx={{
              padding: isMobile ? '12px' : '16px'
            }}
          >
            <PlayArrow sx={{ fontSize: isMobile ? 40 : 60 }} />
          </PlayButton>
          <OverlayContent 
            sx={{ 
              padding: isMobile ? 2 : 3,
              zIndex: 4
            }}
          >
            <VideoTitle 
              variant={isMobile ? "h4" : "h3"}
              sx={{
                fontSize: isMobile ? '1.5rem' : '2.125rem'
              }}
            >
              {title}
            </VideoTitle>
            <Typography 
              variant={isMobile ? "body1" : "h6"} 
              sx={{ 
                color: 'white', 
                mb: isMobile ? 1 : 2,
                display: isMobile ? '-webkit-box' : 'block',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {subtitle}
            </Typography>
            <ClickHereButton 
              variant="contained" 
              endIcon={isMobile ? <KeyboardArrowRight /> : <PlayArrow />}
              size={isMobile ? "small" : "medium"}
              onClick={(e) => {
                e.stopPropagation();
                togglePlayback();
              }}
            >
              CLICK HERE
            </ClickHereButton>
          </OverlayContent>
        </>
      ) : (
        <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
          {videoError ? (
            <Box sx={{ 
              width: '100%', 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              bgcolor: 'black',
              color: 'white'
            }}>
              <Typography variant="h6" gutterBottom>
                Video could not be loaded
              </Typography>
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={() => {
                  setVideoError(false);
                  setIsPlaying(false);
                }}
                sx={{ mt: 2 }}
              >
                Try Again
              </Button>
            </Box>
          ) : (
            <>
              <video
                ref={videoRef}
                width="100%"
                height="100%"
                controls
                autoPlay
                muted={false}
                preload="auto"
                src={currentVideoUrl}
                style={{ objectFit: 'cover' }}
                onLoadedData={handleVideoLoad}
                onError={handleVideoError}
                onEnded={() => setIsPlaying(false)}
                onClick={(e) => {
                  // Toggle play/pause when video is clicked directly
                  e.preventDefault();
                  e.stopPropagation();
                  if (videoRef.current) {
                    if (videoRef.current.paused) {
                      videoRef.current.play().catch(err => {
                        console.error("Video play error:", err);
                      });
                    } else {
                      videoRef.current.pause();
                    }
                    setIsPlaying(!videoRef.current.paused);
                  }
                }}
                playsInline
              />
              <IconButton
                aria-label="pause"
                onClick={handlePause}
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  color: '#fff',
                  zIndex: 5,
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  }
                }}
              >
                <Pause />
              </IconButton>
            </>
          )}
        </Box>
      )}

      {/* Curtains on left and right */}
      <CurtainContainer>
        <Curtain side="left" />
        <Curtain side="right" />
      </CurtainContainer>
    </ThumbnailContainer>
  );
};

export default HeroThumbnail; 