import React, { createContext, useState, useEffect, useContext } from 'react';
import { getCurrentUser, loginUser, registerUser, logoutUser } from '../api';

// Create the context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on initial load
  useEffect(() => {
    const loadUser = async () => {
      try {
        if (localStorage.getItem('token')) {
          const userData = await getCurrentUser();
          setCurrentUser(userData);
        }
      } catch (err) {
        console.error('Error loading user:', err);
        // Clear invalid token
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Login function
  const login = async (credentials) => {
    setError(null);
    try {
      const data = await loginUser(credentials);
      setCurrentUser(await getCurrentUser());
      return data;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  // Register function
  const register = async (userData) => {
    setError(null);
    try {
      const data = await registerUser(userData);
      return data;
    } catch (err) {
      // Capture more details from the error response
      let errorMessage = 'Registration failed';
      
      // Check for the specific API Error format that we're seeing
      if (err.status === 400) {
        if (err.message === 'Email already registered') {
          errorMessage = 'Email already registered';
        } else if (err.message === 'Username already taken') {
          errorMessage = 'Username already taken';
        } else {
          errorMessage = err.message || 'Registration failed';
        }
      } else if (err.response && err.response.data) {
        // API returned an error response
        const responseData = err.response.data;
        if (responseData.detail) {
          errorMessage = responseData.detail;
        } else if (responseData.message) {
          errorMessage = responseData.message;
        } else if (responseData.error) {
          errorMessage = responseData.error;
        } else if (typeof responseData === 'string') {
          errorMessage = responseData;
        }
      } else if (err.message) {
        // Network or other client-side error
        errorMessage = err.message;
      }
      
      // Set the error in the context
      setError(errorMessage);
      
      // Make sure the err object has the message property set consistently
      err.message = errorMessage;
      
      // Pass the enhanced error
      throw err;
    }
  };

  // Logout function
  const logout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  // Value provided by the context
  const value = {
    currentUser,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!currentUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook for using the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 