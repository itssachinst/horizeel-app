import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import UploadRestriction from './UploadRestriction';

const UploadProtectedRoute = ({ children }) => {
  const { canUpload, currentUser, loading } = useAuth();

  // Show loading state while checking user data
  if (loading) {
    return null; // or a loading spinner
  }

  // If user doesn't have upload permission, show restriction message
  if (!canUpload) {
    return <UploadRestriction />;
  }

  // If user has upload permission, render the children (upload component)
  return children;
};

export default UploadProtectedRoute; 