import React, { useEffect, useState } from "react";
import { Grid } from "@mui/material";
import VideoCard from "./VideoCard";
import { fetchVideos } from "../api";

const VideoGrid = () => {
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    const getVideos = async () => {
      const data = await fetchVideos();
      console.log("Fetched videos:", data); // Debugging
      setVideos(data);
    };
    getVideos();
  }, []);

  return (
    <Grid container spacing={2}>
      {videos.length > 0 ? (
        videos.map((video) => (
          <Grid item xs={12} sm={6} md={4} key={video.id}>
            <VideoCard video={video} />
          </Grid>
        ))
      ) : (
        <p>No videos available.</p>
      )}
    </Grid>
  );
};

export default VideoGrid;
