import { useState } from 'react';
import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid2 as Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  useTheme,
  Tabs,
  Tab
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloudIcon from '@mui/icons-material/Cloud';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Alert from '@mui/material/Alert';
import { useNotify } from 'react-admin';

const S3_CORS_POLICY = `[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://TU_DOMINIO_DE_PRODUCCION.com"
    ],
    "ExposeHeaders": ["ETag", "x-amz-request-id"],
    "MaxAgeSeconds": 3000
  }
]`;

const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      <Box sx={{ pt: 3, display: value === index ? 'block' : 'none' }}>{children}</Box>
    </div>
  );
};

export const ConfigurationPage = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const notify = useNotify();
  const [tabValue, setTabValue] = useState(0);
  const [showSecretKey, setShowSecretKey] = useState(false);

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
    // AWS S3
    awsS3Enabled: false,
    awsAccessKeyId: '',
    awsSecretAccessKey: '',
    awsRegion: 'us-east-1',
    awsS3Bucket: '',
    
    // IA / LLM (multi-proveedor)
    llmEnabled: false,
    llmProvider: 'openai' as 'openai' | 'ollama_cloud' | 'deepseek',
    // OpenAI
    openaiEnabled: false,    // mantenido por compatibilidad
    openaiApiKey: '',
    openaiModel: 'gpt-4o-mini',
    // Ollama Cloud
    ollamaApiKey: '',
    ollamaModel: 'llama3.2',
    ollamaBaseUrl: 'https://ollama.com/v1',
    // DeepSeek
    deepseekApiKey: '',
    deepseekModel: 'deepseek-chat',
    deepseekBaseUrl: 'https://api.deepseek.com/v1',
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

  const handleConfigChange = (field: string, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const GeneralSettings = (
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
              onChange={(e) => handleConfigChange('appName', e.target.value)}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Idioma</InputLabel>
              <Select
                value={config.language}
                onChange={(e) => handleConfigChange('language', e.target.value)}
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
                onChange={(e) => handleConfigChange('timezone', e.target.value)}
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
                onChange={(e) => handleConfigChange('dateFormat', e.target.value)}
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
                  onChange={(e) => handleConfigChange('autoSaveTestResults', e.target.checked)}
                />
              }
              label="Guardar resultados automáticamente"
              sx={{ mb: 2, display: 'block' }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Prioridad por Defecto</InputLabel>
              <Select
                value={config.defaultTestPriority}
                onChange={(e) => handleConfigChange('defaultTestPriority', e.target.value)}
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
                onChange={(e) => handleConfigChange('defaultTestCategory', e.target.value)}
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
              onChange={(e) => handleConfigChange('maxTestDuration', parseInt(e.target.value) || 300)}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const NotificationSettings = (
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
                  onChange={(e) => handleConfigChange('emailNotifications', e.target.checked)}
                />
              }
              label="Activar notificaciones por email"
              sx={{ mb: 2, display: 'block' }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={config.notificationOnFailure}
                  onChange={(e) => handleConfigChange('notificationOnFailure', e.target.checked)}
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
                  onChange={(e) => handleConfigChange('notificationOnSuccess', e.target.checked)}
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
                  onChange={(e) => handleConfigChange('slackNotifications', e.target.checked)}
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

  const ReportSettings = (
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
                  onChange={(e) => handleConfigChange('autoGenerateReports', e.target.checked)}
                />
              }
              label="Generar reportes automáticamente"
              sx={{ mb: 2, display: 'block' }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Formato de Reporte</InputLabel>
              <Select
                value={config.reportFormat}
                onChange={(e) => handleConfigChange('reportFormat', e.target.value)}
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
                  onChange={(e) => handleConfigChange('includeScreenshots', e.target.checked)}
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

  const IntegrationSettings = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Grid container spacing={3}>
        {/* Fila 1: Jira y GitHub */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%', backgroundColor: isDark ? '#2B2D42' : '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                Integración con Jira
              </Typography>
              <Divider sx={{ my: 2 }} />
              <FormControlLabel
                control={
                  <Switch
                    checked={config.jiraIntegration}
                    onChange={(e) => handleConfigChange('jiraIntegration', e.target.checked)}
                  />
                }
                label="Activar integración con Jira"
                sx={{ mb: 2, display: 'block' }}
              />
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="URL de Jira"
                  value={config.jiraUrl}
                  onChange={(e) => handleConfigChange('jiraUrl', e.target.value)}
                  disabled={!config.jiraIntegration}
                  placeholder="https://tu-empresa.atlassian.net"
                />
                <TextField
                  fullWidth
                  label="Clave del Proyecto"
                  value={config.jiraProjectKey}
                  onChange={(e) => handleConfigChange('jiraProjectKey', e.target.value)}
                  disabled={!config.jiraIntegration}
                  placeholder="PROJ"
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%', backgroundColor: isDark ? '#2B2D42' : '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                Integración con GitHub
              </Typography>
              <Divider sx={{ my: 2 }} />
              <FormControlLabel
                control={
                  <Switch
                    checked={config.githubIntegration}
                    onChange={(e) => handleConfigChange('githubIntegration', e.target.checked)}
                  />
                }
                label="Activar integración con GitHub"
                sx={{ mb: 2, display: 'block' }}
              />
              <TextField
                fullWidth
                label="Repositorio de GitHub"
                value={config.githubRepo}
                onChange={(e) => handleConfigChange('githubRepo', e.target.value)}
                disabled={!config.githubIntegration}
                placeholder="usuario/repositorio"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Fila 2: Agente IA (Ancho completo) */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ backgroundColor: isDark ? '#2B2D42' : '#FFFFFF' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AutoAwesomeIcon sx={{ color: '#FF6B35' }} />
                  <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                    Agente IA — QA Test Case Architect
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.llmEnabled}
                      onChange={(e) => {
                        handleConfigChange('llmEnabled', e.target.checked);
                        handleConfigChange('openaiEnabled', e.target.checked);
                      }}
                    />
                  }
                  label="Activar Agente"
                  labelPlacement="start"
                />
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                Selecciona el proveedor LLM para la generación de casos de prueba con RAG (BM25).
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Stack spacing={1.5}>
                    {(
                      [
                        { value: 'openai',       label: 'OpenAI',       color: '#10A37F', desc: 'GPT-4o · GPT-4o Mini' },
                        { value: 'ollama_cloud', label: 'Ollama Cloud',  color: '#FF6B35', desc: 'LLaMA · Qwen · Mistral' },
                        { value: 'deepseek',     label: 'DeepSeek',      color: '#4F94EF', desc: 'DeepSeek Chat · Reasoner' },
                      ] as const
                    ).map((p) => (
                      <Card
                        key={p.value}
                        onClick={() => config.llmEnabled && handleConfigChange('llmProvider', p.value)}
                        sx={{
                          cursor: config.llmEnabled ? 'pointer' : 'default',
                          border: `2px solid ${config.llmProvider === p.value && config.llmEnabled ? p.color : 'transparent'}`,
                          backgroundColor:
                            config.llmProvider === p.value && config.llmEnabled
                              ? isDark ? '#1A1C2E' : '#F5F5F5'
                              : isDark ? '#1A1C2E' : '#FAFAFA',
                          opacity: config.llmEnabled ? 1 : 0.5,
                          transition: 'all 0.2s ease',
                          '&:hover': config.llmEnabled ? { borderColor: p.color, transform: 'translateY(-2px)' } : {},
                        }}
                      >
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                              {p.label}
                            </Typography>
                            {config.llmProvider === p.value && config.llmEnabled && (
                              <Chip label="activo" size="small" sx={{ backgroundColor: p.color, color: '#fff', height: 18, fontSize: '0.65rem' }} />
                            )}
                          </Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {p.desc}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 8 }}>
                  {config.llmEnabled ? (
                    <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', height: '100%' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {config.llmProvider === 'openai' && (
                          <>
                            <TextField
                              fullWidth
                              type="password"
                              label="API Key de OpenAI"
                              value={config.openaiApiKey}
                              onChange={(e) => handleConfigChange('openaiApiKey', e.target.value)}
                              placeholder="sk-..."
                              helperText="Obtén tu API key en platform.openai.com/api-keys"
                            />
                            <FormControl fullWidth>
                              <InputLabel>Modelo</InputLabel>
                              <Select
                                value={config.openaiModel}
                                onChange={(e) => handleConfigChange('openaiModel', e.target.value)}
                                label="Modelo"
                              >
                                <MenuItem value="gpt-4o-mini">GPT-4o Mini — rápido y económico</MenuItem>
                                <MenuItem value="gpt-4o">GPT-4o — máxima capacidad</MenuItem>
                                <MenuItem value="gpt-4-turbo">GPT-4 Turbo</MenuItem>
                              </Select>
                            </FormControl>
                          </>
                        )}

                        {config.llmProvider === 'ollama_cloud' && (
                          <>
                            <TextField
                              fullWidth
                              type="password"
                              label="API Key de Ollama"
                              value={config.ollamaApiKey}
                              onChange={(e) => handleConfigChange('ollamaApiKey', e.target.value)}
                              placeholder="ollama_..."
                            />
                            <TextField
                              fullWidth
                              label="Modelo"
                              value={config.ollamaModel}
                              onChange={(e) => handleConfigChange('ollamaModel', e.target.value)}
                              placeholder="llama3.2"
                            />
                            <TextField
                              fullWidth
                              label="URL base (opcional)"
                              value={config.ollamaBaseUrl}
                              onChange={(e) => handleConfigChange('ollamaBaseUrl', e.target.value)}
                            />
                          </>
                        )}

                        {config.llmProvider === 'deepseek' && (
                          <>
                            <TextField
                              fullWidth
                              type="password"
                              label="API Key de DeepSeek"
                              value={config.deepseekApiKey}
                              onChange={(e) => handleConfigChange('deepseekApiKey', e.target.value)}
                              placeholder="sk-..."
                            />
                            <FormControl fullWidth>
                              <InputLabel>Modelo</InputLabel>
                              <Select
                                value={config.deepseekModel}
                                onChange={(e) => handleConfigChange('deepseekModel', e.target.value)}
                                label="Modelo"
                              >
                                <MenuItem value="deepseek-chat">DeepSeek Chat</MenuItem>
                                <MenuItem value="deepseek-reasoner">DeepSeek Reasoner</MenuItem>
                              </Select>
                            </FormControl>
                          </>
                        )}
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed', borderColor: 'divider', borderRadius: 2, p: 4 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                        Activa el Agente IA para configurar el proveedor de lenguaje.
                      </Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Fila 3: AWS S3 (Ancho completo) */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ backgroundColor: isDark ? '#2B2D42' : '#FFFFFF' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CloudIcon sx={{ color: '#FF9900' }} />
                  <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                    Almacenamiento de Evidencias — AWS S3
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.awsS3Enabled}
                      onChange={(e) => handleConfigChange('awsS3Enabled', e.target.checked)}
                    />
                  }
                  label="Activar S3"
                  labelPlacement="start"
                />
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                Almacena imágenes y videos de evidencias en un bucket de Amazon S3.
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 8 }}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                      gap: 2,
                      opacity: config.awsS3Enabled ? 1 : 0.45,
                      pointerEvents: config.awsS3Enabled ? 'auto' : 'none',
                    }}
                  >
                    <TextField
                      fullWidth
                      label="Access Key ID"
                      value={config.awsAccessKeyId}
                      onChange={(e) => handleConfigChange('awsAccessKeyId', e.target.value)}
                      placeholder="AKIA..."
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      fullWidth
                      label="Secret Access Key"
                      type={showSecretKey ? 'text' : 'password'}
                      value={config.awsSecretAccessKey}
                      onChange={(e) => handleConfigChange('awsSecretAccessKey', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setShowSecretKey((v) => !v)} edge="end">
                              {showSecretKey ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                    <TextField
                      fullWidth
                      label="Bucket Name"
                      value={config.awsS3Bucket}
                      onChange={(e) => handleConfigChange('awsS3Bucket', e.target.value)}
                      placeholder="mi-bucket"
                      InputLabelProps={{ shrink: true }}
                    />
                    <FormControl fullWidth>
                      <InputLabel shrink>Región</InputLabel>
                      <Select
                        value={config.awsRegion}
                        onChange={(e) => handleConfigChange('awsRegion', e.target.value)}
                        label="Región"
                        notched
                      >
                        <MenuItem value="us-east-1">us-east-1 — Virginia</MenuItem>
                        <MenuItem value="us-east-2">us-east-2 — Ohio</MenuItem>
                        <MenuItem value="us-west-1">us-west-1 — California</MenuItem>
                        <MenuItem value="sa-east-1">sa-east-1 — Sudamérica (São Paulo)</MenuItem>
                        <MenuItem value="eu-west-1">eu-west-1 — Europa (Irlanda)</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  {config.awsS3Enabled && (
                    <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ borderRadius: 2, height: '100%' }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                        Configuración CORS
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                        Asegúrate de configurar la política CORS en tu bucket para permitir subidas directas.
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          navigator.clipboard.writeText(S3_CORS_POLICY);
                          notify('Política CORS copiada', { type: 'success' });
                        }}
                        startIcon={<ContentCopyIcon sx={{ fontSize: 14 }} />}
                        sx={{ fontSize: '0.65rem', textTransform: 'none' }}
                      >
                        Copiar Política
                      </Button>
                    </Alert>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ pt: { xs: '12px', sm: '20px' }, pr: { xs: '12px', sm: '20px' }, pb: { xs: '12px', sm: '20px' }, pl: 0 }}>
      <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 700, fontFamily: "'Ubuntu Sans', sans-serif", mb: 3 }}>
        Configuración
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="General" />
          <Tab label="Notificaciones" />
          <Tab label="Reportes" />
          <Tab label="Integraciones" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {GeneralSettings}
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        {NotificationSettings}
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        {ReportSettings}
      </TabPanel>
      <TabPanel value={tabValue} index={3}>
        {IntegrationSettings}
      </TabPanel>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          sx={{
            backgroundColor: '#FF6B35',
            color: '#FFFFFF',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { backgroundColor: '#E55A2B' },
          }}
        >
          Guardar Cambios
        </Button>
      </Box>
    </Box>
  );
};
