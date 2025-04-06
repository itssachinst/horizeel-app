import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import './VideoPage.css';

const VideoPage = () => {
  const { id } = useParams();
  const [currentVideo, setCurrentVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVideo = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/videos/${id}`);
        if (!response.ok) throw new Error('Failed to fetch video details');
        const data = await response.json();
        setCurrentVideo(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching video:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchVideo();
  }, [id]);

  // Function to fetch and play the next video
  const handleNextVideo = async () => {
    try {
      const response = await fetch('/api/videos/?skip=0&limit=20');
      if (!response.ok) throw new Error('Failed to fetch videos');
      const videos = await response.json();
      
      // Find current video index and get the next one
      const currentIndex = videos.findIndex(v => v.video_id === id);
      if (currentIndex !== -1 && currentIndex < videos.length - 1) {
        const nextVideo = videos[currentIndex + 1];
        window.location.href = `/video/${nextVideo.video_id}`;
      }
    } catch (err) {
      console.error('Error fetching next video:', err);
    }
  };

  // Function to fetch and play the previous video
  const handlePreviousVideo = async () => {
    try {
      const response = await fetch('/api/videos/?skip=0&limit=20');
      if (!response.ok) throw new Error('Failed to fetch videos');
      const videos = await response.json();
      
      // Find current video index and get the previous one
      const currentIndex = videos.findIndex(v => v.video_id === id);
      if (currentIndex > 0) {
        const prevVideo = videos[currentIndex - 1];
        window.location.href = `/video/${prevVideo.video_id}`;
      }
    } catch (err) {
      console.error('Error fetching previous video:', err);
    }
  };

  if (loading) {
    return <div className="loading">Loading video...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!currentVideo) {
    return <div className="error">Video not found</div>;
  }

  return (
    <div className="video-page">
      <VideoPlayer 
        key={currentVideo.video_url}
        url={currentVideo.video_url}
        videoTitle={currentVideo.title}
        views={currentVideo.views}
        likes={currentVideo.likes}
        dislikes={currentVideo.dislikes}
        profile_picture={currentVideo.profile_picture}
        onNextVideo={handleNextVideo}
        onPreviousVideo={handlePreviousVideo}
      />
    </div>
  );
};

export default VideoPage;