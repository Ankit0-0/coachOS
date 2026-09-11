import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';
import { useAuth } from './lib/auth';
import { CoachDetail } from './pages/CoachDetail';
import { Coaches } from './pages/Coaches';
import { Login } from './pages/Login';
import { Plans } from './pages/Plans';

export default function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="page">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  // Only an admin session reaches the dashboard; everything else is the login
  // screen, including a signed-in coach or client whose token is perfectly
  // valid but useless here.
  if (!user) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/coaches" element={<Coaches />} />
          <Route path="/coaches/:id" element={<CoachDetail />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="*" element={<Navigate to="/coaches" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
