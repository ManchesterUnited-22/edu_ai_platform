import { Navigate, Route, Routes } from 'react-router-dom';
import Header from '../components/layout/Header.jsx';
import Sidebar from '../components/layout/Sidebar.jsx';
import LoginPage, { homeFor } from '../pages/auth/LoginPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';

// Phụ huynh
import AlertsPage from '../pages/parent/AlertsPage.jsx';
import ChildProgressPage from '../pages/parent/ChildProgressPage.jsx';
import LinkChildPage from '../pages/parent/LinkChildPage.jsx';
import ParentDashboard from '../pages/parent/ParentDashboard.jsx';

// Học sinh
import AskPage from '../pages/student/AskPage.jsx';
import MaterialsPage from '../pages/student/MaterialsPage.jsx';
import MyProgressPage from '../pages/student/MyProgressPage.jsx';
import OfficialQuizPage from '../pages/student/OfficialQuizPage.jsx';
import PracticeQuizPage from '../pages/student/PracticeQuizPage.jsx';
import ReviewSuggestionsPage from '../pages/student/ReviewSuggestionsPage.jsx';
import SocraticPage from '../pages/student/SocraticPage.jsx';
import StudentDashboard from '../pages/student/StudentDashboard.jsx';

// Giáo viên
import ClassDetailPage from '../pages/teacher/ClassDetailPage.jsx';
import ClassListPage from '../pages/teacher/ClassListPage.jsx';
import ClassReportPage from '../pages/teacher/ClassReportPage.jsx';
import DocumentUploadPage from '../pages/teacher/DocumentUploadPage.jsx';
import GenerateOutlinePage from '../pages/teacher/GenerateOutlinePage.jsx';
import GenerateQuestionsPage from '../pages/teacher/GenerateQuestionsPage.jsx';
import QuizManagePage from '../pages/teacher/QuizManagePage.jsx';
import TeacherDashboard from '../pages/teacher/TeacherDashboard.jsx';
import TopicManagePage from '../pages/teacher/TopicManagePage.jsx';
import WrongAnswerReportsPage from '../pages/teacher/WrongAnswerReportsPage.jsx';

import { useAuthStore } from '../store/authStore.js';
import ProtectedRoute from './ProtectedRoute.jsx';

function Home() {
  const user = useAuthStore((s) => s.user);
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />;
}

export default function AppRoutes() {
  const user = useAuthStore((s) => s.user);

  return (
    <>
      <Header />
      <div className={user ? 'shell' : ''}>
        {user && <Sidebar />}
        <main className={user ? 'container' : 'container-wide'}>
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
              <Route path="/student/materials" element={<MaterialsPage />} />
              <Route path="/student/ask" element={<AskPage />} />
              <Route path="/student/socratic" element={<SocraticPage />} />
              <Route path="/student/quizzes" element={<OfficialQuizPage />} />
              <Route path="/student/practice" element={<PracticeQuizPage />} />
              <Route path="/student/progress" element={<MyProgressPage />} />
              <Route path="/student/review" element={<ReviewSuggestionsPage />} />
            </Route>

            <Route element={<ProtectedRoute role="teacher" />}>
              <Route path="/teacher" element={<TeacherDashboard />} />
              <Route path="/teacher/topics" element={<TopicManagePage />} />
              <Route path="/teacher/classes" element={<ClassListPage />} />
              <Route path="/teacher/classes/:classId" element={<ClassDetailPage />} />
              <Route path="/teacher/classes/:classId/documents" element={<DocumentUploadPage />} />
              <Route path="/teacher/classes/:classId/outlines" element={<GenerateOutlinePage />} />
              <Route path="/teacher/classes/:classId/questions" element={<GenerateQuestionsPage />} />
              <Route path="/teacher/classes/:classId/quizzes" element={<QuizManagePage />} />
              <Route path="/teacher/classes/:classId/report" element={<ClassReportPage />} />
              <Route path="/teacher/classes/:classId/reports" element={<WrongAnswerReportsPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </>
  );
}