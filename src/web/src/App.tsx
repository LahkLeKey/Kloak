import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AccountPage } from './pages/AccountPage';
import { DeploymentCreationPage } from './pages/DeploymentCreationPage';
import { DeploymentDetailPage } from './pages/DeploymentDetailPage';
import { DeploymentsPage } from './pages/DeploymentsPage';
import { DocsPage } from './pages/DocsPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterAppPage } from './pages/RegisterAppPage';
import { SignupPage } from './pages/SignupPage';

export function App() {
    return (
        <Layout>
            <Routes>
                <Route path="/" element={<DeploymentsPage />} />
                <Route path="/docs" element={<DocsPage />} />
                <Route path="/deployments/new" element={<DeploymentCreationPage />} />
                <Route path="/deployments/:id" element={<DeploymentDetailPage />} />
                <Route path="/deployments/:id/apps/new" element={<RegisterAppPage />} />
                <Route path="/auth/login" element={<LoginPage />} />
                <Route path="/auth/signup" element={<SignupPage />} />
                <Route path="/account" element={<AccountPage />} />
            </Routes>
        </Layout>
    );
}
