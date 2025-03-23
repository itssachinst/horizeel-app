import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Switch, 
  FormControlLabel, 
  Button, 
  Divider,
  Snackbar,
  Alert
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const SettingsPage = () => {
  const { user } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleDarkModeChange = (event) => {
    setDarkMode(event.target.checked);
  };

  const handleAutoplayChange = (event) => {
    setAutoplay(event.target.checked);
  };

  const handleNotificationsChange = (event) => {
    setNotifications(event.target.checked);
  };

  const handleSave = () => {
    // Here you would save the settings to a backend API or local storage
    setSnackbar({
      open: true,
      message: 'Settings saved successfully!',
      severity: 'success'
    });
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
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Account
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {user ? `Signed in as: ${user.email}` : 'Not signed in'}
          </Typography>
          <Button 
            variant="outlined" 
            color="primary" 
            sx={{ mt: 1 }}
          >
            Edit Profile
          </Button>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Appearance
          </Typography>
          <FormControlLabel
            control={
              <Switch 
                checked={darkMode} 
                onChange={handleDarkModeChange} 
                color="primary"
              />
            }
            label="Dark Mode"
          />
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Video Playback
          </Typography>
          <FormControlLabel
            control={
              <Switch 
                checked={autoplay} 
                onChange={handleAutoplayChange} 
                color="primary"
              />
            }
            label="Autoplay Videos"
          />
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Notifications
          </Typography>
          <FormControlLabel
            control={
              <Switch 
                checked={notifications} 
                onChange={handleNotificationsChange} 
                color="primary"
              />
            }
            label="Enable Notifications"
          />
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleSave}
            >
              Save Changes
            </Button>
          </Box>
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
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SettingsPage; 