import { useState } from 'react';
import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  Tabs,
  Tab
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useNotify } from 'react-admin';

const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

export const ConfigurationPage = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const notify = useNotify();
  const [tabValue, setTabValue] = useState(0);

  // Estado de configuración (en producción esto vendría de un store o API)
  const [config, setConfig] = useState({
    // General
    appName: 'QAScope',
    language: 'es',
    timezone: 'America/Bogota',
    dateFormat: 'DD/MM/YYYY',
    
    // Notificaciones
    emailNotifications: true,
    slackNotifications: false,
    notificationOnFailure: true,
    notificationOnSuccess: false,
    
    // Pruebas
    autoSaveTestResults: true,
    defaultTestPriority: 'Media',
    defaultTestCategory: 'Funcionales',
    maxTestDuration: 300,
    
    // Reportes
    autoGenerateReports: false,
    reportFormat: 'PDF',
    includeScreenshots: true,
    
    // Integraciones
    jiraIntegration: false,
    jiraUrl: '',
    jiraProjectKey: '',
    githubIntegration: false,
    githubRepo: '',
    
    // IA / ChatGPT
    openaiEnabled: false,
    openaiApiKey: '',
    openaiModel: 'gpt-4o-mini',
  });

  const handleSave = () => {
    // Guardar configuración en localStorage
    localStorage.setItem('qaScopeConfig', JSON.stringify(config));
    notify('Configuración guardada exitosamente', { type: 'success' });
  };

  // Cargar configuración al iniciar
  React.useEffect(() => {
    const savedConfig = localStorage.getItem('qaScopeConfig');
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error('Error al cargar configuración:', e);
      }
    }
  }, []);

  const GeneralSettings = () => (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ backgroundColor: isDark ? '#2B2D42' : '#FFFFFF' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600 }}>
              Configuración General
            </Typography>
            <Divider sx={{ my: 2 }} />
            <TextField
              fullWidth
              label="Nombre de la Aplicación"
              value={config.appName}
              onChange={(e) => setConfig({ ...config, appName: e.target.value })}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Idioma</InputLabel>
              <Select
                value={config.language}
                onChange={(e) => setConfig({ ...config, language: e.target.value })}
                label="Idioma"
              >
                <MenuItem value="es">Español</MenuItem>
                <MenuItem value="en">English</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Zona Horaria</InputLabel>
              <Select
                value={config.timezone}
                onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
                label="Zona Horaria"
              >
                <MenuItem value="America/Bogota">Bogotá (GMT-5)</MenuItem>
                <MenuItem value="America/Mexico_City">Ciudad de México (GMT-6)</MenuItem>
                <MenuItem value="America/New_York">Nueva York (GMT-5)</MenuItem>
                <MenuItem value="UTC">UTC</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Formato de Fecha</InputLabel>
              <Select
                value={config.dateFormat}
                onChange={(e) => setConfig({ ...config, dateFormat: e.target.value })}
                label="Formato de Fecha"
              >
                <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
              </Select>
            </FormControl>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ backgroundColor: isDark ? '#2B2D42' : '#FFFFFF' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600 }}>
              Comportamiento de Pruebas
            </Typography>
            <Divider sx={{ my: 2 }} />
            <FormControlLabel
              control={
                <Switch
                  checked={config.autoSaveTestResults}
                  onChange={(e) => setConfig({ ...config, autoSaveTestResults: e.target.checked })}
                />
              }
              label="Guardar resultados automáticamente"
              sx={{ mb: 2, display: 'block' }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Prioridad por Defecto</InputLabel>
              <Select
                value={config.defaultTestPriority}
                onChange={(e) => setConfig({ ...config, defaultTestPriority: e.target.value })}
                label="Prioridad por Defecto"
              >
                <MenuItem value="Alta">Alta</MenuItem>
                <MenuItem value="Media">Media</MenuItem>
                <MenuItem value="Baja">Baja</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Categoría por Defecto</InputLabel>
              <Select
                value={config.defaultTestCategory}
                onChange={(e) => setConfig({ ...config, defaultTestCategory: e.target.value })}
                label="Categoría por Defecto"
              >
                <MenuItem value="Smoke">Smoke</MenuItem>
                <MenuItem value="Funcionales">Funcionales</MenuItem>
                <MenuItem value="No Funcionales">No Funcionales</MenuItem>
                <MenuItem value="Regresión">Regresión</MenuItem>
                <MenuItem value="UAT">UAT</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              type="number"
              label="Duración Máxima de Prueba (segundos)"
              value={config.maxTestDuration}
              onChange={(e) => setConfig({ ...config, maxTestDuration: parseInt(e.target.value) || 300 })}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const NotificationSettings = () => (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ backgroundColor: isDark ? '#2B2D42' : '#FFFFFF' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600 }}>
              Notificaciones por Email
            </Typography>
            <Divider sx={{ my: 2 }} />
            <FormControlLabel
              control={
                <Switch
                  checked={config.emailNotifications}
                  onChange={(e) => setConfig({ ...config, emailNotifications: e.target.checked })}
                />
              }
              label="Activar notificaciones por email"
              sx={{ mb: 2, display: 'block' }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={config.notificationOnFailure}
                  onChange={(e) => setConfig({ ...config, notificationOnFailure: e.target.checked })}
                  disabled={!config.emailNotifications}
                />
              }
              label="Notificar cuando una prueba falle"
              sx={{ mb: 2, display: 'block' }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={config.notificationOnSuccess}
                  onChange={(e) => setConfig({ ...config, notificationOnSuccess: e.target.checked })}
                  disabled={!config.emailNotifications}
                />
              }
              label="Notificar cuando una prueba pase"
              sx={{ display: 'block' }}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ backgroundColor: isDark ? '#2B2D42' : '#FFFFFF' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600 }}>
              Notificaciones por Slack
            </Typography>
            <Divider sx={{ my: 2 }} />
            <FormControlLabel
              control={
                <Switch
                  checked={config.slackNotifications}
                  onChange={(e) => setConfig({ ...config, slackNotifications: e.target.checked })}
                />
              }
              label="Activar notificaciones por Slack"
              sx={{ display: 'block' }}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const ReportSettings = () => (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ backgroundColor: isDark ? '#2B2D42' : '#FFFFFF' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600 }}>
              Configuración de Reportes
            </Typography>
            <Divider sx={{ my: 2 }} />
            <FormControlLabel
              control={
                <Switch
                  checked={config.autoGenerateReports}
                  onChange={(e) => setConfig({ ...config, autoGenerateReports: e.target.checked })}
                />
              }
              label="Generar reportes automáticamente"
              sx={{ mb: 2, display: 'block' }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Formato de Reporte</InputLabel>
              <Select
                value={config.reportFormat}
                onChange={(e) => setConfig({ ...config, reportFormat: e.target.value })}
                label="Formato de Reporte"
              >
                <MenuItem value="PDF">PDF</MenuItem>
                <MenuItem value="Excel">Excel</MenuItem>
                <MenuItem value="HTML">HTML</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={config.includeScreenshots}
                  onChange={(e) => setConfig({ ...config, includeScreenshots: e.target.checked })}
                />
              }
              label="Incluir capturas de pantalla en reportes"
              sx={{ display: 'block' }}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const IntegrationSettings = () => (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ backgroundColor: isDark ? '#2B2D42' : '#FFFFFF' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600 }}>
              Integración con Jira
            </Typography>
            <Divider sx={{ my: 2 }} />
            <FormControlLabel
              control={
                <Switch
                  checked={config.jiraIntegration}
                  onChange={(e) => setConfig({ ...config, jiraIntegration: e.target.checked })}
                />
              }
              label="Activar integración con Jira"
              sx={{ mb: 2, display: 'block' }}
            />
            <TextField
              fullWidth
              label="URL de Jira"
              value={config.jiraUrl}
              onChange={(e) => setConfig({ ...config, jiraUrl: e.target.value })}
              disabled={!config.jiraIntegration}
              sx={{ mb: 2 }}
              placeholder="https://tu-empresa.atlassian.net"
            />
            <TextField
              fullWidth
              label="Clave del Proyecto"
              value={config.jiraProjectKey}
              onChange={(e) => setConfig({ ...config, jiraProjectKey: e.target.value })}
              disabled={!config.jiraIntegration}
              placeholder="PROJ"
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ backgroundColor: isDark ? '#2B2D42' : '#FFFFFF' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600 }}>
              Integración con ChatGPT (OpenAI)
            </Typography>
            <Divider sx={{ my: 2 }} />
            <FormControlLabel
              control={
                <Switch
                  checked={config.openaiEnabled}
                  onChange={(e) => setConfig({ ...config, openaiEnabled: e.target.checked })}
                />
              }
              label="Activar Agente IA con ChatGPT"
              sx={{ mb: 2, display: 'block' }}
            />
            <TextField
              fullWidth
              type="password"
              label="API Key de OpenAI"
              value={config.openaiApiKey}
              onChange={(e) => setConfig({ ...config, openaiApiKey: e.target.value })}
              disabled={!config.openaiEnabled}
              sx={{ mb: 2 }}
              placeholder="sk-..."
              helperText="Tu API key se guarda localmente y nunca se comparte"
            />
            <FormControl fullWidth>
              <InputLabel>Modelo de OpenAI</InputLabel>
              <Select
                value={config.openaiModel}
                onChange={(e) => setConfig({ ...config, openaiModel: e.target.value })}
                label="Modelo de OpenAI"
                disabled={!config.openaiEnabled}
              >
                <MenuItem value="gpt-4o-mini">GPT-4o Mini (Recomendado)</MenuItem>
                <MenuItem value="gpt-4o">GPT-4o</MenuItem>
                <MenuItem value="gpt-4-turbo">GPT-4 Turbo</MenuItem>
                <MenuItem value="gpt-3.5-turbo">GPT-3.5 Turbo</MenuItem>
              </Select>
            </FormControl>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ backgroundColor: isDark ? '#2B2D42' : '#FFFFFF' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600 }}>
              Integración con GitHub
            </Typography>
            <Divider sx={{ my: 2 }} />
            <FormControlLabel
              control={
                <Switch
                  checked={config.githubIntegration}
                  onChange={(e) => setConfig({ ...config, githubIntegration: e.target.checked })}
                />
              }
              label="Activar integración con GitHub"
              sx={{ mb: 2, display: 'block' }}
            />
            <TextField
              fullWidth
              label="Repositorio de GitHub"
              value={config.githubRepo}
              onChange={(e) => setConfig({ ...config, githubRepo: e.target.value })}
              disabled={!config.githubIntegration}
              placeholder="usuario/repositorio"
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Box sx={{ padding: '20px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
          Configuración
        </Typography>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          sx={{
            backgroundColor: '#FF6B35',
            color: '#FFFFFF',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': {
              backgroundColor: '#E55A2B'
            }
          }}
        >
          Guardar Cambios
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="General" />
          <Tab label="Notificaciones" />
          <Tab label="Reportes" />
          <Tab label="Integraciones" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <GeneralSettings />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <NotificationSettings />
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        <ReportSettings />
      </TabPanel>
      <TabPanel value={tabValue} index={3}>
        <IntegrationSettings />
      </TabPanel>
    </Box>
  );
};

