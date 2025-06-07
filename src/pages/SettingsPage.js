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
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
      pt: 9, // Add padding for fixed header
    }}>
      <Container maxWidth="md">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{
            color: 'white',
            fontWeight: 'bold',
            mb: 3
          }}>
            Settings
          </Typography>
          
          <Paper sx={{ 
            p: 3, 
            mt: 3,
            background: 'rgba(18, 18, 18, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 2,
          }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
              Account
            </Typography>
            <Typography variant="body1" sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              mb: 2
            }}>
              {user ? `Signed in as: ${user.email}` : 'Not signed in'}
            </Typography>
            <Button 
              variant="outlined" 
              color="primary" 
              sx={{ 
                mt: 1,
                borderColor: '#BDFA03',
                color: '#BDFA03',
                '&:hover': {
                  borderColor: '#A8E003',
                  backgroundColor: 'rgba(189, 250, 3, 0.1)',
                },
              }}
            >
              Edit Profile
            </Button>
            
            <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
            
            <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
              Appearance
            </Typography>
            <FormControlLabel
              control={
                <Switch 
                  checked={darkMode} 
                  onChange={handleDarkModeChange} 
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#BDFA03',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#BDFA03',
                    },
                  }}
                />
              }
              label={<Typography sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>Dark Mode</Typography>}
            />
            
            <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
            
            <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
              Video Playback
            </Typography>
            <FormControlLabel
              control={
                <Switch 
                  checked={autoplay} 
                  onChange={handleAutoplayChange} 
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#BDFA03',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#BDFA03',
                    },
                  }}
                />
              }
              label={<Typography sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>Autoplay Videos</Typography>}
            />
            
            <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
            
            <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
              Notifications
            </Typography>
            <FormControlLabel
              control={
                <Switch 
                  checked={notifications} 
                  onChange={handleNotificationsChange} 
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#BDFA03',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#BDFA03',
                    },
                  }}
                />
              }
              label={<Typography sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>Enable Notifications</Typography>}
            />
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                variant="contained" 
                onClick={handleSave}
                sx={{
                  background: '#BDFA03',
                  color: '#000',
                  fontWeight: 'bold',
                  '&:hover': {
                    background: '#A8E003',
                    boxShadow: '0 0 20px rgba(189, 250, 3, 0.4)',
                  },
                }}
              >
                Save Changes
              </Button>
            </Box>
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
          sx={{
            background: 'rgba(76, 175, 80, 0.9)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SettingsPage; 