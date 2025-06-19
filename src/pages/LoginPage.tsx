import { useState } from 'react';
import { useLogin, useNotify } from 'react-admin';
import { Card, CardContent, TextField, Button, Typography, Box, InputAdornment, IconButton } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import logo from '../assets/logo queo white small.svg';

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
      {/* Logo */}
      <Box 
        position="absolute"
        top={40}
        left={40}
        width="120px"
        height="120px"
      >
        <img src={logo} alt="QAScope Logo" style={{ width: '100%', height: '100%' }} />
      </Box>

      {/* Título */}
      <Typography variant="h2" sx={{ color: '#fff', fontWeight: 700, mb: 4, letterSpacing: 1 }}>
        QAScope
      </Typography>

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