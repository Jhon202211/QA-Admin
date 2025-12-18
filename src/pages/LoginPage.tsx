import { useState } from 'react';
import { useLogin, useNotify } from 'react-admin';
import { TextField, Button, Typography, Box, InputAdornment, IconButton, Checkbox, FormControlLabel } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import isotype from '../assets/isotype white small.svg';

export default function LoginPage() {
  const login = useLogin();
  const notify = useNotify();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberUser, setRememberUser] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ username, password });
    } catch (error) {
      notify('Usuario o contraseña incorrectos', { type: 'error' });
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1,
        fontFamily: 'Inter, sans-serif',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
      }}
    >
      {/* Header superior */}
      <Box
        sx={{
          height: '64px',
          backgroundColor: '#2B2D42',
          display: 'flex',
          alignItems: 'center',
          padding: '0 40px',
          zIndex: 10
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <img src={isotype} alt="QAScope Logo" style={{ height: '32px', marginRight: '12px' }} />
          <Typography
            variant="h6"
            sx={{
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '1.25rem',
              fontFamily: 'Inter, sans-serif'
            }}
          >
            QAScope
          </Typography>
        </Box>
      </Box>

      {/* Contenedor principal centrado */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: '40px 20px'
        }}
      >
        {/* Cuadro blanco centrado */}
        <Box
          sx={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '60px 50px',
            width: '100%',
            maxWidth: '450px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}
        >
          <Typography
            variant="h4"
            sx={{
              color: '#2B2D42',
              fontWeight: 700,
              mb: 4,
              fontSize: '2rem',
              fontFamily: 'Inter, sans-serif',
              textAlign: 'center'
            }}
          >
            Accede con tu cuenta
          </Typography>

          <form onSubmit={handleSubmit}>
            <TextField
              label="Correo electrónico"
              placeholder="nombre@ejemplo.com"
              value={username}
              onChange={e => setUsername(e.target.value)}
              fullWidth
              margin="normal"
              autoFocus
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
                mb: 2
              }}
            />
            <TextField
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              fullWidth
              margin="normal"
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
                mb: 1
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(v => !v)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberUser}
                    onChange={e => setRememberUser(e.target.checked)}
                    sx={{
                      color: '#2B2D42',
                      '&.Mui-checked': {
                        color: '#FF6B35'
                      }
                    }}
                  />
                }
                label="Recordar usuario"
                sx={{ color: '#2B2D42', fontSize: '0.875rem' }}
              />
              <Typography
                sx={{
                  color: '#FF6B35',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }}
              >
                ¿Olvidaste tu contraseña?
              </Typography>
            </Box>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{
                mt: 2,
                mb: 3,
                backgroundColor: '#FF6B35',
                color: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                padding: '12px',
                borderRadius: '8px',
                '&:hover': {
                  backgroundColor: '#E55A2B'
                },
                '&:disabled': {
                  backgroundColor: '#FFB399'
                }
              }}
              disabled={loading}
            >
              Iniciar sesión
            </Button>
          </form>
        </Box>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          padding: '20px',
          textAlign: 'center',
          zIndex: 10
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: '#FFFFFF',
            fontSize: '0.875rem',
            fontFamily: 'Inter, sans-serif',
            opacity: 0.9
          }}
        >
          © 2025 QAScope - Suite de pruebas
        </Typography>
      </Box>
    </Box>
  );
} 