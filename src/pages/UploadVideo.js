import React, { useState } from "react";
import axios from "axios";
import { TextField, Button, Card, CardContent, Typography, Box } from "@mui/material";
import { API_BASE_URL } from "../api";

const UploadVideo = () => {
  const [videoDetails, setVideoDetails] = useState({
    title: "",  // FIX: Changed from "name" to "title" (matching API)
    description: "",
  });
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailURL, setThumbnailURL] = useState(null);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setVideoDetails({ ...videoDetails, [name]: value });
  };

  const generateThumbnail = (file) => {
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
            const thumbnailFile = new File([blob], "thumbnail.jpg", { type: "image/jpeg" });
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
    setVideoFile(selectedFile);

    try {
      const thumbnail = await generateThumbnail(selectedFile);
      setThumbnailFile(thumbnail);
      setThumbnailURL(URL.createObjectURL(thumbnail));
    } catch (error) {
      console.error("Error generating thumbnail:", error);
      setMessage("Failed to generate thumbnail. Please try again.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!videoDetails.title || !videoDetails.description || !videoFile || !thumbnailFile) {
      setMessage("Please fill all the fields and select a video file.");
      return;
    }

    const formData = new FormData();
    formData.append("title", videoDetails.title); // FIX: Changed from "name" to "title"
    formData.append("description", videoDetails.description);
    formData.append("vfile", videoFile); // FIX: Matched API field name
    formData.append("tfile", thumbnailFile); // FIX: Matched API field name

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
        setThumbnailFile(null);
        setThumbnailURL(null);
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
        maxWidth: "500px", 
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
              name="title" // FIX: Matched API field name
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
              <input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  fontSize: '16px',
                }}
              />
            </Box>
            {thumbnailURL && (
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                  Generated Thumbnail:
                </Typography>
                <img
                  src={thumbnailURL}
                  alt="Thumbnail"
                  style={{ 
                    maxWidth: "150px", 
                    borderRadius: "8px",
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                />
              </Box>
            )}
            <Button 
              type="submit" 
              variant="contained" 
              fullWidth
              sx={{ 
                mt: 3,
                py: 1.5,
                background: '#BDFA03',
                color: '#000',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                '&:hover': {
                  background: '#A8E003',
                  boxShadow: '0 0 20px rgba(189, 250, 3, 0.4)',
                },
              }}
            >
              Upload Video
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default UploadVideo;
