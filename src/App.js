import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { AuthProvider } from "./contexts/AuthContext";
import { VideoProvider } from "./contexts/VideoContext";
import Header from "./components/Header";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import VideoPage from "./pages/VideoPage";
import VerticalFeedPage from "./pages/VerticalFeedPage";
import UploadVideo from "./components/UploadVideo";
import FollowersPage from "./pages/FollowersPage";
import SearchPage from "./pages/SearchPage";
import SettingsPage from "./pages/SettingsPage";
import FeedbackPage from "./pages/FeedbackPage";
import ProtectedRoute from "./components/ProtectedRoute";
import UploadProtectedRoute from "./components/UploadProtectedRoute";
import theme from './theme';
import './App.css';
import { useMediaQuery } from '@mui/material';

// Layout component to conditionally render the Header
const AppLayout = ({ children }) => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isReelsPage = location.pathname.startsWith('/reels');
  const isHomePage = location.pathname === '/' || location.pathname === '/demo/' || location.pathname.startsWith('/demo/');
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <>
      {!isAuthPage && !isReelsPage && (!isHomePage || !isMobile) && <Header />}
      <Box sx={{
          pt: 0, // Remove padding top
        minHeight: '100vh',
        bgcolor: theme.palette.background.default
      }}>
        {children}
      </Box>
    </>
  );
};

function App() {
  useEffect(() => {
    // Apply global styles for proper scrolling
    document.documentElement.style.overflow = 'auto';
    document.documentElement.style.height = '100%';
    document.body.style.overflow = 'auto';
    document.body.style.height = '100%';
    document.body.style.margin = '0';

    return () => {
      // Clean up styles when component unmounts
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.body.style.margin = '';
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <VideoProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/video/:id" element={<Navigate to={location => `/reels/${location.pathname.split('/').pop()}`} replace />} />
              <Route path="/reels" element={<VerticalFeedPage />} />
              <Route path="/reels/:id" element={<VerticalFeedPage />} />
              <Route path="/demo/" element={
                  <AppLayout>
                    <HomePage />
                  </AppLayout>
              } />
              <Route path="/demo/*" element={
                  <AppLayout>
                    <HomePage />
                  </AppLayout>
              } />
              <Route path="/profile" element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ProfilePage />
                    </AppLayout>
                  </ProtectedRoute>
              } />
              <Route path="/upload" element={
                  <ProtectedRoute>
                  <UploadProtectedRoute>
                    <AppLayout>
                      <UploadVideo />
                    </AppLayout>
                  </UploadProtectedRoute>
                  </ProtectedRoute>
              } />
              <Route path="/followers" element={
                  <ProtectedRoute>
                    <AppLayout>
                      <FollowersPage />
                    </AppLayout>
                  </ProtectedRoute>
              } />
              <Route path="/search" element={
                  <AppLayout>
                    <SearchPage />
                  </AppLayout>
              } />
              <Route path="/settings" element={
                  <AppLayout>
                    <SettingsPage />
                  </AppLayout>
              } />
              <Route path="/feedback" element={
                  <AppLayout>
                    <FeedbackPage />
                  </AppLayout>
              } />
            </Routes>
          </Router>
        </VideoProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
