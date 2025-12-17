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

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1>Algo salió mal</h1>
          <p>{this.state.error?.message || 'Error desconocido'}</p>
          <button onClick={() => window.location.reload()}>Recargar página</button>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('No se encontró el elemento root');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
