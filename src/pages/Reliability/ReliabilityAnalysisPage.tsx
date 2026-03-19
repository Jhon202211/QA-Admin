import { Box, Card, CardContent, Divider, Grid, Stack, Typography } from '@mui/material';
import { useGetList } from 'react-admin';
import {
  RELIABILITY_COLORS,
  aggregateDowntimeByCause,
  aggregateIncidentsBySubsystem,
  computeAvailabilityByScope,
  computeReliabilityStats,
  formatMinutes,
  formatPercentage,
} from './reliabilityUtils';
import type { ReliabilityIncident } from './reliabilityUtils';

const RankedList = ({
  title,
  items,
  suffix,
}: {
  title: string;
  items: Array<{ name: string; value: number }>;
  suffix: string;
}) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        {title}
      </Typography>
      {items.length === 0 ? (
        <Typography color="text.secondary">No hay datos suficientes para este análisis.</Typography>
      ) : (
        <Stack spacing={1.5}>
          {items.slice(0, 6).map((item, index) => (
            <Box key={item.name}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {item.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.value} {suffix}
                </Typography>
              </Box>
              <Box sx={{ width: '100%', height: 8, bgcolor: '#EEE', borderRadius: 999 }}>
                <Box
                  sx={{
                    width: `${Math.max(8, (item.value / (items[0]?.value || 1)) * 100)}%`,
                    height: '100%',
                    borderRadius: 999,
                    bgcolor: RELIABILITY_COLORS[index % RELIABILITY_COLORS.length],
                  }}
                />
              </Box>
            </Box>
          ))}
        </Stack>
      )}
    </CardContent>
  </Card>
);

export const ReliabilityAnalysisPage = () => {
  const { data = [] } = useGetList<ReliabilityIncident>('system_incidents', {
    pagination: { page: 1, perPage: 1000 },
    sort: { field: 'date', order: 'DESC' },
  });

  const { monthlyIncidents, incidentCount } = computeReliabilityStats(data);
  const { controllableAvailability, externalAvailability, controllableDowntime, externalDowntime } = computeAvailabilityByScope(data);
  const downtimeByCause = aggregateDowntimeByCause(monthlyIncidents);
  const incidentsBySubsystem = aggregateIncidentsBySubsystem(monthlyIncidents);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 700, fontFamily: "'Ubuntu Sans', sans-serif" }}>
          Análisis de Reliability
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Separación entre reliability controlable y externa, con foco en causas y subsistemas afectados.
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Reliability controlable
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#2B2D42', mt: 2 }}>
                {formatPercentage(controllableAvailability)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Downtime atribuible a plataforma o infraestructura propia: {formatMinutes(controllableDowntime)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Reliability externo
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#2B2D42', mt: 2 }}>
                {formatPercentage(externalAvailability)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Downtime causado por dependencias, red o cliente: {formatMinutes(externalDowntime)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <RankedList title="Downtime por causa" items={downtimeByCause} suffix="min" />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <RankedList title="Subsistemas más afectados" items={incidentsBySubsystem} suffix="inc." />
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Recomendación operativa
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Para QA, el término más claro para el listado es <strong>Incidentes</strong>, porque permite registrar caídas, degradaciones,
            errores intermitentes y fallos de dependencias en una sola vista.
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              Incidentes del mes analizados: {incidentCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Submenú sugerido: Dashboard, Incidentes y Análisis.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Si más adelante quieren madurar esta sección, el siguiente paso natural sería añadir SLOs/SLAs y alertas.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};
