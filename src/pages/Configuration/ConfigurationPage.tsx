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
  Stack,
  useTheme,
  Tabs,
  Tab
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloudIcon from '@mui/icons-material/Cloud';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
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
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
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

      <Grid size={{ xs: 12 }}>
        <Card sx={{ backgroundColor: isDark ? '#2B2D42' : '#FFFFFF' }}>
          <CardContent>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AutoAwesomeIcon sx={{ color: '#FF6B35' }} />
              <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                Agente IA — QA Test Case Architect
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              Selecciona el proveedor LLM para la generación de casos de prueba con RAG (BM25).
              Las API keys se guardan localmente y nunca se comparten.
            </Typography>
            <Divider sx={{ mb: 3 }} />

            {/* Activar agente */}
            <FormControlLabel
              control={
                <Switch
                  checked={config.llmEnabled}
                  onChange={(e) =>
                    setConfig({ ...config, llmEnabled: e.target.checked, openaiEnabled: e.target.checked })
                  }
                />
              }
              label="Activar Agente IA"
              sx={{ mb: 3, display: 'block' }}
            />

            {/* Selector de proveedor */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
              {(
                [
                  { value: 'openai',       label: 'OpenAI',       color: '#10A37F', desc: 'GPT-4o · GPT-4o Mini' },
                  { value: 'ollama_cloud', label: 'Ollama Cloud',  color: '#FF6B35', desc: 'LLaMA · Qwen · Mistral' },
                  { value: 'deepseek',     label: 'DeepSeek',      color: '#4F94EF', desc: 'DeepSeek Chat · Reasoner' },
                ] as const
              ).map((p) => (
                <Card
                  key={p.value}
                  onClick={() => config.llmEnabled && setConfig({ ...config, llmProvider: p.value })}
                  sx={{
                    flex: '1 1 160px',
                    cursor: config.llmEnabled ? 'pointer' : 'default',
                    border: `2px solid ${config.llmProvider === p.value && config.llmEnabled ? p.color : 'transparent'}`,
                    backgroundColor:
                      config.llmProvider === p.value && config.llmEnabled
                        ? isDark ? '#1A1C2E' : '#F5F5F5'
                        : isDark ? '#1A1C2E' : '#FAFAFA',
                    opacity: config.llmEnabled ? 1 : 0.5,
                    transition: 'border-color 0.15s',
                    '&:hover': config.llmEnabled ? { borderColor: p.color } : {},
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
            </Box>

            {/* Campos dinámicos por proveedor */}
            {config.llmEnabled && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

                {/* ── OpenAI ── */}
                {config.llmProvider === 'openai' && (
                  <>
                    <TextField
                      fullWidth
                      type="password"
                      label="API Key de OpenAI"
                      value={config.openaiApiKey}
                      onChange={(e) => setConfig({ ...config, openaiApiKey: e.target.value })}
                      placeholder="sk-..."
                      helperText="Obtén tu API key en platform.openai.com/api-keys"
                    />
                    <FormControl fullWidth>
                      <InputLabel>Modelo</InputLabel>
                      <Select
                        value={config.openaiModel}
                        onChange={(e) => setConfig({ ...config, openaiModel: e.target.value })}
                        label="Modelo"
                      >
                        <MenuItem value="gpt-4o-mini">GPT-4o Mini — rápido y económico (recomendado)</MenuItem>
                        <MenuItem value="gpt-4o">GPT-4o — máxima capacidad</MenuItem>
                        <MenuItem value="gpt-4-turbo">GPT-4 Turbo</MenuItem>
                        <MenuItem value="gpt-3.5-turbo">GPT-3.5 Turbo — más económico</MenuItem>
                      </Select>
                    </FormControl>
                  </>
                )}

                {/* ── Ollama Cloud ── */}
                {config.llmProvider === 'ollama_cloud' && (
                  <>
                    <TextField
                      fullWidth
                      type="password"
                      label="API Key de Ollama"
                      value={config.ollamaApiKey}
                      onChange={(e) => setConfig({ ...config, ollamaApiKey: e.target.value })}
                      placeholder="ollama_..."
                      helperText="Obtén tu API key en ollama.com/settings/keys"
                    />
                    <TextField
                      fullWidth
                      label="Modelo"
                      value={config.ollamaModel}
                      onChange={(e) => setConfig({ ...config, ollamaModel: e.target.value })}
                      placeholder="llama3.2"
                      helperText="Escribe el nombre exacto del modelo. Ej: llama3.2, llama3.1, qwen2.5, mistral"
                    />
                    <TextField
                      fullWidth
                      label="URL base (opcional)"
                      value={config.ollamaBaseUrl}
                      onChange={(e) => setConfig({ ...config, ollamaBaseUrl: e.target.value })}
                      helperText="Por defecto: https://ollama.com/v1"
                    />
                  </>
                )}

                {/* ── DeepSeek ── */}
                {config.llmProvider === 'deepseek' && (
                  <>
                    <TextField
                      fullWidth
                      type="password"
                      label="API Key de DeepSeek"
                      value={config.deepseekApiKey}
                      onChange={(e) => setConfig({ ...config, deepseekApiKey: e.target.value })}
                      placeholder="sk-..."
                      helperText="Obtén tu API key en platform.deepseek.com"
                    />
                    <FormControl fullWidth>
                      <InputLabel>Modelo</InputLabel>
                      <Select
                        value={config.deepseekModel}
                        onChange={(e) => setConfig({ ...config, deepseekModel: e.target.value })}
                        label="Modelo"
                      >
                        <MenuItem value="deepseek-chat">DeepSeek Chat — generación estándar (recomendado)</MenuItem>
                        <MenuItem value="deepseek-reasoner">DeepSeek Reasoner — razonamiento avanzado (R1)</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      fullWidth
                      label="URL base (opcional)"
                      value={config.deepseekBaseUrl}
                      onChange={(e) => setConfig({ ...config, deepseekBaseUrl: e.target.value })}
                      helperText="Por defecto: https://api.deepseek.com/v1"
                    />
                  </>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* ── AWS S3 ── */}
      <Grid size={{ xs: 12 }}>
        <Card sx={{ backgroundColor: isDark ? '#2B2D42' : '#FFFFFF' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CloudIcon sx={{ color: '#FF9900' }} />
              <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                Almacenamiento de Evidencias — AWS S3
              </Typography>
              {config.awsS3Enabled && (
                <Chip label="activo" size="small" sx={{ backgroundColor: '#FF9900', color: '#fff', height: 20, fontSize: '0.65rem', ml: 1 }} />
              )}
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              Conecta un bucket de Amazon S3 para almacenar las imágenes y videos de evidencias de tus pruebas.
              Las credenciales se guardan localmente en el navegador.
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <FormControlLabel
              control={
                <Switch
                  checked={config.awsS3Enabled}
                  onChange={(e) => setConfig({ ...config, awsS3Enabled: e.target.checked })}
                />
              }
              label="Activar almacenamiento en AWS S3"
              sx={{ mb: 3, display: 'block' }}
            />

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 2,
                opacity: config.awsS3Enabled ? 1 : 0.45,
                pointerEvents: config.awsS3Enabled ? 'auto' : 'none',
              }}
            >
              <TextField
                fullWidth
                label="Access Key ID"
                value={config.awsAccessKeyId}
                onChange={(e) => setConfig({ ...config, awsAccessKeyId: e.target.value })}
                placeholder="AKIAIOSFODNN7EXAMPLE"
                helperText="Clave de acceso de tu usuario IAM"
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                fullWidth
                label="Secret Access Key"
                type={showSecretKey ? 'text' : 'password'}
                value={config.awsSecretAccessKey}
                onChange={(e) => setConfig({ ...config, awsSecretAccessKey: e.target.value })}
                placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                helperText="Clave secreta de tu usuario IAM"
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
                onChange={(e) => setConfig({ ...config, awsS3Bucket: e.target.value })}
                placeholder="mi-bucket-de-evidencias"
                helperText="Nombre exacto del bucket S3"
                InputLabelProps={{ shrink: true }}
              />

              <FormControl fullWidth>
                <InputLabel shrink>Región</InputLabel>
                <Select
                  value={config.awsRegion}
                  onChange={(e) => setConfig({ ...config, awsRegion: e.target.value })}
                  label="Región"
                  notched
                >
                  <MenuItem value="us-east-1">us-east-1 — EE.UU. Este (Norte de Virginia)</MenuItem>
                  <MenuItem value="us-east-2">us-east-2 — EE.UU. Este (Ohio)</MenuItem>
                  <MenuItem value="us-west-1">us-west-1 — EE.UU. Oeste (Norte de California)</MenuItem>
                  <MenuItem value="us-west-2">us-west-2 — EE.UU. Oeste (Oregón)</MenuItem>
                  <MenuItem value="sa-east-1">sa-east-1 — Sudamérica (São Paulo)</MenuItem>
                  <MenuItem value="eu-west-1">eu-west-1 — Europa (Irlanda)</MenuItem>
                  <MenuItem value="eu-central-1">eu-central-1 — Europa (Fráncfort)</MenuItem>
                  <MenuItem value="ap-southeast-1">ap-southeast-1 — Asia Pacífico (Singapur)</MenuItem>
                  <MenuItem value="ap-northeast-1">ap-northeast-1 — Asia Pacífico (Tokio)</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {config.awsS3Enabled && (!config.awsAccessKeyId || !config.awsSecretAccessKey || !config.awsS3Bucket) && (
              <Box sx={{ mt: 2, p: 1.5, borderRadius: 1.5, backgroundColor: 'rgba(255,153,0,0.08)', border: '1px solid rgba(255,153,0,0.3)' }}>
                <Typography variant="caption" sx={{ color: '#FF9900' }}>
                  ⚠ Completa los campos Access Key ID, Secret Access Key y Bucket Name para activar S3 como destino de evidencias.
                </Typography>
              </Box>
            )}

            {/* ── Instrucciones CORS ── */}
            {config.awsS3Enabled && (
              <Box sx={{ mt: 3 }}>
                <Alert
                  severity="warning"
                  icon={<InfoOutlinedIcon />}
                  sx={{ mb: 2, borderRadius: 2 }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Paso obligatorio: configura la política CORS en tu bucket S3
                  </Typography>
                  <Typography variant="body2">
                    Para que el navegador pueda subir archivos directamente a S3, debes añadir
                    la siguiente política CORS en tu bucket. Sin esto, todas las subidas
                    fallarán con error <strong>Access-Control-Allow-Origin</strong>.
                  </Typography>
                </Alert>

                <Accordion
                  disableGutters
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '8px !important',
                    '&:before': { display: 'none' },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    component="div"
                    sx={{ cursor: 'pointer' }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <CloudIcon sx={{ color: '#FF9900', fontSize: 18 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Ver política CORS requerida para el bucket
                      </Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    <Box
                      sx={{
                        position: 'relative',
                        backgroundColor: isDark ? '#0d1117' : '#f6f8fa',
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        borderRadius: '0 0 8px 8px',
                        p: 2,
                      }}
                    >
                      <Tooltip title="Copiar política CORS">
                        <IconButton
                          size="small"
                          onClick={() => {
                            navigator.clipboard.writeText(S3_CORS_POLICY);
                            notify('Política CORS copiada al portapapeles', { type: 'success' });
                          }}
                          sx={{ position: 'absolute', top: 8, right: 8, bgcolor: isDark ? '#2B2D42' : '#fff' }}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Typography
                        component="pre"
                        sx={{
                          fontFamily: "'Courier New', monospace",
                          fontSize: '0.75rem',
                          whiteSpace: 'pre',
                          overflowX: 'auto',
                          m: 0,
                          color: isDark ? '#e6edf3' : '#24292f',
                        }}
                      >
                        {S3_CORS_POLICY}
                      </Typography>
                    </Box>
                    <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        <strong>Cómo aplicarla:</strong> Ve a AWS Console → S3 → tu bucket →
                        pestaña <em>Permissions</em> → sección <em>Cross-origin resource sharing (CORS)</em>
                        → haz clic en <em>Edit</em> y pega el JSON anterior.
                      </Typography>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              </Box>
            )}
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

