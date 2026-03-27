import { Box, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import { useGetList } from 'react-admin';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  RELIABILITY_COLORS,
  aggregateDowntimeByCause,
  aggregateIncidentsByScope,
  computeReliabilityStats,
  formatMinutes,
  formatPercentage,
  getCauseTypeLabel,
  getControlScopeLabel,
  getSeverityLabel,
  parseIncidentDate,
} from './reliabilityUtils';
import type { ReliabilityIncident } from './reliabilityUtils';

const MetricCard = ({ title, value, helper }: { title: string; value: string; helper: string }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 700, color: '#2B2D42', mb: 1 }}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {helper}
      </Typography>
    </CardContent>
  </Card>
);

export const ReliabilityDashboardPage = () => {
  const { data = [], isLoading } = useGetList<ReliabilityIncident>('system_incidents', {
    pagination: { page: 1, perPage: 1000 },
    sort: { field: 'date', order: 'DESC' },
  });

  const { monthlyIncidents, availability, downtimeMinutes, incidentCount, mttr, mtbf } = computeReliabilityStats(data);
  const downtimeByCause = aggregateDowntimeByCause(monthlyIncidents);
  const incidentsByScope = aggregateIncidentsByScope(monthlyIncidents);
  const latestIncidents = [...monthlyIncidents]
    .sort((a, b) => (parseIncidentDate(b.date)?.getTime() ?? 0) - (parseIncidentDate(a.date)?.getTime() ?? 0))
    .slice(0, 5);

  return (
    <Box sx={{ pt: { xs: 1.5, sm: 3 }, pr: { xs: 1.5, sm: 3 }, pb: { xs: 1.5, sm: 3 }, pl: 0 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 700, fontFamily: "'Ubuntu Sans', sans-serif" }}>
          Reliability Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Vista mensual de disponibilidad, downtime e incidentes para el seguimiento operativo de QA.
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard title="Availability" value={formatPercentage(availability)} helper="Calculado sobre el mes actual" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard title="Downtime total" value={formatMinutes(downtimeMinutes)} helper="Suma de minutos caídos del mes" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard title="Incidentes" value={String(incidentCount)} helper="Eventos registrados este mes" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard title="MTTR / MTBF" value={`${formatMinutes(mttr)} / ${formatMinutes(mtbf)}`} helper="Recuperación y tiempo entre fallos" />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Downtime por causa
              </Typography>
              <Box sx={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={downtimeByCause}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `${value} min`} />
                    <Legend />
                    <Bar dataKey="value" name="Minutos">
                      {downtimeByCause.map((entry, index) => (
                        <Cell key={entry.name} fill={RELIABILITY_COLORS[index % RELIABILITY_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Incidentes por alcance
              </Typography>
              <Box sx={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={incidentsByScope} dataKey="value" nameKey="name" outerRadius={100} label>
                      {incidentsByScope.map((entry, index) => (
                        <Cell key={entry.name} fill={RELIABILITY_COLORS[index % RELIABILITY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Últimos incidentes del mes
          </Typography>
          {isLoading ? (
            <Typography color="text.secondary">Cargando incidentes...</Typography>
          ) : latestIncidents.length === 0 ? (
            <Typography color="text.secondary">
              No hay incidentes registrados este mes. Cuando se creen eventos en el registro, aparecerán aquí.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {latestIncidents.map((incident) => (
                <Box
                  key={incident.id}
                  sx={{
                    p: 2,
                    border: '1px solid #E0E0E0',
                    borderRadius: 2,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1.5,
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {incident.subsystem || incident.system || 'Sistema sin nombre'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {incident.description || 'Sin descripción'} · {formatMinutes(Number(incident.durationMin) || 0)}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip label={getCauseTypeLabel(incident.causeType)} size="small" />
                    <Chip label={getControlScopeLabel(incident.controlScope)} size="small" />
                    <Chip label={getSeverityLabel(incident.severity)} size="small" />
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
