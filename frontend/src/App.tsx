import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { AdminRoute, ProtectedRoute } from './auth/ProtectedRoute';
import { LoginPage } from './pages/Login/LoginPage';
import { RegisterPage } from './pages/Register/RegisterPage';
import { RoomPage } from './pages/Room/RoomPage';
import { AdminPage } from './pages/Admin/AdminPage';
import { TesterPage } from './pages/Tester/TesterPage';
import { JsonComparePage } from './pages/JsonCompare/JsonComparePage';
import { DocsPage } from './pages/Docs/DocsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<Layout />}>
        <Route path="/docs" element={<DocsPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<RoomPage />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/tester" element={<TesterPage />} />
          <Route path="/json-compare" element={<JsonComparePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
