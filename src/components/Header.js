import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Box, 
  IconButton, 
  InputBase, 
  Avatar, 
  Badge, 
  Menu, 
  MenuItem, 
  Divider, 
  ListItemIcon,
  useMediaQuery,
  useTheme,
  Chip,
  Tooltip,
  Autocomplete,
  Paper,
  Typography,
  Button,
  Fade
} from '@mui/material';
import { 
  Search as SearchIcon, 
  VideoCall as VideoCallIcon, 
  Logout as LogoutIcon, 
  Settings as SettingsIcon,
  AccountCircle as AccountCircleIcon,
  BookmarkBorder as BookmarkIcon,
  Menu as MenuIcon,
  Mic as MicIcon,
  Feedback as FeedbackIcon,
  Upload as UploadIcon
} from '@mui/icons-material';
import { styled, alpha } from '@mui/material/styles';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { navigateToHomeWithRefresh, isVideoPage } from '../utils/navigation';
import { searchVideos } from '../api';
import Logo from './Logo';

// Unified styled components for consistent header design
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  background: 'rgba(0, 0, 0, 0.9)',
  backdropFilter: 'blur(20px)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  position: 'fixed',
  zIndex: theme.zIndex.appBar,
}));

const SearchContainer = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: 25,
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  '&:hover': {
    background: 'rgba(255, 255, 255, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
  },
  '&:focus-within': {
    background: 'rgba(255, 255, 255, 0.15)',
    border: '1px solid rgba(189, 250, 3, 0.5)',
    boxShadow: '0 0 20px rgba(189, 250, 3, 0.2)',
  },
  width: '100%',
  maxWidth: 450,
  display: 'flex',
  alignItems: 'center',
  transition: 'all 0.3s ease',
}));

const SearchInput = styled(InputBase)(({ theme }) => ({
  color: 'white',
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1.5, 1, 1.5, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    paddingRight: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
  },
}));

const RotatingSuggestions = styled(Box)(({ theme }) => ({
  position: 'absolute',
  left: `calc(1em + ${theme.spacing(4)})`,
  top: '50%',
  transform: 'translateY(-50%)',
  pointerEvents: 'none',
  color: alpha(theme.palette.common.white, 0.5),
  fontSize: '1rem',
  overflow: 'hidden',
  height: '1.2em',
  display: 'flex',
  alignItems: 'center',
  zIndex: 1,
  userSelect: 'none',
}));

const SuggestionText = styled(Typography)(({ theme }) => ({
  position: 'absolute',
  whiteSpace: 'nowrap',
  transition: 'transform 0.5s ease-in-out, opacity 0.5s ease-in-out',
  fontSize: 'inherit',
  color: 'inherit',
}));

// Category data for rotating suggestions
const CATEGORIES = [
  'Trending', 'Music', 'Travel', 'Food', 'Gaming', 'Movies', 
  'Art', 'Nature', 'Cars', 'Education', 'Sports', 'Fashion'
];

// Rotating Suggestions Component
const RotatingSuggestionsComponent = ({ isVisible }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setIsAnimating(true);
      
      setTimeout(() => {
        setCurrentIndex((prevIndex) => 
          (prevIndex + 1) % CATEGORIES.length
        );
        setIsAnimating(false);
      }, 300);
    }, 2500);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <RotatingSuggestions>
      <SuggestionText
        sx={{
          transform: isAnimating ? 'translateY(-20px)' : 'translateY(0)',
          opacity: isAnimating ? 0 : 0.7,
          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        Search {CATEGORIES[currentIndex]}...
      </SuggestionText>
    </RotatingSuggestions>
  );
};

// Memoized SearchBar component
const SearchBar = React.memo(({ searchQuery, onSearchChange, onSearch, showRotatingSuggestions = true }) => (
  <SearchContainer>
    <Box sx={{ position: 'absolute', left: 16, display: 'flex', alignItems: 'center' }}>
      <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
    </Box>
    <SearchInput
      placeholder={searchQuery ? "" : "Search videos..."}
      value={searchQuery}
      onChange={(e) => onSearchChange(e.target.value)}
      onKeyPress={(e) => {
        if (e.key === 'Enter') {
          onSearch(searchQuery);
        }
      }}
    />
    {/* Rotating suggestions - only show when search is empty and enabled */}
    {showRotatingSuggestions && <RotatingSuggestionsComponent isVisible={!searchQuery} />}
    {searchQuery && (
      <IconButton
        onClick={() => onSearch(searchQuery)}
        sx={{ position: 'absolute', right: 8, color: 'white' }}
      >
        <SearchIcon />
      </IconButton>
    )}
  </SearchContainer>
));

const Header = ({ 
  variant = 'default', // 'default' or 'home'
  onSearch,
  searchQuery: externalSearchQuery,
  onSearchChange: externalOnSearchChange,
  showSearch = true,
  customSearchPlaceholder
}) => {
  const { currentUser, logout, canUpload } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = useState(null);
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  
  // Use external search state if provided, otherwise use internal state
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const setSearchQuery = externalOnSearchChange || setInternalSearchQuery;
  
  const isMenuOpen = Boolean(anchorEl);
  const isMobileMenuOpen = Boolean(mobileMenuAnchorEl);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMobileMenuOpen = (event) => {
    setMobileMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMobileMenuAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleMenuClose();
  };

  // Handle search
  const handleSearch = useCallback(async (query) => {
    if (onSearch) {
      // Use external search handler if provided
      onSearch(query);
    } else {
      // Default search behavior
      if (query.trim()) {
        navigate(`/search?q=${encodeURIComponent(query)}`);
      }
    }
  }, [onSearch, navigate]);

  const handleGoToProfile = () => {
    navigate('/profile');
    handleMenuClose();
  };

  const handleGoToSettings = () => {
    navigate('/settings');
    handleMenuClose();
  };

  const handleGoToSavedVideos = () => {
    navigate('/profile');
    handleMenuClose();
  };

  const handleGoToUpload = () => {
    navigate('/upload');
    handleMenuClose();
  };

  const handleGoToFeedback = () => {
    navigate('/feedback');
    handleMenuClose();
  };

  const handleLogoClick = () => {
    if (isVideoPage(location.pathname)) {
      navigateToHomeWithRefresh();
    } else {
      navigate('/demo/');
    }
  };

  // Desktop menu
  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={isMenuOpen}
      onClose={handleMenuClose}
      PaperProps={{
        elevation: 3,
        sx: {
          overflow: 'visible',
          filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
          mt: 1.5,
          background: 'rgba(18, 18, 18, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          '& .MuiAvatar-root': {
            width: 32,
            height: 32,
            ml: -0.5,
            mr: 1,
          },
          '&:before': {
            content: '""',
            display: 'block',
            position: 'absolute',
            top: 0,
            right: 14,
            width: 10,
            height: 10,
            bgcolor: 'rgba(18, 18, 18, 0.95)',
            transform: 'translateY(-50%) rotate(45deg)',
            zIndex: 0,
          },
        },
      }}
    >
      <MenuItem onClick={handleGoToProfile} sx={{ color: 'white' }}>
        <ListItemIcon>
          <AccountCircleIcon fontSize="small" sx={{ color: 'white' }} />
        </ListItemIcon>
        Profile
      </MenuItem>
      <MenuItem onClick={handleGoToSavedVideos} sx={{ color: 'white' }}>
        <ListItemIcon>
          <BookmarkIcon fontSize="small" sx={{ color: 'white' }} />
        </ListItemIcon>
        Saved Videos
      </MenuItem>
      <MenuItem onClick={handleGoToSettings} sx={{ color: 'white' }}>
        <ListItemIcon>
          <SettingsIcon fontSize="small" sx={{ color: 'white' }} />
        </ListItemIcon>
        Settings
      </MenuItem>
      <MenuItem onClick={handleGoToFeedback} sx={{ color: 'white' }}>
        <ListItemIcon>
          <FeedbackIcon fontSize="small" sx={{ color: 'white' }} />
        </ListItemIcon>
        Feedback
      </MenuItem>
      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
      <MenuItem onClick={handleLogout} sx={{ color: 'white' }}>
        <ListItemIcon>
          <LogoutIcon fontSize="small" sx={{ color: 'white' }} />
        </ListItemIcon>
        Logout
      </MenuItem>
    </Menu>
  );

  // Mobile menu
  const renderMobileMenu = (
    <Menu
      anchorEl={mobileMenuAnchorEl}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={isMobileMenuOpen}
      onClose={handleMenuClose}
      PaperProps={{
        sx: {
          background: 'rgba(18, 18, 18, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }
      }}
    >
      <MenuItem 
        onClick={handleGoToUpload}
        sx={{
          color: 'white',
          opacity: canUpload ? 1 : 0.5,
          '&:hover': {
            backgroundColor: canUpload ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 0, 0, 0.1)',
          }
        }}
      >
        <IconButton size="large" sx={{ color: 'white' }}>
          <VideoCallIcon />
        </IconButton>
        <Typography>{canUpload ? 'Upload' : 'Upload (Restricted)'}</Typography>
      </MenuItem>
      <MenuItem onClick={handleGoToFeedback} sx={{ color: 'white' }}>
        <IconButton size="large" sx={{ color: 'white' }}>
          <FeedbackIcon />
        </IconButton>
        <Typography>Feedback</Typography>
      </MenuItem>
      <MenuItem onClick={handleGoToProfile} sx={{ color: 'white' }}>
        <IconButton size="large" sx={{ color: 'white' }}>
          <AccountCircleIcon />
        </IconButton>
        <Typography>Profile</Typography>
      </MenuItem>
    </Menu>
  );

  return (
    <Box sx={{ flexGrow: 1 }}>
      <StyledAppBar>
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 3 } }}>
          {/* Left side - Logo and mobile menu */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              sx={{ 
                display: { xs: 'flex', md: 'none' }, 
                mr: 1,
                color: 'white',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                }
              }}
              onClick={handleMobileMenuOpen}
            >
              <MenuIcon />
            </IconButton>
            
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                cursor: 'pointer'
              }}
              onClick={handleLogoClick}
            >
              <Logo />
            </Box>
          </Box>
          
          {/* Center - Search Bar */}
          {showSearch && (
            <Box sx={{ 
              flexGrow: 1, 
              display: 'flex', 
              justifyContent: 'center',
              mx: { xs: 1, md: 3 },
              maxWidth: { xs: '200px', sm: '300px', md: '450px' }
            }}>
              <SearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSearch={handleSearch}
                showRotatingSuggestions={variant === 'home'}
              />
            </Box>
          )}
          
          {/* Right side - Action buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Desktop Navigation Items */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
              <IconButton
                sx={{
                  color: 'white',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)'
                  }
                }}
                onClick={handleGoToUpload}
                title={canUpload ? "Upload Video" : "Upload Restricted"}
              >
                <UploadIcon />
              </IconButton>
              
              <IconButton
                sx={{
                  color: 'white',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)'
                  }
                }}
                onClick={handleGoToFeedback}
              >
                <FeedbackIcon />
              </IconButton>
              
              <IconButton
                sx={{
                  color: 'white',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)'
                  }
                }}
                onClick={handleProfileMenuOpen}
              >
                {currentUser?.profile_picture ? (
                  <Avatar
                    src={currentUser.profile_picture}
                    sx={{ width: 32, height: 32, border: '2px solid rgba(189, 250, 3, 0.5)' }}
                  />
                ) : (
                  <AccountCircleIcon />
                )}
              </IconButton>
            </Box>
          </Box>
        </Toolbar>
      </StyledAppBar>
      {renderMobileMenu}
      {renderMenu}
    </Box>
  );
};

export default Header; 