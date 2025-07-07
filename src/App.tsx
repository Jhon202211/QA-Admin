import { Admin, Resource, Layout, AppBar } from 'react-admin';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard/DashboardPage';
import { TestResultsList, TestResultShow, TestResultEdit } from './pages/TestResults/TestResultsPage';
import { authProvider } from './firebase/auth';
import { dataProvider } from './firebase/dataProvider';
import { Typography, Box } from '@mui/material';
import LoginPage from './pages/LoginPage';
import isotype from './assets/isotype white small.svg';
import { TestCasesPage, TestCaseCreate, TestCaseEdit } from './pages/TestCases/TestCasesPage';
import { TestPlanningPage, TestPlanningCreate, TestPlanningEdit } from './pages/TestPlanning/TestPlanningPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import './App.css';
import { useEffect } from 'react';
import { useSidebarState } from 'react-admin';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventNoteIcon from '@mui/icons-material/EventNote';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import { AutomationRunnerPage } from './pages/AutomationRunner/AutomationRunnerPage';
import { TestProvider } from './context/TestContext';

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

const CustomLayout = (props: any) => {
  const [open] = useSidebarState();
  return (
    <Layout
      {...props}
      appBar={CustomAppBar}
      sx={{
        '& .RaSidebar-fixed': {
          position: 'fixed',
          height: 'calc(100vh - 64px)',
          backgroundColor: '#f5f5f5',
          borderRight: 'none',
          left: 0,
          top: '64px',
          width: open ? '240px' : '0px',
          minWidth: 0,
          maxWidth: open ? '240px' : '0px',
          boxShadow: 'none',
          overflowX: 'hidden',
          transition: 'width 0.2s',
        },
        '& .RaLayout-appFrame': {
          marginTop: '64px',
        },
        '& .RaLayout-contentWithSidebar': {
          marginLeft: open ? '240px' : '0px',
          minHeight: 'calc(100vh - 64px)',
          width: open ? 'calc(100vw - 240px)' : '100vw',
          maxWidth: 'none',
          boxSizing: 'border-box',
          backgroundColor: '#f5f5f5',
          transition: 'margin-left 0.2s, width 0.2s',
        },
        '& .RaLayout-content': {
          padding: 0,
          backgroundColor: 'transparent',
          width: '100%',
          maxWidth: 'none',
          boxSizing: 'border-box',
        },
        '& .RaMenu-root': {
          marginTop: '24px',
        },
        '& .RaMenu-item': {
          padding: '12px 28px',
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
};

const Footer = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  if (isLoginPage) return null;
  return (
    <Box sx={{ width: '100%', textAlign: 'center', py: 2, color: '#888', fontSize: 14, background: 'transparent' }}>
      © 2025 QAScope - Gestión de pruebas automatizadas | v0.5
    </Box>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <TestProvider>
        <BrowserRouter>
          <Admin
            authProvider={authProvider}
            dataProvider={dataProvider}
            layout={CustomLayout}
            loginPage={LoginPage}
            dashboard={Dashboard}
            requireAuth
          >
            <Resource name="test_results" list={TestResultsList} show={TestResultShow} edit={TestResultEdit} icon={FactCheckIcon} />
            <Resource name="test_cases" list={TestCasesPage} create={TestCaseCreate} edit={TestCaseEdit} icon={AssignmentIcon} />
            <Resource name="test_planning" list={TestPlanningPage} create={TestPlanningCreate} edit={TestPlanningEdit} icon={EventNoteIcon} />
            <Resource name="automation" list={AutomationRunnerPage} icon={PlayCircleIcon} options={{ label: 'Automatización' }} />
          </Admin>
          <Footer />
        </BrowserRouter>
      </TestProvider>
    </ErrorBoundary>
  );
}

export default App;
