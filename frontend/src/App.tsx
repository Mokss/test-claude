import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout.tsx';
import { ProtectedRoute } from './components/ProtectedRoute.tsx';
import { LoginPage } from './pages/auth/LoginPage.tsx';
import { RegisterPage } from './pages/auth/RegisterPage.tsx';
import { StudentTaskListPage } from './pages/student/TaskListPage.tsx';
import { StudentTaskDetailPage } from './pages/student/TaskDetailPage.tsx';
import { StudentSubmissionDetailPage } from './pages/student/SubmissionDetailPage.tsx';
import { TeacherTaskListPage } from './pages/teacher/TaskListPage.tsx';
import { TeacherTaskFormPage } from './pages/teacher/TaskFormPage.tsx';
import { TeacherStudentListPage } from './pages/teacher/StudentListPage.tsx';
import { TeacherStudentDetailPage } from './pages/teacher/StudentDetailPage.tsx';
import { TeacherSubmissionGradePage } from './pages/teacher/SubmissionGradePage.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute role="student" />}>
            <Route element={<Layout />}>
              <Route path="/student" element={<StudentTaskListPage />} />
              <Route path="/student/tasks/:id" element={<StudentTaskDetailPage />} />
              <Route path="/student/submissions/:id" element={<StudentSubmissionDetailPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute role="teacher" />}>
            <Route element={<Layout />}>
              <Route path="/teacher" element={<TeacherTaskListPage />} />
              <Route path="/teacher/tasks/:id" element={<TeacherTaskFormPage />} />
              <Route path="/teacher/students" element={<TeacherStudentListPage />} />
              <Route path="/teacher/students/:studentId" element={<TeacherStudentDetailPage />} />
              <Route path="/teacher/submissions/:id" element={<TeacherSubmissionGradePage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
