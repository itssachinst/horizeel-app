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
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ 
          fontWeight: 'bold',
          color: 'primary.main'
        }}>
          Your Opinion Matters to Us
        </Typography>
        
        <Paper sx={{ p: 4, mt: 3, borderRadius: 2, boxShadow: 3 }}>
          <Typography variant="body1" paragraph sx={{ mb: 2 }}>
            We value your input and are committed to making our platform better with your feedback. Our team reviews every submission to improve the Horizontal Reels experience.
          </Typography>
          
          <Typography variant="body1" paragraph sx={{ mb: 4 }}>
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
              sx={{ mb: 3 }}
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
                  boxShadow: 2
                }}
              >
                {isSubmitting ? (
                  <CircularProgress size={24} color="inherit" />
                ) : 'Submit Feedback'}
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
      
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
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default FeedbackPage; 