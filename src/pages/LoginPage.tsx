import { useState } from 'react';
import { useLogin, useNotify } from 'react-admin';
import { Card, CardContent, TextField, Button, Typography, Box, InputAdornment, IconButton } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

export default function LoginPage() {
  const login = useLogin();
  const notify = useNotify();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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
    <Box minHeight="100vh" display="flex" flexDirection="column" alignItems="center" justifyContent="center" sx={{ background: 'radial-gradient(circle at 50% 30%, #23234a 0%, #181a32 100%)' }}>
      {/* Logo y marca */}
      <Box display="flex" flexDirection="column" alignItems="center" mb={4} mt={6}>
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="36" cy="36" r="28" fill="#fff" />
          <path d="M12 60L-4 76" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
          <path d="M26 36l8 8 16-16" stroke="#3CCF91" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <Typography variant="h2" sx={{ color: '#fff', fontWeight: 700, mt: 2, letterSpacing: 1 }}>
          QAScope
        </Typography>
      </Box>
      {/* Formulario */}
      <Card sx={{ minWidth: 350 }}>
        <CardContent>
          <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
            <LockIcon sx={{ fontSize: 48, color: '#4B3C9D' }} />
          </Box>
          <form onSubmit={handleSubmit}>
            <TextField
              label="Usuario"
              placeholder="Ingresa tu usuario"
              value={username}
              onChange={e => setUsername(e.target.value)}
              fullWidth
              margin="normal"
              autoFocus
              required
            />
            <TextField
              label="Contraseña"
              placeholder="Ingresa tu contraseña"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              fullWidth
              margin="normal"
              required
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
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 2, backgroundColor: '#4B3C9D' }}
              disabled={loading}
            >
              Iniciar sesión
            </Button>
          </form>
        </CardContent>
      </Card>
      {/* Pie de página */}
      <Box mt={6} mb={2}>
        <Typography variant="body2" align="center" sx={{ color: '#fff', opacity: 0.8 }}>
          © 2025 QAScope - Gestión de pruebas automatizadas
        </Typography>
      </Box>
    </Box>
  );
} 