import { Card, CardContent, Typography, Grid, Box } from '@mui/material';
import { useGetList } from 'react-admin';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#FF6B35', '#3CCF91', '#2196F3', '#FF9800', '#9C27B0'];

export const ManualMetrics = () => {
  const { data: testCases = [] } = useGetList('test_cases', {
    pagination: { page: 1, perPage: 1000 },
  });

  // Calcular métricas
  const totalCases = testCases.length;
  const passedCases = testCases.filter(tc => tc.executionResult === 'passed').length;
  const failedCases = testCases.filter(tc => tc.executionResult === 'failed').length;
  const blockedCases = testCases.filter(tc => tc.executionResult === 'blocked').length;
  const notExecutedCases = testCases.filter(tc => !tc.executionResult || tc.executionResult === 'not_executed').length;
  
  const successRate = totalCases > 0 ? ((passedCases / totalCases) * 100).toFixed(2) : '0';
  
  // Agrupar por categoría
  const categoryData = ['Smoke', 'Funcionales', 'No Funcionales', 'Regresión', 'UAT'].map(category => {
    const cases = testCases.filter(tc => tc.category === category);
    return {
      name: category,
      total: cases.length,
      passed: cases.filter(tc => tc.executionResult === 'passed').length,
      failed: cases.filter(tc => tc.executionResult === 'failed').length,
    };
  });

  // Agrupar por proyecto
  const projectGroups = testCases.reduce((acc: any, tc: any) => {
    const project = tc.testProject || 'Sin proyecto';
    if (!acc[project]) {
      acc[project] = { total: 0, passed: 0, failed: 0 };
    }
    acc[project].total++;
    if (tc.executionResult === 'passed') acc[project].passed++;
    if (tc.executionResult === 'failed') acc[project].failed++;
    return acc;
  }, {});

  const projectData = Object.entries(projectGroups).map(([name, data]: [string, any]) => ({
    name,
    ...data
  }));

  const pieData = [
    { name: 'Aprobados', value: passedCases },
    { name: 'Fallidos', value: failedCases },
    { name: 'Bloqueados', value: blockedCases },
    { name: 'No Ejecutados', value: notExecutedCases },
  ];

  return (
    <>
      <Grid container spacing={3} width="100%">
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ minHeight: 400, width: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                Estado de Casos de Prueba
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ minHeight: 400, width: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                Casos por Categoría
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#FF6B35" name="Total" />
                  <Bar dataKey="passed" fill="#3CCF91" name="Aprobados" />
                  <Bar dataKey="failed" fill="#E53935" name="Fallidos" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box mt={3} display="flex" justifyContent="flex-start" alignItems="stretch" gap={2}>
        <Card sx={{ minWidth: 150, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom sx={{ color: 'text.primary', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>
              Total de Casos
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {totalCases}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 150, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom sx={{ color: 'text.primary', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>
              % Éxito
            </Typography>
            <Typography variant="h5" sx={{ color: '#3CCF91', fontWeight: 600 }}>
              {successRate}%
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 150, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom sx={{ color: 'text.primary', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>
              Aprobados
            </Typography>
            <Typography variant="h5" sx={{ color: '#3CCF91', fontWeight: 600 }}>
              {passedCases}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 150, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom sx={{ color: 'text.primary', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>
              Fallidos
            </Typography>
            <Typography variant="h5" sx={{ color: '#E53935', fontWeight: 600 }}>
              {failedCases}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 150, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom sx={{ color: 'text.primary', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>
              No Ejecutados
            </Typography>
            <Typography variant="h5" sx={{ color: '#6B6B6B', fontWeight: 600 }}>
              {notExecutedCases}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {projectData.length > 0 && (
        <Box mt={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                Casos por Proyecto
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={projectData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#FF6B35" name="Total" />
                  <Bar dataKey="passed" fill="#3CCF91" name="Aprobados" />
                  <Bar dataKey="failed" fill="#E53935" name="Fallidos" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>
      )}
    </>
  );
};

