import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { 
  TextField, Button, Card, CardContent, Typography, Box, CircularProgress, 
  Chip, InputAdornment, IconButton, Alert, Snackbar, Dialog, DialogTitle, 
  DialogContent, DialogActions, LinearProgress, Stepper, Step, StepLabel 
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { 
  Add as AddIcon, Tag as TagIcon, CheckCircle as CheckCircleIcon,
  Error as ErrorIcon, Schedule as ScheduleIcon, PlayArrow as PlayArrowIcon
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

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

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

    try {
      // Validate video requirements
      const videoInfo = await validateVideo(selectedFile);
      console.log("Video validation passed:", videoInfo);

      setVideoFile(selectedFile);

      // Extract video filename without extension
      const videoFileName = selectedFile.name.split('.').slice(0, -1).join('.');

      // Generate thumbnail
      const thumbnail = await generateThumbnail(selectedFile, videoFileName);
      setThumbnailFile(thumbnail);
      setThumbnailURL(URL.createObjectURL(thumbnail));

      setSnackbar({
        open: true,
        message: "Video validated successfully!",
        severity: "success"
      });

    } catch (errors) {
      console.error("Video validation failed:", errors);
      setValidationErrors(Array.isArray(errors) ? errors : [errors]);
      setVideoFile(null);
      setThumbnailFile(null);
      setThumbnailURL(null);
      
      setSnackbar({
        open: true,
        message: "Video validation failed. Please check the requirements.",
        severity: "error"
      });
    }
  };

  const handleHashtagChange = (e) => {
    let value = e.target.value;
    if (value.startsWith('#')) {
      value = value.substring(1);
    }
    setHashtag(value);
  };

  const addHashtag = () => {
    if (hashtag.trim()) {
      const formattedHashtag = `#${hashtag.trim().replace(/\s+/g, '')}`;
      
      if (!hashtags.includes(formattedHashtag)) {
        setHashtags([...hashtags, formattedHashtag]);
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

    const descriptionWithHashtags = hashtags.length > 0
      ? `${videoDetails.description}\n\n${hashtags.join(' ')}`
      : videoDetails.description;

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
          <Typography variant="body2" gutterBottom color="gray" align="center" sx={{ mb: 3 }}>
            Share your short videos (max 1 minute) with the world
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
            
            {thumbnailURL && (
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
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, color: 'white' }}>
                Add Hashtags
              </Typography>
              
              <TextField
                placeholder="Enter hashtag..."
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
                sx={{ mb: 2 }}
              />
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {hashtags.map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag}
                    onDelete={() => setHashtags(hashtags.filter((_, i) => i !== index))}
                    color="primary"
                    variant="outlined"
                    icon={<TagIcon />}
                  />
                ))}
              </Box>
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
                  validationErrors.length > 0 ||
                  !videoDetails.title.trim() ||
                  !videoDetails.description.trim()
                }
                sx={{ py: 1.5 }}
              >
                {!canUpload ? 'Upload Restricted' : 'Upload Video'}
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
