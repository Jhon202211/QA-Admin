import { Card, CardContent, Typography, Grid, Box, Button } from '@mui/material';
import { Title, useGetList } from 'react-admin';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export const Dashboard = () => {
  const { data: testResults = [], total } = useGetList('test_results', {
    pagination: { page: 1, perPage: 100 },
    sort: { field: 'date', order: 'DESC' }
  });

  const passedTests = testResults.filter(test => test.status === 'passed').length;
  const failedTests = testResults.filter(test => test.status === 'failed').length;

  const pieData = [
    { name: 'Exitosas', value: passedTests },
    { name: 'Fallidas', value: failedTests }
  ];

  const COLORS = ['#4CAF50', '#f44336'];

  return (
    <Box>
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3
      }}>
        <Title title="Dashboard" />
        <Button
          variant="contained"
          sx={{
            bgcolor: '#4B3C9D',
            '&:hover': { bgcolor: '#3c2f7c' }
          }}
        >
          EXPORTAR A PDF
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Éxito vs Fallos
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ value, percent }) => `${value} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Typography variant="body2" sx={{ mt: 2 }}>
                Total de pruebas: {total} | Exitosas: {passedTests} | Fallidas: {failedTests}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Ejecuciones por rango de fecha
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" gutterBottom>
                      Fecha inicio
                    </Typography>
                    <input type="date" style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '4px' }} />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" gutterBottom>
                      Fecha fin
                    </Typography>
                    <input type="date" style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '4px' }} />
                  </Grid>
                </Grid>
                <Box sx={{ height: '230px', display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2 }}>
                  <Typography color="textSecondary">Gráfico de ejecuciones aquí.</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}; 