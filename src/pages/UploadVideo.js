import React, { useState } from "react";
import axios from "axios";
import { TextField, Button, Card, CardContent, Typography } from "@mui/material";

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
      const response = await axios.post("http://localhost:8000/api/videos/", formData, {
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
    <Card style={{ maxWidth: "500px", margin: "20px auto", padding: "20px" }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Upload Video
        </Typography>
        {message && (
          <Typography variant="body1" color="error" gutterBottom>
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
          />
          <TextField
            label="Description"
            name="description"
            value={videoDetails.description}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
          />
          <input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            style={{ marginTop: "10px", marginBottom: "10px" }}
            required
          />
          {thumbnailURL && (
            <img
              src={thumbnailURL}
              alt="Thumbnail"
              style={{ maxWidth: "100px", marginTop: "20px" }}
            />
          )}
          <Button type="submit" variant="contained" color="primary" fullWidth>
            Upload
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default UploadVideo;
