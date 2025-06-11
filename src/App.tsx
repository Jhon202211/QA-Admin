import { Admin, Resource } from 'react-admin';
import { BrowserRouter } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard/DashboardPage';
import { TestResultsList } from './pages/TestResults/TestResultsPage';
import { authProvider } from './firebase/auth';
import { dataProvider } from './firebase/dataProvider';

function App() {
  return (
    <BrowserRouter>
      <Admin
        authProvider={authProvider}
        dataProvider={dataProvider}
        dashboard={Dashboard}
      >
        <Resource name="testResults" list={TestResultsList} />
      </Admin>
    </BrowserRouter>
  );
}

export default App;
