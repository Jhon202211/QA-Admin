import { Card, CardContent, Typography, Grid, Box, List, ListItem, ListItemText } from '@mui/material';
import { useGetList } from 'react-admin';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#4caf50', '#f44336'];

export const Dashboard = () => {
  const { data: testResults = [], total } = useGetList('test_results', {
    pagination: { page: 1, perPage: 100 },
    sort: { field: 'date', order: 'DESC' }
  });

  const passedTests = testResults.filter(test => test.status === 'passed').length;
  const failedTests = testResults.filter(test => test.status === 'failed').length;
  const successRate = total ? ((passedTests / total) * 100).toFixed(2) : '0';
  const avgDuration = testResults.length ? (testResults.reduce((acc, t) => acc + (t.duration || 0), 0) / testResults.length).toFixed(2) : '0';
  const recentTests = testResults.slice(0, 5);
  const recentErrors = testResults.filter(test => test.status === 'failed' && test.error).slice(0, 5);

  const pieData = [
    { name: 'Exitosas', value: passedTests },
    { name: 'Fallidas', value: failedTests }
  ];

  // Calcular tests por semana (últimas 3 semanas)
  const now = new Date();
  const weeks = [2, 1, 0].map(i => {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() - (i * 7));
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  });
  const weeklyData = weeks.map(({ start, end }) => {
    const count = testResults.filter(test => {
      const d = test.date ? new Date(test.date) : null;
      return d && d >= start && d <= end;
    }).length;
    return {
      semana: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
      ejecuciones: count
    };
  }).reverse();

  return (
    <div style={{ padding: '20px' }}>
      <Typography variant="h4" gutterBottom>
        Dashboard de Pruebas
      </Typography>
      <Grid container spacing={3}>
        {/* Fila 1: Gráfica de pastel y gráfica de línea */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Éxito vs Fallos
              </Typography>
              <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                <ResponsiveContainer width={400} height={300}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Ejecuciones por Semana (últimas 3)
              </Typography>
              <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={weeklyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="semana" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="ejecuciones" stroke="#1976d2" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {/* Fila 2: KPIs pequeñas */}
      <Box mt={3} display="flex" justifyContent="flex-start" alignItems="stretch" gap={2}>
        <Card sx={{ minWidth: 150, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              % Éxito
            </Typography>
            <Typography variant="h5" color="primary">
              {successRate}%
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 150, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Prom. Duración (s)
            </Typography>
            <Typography variant="h5">
              {avgDuration}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 150, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total de Pruebas
            </Typography>
            <Typography variant="h5">
              {total}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 150, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Exitosas
            </Typography>
            <Typography variant="h5" color="primary">
              {passedTests}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 150, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Fallidas
            </Typography>
            <Typography variant="h5" color="error">
              {failedTests}
            </Typography>
          </CardContent>
        </Card>
      </Box>
      {/* Lista de pruebas recientes */}
      <Box mt={4}>
        <Typography variant="h6">Pruebas Recientes</Typography>
        <List>
          {recentTests.map((test, idx) => (
            <ListItem key={idx} divider>
              <ListItemText
                primary={`${test.name || 'Sin nombre'} (${test.status})`}
                secondary={`Duración: ${test.duration || 0}s | Fecha: ${test.date ? new Date(test.date).toLocaleString() : 'Sin fecha'}`}
              />
            </ListItem>
          ))}
        </List>
      </Box>
      {/* Lista de errores recientes */}
      <Box mt={4}>
        <Typography variant="h6" color="error">Errores Recientes</Typography>
        <List>
          {recentErrors.length === 0 && <ListItem><ListItemText primary="Sin errores recientes" /></ListItem>}
          {recentErrors.map((test, idx) => (
            <ListItem key={idx} divider>
              <ListItemText
                primary={test.name || 'Sin nombre'}
                secondary={test.error}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    </div>
  );
}; 