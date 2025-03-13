import React from "react";
import { Card, CardMedia, CardContent, Typography } from "@mui/material";
import { Link } from "react-router-dom";

const VideoCard = ({ video }) => {
  return (
    <Card>
      <Link to={`/video/${video.id}`} style={{ textDecoration: "none" }}>
        <CardMedia
          component="img"
          height="140"
          image={video.file_url} // Replace with your thumbnail field if available
          alt={video.title}
        />
        <CardContent>
          <Typography variant="h6">{video.title}</Typography>
        </CardContent>
      </Link>
    </Card>
  );
};

export default VideoCard;
