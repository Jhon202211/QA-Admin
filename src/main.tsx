import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#4B3C9D',
    },
    secondary: {
      main: '#3CCF91',
    },
    success: {
      main: '#3CCF91',
    },
    error: {
      main: '#e53935',
    },
    background: {
      default: '#F2F2F7',
      paper: '#fff',
    },
    text: {
      primary: '#2B2D42',
      secondary: '#4B3C9D',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '@media (prefers-color-scheme: dark)': {
          body: {
            backgroundColor: '#23232a',
            color: '#fff',
          },
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
