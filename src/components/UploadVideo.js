import React, { useState } from "react";
import axios from "axios";
import { TextField, Button, Card, CardContent, Typography, Box, CircularProgress, Chip, InputAdornment, IconButton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Add as AddIcon, Tag as TagIcon } from "@mui/icons-material";
import { API_BASE_URL, uploadVideo } from "../api";

const UploadVideo = () => {
  const [videoDetails, setVideoDetails] = useState({
    title: "",
    description: "",
    category: "",
    privacy: "public",
  });
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailURL, setThumbnailURL] = useState(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hashtag, setHashtag] = useState("");
  const [hashtags, setHashtags] = useState([]);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setVideoDetails({ ...videoDetails, [name]: value });
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
    
    // Validate file size (max 100MB for 1-minute videos)
    if (selectedFile.size > 100 * 1024 * 1024) {
      setMessage("File too large. Please upload a video smaller than 100MB.");
      return;
    }

    setVideoFile(selectedFile);

    // Extract video filename without extension
    const videoFileName = selectedFile.name.split('.').slice(0, -1).join('.');

    try {
        const thumbnail = await generateThumbnail(selectedFile, videoFileName);
        setThumbnailFile(thumbnail);
        setThumbnailURL(URL.createObjectURL(thumbnail));
    } catch (error) {
        console.error("Error generating thumbnail:", error);
        setMessage("Failed to generate thumbnail. Please try again.");
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setUploadProgress(0);
    setMessage("");

    if (!videoDetails.title || !videoDetails.description || !videoFile || !thumbnailFile) {
      setMessage("Please fill all the fields and select a video file.");
      setUploading(false);
      return;
    }

    const descriptionWithHashtags = hashtags.length > 0
      ? `${videoDetails.description}\n\n${hashtags.join(' ')}`
      : videoDetails.description;

    const formData = new FormData();
    formData.append("title", videoDetails.title);
    formData.append("description", descriptionWithHashtags);
    formData.append("vfile", videoFile);
    formData.append("tfile", thumbnailFile);

    try {
      // Get the token
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage("You must be logged in to upload videos.");
        setUploading(false);
        return;
      }
      
      // Log the authorization header for debugging
      const authHeader = `Bearer ${token}`;
      console.log("Authorization header:", authHeader.substring(0, 15) + "...");
      
      // Log form data for debugging
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
          "Authorization": authHeader
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      if (response.status === 201) {
        setMessage("Video uploaded successfully!");
        setVideoDetails({ title: "", description: "", category: "", privacy: "public" });
        setVideoFile(null);
        setThumbnailFile(null);
        setThumbnailURL(null);
        setHashtags([]);
        
        // Navigate to the video page after successful upload
        setTimeout(() => {
          navigate(`/video/${response.data.video_id}`);
        }, 1500);
      }
    } catch (error) {
      console.error("Error uploading video:", error);
      
      // Log detailed error info
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response headers:", error.response.headers);
        console.error("Response data:", error.response.data);
      }
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        setMessage("Authentication failed. Please log in again.");
      } else if (error.response?.data?.detail) {
        setMessage(`Upload failed: ${error.response.data.detail}`);
      } else {
        setMessage("Failed to upload video. Please try again.");
      }
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
                border: '2px dashed gray', 
                borderRadius: 2, 
                p: 3, 
                textAlign: 'center',
                mb: 3,
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  borderColor: 'primary.main',
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
              <Typography variant="caption" color="gray">
                Maximum size: 100MB (ideal for 1-minute videos)
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
                disabled={!videoFile || !thumbnailFile}
                sx={{ py: 1.5 }}
              >
                Upload Video
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default UploadVideo;
