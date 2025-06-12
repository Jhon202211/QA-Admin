import { Card, CardContent, Typography, Grid } from '@mui/material';
import { useGetList } from 'react-admin';

export const Dashboard = () => {
  const { data: testResults, total } = useGetList('test_results', {
    pagination: { page: 1, perPage: 10 },
    sort: { field: 'date', order: 'DESC' }
  });

  const passedTests = testResults?.filter(test => test.status === 'passed').length || 0;
  const failedTests = testResults?.filter(test => test.status === 'failed').length || 0;

  return (
    <div style={{ padding: '20px' }}>
      <Typography variant="h4" gutterBottom>
        Dashboard de Pruebas
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total de Pruebas
              </Typography>
              <Typography variant="h5">
                {total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pruebas Exitosas
              </Typography>
              <Typography variant="h5" color="primary">
                {passedTests}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pruebas Fallidas
              </Typography>
              <Typography variant="h5" color="error">
                {failedTests}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
}; 