import React from 'react';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import { Lock as LockIcon, VideoCall as VideoCallIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const UploadRestriction = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '80vh',
        px: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 500,
          width: '100%',
          textAlign: 'center',
          boxShadow: 3,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mb: 3,
            }}
          >
            <Box
              sx={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <VideoCallIcon
                sx={{
                  fontSize: 60,
                  color: 'text.secondary',
                  opacity: 0.5,
                }}
              />
              <LockIcon
                sx={{
                  position: 'absolute',
                  fontSize: 30,
                  color: 'error.main',
                  bottom: -5,
                  right: -5,
                  backgroundColor: 'background.paper',
                  borderRadius: '50%',
                  p: 0.5,
                }}
              />
            </Box>
          </Box>

          <Typography
            variant="h5"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 'bold',
              color: 'text.primary',
              mb: 2,
            }}
          >
            Upload Restricted
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              mb: 3,
              lineHeight: 1.6,
            }}
          >
            You are not allowed to upload videos at this time. This restriction may be due to account limitations or administrative settings.
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 4,
              fontStyle: 'italic',
            }}
          >
            If you believe this is an error, please contact support for assistance.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={() => navigate('/demo/')}
              sx={{
                px: 3,
                py: 1,
              }}
            >
              Go to Home
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/feedback')}
              sx={{
                px: 3,
                py: 1,
              }}
            >
              Contact Support
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default UploadRestriction; 