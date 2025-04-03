import React from 'react';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const LogoWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  cursor: 'pointer',
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
      <LogoText variant="h6">
        Horizeel
      </LogoText>
    </LogoWrapper>
  );
};

export default Logo; 