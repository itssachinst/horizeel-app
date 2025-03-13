import React, { useState } from 'react';
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
  useTheme
} from '@mui/material';
import { 
  Search as SearchIcon, 
  VideoCall as VideoCallIcon, 
  Notifications as NotificationsIcon, 
  Logout as LogoutIcon, 
  Settings as SettingsIcon,
  AccountCircle as AccountCircleIcon,
  BookmarkBorder as BookmarkIcon,
  Menu as MenuIcon,
  Mic as MicIcon
} from '@mui/icons-material';
import { styled, alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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

// Styled right side icon buttons
const ActionIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.common.white,
  marginLeft: theme.spacing(1),
}));

const Header = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
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
    navigate('/upload');
    handleMenuClose();
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
      <MenuItem onClick={handleGoToUpload}>
        <IconButton size="large" color="inherit">
          <VideoCallIcon />
        </IconButton>
        <p>Upload</p>
      </MenuItem>
      <MenuItem>
        <IconButton
          size="large"
          color="inherit"
        >
          <Badge badgeContent={4} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
        <p>Notifications</p>
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

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="fixed" sx={{ backgroundColor: '#000', borderBottom: '1px solid #262626' }}>
        <Toolbar sx={{ justifyContent: 'space-between', height: 56 }}>
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Logo onClick={() => navigate('/')} />
          </Box>

          {/* Search Bar */}
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', maxWidth: 600, mx: 2 }}>
            <form onSubmit={handleSearch} style={{ width: '100%' }}>
              <Search>
                <SearchIconWrapper>
                  <SearchIcon />
                </SearchIconWrapper>
                <StyledInputBase
                  placeholder="Search videos..."
                  inputProps={{ 'aria-label': 'search' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  fullWidth
                />
                <IconButton 
                  sx={{ position: 'absolute', right: 8, color: 'white' }}
                  aria-label="voice search"
                >
                  <MicIcon />
                </IconButton>
              </Search>
            </form>
          </Box>

          {/* Desktop Navigation Items */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
            <ActionIconButton
              size="large"
              onClick={handleGoToUpload}
              aria-label="upload video"
            >
              <VideoCallIcon />
            </ActionIconButton>
            
            <ActionIconButton
              size="large"
              aria-label="show notifications"
            >
              <Badge badgeContent={4} color="error">
                <NotificationsIcon />
              </Badge>
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

          {/* Mobile Navigation Items */}
          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="show more"
              aria-haspopup="true"
              onClick={handleMobileMenuOpen}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      {/* Add spacer to prevent content from going under the AppBar */}
      <Toolbar />
      {renderMobileMenu}
      {renderMenu}
    </Box>
  );
};

export default Header; 