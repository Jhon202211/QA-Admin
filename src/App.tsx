import { Admin, Resource, Layout, AppBar } from 'react-admin';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard/DashboardPage';
import { TestResultsList, TestResultShow, TestResultEdit } from './pages/TestResults/TestResultsPage';
import { authProvider } from './firebase/auth';
import { dataProvider } from './firebase/dataProvider';
import { Typography, Box } from '@mui/material';
import LoginPage from './pages/LoginPage';
import isotype from './assets/isotype white small.svg';
import { TestCasesPage } from './pages/TestCases/TestCasesPage';
import { TestPlanningPage } from './pages/TestPlanning/TestPlanningPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import './App.css';

const CustomAppBar = (props: any) => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return null;
  }

  return (
    <AppBar {...props} color="primary" sx={{ backgroundColor: '#4B3C9D', color: '#FFFFFF' }}>
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <img src={isotype} alt="QAScope Logo" style={{ height: '32px' }} />
          <Typography
            variant="h6"
            color="inherit"
            sx={{ 
              fontWeight: 500,
              fontSize: '1.25rem',
              ml: 1.5
            }}
          >
            QAScope
          </Typography>
        </Box>
      </Box>
    </AppBar>
  );
};

const CustomLayout = (props: any) => (
  <Layout
    {...props}
    appBar={CustomAppBar}
    sx={{
      '& .RaSidebar-fixed': {
        position: 'fixed',
        height: 'calc(100vh - 64px)',
        backgroundColor: '#fff',
        borderRight: '1px solid #e0e0e0',
        left: 0,
        top: '64px',
        width: '240px',
      },
      '& .RaLayout-appFrame': {
        marginTop: '64px',
      },
      '& .RaLayout-contentWithSidebar': {
        marginLeft: '240px',
        padding: '24px 32px',
        backgroundColor: '#f5f5f5',
        minHeight: 'calc(100vh - 64px)',
      },
      '& .RaLayout-content': {
        padding: 0,
        backgroundColor: 'transparent',
      },
      '& .RaMenu-root': {
        marginTop: '12px',
      },
      '& .RaMenu-item': {
        padding: '8px 24px',
      },
      '& .RaListToolbar-root': {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
      }
    }}
  />
);

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Admin
          authProvider={authProvider}
          dataProvider={dataProvider}
          layout={CustomLayout}
          loginPage={LoginPage}
          dashboard={Dashboard}
          requireAuth
        >
          <Resource name="test_results" list={TestResultsList} show={TestResultShow} edit={TestResultEdit} />
          <Resource name="test_cases" list={TestCasesPage} />
          <Resource name="test_planning" list={TestPlanningPage} />
        </Admin>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
