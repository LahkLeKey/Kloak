import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DeploymentDetailPage } from './pages/DeploymentDetailPage';
import { DeploymentsPage } from './pages/DeploymentsPage';
import { RegisterAppPage } from './pages/RegisterAppPage';

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DeploymentsPage />} />
        <Route path="/deployments/:id" element={<DeploymentDetailPage />} />
        <Route path="/deployments/:id/apps/new" element={<RegisterAppPage />} />
      </Routes>
    </Layout>
  );
}
