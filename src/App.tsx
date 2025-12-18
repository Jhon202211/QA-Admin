import { Admin, Resource, Layout, AppBar } from 'react-admin';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard/DashboardPage';
import { TestResultsList, TestResultShow, TestResultEdit } from './pages/TestResults/TestResultsPage';
import { authProvider } from './firebase/auth';
import { dataProvider } from './firebase/dataProvider';
import { Typography, Box, IconButton, useTheme } from '@mui/material';
import LoginPage from './pages/LoginPage';
import isotype from './assets/isotype white small.svg';
import { TestCasesPage, TestCaseCreate, TestCaseEdit } from './pages/TestCases/TestCasesPage';
import { TestPlanningPage, TestPlanningCreate, TestPlanningEdit } from './pages/TestPlanning/TestPlanningPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import './App.css';

import { useSidebarState } from 'react-admin';

import FactCheckIcon from '@mui/icons-material/FactCheck';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventNoteIcon from '@mui/icons-material/EventNote';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { AutomationRunnerPage, AutomationCaseCreate, AutomationCaseEdit } from './pages/AutomationRunner/AutomationRunnerPage';
import PlaywrightPage from './pages/AutomationRunner/PlaywrightPage';
import { useThemeMode } from './contexts/ThemeContext';

const CustomAppBar = (props: any) => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const { mode, toggleMode } = useThemeMode();
  const theme = useTheme();

  if (isLoginPage) {
    return null;
  }

  return (
    <AppBar {...props} color="primary" sx={{ backgroundColor: '#2B2D42', color: '#FFFFFF', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <img src={isotype} alt="QAScope Logo" style={{ height: '32px' }} />
          <Typography
            variant="h6"
            color="inherit"
            sx={{ 
              fontWeight: 600,
              fontSize: '1.25rem',
              ml: 1.5,
              fontFamily: 'Inter, sans-serif'
            }}
          >
            QAScope
          </Typography>
        </Box>
        <IconButton
          onClick={toggleMode}
          sx={{ color: '#FFFFFF' }}
          aria-label="toggle theme"
        >
          {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>
      </Box>
    </AppBar>
  );
};

const CustomLayout = (props: any) => {
  const [open] = useSidebarState();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  return (
    <Layout
      {...props}
      appBar={CustomAppBar}
      sx={{
        '& .RaSidebar-fixed': {
          position: 'fixed',
          height: 'calc(100vh - 64px)',
          backgroundColor: isDark ? '#1A1C2E' : '#F5F5F5',
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
          backgroundColor: isDark ? '#1A1C2E' : '#F5F5F5',
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
          color: isDark ? '#FFFFFF' : '#2B2D42',
          fontWeight: 500,
          '&:hover': {
            backgroundColor: 'rgba(255, 107, 53, 0.1)',
            color: '#FF6B35',
          },
          '&[aria-current="page"]': {
            color: '#FF6B35',
            fontWeight: 600,
            borderLeft: '3px solid #FF6B35',
            backgroundColor: 'rgba(255, 107, 53, 0.05)',
          },
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  if (isLoginPage) return null;
  return (
    <Box sx={{ 
      width: '100%', 
      textAlign: 'center', 
      py: 2, 
      color: isDark ? '#B0B0B0' : '#6B6B6B', 
      fontSize: 14, 
      background: 'transparent', 
      fontFamily: 'Inter, sans-serif' 
    }}>
      © 2025 QAScope - Suite de pruebas | v0.9
    </Box>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Admin
          authProvider={authProvider}
          dataProvider={dataProvider as any}
          layout={CustomLayout}
          loginPage={LoginPage}
          dashboard={Dashboard}
          requireAuth
        >
          <Resource name="test_results" list={TestResultsList} show={TestResultShow} edit={TestResultEdit} icon={FactCheckIcon} />
          <Resource name="test_cases" list={TestCasesPage} create={TestCaseCreate} edit={TestCaseEdit} icon={AssignmentIcon} />
          <Resource name="test_planning" list={TestPlanningPage} create={TestPlanningCreate} edit={TestPlanningEdit} icon={EventNoteIcon} />
          <Resource name="automation" list={AutomationRunnerPage} create={AutomationCaseCreate} edit={AutomationCaseEdit} icon={PlayCircleIcon} options={{ label: 'Automatización' }} />
          <Resource name="playwright" list={PlaywrightPage} icon={PlayCircleIcon} options={{ label: 'Playwright' }} />
        </Admin>
        <Footer />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
