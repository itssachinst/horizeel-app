import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  TextField, 
  Button, 
  Snackbar, 
  Alert,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { submitUserFeedback } from '../api';

const FeedbackPage = () => {
  const { currentUser } = useAuth();
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleFeedbackChange = (event) => {
    setFeedback(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!feedback.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter some feedback before submitting',
        severity: 'error'
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      await submitUserFeedback(feedback);
      
      setSnackbar({
        open: true,
        message: 'Your feedback has been submitted. Thank you!',
        severity: 'success'
      });
      
      // Clear the form
      setFeedback('');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      
      setSnackbar({
        open: true,
        message: 'Failed to submit feedback. Please try again.',
        severity: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
      pt: 9, // Add padding for fixed header
    }}>
      <Container maxWidth="md">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ 
            fontWeight: 'bold',
            color: 'white',
            mb: 3
          }}>
            Your Opinion Matters to Us
          </Typography>
          
          <Paper sx={{ 
            p: 4, 
            mt: 3, 
            borderRadius: 2, 
            boxShadow: 3,
            background: 'rgba(18, 18, 18, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <Typography variant="body1" paragraph sx={{ 
              mb: 2,
              color: 'rgba(255, 255, 255, 0.9)'
            }}>
              We value your input and are committed to making our platform better with your feedback. Our team reviews every submission to improve the Horizontal Reels experience.
            </Typography>
            
            <Typography variant="body1" paragraph sx={{ 
              mb: 4,
              color: 'rgba(255, 255, 255, 0.9)'
            }}>
              Please let us know what you think about our app, suggest new features, or tell us about any issues you've encountered.
            </Typography>
            
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                id="feedback"
                label="Your Feedback"
                multiline
                rows={6}
                value={feedback}
                onChange={handleFeedbackChange}
                variant="outlined"
                placeholder="Tell us what you think about the platform, features you'd like to see, or anything else that would make your experience better!"
                sx={{ 
                  mb: 3,
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
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary" 
                  size="large"
                  disabled={isSubmitting || !feedback.trim()}
                  sx={{ 
                    minWidth: 120,
                    textTransform: 'none',
                    fontWeight: 'bold',
                    boxShadow: 2,
                    background: '#BDFA03',
                    color: '#000',
                    '&:hover': {
                      background: '#A8E003',
                      boxShadow: '0 0 20px rgba(189, 250, 3, 0.4)',
                    },
                    '&:disabled': {
                      background: 'rgba(189, 250, 3, 0.5)',
                      color: 'rgba(0, 0, 0, 0.5)',
                    },
                  }}
                >
                  {isSubmitting ? (
                    <CircularProgress size={24} sx={{ color: '#000' }} />
                  ) : 'Submit Feedback'}
                </Button>
              </Box>
            </form>
          </Paper>
        </Box>
      </Container>
      
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
          elevation={6}
          sx={{
            background: snackbar.severity === 'success' 
              ? 'rgba(76, 175, 80, 0.9)' 
              : 'rgba(244, 67, 54, 0.9)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FeedbackPage; 