import React from "react";
import { Card, CardMedia, Box, Typography, Avatar } from "@mui/material";
import { Person, Visibility } from "@mui/icons-material";
import { Link } from "react-router-dom";

const VideoCard = ({ video }) => {
  return (
    <Card sx={{ position: 'relative', overflow: 'hidden' }}>
      <Link to={`/video/${video.video_id}`} style={{ textDecoration: "none" }}>
        <CardMedia
          component="img"
          height="140"
          image={video.thumbnail_url || "https://via.placeholder.com/640x360"}
          alt={video.title}
          sx={{ objectFit: 'cover' }}
        />
        
        {/* Overlay information directly on the thumbnail */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.8) 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            p: 1
          }}
        >
          {/* Top row: Title and views */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            {/* Title in top-left */}
            <Typography
              variant="caption"
              sx={{
                color: 'white',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                lineHeight: 1.2,
                fontWeight: 'bold',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                maxWidth: '70%'
              }}
            >
              {video.title}
            </Typography>

            {/* Views in top-right */}
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                bgcolor: 'rgba(0,0,0,0.5)',
                px: 0.8,
                py: 0.3,
                borderRadius: 1
              }}
            >
              <Visibility
                sx={{
                  fontSize: 12,
                  color: 'white',
                  mr: 0.5
                }}
              />
              <Typography
                variant="caption"
                color="white"
                fontSize="0.65rem"
                sx={{ fontWeight: 'medium' }}
              >
                {video.views || 0}
              </Typography>
            </Box>
          </Box>

          {/* Bottom row: Creator info */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Avatar
              src={video.profile_picture}
              alt={video.username}
              sx={{
                width: 24,
                height: 24,
                border: '1px solid rgba(255,255,255,0.5)',
                mr: 1
              }}
            >
              <Person fontSize="small" />
            </Avatar>
            <Typography
              variant="caption"
              sx={{
                color: 'white',
                fontSize: '0.7rem',
                fontWeight: 500,
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {video.username || "Anonymous"}
            </Typography>
          </Box>
        </Box>
      </Link>
    </Card>
  );
};

export default VideoCard;
