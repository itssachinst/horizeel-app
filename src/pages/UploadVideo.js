import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  TextField, 
  Button, 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Grid, 
  CircularProgress,
  Chip,
  IconButton
} from "@mui/material";
import { CheckCircle, RadioButtonUnchecked, Refresh } from "@mui/icons-material";
import { API_BASE_URL } from "../api";

const UploadVideo = () => {
  const [videoDetails, setVideoDetails] = useState({
    title: "",
    description: "",
  });
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailOptions, setThumbnailOptions] = useState([]);
  const [selectedThumbnailIndex, setSelectedThumbnailIndex] = useState(0);
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);
  const [message, setMessage] = useState("");

  // Cleanup object URLs when component unmounts
  useEffect(() => {
    return () => {
      thumbnailOptions.forEach(option => {
        URL.revokeObjectURL(option.url);
      });
    };
  }, [thumbnailOptions]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setVideoDetails({ ...videoDetails, [name]: value });
  };

  const generateThumbnailAtTime = (file, timeInSeconds) => {
    return new Promise((resolve, reject) => {
      console.log(`Starting thumbnail generation at ${timeInSeconds}s`);
      
      const video = document.createElement("video");
      video.muted = true;
      video.crossOrigin = "anonymous";
      video.preload = "metadata";
      
      // Create a unique object URL for this video element
      const videoURL = URL.createObjectURL(file);
      video.src = videoURL;

      let hasResolved = false;

      const cleanup = () => {
        URL.revokeObjectURL(videoURL);
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
      };

      const onLoadedMetadata = () => {
        console.log(`Video metadata loaded for ${timeInSeconds}s thumbnail. Duration: ${video.duration}s`);
        // Ensure we don't exceed video duration
        const targetTime = Math.min(timeInSeconds, video.duration - 0.5);
        const safeTime = Math.max(0, targetTime);
        console.log(`Setting currentTime to ${safeTime}s for ${timeInSeconds}s thumbnail`);
        video.currentTime = safeTime;
      };

      const onSeeked = () => {
        if (hasResolved) return;
        
        console.log(`Video seeked to ${video.currentTime}s for ${timeInSeconds}s thumbnail`);
        
        try {
        const canvas = document.createElement("canvas");
          canvas.width = Math.min(video.videoWidth, 640); // Limit max width
          canvas.height = Math.min(video.videoHeight, 360); // Limit max height
          
          // Maintain aspect ratio
          if (video.videoWidth > 640) {
            const ratio = 640 / video.videoWidth;
            canvas.width = 640;
            canvas.height = video.videoHeight * ratio;
          }
          
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (blob && !hasResolved) {
              hasResolved = true;
              const thumbnailFile = new File([blob], `thumbnail_${timeInSeconds}s.jpg`, { type: "image/jpeg" });
              const thumbnailURL = URL.createObjectURL(blob);
              
              console.log(`Successfully generated thumbnail at ${timeInSeconds}s`);
              
              cleanup();
              resolve({
                file: thumbnailFile,
                url: thumbnailURL,
                timestamp: timeInSeconds,
                formattedTime: formatTime(timeInSeconds)
              });
            } else if (!hasResolved) {
              hasResolved = true;
              cleanup();
              reject(new Error(`Failed to create thumbnail blob at ${timeInSeconds}s`));
            }
          }, "image/jpeg", 0.8);
        } catch (error) {
          if (!hasResolved) {
            hasResolved = true;
            cleanup();
            reject(new Error(`Canvas error at ${timeInSeconds}s: ${error.message}`));
          }
        }
      };

      const onError = (error) => {
        if (!hasResolved) {
          hasResolved = true;
          cleanup();
          reject(new Error(`Video error at ${timeInSeconds}s: ${error.message || 'Unknown video error'}`));
        }
      };

      // Add event listeners
      video.addEventListener('loadedmetadata', onLoadedMetadata);
      video.addEventListener('seeked', onSeeked);
      video.addEventListener('error', onError);

      // Add timeout to prevent hanging
      setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          cleanup();
          reject(new Error(`Timeout generating thumbnail at ${timeInSeconds}s`));
        }
      }, 15000); // Increased timeout to 15 seconds
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const generateMultipleThumbnails = async (file) => {
    setIsGeneratingThumbnails(true);
    setMessage("Generating thumbnail options...");
    
    try {
      // First, get video duration
      const video = document.createElement("video");
      const videoURL = URL.createObjectURL(file);
      video.src = videoURL;
      
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(videoURL);
          resolve();
        };
        video.onerror = () => {
          URL.revokeObjectURL(videoURL);
          reject(new Error("Failed to load video metadata"));
        };
        setTimeout(() => {
          URL.revokeObjectURL(videoURL);
          reject(new Error("Timeout loading video metadata"));
        }, 5000);
      });

      const duration = video.duration;
      console.log(`Video duration: ${duration} seconds`);

      if (duration < 2) {
        throw new Error("Video is too short to generate multiple thumbnails");
      }

      // Generate 5 thumbnails at different timestamps
      const timestamps = [
        Math.max(1, duration * 0.1),    // 10% into video
        duration * 0.25,                // 25% into video
        duration * 0.5,                 // 50% into video (middle)
        duration * 0.75,                // 75% into video
        Math.min(duration - 1, duration * 0.9) // 90% into video
      ];

      console.log("Generating thumbnails at timestamps:", timestamps);

      // Generate thumbnails sequentially for better reliability
      const validThumbnails = [];
      
      for (let i = 0; i < timestamps.length; i++) {
        const timestamp = timestamps[i];
        setMessage(`Generating thumbnail ${i + 1} of ${timestamps.length}...`);
        
        try {
          console.log(`Generating thumbnail ${i + 1} at ${timestamp}s`);
          const thumbnail = await generateThumbnailAtTime(file, timestamp);
          validThumbnails.push(thumbnail);
          console.log(`Successfully generated thumbnail ${i + 1}`);
        } catch (error) {
          console.error(`Failed to generate thumbnail ${i + 1} at ${timestamp}s:`, error);
          // Continue with next thumbnail instead of failing completely
        }
        
        // Small delay between generations to prevent conflicts
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (validThumbnails.length === 0) {
        throw new Error("Failed to generate any thumbnails");
      }

      console.log(`Successfully generated ${validThumbnails.length} out of ${timestamps.length} thumbnails`);
      setThumbnailOptions(validThumbnails);
      setSelectedThumbnailIndex(0); // Default to first thumbnail
      setMessage(`Generated ${validThumbnails.length} thumbnail options. Select your preferred one.`);

    } catch (error) {
      console.error("Error generating thumbnails:", error);
      setMessage(`Failed to generate thumbnails: ${error.message}. Please try again.`);
      setThumbnailOptions([]);
    } finally {
      setIsGeneratingThumbnails(false);
    }
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Validate file size (limit to 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB in bytes
    if (selectedFile.size > maxSize) {
      setMessage("Video file is too large. Please select a file smaller than 100MB.");
      return;
    }

    // Validate file type
    if (!selectedFile.type.startsWith('video/')) {
      setMessage("Please select a valid video file.");
      return;
    }

    setVideoFile(selectedFile);
    setThumbnailOptions([]);
    setSelectedThumbnailIndex(0);
    setMessage(`Selected: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(1)}MB)`);

    // Generate multiple thumbnails
    await generateMultipleThumbnails(selectedFile);
  };

  const handleThumbnailSelect = (index) => {
    setSelectedThumbnailIndex(index);
  };

  const handleRegenerateThumbnails = async () => {
    if (videoFile) {
      await generateMultipleThumbnails(videoFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!videoDetails.title || !videoDetails.description || !videoFile || thumbnailOptions.length === 0) {
      setMessage("Please fill all fields, select a video file, and ensure thumbnails are generated.");
      return;
    }

    const selectedThumbnail = thumbnailOptions[selectedThumbnailIndex];
    if (!selectedThumbnail) {
      setMessage("Please select a thumbnail.");
      return;
    }

    setMessage("Uploading video...");

    const formData = new FormData();
    formData.append("title", videoDetails.title);
    formData.append("description", videoDetails.description);
    formData.append("vfile", videoFile);
    formData.append("tfile", selectedThumbnail.file);

    try {
      const response = await axios.post(`${API_BASE_URL}/videos/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.status === 201) {
        setMessage("Video uploaded successfully!");
        setVideoDetails({ title: "", description: "" });
        setVideoFile(null);
        setThumbnailOptions([]);
        setSelectedThumbnailIndex(0);
        
        // Clean up object URLs to prevent memory leaks
        thumbnailOptions.forEach(option => {
          URL.revokeObjectURL(option.url);
        });
      }
    } catch (error) {
      console.error("Error uploading video:", error);
      setMessage("Failed to upload video. Please check the API request and try again.");
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
      pt: 9, // Add padding for fixed header
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      px: 2,
    }}>
      <Card sx={{ 
        maxWidth: "700px", 
        width: "100%",
        background: 'rgba(18, 18, 18, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 3,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ 
            color: 'white',
            fontWeight: 'bold',
            textAlign: 'center',
            mb: 3
          }}>
          Upload Video
        </Typography>
        {message && (
            <Typography 
              variant="body1" 
              sx={{ 
                color: message.includes('successfully') ? '#4caf50' : '#f44336',
                mb: 2,
                textAlign: 'center',
                p: 2,
                borderRadius: 1,
                background: message.includes('successfully') 
                  ? 'rgba(76, 175, 80, 0.1)' 
                  : 'rgba(244, 67, 54, 0.1)',
                border: `1px solid ${message.includes('successfully') ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)'}`,
              }}
            >
            {message}
          </Typography>
        )}
        <form onSubmit={handleSubmit}>
          <TextField
            label="Video Title"
              name="title"
            value={videoDetails.title}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#BDFA03',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&.Mui-focused': {
                    color: '#BDFA03',
                  },
                },
              }}
          />
          <TextField
            label="Description"
            name="description"
            value={videoDetails.description}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
              multiline
              rows={3}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#BDFA03',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&.Mui-focused': {
                    color: '#BDFA03',
                  },
                },
              }}
            />
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                Select Video File (Max 100MB):
              </Typography>
              <Box
                component="label"
                sx={{
                  display: 'block',
                  width: '100%',
                  padding: '12px',
                  borderRadius: '4px',
                  border: '2px dashed rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  fontSize: '16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    border: '2px dashed #BDFA03',
                    background: 'rgba(189, 250, 3, 0.05)',
                  }
                }}
              >
                {videoFile ? (
                  <Box>
                    <Typography variant="body2" sx={{ color: '#BDFA03', fontWeight: 'bold' }}>
                      ✓ {videoFile.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      {(videoFile.size / 1024 / 1024).toFixed(1)}MB • Click to change
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      📹 Click to select video file
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Supports MP4, MOV, AVI, WebM
                    </Typography>
                  </Box>
                )}
          <input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            required
                  style={{ display: 'none' }}
                />
              </Box>
            </Box>
            {isGeneratingThumbnails && (
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <CircularProgress sx={{ color: '#BDFA03' }} />
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mt: 1 }}>
                  {message || "Generating thumbnails..."}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', display: 'block', mt: 1 }}>
                  This may take a few seconds...
                </Typography>
              </Box>
            )}
            
            {/* Debug info */}
            {process.env.NODE_ENV === 'development' && videoFile && (
              <Box sx={{ mb: 2, p: 2, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Debug: Video selected - {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)}MB)
                  <br />
                  Thumbnails generated: {thumbnailOptions.length}
                  <br />
                  Selected thumbnail: {selectedThumbnailIndex + 1}
                </Typography>
              </Box>
            )}
            
            {thumbnailOptions.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Choose your thumbnail ({thumbnailOptions.length} options):
                  </Typography>
                  <IconButton
                    onClick={handleRegenerateThumbnails}
                    size="small"
                    sx={{ 
                      color: '#BDFA03',
                      '&:hover': { backgroundColor: 'rgba(189, 250, 3, 0.1)' }
                    }}
                    title="Regenerate thumbnails"
                  >
                    <Refresh fontSize="small" />
                  </IconButton>
                </Box>
                
                <Grid container spacing={1}>
                  {thumbnailOptions.map((thumbnail, index) => (
                    <Grid item xs={6} sm={4} key={index}>
                      <Box
                        onClick={() => handleThumbnailSelect(index)}
                        sx={{
                          position: 'relative',
                          cursor: 'pointer',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: selectedThumbnailIndex === index 
                            ? '2px solid #BDFA03' 
                            : '2px solid rgba(255, 255, 255, 0.2)',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            border: '2px solid #BDFA03',
                            transform: 'scale(1.02)',
                          }
                        }}
                      >
                        <img
                          src={thumbnail.url}
                          alt={`Thumbnail ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '80px',
                            objectFit: 'cover',
                            display: 'block'
                          }}
                        />
                        
                        {/* Selection indicator */}
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            color: selectedThumbnailIndex === index ? '#BDFA03' : 'rgba(255, 255, 255, 0.7)',
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                            borderRadius: '50%',
                            padding: '2px'
                          }}
                        >
                          {selectedThumbnailIndex === index ? (
                            <CheckCircle fontSize="small" />
                          ) : (
                            <RadioButtonUnchecked fontSize="small" />
                          )}
                        </Box>
                        
                        {/* Timestamp label */}
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: 4,
                            left: 4,
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 'bold'
                          }}
                        >
                          {thumbnail.formattedTime}
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
                
                {/* Selected thumbnail preview */}
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                    Selected Thumbnail:
                  </Typography>
                  <Box sx={{ display: 'inline-block', position: 'relative' }}>
                    <img
                      src={thumbnailOptions[selectedThumbnailIndex]?.url}
                      alt="Selected thumbnail"
                      style={{
                        maxWidth: '200px',
                        borderRadius: '8px',
                        border: '2px solid #BDFA03',
                        boxShadow: '0 4px 12px rgba(189, 250, 3, 0.3)'
                      }}
                    />
                    <Chip
                      label={`Option ${selectedThumbnailIndex + 1} - ${thumbnailOptions[selectedThumbnailIndex]?.formattedTime}`}
                      sx={{
                        position: 'absolute',
                        bottom: -10,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: '#BDFA03',
                        color: '#000',
                        fontWeight: 'bold'
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            )}
            
            <Button 
              type="submit" 
              variant="contained" 
              fullWidth
              disabled={isGeneratingThumbnails || thumbnailOptions.length === 0}
              sx={{ 
                mt: 3,
                py: 1.5,
                background: isGeneratingThumbnails || thumbnailOptions.length === 0 
                  ? 'rgba(189, 250, 3, 0.5)' 
                  : '#BDFA03',
                color: '#000',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                '&:hover': {
                  background: isGeneratingThumbnails || thumbnailOptions.length === 0 
                    ? 'rgba(189, 250, 3, 0.5)' 
                    : '#A8E003',
                  boxShadow: '0 0 20px rgba(189, 250, 3, 0.4)',
                },
                '&:disabled': {
                  color: 'rgba(0, 0, 0, 0.5)',
                }
              }}
            >
              {isGeneratingThumbnails 
                ? 'Generating Thumbnails...' 
                : thumbnailOptions.length === 0 
                  ? 'Select Video First'
                  : 'Upload Video'
              }
          </Button>
        </form>
      </CardContent>
    </Card>
    </Box>
  );
};

export default UploadVideo;
