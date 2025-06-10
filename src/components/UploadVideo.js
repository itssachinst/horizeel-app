import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { 
  TextField, Button, Card, CardContent, Typography, Box, CircularProgress, 
  Chip, InputAdornment, IconButton, Alert, Snackbar, Dialog, DialogTitle, 
  DialogContent, DialogActions, LinearProgress, Stepper, Step, StepLabel,
  Grid
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { 
  Add as AddIcon, Tag as TagIcon, CheckCircle as CheckCircleIcon,
  Error as ErrorIcon, Schedule as ScheduleIcon, PlayArrow as PlayArrowIcon,
  RadioButtonUnchecked, Refresh
} from "@mui/icons-material";
import { API_BASE_URL } from "../api";

const UploadVideo = () => {
  const [videoDetails, setVideoDetails] = useState({
    title: "",
    description: "",
  });
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailURL, setThumbnailURL] = useState(null);
  
  // Multiple thumbnail states
  const [thumbnailOptions, setThumbnailOptions] = useState([]);
  const [selectedThumbnailIndex, setSelectedThumbnailIndex] = useState(0);
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);
  
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hashtag, setHashtag] = useState("");
  const [hashtags, setHashtags] = useState([]);
  
  // New state for async processing
  const [uploadedVideoId, setUploadedVideoId] = useState(null);
  const [videoStatus, setVideoStatus] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const [validationErrors, setValidationErrors] = useState([]);
  
  const navigate = useNavigate();
  const { currentUser, canUpload } = useAuth();
  const videoRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // Cleanup polling and object URLs on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      // Cleanup thumbnail URLs
      thumbnailOptions.forEach(option => {
        URL.revokeObjectURL(option.url);
      });
    };
  }, [thumbnailOptions]);

  // Check upload permission
  useEffect(() => {
    if (!canUpload) {
      setSnackbar({
        open: true,
        message: "You don't have permission to upload videos",
        severity: "error"
      });
    }
  }, [canUpload]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setVideoDetails({ ...videoDetails, [name]: value });
  };

  // Video validation function
  const validateVideo = (file) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.src = URL.createObjectURL(file);
      
      video.onloadedmetadata = () => {
        const errors = [];
        
        // Check duration (≤ 180 seconds)
        if (video.duration > 180) {
          errors.push(`Video duration is ${Math.round(video.duration)}s. Maximum allowed is 180s (3 minutes).`);
        }
        
        // Check if horizontal (width > height)
        if (video.videoWidth <= video.videoHeight) {
          errors.push(`Video must be horizontal (width > height). Current: ${video.videoWidth}x${video.videoHeight}`);
        }
        
        // Check file size (max 100MB)
        if (file.size > 100 * 1024 * 1024) {
          errors.push("File size exceeds 100MB limit.");
        }
        
        URL.revokeObjectURL(video.src);
        
        if (errors.length > 0) {
          reject(errors);
        } else {
          resolve({
            duration: video.duration,
            width: video.videoWidth,
            height: video.videoHeight,
            size: file.size
          });
        }
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(["Invalid video file or unsupported format."]);
      };
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
      
      // Set the first thumbnail as the selected one for upload
      setThumbnailFile(validThumbnails[0].file);
      setThumbnailURL(validThumbnails[0].url);
      
      setMessage(`Generated ${validThumbnails.length} thumbnail options. Select your preferred one.`);

    } catch (error) {
      console.error("Error generating thumbnails:", error);
      setMessage(`Failed to generate thumbnails: ${error.message}. Please try again.`);
      setThumbnailOptions([]);
    } finally {
      setIsGeneratingThumbnails(false);
    }
  };

  const handleThumbnailSelect = (index) => {
    setSelectedThumbnailIndex(index);
    const selectedThumbnail = thumbnailOptions[index];
    setThumbnailFile(selectedThumbnail.file);
    setThumbnailURL(selectedThumbnail.url);
  };

  const handleRegenerateThumbnails = async () => {
    if (videoFile) {
      await generateMultipleThumbnails(videoFile);
    }
  };

  // Legacy single thumbnail generation (keeping for fallback)
  const generateThumbnail = (file, videoFileName) => {
    return new Promise((resolve, reject) => {
        const video = document.createElement("video");
        video.muted = true;
        video.crossOrigin = "anonymous";
        video.src = URL.createObjectURL(file);

        video.onloadedmetadata = () => {
            video.currentTime = 1; // Capture at 1 second
        };

        video.onseeked = () => {
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth / 2; // Reduce size
            canvas.height = video.videoHeight / 2;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            canvas.toBlob((blob) => {
                if (blob) {
                    // Create dynamic thumbnail filename
                    const thumbnailFileName = `${videoFileName}_thumbnail.jpg`;
                    const thumbnailFile = new File([blob], thumbnailFileName, { type: "image/jpeg" });
                    resolve(thumbnailFile);
                } else {
                    reject(new Error("Failed to create thumbnail blob."));
                }
            }, "image/jpeg");
        };

        video.onerror = (error) => {
            reject(error);
        };
    });
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setValidationErrors([]);
    setMessage("");
    setThumbnailOptions([]);
    setSelectedThumbnailIndex(0);

    try {
      // Validate video requirements
      const videoInfo = await validateVideo(selectedFile);
      console.log("Video validation passed:", videoInfo);

    setVideoFile(selectedFile);

      setSnackbar({
        open: true,
        message: "Video validated successfully! Generating thumbnails...",
        severity: "success"
      });

      // Generate multiple thumbnails instead of single thumbnail
      await generateMultipleThumbnails(selectedFile);

    } catch (errors) {
      console.error("Video validation failed:", errors);
      setValidationErrors(Array.isArray(errors) ? errors : [errors]);
      setVideoFile(null);
      setThumbnailFile(null);
      setThumbnailURL(null);
      setThumbnailOptions([]);
      
      setSnackbar({
        open: true,
        message: "Video validation failed. Please check the requirements.",
        severity: "error"
      });
    }
  };

  const handleHashtagChange = (e) => {
    let value = e.target.value;
    
    // Remove # if user types it
    if (value.startsWith('#')) {
      value = value.substring(1);
    }
    
    // Remove spaces and special characters except letters, numbers, and underscores
    value = value.replace(/[^a-zA-Z0-9_]/g, '');
    
    setHashtag(value);
  };

  const addHashtag = () => {
    if (hashtag.trim()) {
      const formattedHashtag = `#${hashtag.trim().replace(/\s+/g, '').toLowerCase()}`;
      
      // Check for duplicates using case-insensitive comparison
      const isDuplicate = hashtags.some(existingTag => 
        existingTag.toLowerCase() === formattedHashtag.toLowerCase()
      );
      
      if (!isDuplicate) {
        setHashtags([...hashtags, formattedHashtag]);
        console.log("Added hashtag:", formattedHashtag);
        console.log("Current hashtags:", [...hashtags, formattedHashtag]);
      } else {
        console.log("Duplicate hashtag prevented:", formattedHashtag);
        setSnackbar({
          open: true,
          message: `Hashtag "${formattedHashtag}" already exists`,
          severity: "warning"
        });
      }
      setHashtag("");
    }
  };

  const handleHashtagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addHashtag();
    }
  };

  // Status polling function
  const pollVideoStatus = async (videoId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/videos/${videoId}/status`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const status = response.data.status;
      setVideoStatus(status);

      console.log(`Video ${videoId} status: ${status}`);

      switch (status) {
        case 'ready':
        case 'published':
          setIsProcessing(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          setSnackbar({
            open: true,
            message: "Video is ready! Redirecting to player...",
            severity: "success"
          });
          setTimeout(() => {
            navigate(`/reels/${videoId}`);
          }, 2000);
          break;
          
        case 'failed':
          setIsProcessing(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          setSnackbar({
            open: true,
            message: "Video processing failed. Please try uploading again.",
            severity: "error"
          });
          break;
          
        case 'draft':
        case 'private':
          setIsProcessing(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          setSnackbar({
            open: true,
            message: `Video is in ${status} mode. Check your profile to manage it.`,
            severity: "info"
          });
          break;
          
        case 'processing':
        default:
          // Continue polling
          break;
      }
    } catch (error) {
      console.error("Error checking video status:", error);
      if (error.response?.status === 404) {
        // Video not found, stop polling
        setIsProcessing(false);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
        setSnackbar({
          open: true,
          message: "Video not found. It may have been deleted.",
          severity: "error"
        });
      }
    }
  };

  // Start status polling
  const startStatusPolling = (videoId) => {
    setIsProcessing(true);
    setShowStatusDialog(true);
    setUploadedVideoId(videoId);
    
    // Poll immediately
    pollVideoStatus(videoId);
    
    // Then poll every 3 seconds
    pollingIntervalRef.current = setInterval(() => {
      pollVideoStatus(videoId);
    }, 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check upload permission
    if (!canUpload) {
      setSnackbar({
        open: true,
        message: "You don't have permission to upload videos",
        severity: "error"
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setMessage("");
    setValidationErrors([]);

    // Validate form fields
    if (!videoDetails.title.trim()) {
      setSnackbar({
        open: true,
        message: "Please enter a video title",
        severity: "error"
      });
      setUploading(false);
      return;
    }

    if (!videoDetails.description.trim()) {
      setSnackbar({
        open: true,
        message: "Please enter a video description",
        severity: "error"
      });
      setUploading(false);
      return;
    }

    if (!videoFile || !thumbnailFile) {
      setSnackbar({
        open: true,
        message: "Please select a video file",
        severity: "error"
      });
      setUploading(false);
      return;
    }

    // Prepare description with hashtags
    const descriptionWithHashtags = hashtags.length > 0
      ? `${videoDetails.description.trim()}\n\n${hashtags.join(' ')}`
      : videoDetails.description.trim();

    console.log("Original description:", videoDetails.description);
    console.log("Hashtags to append:", hashtags);
    console.log("Final description with hashtags:", descriptionWithHashtags);

    const formData = new FormData();
    formData.append("title", videoDetails.title.trim());
    formData.append("description", descriptionWithHashtags);
    formData.append("vfile", videoFile);
    formData.append("tfile", thumbnailFile);

    try {
      // Get the token
      const token = localStorage.getItem('token');
      if (!token) {
        setSnackbar({
          open: true,
          message: "You must be logged in to upload videos",
          severity: "error"
        });
        setUploading(false);
        return;
      }
      
      console.log("Uploading video with FormData containing:", 
        Array.from(formData.entries()).map(([key, value]) => 
          key === 'vfile' || key === 'tfile' 
            ? `${key}: [${value.name}, ${value.type}, ${value.size} bytes]` 
            : `${key}: ${value}`
        )
      );
      
      const response = await axios.post(`${API_BASE_URL}/videos/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      if (response.status === 201) {
        const { video_id, status } = response.data;
        
        setMessage("Video uploaded successfully! Processing...");
        setVideoDetails({ title: "", description: "" });
        setVideoFile(null);
        setThumbnailFile(null);
        setThumbnailURL(null);
        setThumbnailOptions([]);
        setSelectedThumbnailIndex(0);
        setHashtags([]);
        
        setSnackbar({
          open: true,
          message: "Upload complete! Processing video...",
          severity: "success"
        });
        
        // Start status polling
        startStatusPolling(video_id);
      }
    } catch (error) {
      console.error("Error uploading video:", error);
      
      let errorMessage = "Failed to upload video. Please try again.";
      
      if (error.response) {
        const { status, data } = error.response;
        
        switch (status) {
          case 400:
            errorMessage = data?.detail || "Missing required fields or invalid data";
            break;
          case 401:
            errorMessage = "Not authenticated. Please log in again.";
            break;
          case 403:
            errorMessage = "You don't have permission to upload videos";
            break;
          case 413:
            errorMessage = "File too large. Please reduce file size.";
            break;
          default:
            errorMessage = data?.detail || `Server error (${status})`;
        }
      } else if (error.request) {
        errorMessage = "Network error. Please check your connection.";
      }
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error"
      });
      
      setMessage(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box 
      sx={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        minHeight: "100vh",
        bgcolor: "#000",
        py: 4
      }}
    >
      <Card sx={{ maxWidth: "600px", width: "100%", margin: "20px auto", padding: "20px", backgroundColor: "#121212", color: "white", borderRadius: "12px" }}>
        <CardContent>
          <Typography variant="h4" gutterBottom color="white" align="center">
            Upload Your Video
          </Typography>
          
          {message && (
            <Typography 
              variant="body1" 
              color={message.includes("success") ? "primary" : "error"} 
              gutterBottom 
              align="center"
              sx={{ mb: 2, fontWeight: 'bold' }}
            >
              {message}
            </Typography>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Video Requirements Not Met:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}

          {/* Upload Permission Check */}
          {!canUpload && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              You don't have permission to upload videos. Please contact support if you believe this is an error.
            </Alert>
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
              InputLabelProps={{ style: { color: 'gray' } }}
              InputProps={{ style: { color: 'white' } }}
              sx={{ 
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'gray' },
                  '&:hover fieldset': { borderColor: 'white' },
                  '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                }
              }}
            />
            <TextField
              label="Description"
              name="description"
              value={videoDetails.description}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
              margin="normal"
              required
              InputLabelProps={{ style: { color: 'gray' } }}
              InputProps={{ style: { color: 'white' } }}
              sx={{ 
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'gray' },
                  '&:hover fieldset': { borderColor: 'white' },
                  '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                }
              }}
            />
            
            <Box 
              sx={{ 
                border: validationErrors.length > 0 ? '2px dashed red' : '2px dashed gray', 
                borderRadius: 2, 
                p: 3, 
                textAlign: 'center',
                mb: 3,
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  borderColor: validationErrors.length > 0 ? 'red' : 'primary.main',
                }
              }}
              onClick={() => document.getElementById('video-upload').click()}
            >
              <input
                id="video-upload"
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                required
              />
              <Typography variant="body1" color="white" gutterBottom>
                {videoFile ? videoFile.name : 'Click to select a video file'}
              </Typography>
              <Typography variant="caption" color="gray" sx={{ display: 'block', mb: 1 }}>
                Requirements: Horizontal video, max 180 seconds, max 100MB
              </Typography>
              <Typography variant="caption" color="gray">
                Supported formats: MP4, MOV, AVI, WebM
              </Typography>
            </Box>
            
            {/* Thumbnail Generation Progress */}
            {isGeneratingThumbnails && (
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <CircularProgress sx={{ color: 'primary.main' }} />
                <Typography variant="body2" sx={{ color: 'gray', mt: 1 }}>
                  {message || "Generating thumbnails..."}
                </Typography>
                <Typography variant="caption" sx={{ color: 'gray', display: 'block', mt: 1 }}>
                  This may take a few seconds...
                </Typography>
              </Box>
            )}
            
            {/* Multiple Thumbnail Selection */}
            {thumbnailOptions.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2" sx={{ color: 'white' }}>
                    Choose your thumbnail ({thumbnailOptions.length} options):
                  </Typography>
                  <IconButton
                    onClick={handleRegenerateThumbnails}
                    size="small"
                    sx={{ 
                      color: 'primary.main',
                      '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' }
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
                            ? '2px solid #1976d2' 
                            : '2px solid rgba(255, 255, 255, 0.2)',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            border: '2px solid #1976d2',
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
                            color: selectedThumbnailIndex === index ? '#1976d2' : 'rgba(255, 255, 255, 0.7)',
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                            borderRadius: '50%',
                            padding: '2px'
                          }}
                        >
                          {selectedThumbnailIndex === index ? (
                            <CheckCircleIcon fontSize="small" />
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
                  <Typography variant="body2" sx={{ color: 'gray', mb: 1 }}>
                    Selected Thumbnail:
                  </Typography>
                  <Box sx={{ display: 'inline-block', position: 'relative' }}>
                    <img
                      src={thumbnailOptions[selectedThumbnailIndex]?.url}
                      alt="Selected thumbnail"
                      style={{
                        maxWidth: '200px',
                        borderRadius: '8px',
                        border: '2px solid #1976d2',
                        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
                      }}
                    />
                    <Chip
                      label={`Option ${selectedThumbnailIndex + 1} - ${thumbnailOptions[selectedThumbnailIndex]?.formattedTime}`}
                      sx={{
                        position: 'absolute',
                        bottom: -10,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: '#1976d2',
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            )}
            
            {/* Legacy single thumbnail display (fallback) */}
            {thumbnailURL && thumbnailOptions.length === 0 && (
              <Box textAlign="center" mb={3}>
                <Typography variant="body2" color="gray" gutterBottom>
                  Generated Thumbnail:
                </Typography>
                <img
                  src={thumbnailURL}
                  alt="Video Thumbnail"
                  style={{ 
                    maxWidth: "200px", 
                    maxHeight: "150px", 
                    borderRadius: "8px",
                    border: "1px solid #333" 
                  }}
                />
              </Box>
            )}
            
            {/* Debug info for development */}
            {process.env.NODE_ENV === 'development' && videoFile && (
              <Box sx={{ mb: 2, p: 2, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ color: 'gray' }}>
                  Debug: Video selected - {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)}MB)
                  <br />
                  Thumbnails generated: {thumbnailOptions.length}
                  <br />
                  Selected thumbnail: {selectedThumbnailIndex + 1}
                </Typography>
              </Box>
            )}
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, color: 'white' }}>
                Add Hashtags
              </Typography>
              <Typography variant="caption" color="gray" sx={{ mb: 2, display: 'block' }}>
                Hashtags will be automatically appended to your description. Use letters, numbers, and underscores only.
              </Typography>
              
              <TextField
                placeholder="Enter hashtag (without #)..."
                value={hashtag}
                onChange={handleHashtagChange}
                onKeyDown={handleHashtagKeyDown}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <TagIcon color="primary" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton 
                        onClick={addHashtag} 
                        disabled={!hashtag.trim()}
                        color="primary"
                      >
                        <AddIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                InputLabelProps={{ style: { color: 'gray' } }}
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'gray' },
                    '&:hover fieldset': { borderColor: 'white' },
                    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                  },
                  '& .MuiInputBase-input': { color: 'white' }
                }}
              />
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {hashtags.map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag}
                    onDelete={() => setHashtags(hashtags.filter((_, i) => i !== index))}
                    color="primary"
                    variant="outlined"
                    // icon={<TagIcon />}
                  />
                ))}
              </Box>
              
              {/* Preview of final description with hashtags */}
              {hashtags.length > 0 && videoDetails.description.trim() && (
                <Box sx={{ mt: 2, p: 2, bgcolor: '#1a1a1a', borderRadius: 1, border: '1px solid #333' }}>
                  <Typography variant="caption" color="gray" gutterBottom>
                    Preview - Final Description:
                  </Typography>
                  <Typography variant="body2" color="white" sx={{ whiteSpace: 'pre-wrap' }}>
                    {`${videoDetails.description.trim()}\n\n${hashtags.join(' ')}`}
                  </Typography>
                </Box>
              )}
            </Box>
            
            {uploading ? (
              <Box textAlign="center">
                <CircularProgress 
                  variant="determinate" 
                  value={uploadProgress} 
                  size={60}
                  thickness={4}
                  sx={{ mb: 2 }}
                />
                <Typography variant="body2" color="white">
                  Uploading... {uploadProgress}%
                </Typography>
              </Box>
            ) : (
              <Button 
                type="submit" 
                variant="contained" 
                color="primary" 
                fullWidth
                size="large"
                disabled={
                  !canUpload || 
                  !videoFile || 
                  !thumbnailFile || 
                  isGeneratingThumbnails ||
                  validationErrors.length > 0 ||
                  !videoDetails.title.trim() ||
                  !videoDetails.description.trim()
                }
                sx={{ py: 1.5 }}
              >
                {!canUpload ? 'Upload Restricted' : 
                 isGeneratingThumbnails ? 'Generating Thumbnails...' :
                 thumbnailOptions.length === 0 && videoFile ? 'Select Video First' :
                 'Upload Video'}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Status Dialog */}
      <Dialog 
        open={showStatusDialog} 
        onClose={() => {}} 
        disableEscapeKeyDown
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          Video Processing Status
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 3 }}>
          <Stepper activeStep={videoStatus === 'processing' ? 0 : 1} alternativeLabel>
            <Step>
              <StepLabel 
                icon={videoStatus === 'processing' ? <ScheduleIcon color="primary" /> : <CheckCircleIcon color="success" />}
              >
                Processing
              </StepLabel>
            </Step>
            <Step>
              <StepLabel 
                icon={
                  videoStatus === 'ready' || videoStatus === 'published' ? <CheckCircleIcon color="success" /> :
                  videoStatus === 'failed' ? <ErrorIcon color="error" /> :
                  <ScheduleIcon color="disabled" />
                }
              >
                {videoStatus === 'failed' ? 'Failed' : 'Ready'}
              </StepLabel>
            </Step>
          </Stepper>

          <Box sx={{ mt: 3 }}>
            {isProcessing ? (
              <>
                <CircularProgress size={40} sx={{ mb: 2 }} />
                <Typography variant="body1" gutterBottom>
                  Processing your video...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This may take a few minutes. Please don't close this window.
                </Typography>
              </>
            ) : (
              <>
                {videoStatus === 'ready' || videoStatus === 'published' ? (
                  <>
                    <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Video is Ready!
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Redirecting to video player...
                    </Typography>
                  </>
                ) : videoStatus === 'failed' ? (
                  <>
                    <ErrorIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Processing Failed
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Please try uploading your video again.
                    </Typography>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon color="info" sx={{ fontSize: 48, mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Video Status: {videoStatus}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Check your profile to manage this video.
                    </Typography>
                  </>
                )}
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          {!isProcessing && (
            <>
              <Button 
                onClick={() => setShowStatusDialog(false)}
                variant="outlined"
              >
                Close
              </Button>
              {(videoStatus === 'ready' || videoStatus === 'published') && uploadedVideoId && (
                <Button 
                  onClick={() => navigate(`/reels/${uploadedVideoId}`)}
                  variant="contained"
                  startIcon={<PlayArrowIcon />}
                >
                  Watch Video
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UploadVideo;
