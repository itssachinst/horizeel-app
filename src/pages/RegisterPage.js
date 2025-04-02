import React, { useState } from 'react';
import { TextField, Button, Typography, Box, Card, CardContent, Link } from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { register, login } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password length
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }
    
    // Check internet connection first
    if (!navigator.onLine) {
      setError('You are offline. Please check your internet connection and try again.');
      setLoading(false);
      return;
    }

    try {
      // Display a message that we're contacting the server
      setError('Contacting server...');
      
      // Register the user
      const { username, email, password } = formData;
      console.log('Sending registration request for:', email);
      await register({ username, email, password });
      
      // Auto login after successful registration
      console.log('Registration successful, attempting login...');
      await login({ email, password });
      
      // Redirect to home page
      navigate('/');
    } catch (err) {
      console.error('Registration error:', err);
      
      // Clear the "Contacting server..." message
      setError('');
      
      // Check for the specific error messages we're seeing in the console
      if (err.message === 'Email already registered') {
        setError('This email is already registered. Please use a different email or try logging in.');
        return;
      }
      
      if (err.message === 'Username already taken') {
        setError('This username is already taken. Please choose a different username.');
        return;
      }
      
      // Check for network-related issues
      const isNetworkError = 
        !err.response || 
        err.message?.includes('Network Error') ||
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('net::ERR');
      
      if (isNetworkError) {
        setError(
          'Unable to reach the server. Please check that your internet connection ' +
          'is working and that you can access horizontalreels.com. ' +
          'If the problem persists, the server might be temporarily down.'
        );
        console.log('API URL being used:', process.env.REACT_APP_API_URL || 'default');
      } else if (err.response && err.response.data) {
        const responseData = err.response.data;
        
        if (responseData.detail) {
          // Handle specific error types with more precise pattern matching
          if (responseData.detail.includes('username already') || 
              responseData.detail.includes('Username already') ||
              responseData.detail.includes('username is already') ||
              responseData.detail.includes('Username is already') ||
              responseData.detail.includes('username taken') ||
              responseData.detail.includes('Username taken')) {
            setError('This username is already taken. Please choose a different username.');
          } else if (responseData.detail.includes('email already') || 
                     responseData.detail.includes('Email already') ||
                     responseData.detail.includes('email registered') ||
                     responseData.detail.includes('Email registered')) {
            setError('This email is already registered. Please use a different email or try logging in.');
          } else {
            // Use the API's error message
            setError(responseData.detail);
          }
        } else if (responseData.message) {
          // Check for specific messages in the message field
          if (responseData.message.includes('username already') || 
              responseData.message.includes('Username already') ||
              responseData.message.includes('username taken') ||
              responseData.message.includes('Username taken')) {
            setError('This username is already taken. Please choose a different username.');
          } else if (responseData.message.includes('email already') || 
                     responseData.message.includes('Email already') ||
                     responseData.message.includes('email registered') ||
                     responseData.message.includes('Email registered')) {
            setError('This email is already registered. Please use a different email or try logging in.');
          } else {
            setError(responseData.message);
          }
        } else if (responseData.error) {
          setError(responseData.error);
        } else {
          // Generic error with response code
          setError(`Registration failed (${err.response.status}). Please try again.`);
        }
      } else if (err.message) {
        // Network error or other client-side error
        setError(err.message);
      } else {
        // Fallback generic error
        setError('Registration failed. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
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
            Create an Account
          </Typography>
          
          {error && (
            <Box 
              sx={{ 
                mb: 3, 
                p: 2, 
                borderRadius: 1,
                bgcolor: error === 'Contacting server...' ? 'info.dark' : 'error.dark',
                color: 'white'
              }}
            >
              <Typography 
                color="inherit" 
                align="center" 
                variant="body1"
                fontWeight={error.includes('username') || error.includes('email') ? 'bold' : 'normal'}
              >
                {error}
              </Typography>
              
              {error.includes('username') && (
                <Typography color="inherit" align="center" variant="body2" sx={{ mt: 1 }}>
                  Please try a different username.
                </Typography>
              )}
              
              {error.includes('email') && (
                <Typography color="inherit" align="center" variant="body2" sx={{ mt: 1 }}>
                  You can <Link component={RouterLink} to="/login" color="inherit" sx={{ textDecoration: 'underline' }}>
                    login here
                  </Link> if you already have an account.
                </Typography>
              )}
            </Box>
          )}
          
          <form onSubmit={handleSubmit}>
            <TextField
              label="Username"
              name="username"
              value={formData.username}
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
              label="Email"
              name="email"
              type="email"
              value={formData.email}
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
              value={formData.password}
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
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
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
              {loading ? 'Creating Account...' : 'Register'}
            </Button>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 2 }}>
              <Button
                variant="outlined"
                color="primary"
                size="large"
                fullWidth
                onClick={() => navigate('/')}
              >
                Cancel
              </Button>
            </Box>
            
            <Typography align="center">
              Already have an account?{' '}
              <Link component={RouterLink} to="/login" color="primary">
                Login
              </Link>
            </Typography>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RegisterPage; 