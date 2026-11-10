import { Navigate, Route, Routes } from 'react-router-dom';
import Header from '../components/layout/Header.jsx';
import AlertsPage from '../pages/parent/AlertsPage.jsx';
import ChildProgressPage from '../pages/parent/ChildProgressPage.jsx';
import LinkChildPage from '../pages/parent/LinkChildPage.jsx';
import ParentDashboard from '../pages/parent/ParentDashboard.jsx';
import LoginPage, { homeFor } from '../pages/auth/LoginPage.jsx';
import StudentDashboard from '../pages/student/StudentDashboard.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import { useAuthStore } from '../store/authStore.js';
import ProtectedRoute from './ProtectedRoute.jsx';

const Placeholder = ({ name }) => <div className="card">{name} (đang xây dựng)</div>;

function Home() {
  const user = useAuthStore((s) => s.user);
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />;
}

export default function AppRoutes() {
  return (
    <>
      <Header />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute role="parent" />}>
            <Route path="/parent" element={<ParentDashboard />} />
            <Route path="/parent/link" element={<LinkChildPage />} />
            <Route path="/parent/children/:studentId" element={<ChildProgressPage />} />
            <Route path="/parent/alerts" element={<AlertsPage />} />
          </Route>

          <Route element={<ProtectedRoute role="student" />}>
            <Route path="/student" element={<StudentDashboard />} />
          </Route>

          <Route element={<ProtectedRoute role="teacher" />}>
            <Route path="/teacher" element={<Placeholder name="Trang giáo viên" />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}