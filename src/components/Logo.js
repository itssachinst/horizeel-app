import React from 'react';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const LogoWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0),
  cursor: 'pointer',
}));

const LogoImage = styled('img')(({ theme }) => ({
  height: '68px',
  width: 'auto',
  [theme.breakpoints.down('sm')]: {
    height: '24px',
  },
}));

const LogoText = styled(Typography)(({ theme }) => ({
  fontWeight: 800,
  letterSpacing: '0.5px',
  fontSize: '2.5rem',
  color: 'white',
  fontFamily: 'Roboto',
  [theme.breakpoints.down('sm')]: {
    fontSize: '1.2rem',
  },
}));

const Logo = ({ onClick }) => {
  return (
    <LogoWrapper onClick={onClick}>
      <LogoImage src="/logo512.png" alt="Horizeel Logo" />
      <LogoText fontFamily="Roboto-black">
        Horizeel
      </LogoText>
    </LogoWrapper>
  );
};

export default Logo; 