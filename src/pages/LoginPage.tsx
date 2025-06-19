import { useState } from 'react';
import { useLogin, useNotify } from 'react-admin';
import { Box, Button, Card, TextField, Typography } from '@mui/material';
import logo from '../assets/logo queo white small.svg';
import isotype from '../assets/isotype white small.svg';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();
  const notify = useNotify();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ username, password }).catch(() =>
      notify('Credenciales inválidas', { type: 'error' })
    );
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        minWidth: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4B3C9D',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <Box 
        sx={{ 
          maxWidth: '400px',
          width: '100%',
          padding: '0 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <Box sx={{ textAlign: 'center', marginBottom: 1 }}>
          <Typography
            variant="h4"
            sx={{
              color: 'white',
              fontWeight: 500,
              fontSize: '2.5rem',
              marginBottom: '4px'
            }}
          >
            QAScope
          </Typography>
          <Box sx={{ position: 'relative', textAlign: 'right', marginTop: '-8px' }}>
            <img src={logo} alt="Queo Logo" style={{ width: '80px' }} />
          </Box>
        </Box>

        <Card
          sx={{
            width: '100%',
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
          }}
        >
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <TextField
              label="Usuario"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
              variant="standard"
              fullWidth
              InputProps={{
                sx: { '&:before': { borderColor: 'rgba(0, 0, 0, 0.12)' } }
              }}
            />
            <TextField
              label="Contraseña"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              variant="standard"
              fullWidth
              InputProps={{
                sx: { '&:before': { borderColor: 'rgba(0, 0, 0, 0.12)' } }
              }}
            />
            <Button
              variant="contained"
              type="submit"
              fullWidth
              sx={{
                mt: 2,
                backgroundColor: '#4B3C9D',
                textTransform: 'none',
                py: 1,
                '&:hover': {
                  backgroundColor: '#3c2f7c',
                },
              }}
            >
              Iniciar sesión
            </Button>
          </Box>
        </Card>
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(255, 255, 255, 0.7)',
            textAlign: 'center',
            fontSize: '0.75rem',
            mt: 1
          }}
        >
          © 2023 QAScope - Gestión de pruebas automatizadas
        </Typography>
      </Box>
    </Box>
  );
};

export default LoginPage; 