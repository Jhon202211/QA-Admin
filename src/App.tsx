import { Admin, Resource, Layout, AppBar, CustomRoutes } from 'react-admin';
import { BrowserRouter, Route, useLocation } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard/DashboardPage';
import { ResultsViewPage } from './pages/TestResults/ResultsViewPage';
import { TestResultShow } from './pages/TestResults/TestResultsPage';
import { authProvider } from './firebase/auth';
import { dataProvider } from './firebase/dataProvider';
import { Typography, Box, useTheme, useMediaQuery } from '@mui/material';
import LoginPage from './pages/LoginPage';
import isotype from './assets/isotype white small.svg';
import { TestCasesPage, TestCaseCreate } from './pages/TestCases/TestCasesPage';
import { TestCaseEditPage } from './pages/TestCases/TestCaseEditPage';
import { TestPlanningPage, TestPlanningCreate, TestPlanningEdit } from './pages/TestPlanning/TestPlanningPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import './App.css';

import { useSidebarState } from 'react-admin';
import { useState, useEffect } from 'react';

import AssignmentIcon from '@mui/icons-material/Assignment';
import EventNoteIcon from '@mui/icons-material/EventNote';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import { AutomationRunnerPage, AutomationCaseCreate, AutomationCaseEdit } from './pages/AutomationRunner/AutomationRunnerPage';
import { ConfigurationPage } from './pages/Configuration/ConfigurationPage';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import { AppMenu } from './components/navigation/AppMenu';
import { DraftsListModal } from './components/navigation/DraftsListModal';
import { ReliabilityDashboardPage } from './pages/Reliability/ReliabilityDashboardPage';
import { ReliabilityAnalysisPage } from './pages/Reliability/ReliabilityAnalysisPage';
import { SystemIncidentCreate, SystemIncidentEdit, SystemIncidentsPage } from './pages/Reliability/SystemIncidentsPage';

const CustomAppBar = (props: any) => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

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
              fontFamily: "'Ubuntu Sans', sans-serif"
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
  const [open, setOpen] = useSidebarState();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [draftsModalOpen, setDraftsModalOpen] = useState(false);

  useEffect(() => {
    const handleLogoutCancelled = () => {
      setDraftsModalOpen(true);
    };
    window.addEventListener('logout-cancelled-with-drafts', handleLogoutCancelled);
    return () => window.removeEventListener('logout-cancelled-with-drafts', handleLogoutCancelled);
  }, []);

  return (
    <>
      {/* Overlay oscuro al abrir el sidebar en móvil */}
      {isMobile && open && (
        <Box
          onClick={() => setOpen(false)}
          sx={{
            position: 'fixed',
            inset: 0,
            bgcolor: 'rgba(0,0,0,0.45)',
            zIndex: 1199,
          }}
        />
      )}
      <Layout
        {...props}
        appBar={CustomAppBar}
        menu={AppMenu}
        sx={{
          // Spacer del DOM que empuja el contenido — debe coincidir con el ancho visual del sidebar
          '& .RaSidebar-root': {
            width: isMobile ? '0px' : (open ? '240px' : '0px'),
            minWidth: 0,
            flexShrink: 0,
            transition: 'width 0.25s ease',
          },
          // Panel visual del sidebar (fixed sobre el viewport)
          '& .RaSidebar-fixed': {
            position: 'fixed',
            height: '100vh',
            backgroundColor: isDark ? '#1A1C2E' : '#F5F5F5',
            borderRight: 'none',
            left: 0,
            top: 0,
            paddingTop: isMobile ? '56px' : '64px',
            width: open ? '240px' : '0px',
            minWidth: 0,
            maxWidth: open ? '240px' : '0px',
            boxShadow: open ? '4px 0 20px rgba(0,0,0,0.15)' : 'none',
            overflowX: 'hidden',
            overflowY: 'auto',
            transition: 'width 0.25s ease, max-width 0.25s ease',
            zIndex: isMobile ? 1200 : 'auto',
          },
          '& .RaLayout-appFrame': {
            marginTop: isMobile ? '56px' : '64px',
          },
          // Sin marginLeft extra — el spacer RaSidebar-root ya desplaza el contenido
          '& .RaLayout-contentWithSidebar': {
            marginLeft: 0,
            minHeight: isMobile ? 'calc(100vh - 56px)' : 'calc(100vh - 64px)',
            width: '100%',
            maxWidth: 'none',
            boxSizing: 'border-box',
            backgroundColor: isDark ? '#1A1C2E' : '#F5F5F5',
            transition: 'width 0.25s ease',
            display: 'flex',
          },
          '& .RaLayout-content': {
            padding: 0,
            paddingLeft: isMobile ? '4px' : '8px',
            backgroundColor: 'transparent',
            flex: 1,
            minWidth: 0,
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
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '16px',
          },
        }}
      />
      <DraftsListModal open={draftsModalOpen} onClose={() => setDraftsModalOpen(false)} />
    </>
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
      fontFamily: "'Ubuntu Sans', sans-serif" 
    }}>
      © 2026 QAScope - Suite de pruebas | v2.5.3
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
          <CustomRoutes>
            <Route path="/reliability/dashboard" element={<ReliabilityDashboardPage />} />
            <Route path="/reliability/analysis" element={<ReliabilityAnalysisPage />} />
          </CustomRoutes>
          <Resource name="test_cases" list={TestCasesPage} create={TestCaseCreate} edit={TestCaseEditPage} icon={AssignmentIcon} options={{ label: 'Pruebas manuales' }} />
          <Resource name="test_planning" list={TestPlanningPage} create={TestPlanningCreate} edit={TestPlanningEdit} icon={EventNoteIcon} />
          <Resource name="automation" list={AutomationRunnerPage} create={AutomationCaseCreate} edit={AutomationCaseEdit} icon={PlayCircleIcon} options={{ label: 'Automatización' }} />
          <Resource name="test_results" list={ResultsViewPage} show={TestResultShow} icon={AssessmentIcon} options={{ label: 'Vista de resultados' }} />
          <Resource
            name="system_incidents"
            list={SystemIncidentsPage}
            create={SystemIncidentCreate}
            edit={SystemIncidentEdit}
            icon={MonitorHeartIcon}
            options={{ label: 'Incidentes' }}
          />
          <Resource name="configuration" list={ConfigurationPage} icon={SettingsIcon} options={{ label: 'Configuración' }} />
        </Admin>
        <Footer />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
