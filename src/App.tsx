import { Admin, Resource, Layout, AppBar, TitlePortal } from 'react-admin';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard/DashboardPage';
import { TestResultsList, TestResultShow, TestResultEdit } from './pages/TestResults/TestResultsPage';
import { authProvider } from './firebase/auth';
import { dataProvider } from './firebase/dataProvider';
import { Typography, Box } from '@mui/material';
import LoginPage from './pages/LoginPage';

const CustomAppBar = (props: any) => {
  // const location = useLocation();
  // const sectionTitle = getSectionTitle(location.pathname);
  return (
    <AppBar {...props} color="primary" sx={{ backgroundColor: '#4B3C9D', color: '#FFFFFF' }}>
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 12 }}>
          <circle cx="22" cy="22" r="14" fill="#FFFFFF" />
          <path d="M12 32L0 44" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
          <path d="M16 22l4 4 8-8" stroke="#3CCF91" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <Typography
          variant="h6"
          color="inherit"
          sx={{ fontWeight: 'bold', ml: 0, color: '#FFFFFF' }}
          component="span"
        >
          QAScope
        </Typography>
      </Box>
      {/* <TitlePortal /> */}
    </AppBar>
  );
};

const CustomLayout = (props: any) => <Layout {...props} appBar={CustomAppBar} />;

function App() {
  return (
    <BrowserRouter>
      <Admin
        authProvider={authProvider}
        dataProvider={dataProvider}
        dashboard={Dashboard}
        layout={CustomLayout}
        loginPage={LoginPage}
      >
        <Resource name="test_results" list={TestResultsList} show={TestResultShow} edit={TestResultEdit} />
      </Admin>
    </BrowserRouter>
  );
}

export default App;
