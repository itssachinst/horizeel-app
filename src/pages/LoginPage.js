import React, { useState } from 'react';
import { 
  TextField, 
  Button, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Link, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  CircularProgress,
  Snackbar,
  Alert,
  InputAdornment,
  IconButton,
  Divider
} from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import axios from 'axios';

const LoginPage = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();
  
  // Password reset states
  const [openResetDialog, setOpenResetDialog] = useState(false);
  const [resetForm, setResetForm] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials({ ...credentials, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(credentials);
      navigate('/');
    } catch (err) {
      setError(err.detail || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleOpenResetDialog = () => {
    setOpenResetDialog(true);
    setResetForm({
      email: credentials.email, // Pre-fill with login email if available
      password: '',
      confirmPassword: ''
    });
    setResetError('');
  };
  
  const handleCloseResetDialog = () => {
    setOpenResetDialog(false);
    setResetError('');
  };
  
  const handleResetFormChange = (e) => {
    const { name, value } = e.target;
    setResetForm({ ...resetForm, [name]: value });
  };
  
  const togglePasswordVisibility = (field) => {
    if (field === 'password') {
      setShowPassword(!showPassword);
    } else {
      setShowConfirmPassword(!showConfirmPassword);
    }
  };
  
  const handleResetPassword = async () => {
    // Validate form
    if (!resetForm.email) {
      setResetError('Email is required');
      return;
    }
    
    if (!resetForm.password) {
      setResetError('Password is required');
      return;
    }
    
    if (resetForm.password.length < 8) {
      setResetError('Password must be at least 8 characters long');
      return;
    }
    
    if (resetForm.password !== resetForm.confirmPassword) {
      setResetError('Passwords do not match');
      return;
    }
    
    setResetLoading(true);
    setResetError('');
    
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL ||
        (window.location.hostname === 'localhost' ? 'http://localhost:8000/api' 
        : 'https://horizontalreels.com/api');
                            
      // Call direct password reset endpoint
      await axios.post(`${API_BASE_URL}/auth/direct-reset-password`, {
        email: resetForm.email,
        new_password: resetForm.password
      });
      
      // Show success message
      setSnackbarMessage('Password has been reset successfully. Please login with your new password.');
      setSnackbarOpen(true);
      
      // Close the dialog
      setOpenResetDialog(false);
      
      // Set the email in the login form
      setCredentials(prev => ({
        ...prev,
        email: resetForm.email,
        password: ''
      }));
    } catch (err) {
      setResetError(err.response?.data?.detail || 'Failed to reset password. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };
  
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      bgcolor="#000"
      color="white"
    >
      <Card sx={{ maxWidth: 400, width: '100%', bgcolor: '#121212', color: 'white', borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            Login to Horizeel
          </Typography>
          
          {error && (
            <Typography color="error" align="center" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          
          <form onSubmit={handleSubmit}>
            <TextField
              label="Email"
              name="email"
              type="email"
              value={credentials.email}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
              InputLabelProps={{ style: { color: 'gray' } }}
              InputProps={{ style: { color: 'white' } }}
              sx={{ 
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'gray' },
                  '&:hover fieldset': { borderColor: 'white' },
                  '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                }
              }}
            />
            
            <TextField
              label="Password"
              name="password"
              type="password"
              value={credentials.password}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
              InputLabelProps={{ style: { color: 'gray' } }}
              InputProps={{ style: { color: 'white' } }}
              sx={{ 
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'gray' },
                  '&:hover fieldset': { borderColor: 'white' },
                  '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                }
              }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              disabled={loading}
              sx={{ mb: 2 }}
            >
              {loading ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
                  Logging in...
                </>
              ) : 'Login'}
            </Button>
            
            <Box 
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 2 
              }}
            >
              <Typography>
                Don't have an account?{' '}
                <Link component={RouterLink} to="/register" color="primary">
                  Register
                </Link>
              </Typography>
              
              <Link 
                component="button"
                variant="body2"
                onClick={handleOpenResetDialog}
                color="primary"
                underline="hover"
              >
                Forgot Password?
              </Link>
            </Box>
          </form>
        </CardContent>
      </Card>
      
      {/* Direct Password Reset Dialog */}
      <Dialog 
        open={openResetDialog} 
        onClose={handleCloseResetDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#121212',
            color: 'white',
            borderRadius: 2
          }
        }}
      >
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Enter your email and a new password to reset your account password.
          </Typography>
          
          {resetError && (
            <Alert severity="error" sx={{ mb: 2, backgroundColor: 'rgba(211, 47, 47, 0.1)' }}>
              {resetError}
            </Alert>
          )}
          
          <TextField
            label="Email"
            name="email"
            type="email"
            value={resetForm.email}
            onChange={handleResetFormChange}
            fullWidth
            required
            margin="dense"
            InputLabelProps={{ style: { color: 'gray' } }}
            InputProps={{ style: { color: 'white' } }}
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'gray' },
                '&:hover fieldset': { borderColor: 'white' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
              }
            }}
          />
          
          <Divider sx={{ my: 2, bgcolor: 'rgba(255, 255, 255, 0.12)' }} />
          
          <TextField
            label="New Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={resetForm.password}
            onChange={handleResetFormChange}
            fullWidth
            required
            margin="dense"
            InputLabelProps={{ style: { color: 'gray' } }}
            InputProps={{ 
              style: { color: 'white' },
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => togglePasswordVisibility('password')}
                    edge="end"
                    sx={{ color: 'gray' }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'gray' },
                '&:hover fieldset': { borderColor: 'white' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
              }
            }}
          />
          
          <TextField
            label="Confirm New Password"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={resetForm.confirmPassword}
            onChange={handleResetFormChange}
            fullWidth
            required
            margin="dense"
            InputLabelProps={{ style: { color: 'gray' } }}
            InputProps={{ 
              style: { color: 'white' },
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => togglePasswordVisibility('confirm')}
                    edge="end"
                    sx={{ color: 'gray' }}
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={{ 
              mb: 1,
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'gray' },
                '&:hover fieldset': { borderColor: 'white' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
              }
            }}
            helperText="Password must be at least 8 characters long"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={handleCloseResetDialog} 
            color="primary"
            disabled={resetLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleResetPassword} 
            color="primary" 
            variant="contained"
            disabled={resetLoading || !resetForm.email || !resetForm.password || !resetForm.confirmPassword}
            startIcon={resetLoading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {resetLoading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Success notification */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LoginPage; 