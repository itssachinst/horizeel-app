import React, { useState, useEffect, useRef } from 'react';
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
  Feedback as FeedbackIcon
} from '@mui/icons-material';
import { styled, alpha } from '@mui/material/styles';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { navigateToHomeWithRefresh, isVideoPage } from '../utils/navigation';
import Logo from './Logo';

// Styled search bar
const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: 20,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  width: '100%',
  maxWidth: 600,
  [theme.breakpoints.up('sm')]: {
    width: '100%',
  },
  display: 'flex',
  alignItems: 'center',
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: alpha(theme.palette.common.white, 0.7),
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    paddingRight: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
  },
}));

// Styled component for rotating suggestions
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

// Styled right side icon buttons
const ActionIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.common.white,
  marginLeft: theme.spacing(1),
}));

// Predefined search suggestions
const SEARCH_SUGGESTIONS = [
  'Cars',
  'Music',
  'Places',
  'Food',
  'Travel',
  'Technology',
  'Sports',
  'Fashion',
  'Gaming',
  'Art',
  'Nature',
  'Comedy'
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
          (prevIndex + 1) % SEARCH_SUGGESTIONS.length
        );
        setIsAnimating(false);
      }, 300); // Half of the transition duration
    }, 2500); // Change every 2.5 seconds

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
        Search for {SEARCH_SUGGESTIONS[currentIndex]}...
      </SuggestionText>
    </RotatingSuggestions>
  );
};

const Header = () => {
  const { currentUser, logout, canUpload } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  // const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  
  const isMenuOpen = Boolean(anchorEl);
  const isMobileMenuOpen = Boolean(mobileMenuAnchorEl);

  // Check if we're in demo mode
  useEffect(() => {
    setIsDemo(location.pathname.startsWith('/demo'));
  }, [location.pathname]);

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

  // Handle search input change with hashtag highlighting
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

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
    if (canUpload) {
      navigate('/upload');
    } else {
      // Still navigate to upload route, but the UploadProtectedRoute will handle the restriction
      navigate('/upload');
    }
    handleMenuClose();
  };

  const handleGoToFeedback = () => {
    navigate('/feedback');
    handleMenuClose();
  };

  // Desktop menu with added waiting list option
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
            bgcolor: 'background.paper',
            transform: 'translateY(-50%) rotate(45deg)',
            zIndex: 0,
          },
        },
      }}
    >
      <MenuItem onClick={handleGoToProfile}>
        <ListItemIcon>
          <AccountCircleIcon fontSize="small" />
        </ListItemIcon>
        Profile
      </MenuItem>
      <MenuItem onClick={handleGoToSavedVideos}>
        <ListItemIcon>
          <BookmarkIcon fontSize="small" />
        </ListItemIcon>
        Saved Videos
      </MenuItem>
      <MenuItem onClick={handleGoToSettings}>
        <ListItemIcon>
          <SettingsIcon fontSize="small" />
        </ListItemIcon>
        Settings
      </MenuItem>
      <MenuItem onClick={handleGoToFeedback}>
        <ListItemIcon>
          <FeedbackIcon fontSize="small" />
        </ListItemIcon>
        Feedback
      </MenuItem>
      <Divider />
      <MenuItem onClick={handleLogout}>
        <ListItemIcon>
          <LogoutIcon fontSize="small" />
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
    >
      <MenuItem 
        onClick={handleGoToUpload}
        sx={{
          opacity: canUpload ? 1 : 0.5,
          '&:hover': {
            backgroundColor: canUpload ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 0, 0, 0.04)',
          }
        }}
      >
        <IconButton size="large" color="inherit">
          <VideoCallIcon />
        </IconButton>
        <p>{canUpload ? 'Upload' : 'Upload (Restricted)'}</p>
      </MenuItem>
      <MenuItem onClick={handleGoToFeedback}>
        <IconButton size="large" color="inherit">
          <FeedbackIcon />
        </IconButton>
        <p>Feedback</p>
      </MenuItem>
      <MenuItem onClick={handleGoToProfile}>
        <IconButton
          size="large"
          color="inherit"
        >
          <AccountCircleIcon />
        </IconButton>
        <p>Profile</p>
      </MenuItem>
    </Menu>
  );

  // Enhanced Search component with rotating suggestions
  const renderSearchBox = () => (
    <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', position: 'relative' }}>
      <Search>
        <form onSubmit={handleSearch} style={{ width: '100%', position: 'relative' }}>
          <SearchIconWrapper>
            <SearchIcon />
          </SearchIconWrapper>
          <StyledInputBase
            placeholder={searchQuery ? "" : "Search videos or #hashtags..."}
            inputProps={{ 'aria-label': 'search' }}
            value={searchQuery}
            onChange={handleSearchInputChange}
            sx={{
              '& .MuiInputBase-input': {
                backgroundColor: 'transparent',
              }
            }}
          />
          {/* Rotating suggestions - only show when search is empty */}
          <RotatingSuggestionsComponent isVisible={!searchQuery} />
          {searchQuery && (
            <IconButton 
              type="submit" 
              aria-label="search"
              sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
            >
              <SearchIcon />
            </IconButton>
          )}
        </form>
      </Search>
    </Box>
  );

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="sticky" color="default" sx={{ boxShadow: 'none', backgroundColor: 'black'}}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              sx={{ display: { xs: 'flex', md: 'none' }, mr: 1 }}
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
              onClick={() => {
                // Force refresh if coming from video/reels page
                if (isVideoPage(location.pathname)) {
                  navigateToHomeWithRefresh();
                } else {
                  navigate('/demo/');
                }
              }}
            >
              <Logo />
            </Box>
          </Box>
          
          {/* Insert the new search component here */}
          {renderSearchBox()}
          
          {/* Desktop Navigation Items */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
            <ActionIconButton
              size="large"
              color="inherit"
              onClick={handleGoToUpload}
              title={canUpload ? "Upload Video" : "Upload Restricted"}
              sx={{
                opacity: canUpload ? 1 : 0.5,
                '&:hover': {
                  backgroundColor: canUpload ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 0, 0, 0.1)',
                }
              }}
            >
              <VideoCallIcon />
            </ActionIconButton>
            
            <ActionIconButton
              size="large"
              color="inherit"
              onClick={handleGoToFeedback}
            >
              <FeedbackIcon />
            </ActionIconButton>
            
            <ActionIconButton
              size="large"
              edge="end"
              aria-label="account"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
            >
              {currentUser?.profile_picture ? (
                <Avatar 
                  src={currentUser.profile_picture} 
                  alt={currentUser.username}
                  sx={{ width: 32, height: 32 }}
                />
              ) : (
                <AccountCircleIcon />
              )}
            </ActionIconButton>
          </Box>
        </Toolbar>
      </AppBar>
      {/* Remove this spacer Toolbar */}
      {renderMobileMenu}
      {renderMenu}
    </Box>
  );
};

export default Header; 