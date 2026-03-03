import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PipelinePage = lazy(() => import('./pages/PipelinePage'));
const CompanyListPage = lazy(() => import('./pages/CompanyListPage'));
const CompanyDetailPage = lazy(() => import('./pages/CompanyDetailPage'));
const AufgabenPage = lazy(() => import('./pages/AufgabenPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" />;
}

const PageLoader = (
  <div className="flex items-center justify-center h-[calc(100vh-56px)]">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
  </div>
);

export default function App() {
  return (
    <Suspense fallback={PageLoader}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="pipeline" element={<PipelinePage />} />
          <Route path="companies" element={<CompanyListPage />} />
          <Route path="company/:id" element={<CompanyDetailPage />} />
          <Route path="aufgaben" element={<AufgabenPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="chat" element={<ChatPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Suspense>
  );
}
