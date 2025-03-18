import React from 'react';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const LogoWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  cursor: 'pointer',
}));

const LogoCircle = styled(Box)(({ theme }) => ({
  width: 36,
  height: 36,
  borderRadius: '50%',
  backgroundColor: '#00c853',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    width: 4,
    height: 14,
    backgroundColor: '#000',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 1,
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    width: 14,
    height: 4,
    backgroundColor: '#000',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 1,
  }
}));

const LogoText = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  letterSpacing: '-0.5px',
  fontSize: '1.5rem',
  color: 'white',
  marginLeft: theme.spacing(1),
  [theme.breakpoints.down('sm')]: {
    fontSize: '1.2rem',
  },
}));

const Logo = ({ onClick }) => {
  return (
    <LogoWrapper onClick={onClick}>
      <LogoCircle />
      <LogoText variant="h6">
        Horizontal Reel
      </LogoText>
    </LogoWrapper>
  );
};

export default Logo; 