import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/UI/TofuToast';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TaskManagement from './pages/TaskManagement';
import TaskItems from './pages/TaskItems';
import GroupManagement from './pages/GroupManagement';
import ClientData from './pages/ClientData';
import ClientAllocation from './pages/ClientAllocation';
import SOPWorkflow from './pages/SOPWorkflow';
import BillingData from './pages/BillingData';
import AnnualSchedule from './pages/AnnualSchedule';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="tasks" element={<TaskManagement />} />
        <Route path="items" element={<TaskItems />} />
        <Route path="groups" element={<GroupManagement />} />
        <Route path="clients" element={<ClientData />} />
        <Route path="allocation" element={<ClientAllocation />} />
        <Route path="sop" element={<SOPWorkflow />} />
        <Route path="billing" element={<BillingData />} />
        <Route path="schedule" element={<AnnualSchedule />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
