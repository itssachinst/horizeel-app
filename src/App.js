import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import VideoPage from "./pages/VideoPage";
import UploadVideo from "./components/UploadVideo";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Header from "./components/Header";
import { AuthProvider } from "./contexts/AuthContext";
import { createTheme, ThemeProvider } from '@mui/material/styles';
import ProfilePage from "./pages/ProfilePage";
import FollowersPage from "./pages/FollowersPage";
import { Box } from "@mui/material";

const theme = createTheme({
  palette: {
    mode: 'dark', // Enable dark mode
    background: {
      default: '#000', // Set default background to black
      paper: '#121212', // Paper elements background
    },
    primary: {
      main: '#3f51b5',
    },
    secondary: {
      main: '#f50057',
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      'Arial',
      'sans-serif'
    ].join(','),
  },
  components: {
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        },
      },
    },
  },
});

// Layout component to conditionally render the Header
const AppLayout = ({ children }) => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isVideoPage = location.pathname.startsWith('/video/');
  
  return (
    <>
      {!isAuthPage && !isVideoPage && <Header />}
      <Box sx={{ 
        pt: 0, // Remove padding top
        minHeight: '100vh',
        bgcolor: '#000' // Ensure background is black
      }}>
        {children}
      </Box>
    </>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={
              <AppLayout>
                <HomePage />
              </AppLayout>
            } />
            <Route path="/video/:id" element={
              <AppLayout>
                <VideoPage />
              </AppLayout>
            } />
            <Route path="/login" element={
              <AppLayout>
                <LoginPage />
              </AppLayout>
            } />
            <Route path="/register" element={
              <AppLayout>
                <RegisterPage />
              </AppLayout>
            } />
            <Route path="/upload" element={
              <AppLayout>
                <ProtectedRoute>
                  <UploadVideo />
                </ProtectedRoute>
              </AppLayout>
            } />
            <Route path="/profile" element={
              <AppLayout>
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              </AppLayout>
            } />
            <Route path="/users/:userId/followers" element={
              <AppLayout>
                <ProtectedRoute>
                  <FollowersPage />
                </ProtectedRoute>
              </AppLayout>
            } />
            <Route path="/users/:userId/following" element={
              <AppLayout>
                <ProtectedRoute>
                  <FollowersPage />
                </ProtectedRoute>
              </AppLayout>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
