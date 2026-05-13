import { BrowserRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import AiTutor from './components/AiTutor'

// Pages — Public
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Topics from './pages/Topics'
import Videos from './pages/Videos'
import ExamList from './pages/ExamList'
import Documents from './pages/Documents'
import DocumentDetail from './pages/DocumentDetail'

// Pages — Student Protected
import PracticeRoom from './pages/PracticeRoom'
import ExamRoom from './pages/ExamRoom'
import ExamResult from './pages/ExamResult'
import Stats from './pages/Stats'

import TeacherLayout from './pages/teacher/TeacherLayout'
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import QuestionList from './pages/teacher/QuestionList'
import QuestionForm from './pages/teacher/QuestionForm'
import UploadPDF from './pages/teacher/UploadPDF'
import ExamManager from './pages/teacher/ExamManager'
import ExamQuestions from './pages/teacher/ExamQuestions'
import DocumentManager from './pages/teacher/DocumentManager'
import VideoManager from './pages/teacher/VideoManager'
import StudentManager from './pages/teacher/StudentManager'
import { TeacherStats } from './pages/teacher/TeacherPages'

// Layout chung: Navbar + content + Footer (ẩn footer trong exam-room)
function MainLayout() {
  const location = useLocation()
  // /exam-room/* không hiện Navbar và Footer
  const isExamRoom = location.pathname.startsWith('/exam-room')

  if (isExamRoom) {
    return <Outlet />
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
      {/* AI Tutor widget — tự ẩn trong exam-room và khi chưa đăng nhập */}
      <AiTutor />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Layout chính (Navbar + Footer) */}
          <Route element={<MainLayout />}>
            {/* Public */}
            <Route index element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/topics" element={<Topics />} />
            <Route path="/videos" element={<Videos />} />
            <Route path="/exams" element={<ExamList />} />
            <Route path="/documents" element={<Documents />} />

            {/* Student Protected */}
            <Route
              path="/documents/:id"
              element={
                <ProtectedRoute>
                  <DocumentDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/practice/:sessionId"
              element={
                <ProtectedRoute requiredRole="student">
                  <PracticeRoom />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exam-result/:attemptId"
              element={
                <ProtectedRoute requiredRole="student">
                  <ExamResult />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stats"
              element={
                <ProtectedRoute requiredRole="student">
                  <Stats />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* ExamRoom — full screen, không có Navbar/Footer */}
          <Route
            path="/exam-room/:examId"
            element={
              <ProtectedRoute requiredRole="student">
                <ExamRoom />
              </ProtectedRoute>
            }
          />

          <Route
            path="/teacher"
            element={
              <ProtectedRoute requiredRole="teacher">
                <TeacherLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<TeacherDashboard />} />
            <Route path="questions" element={<QuestionList />} />
            <Route path="questions/add" element={<QuestionForm />} />
            <Route path="questions/:id/edit" element={<QuestionForm />} />
            <Route path="questions/upload" element={<UploadPDF />} />
            <Route path="exams" element={<ExamManager />} />
            <Route path="exams/add" element={<ExamManager />} />
            <Route path="exams/:examId/questions" element={<ExamQuestions />} />
            <Route path="documents" element={<DocumentManager />} />
            <Route path="videos" element={<VideoManager />} />
            <Route path="videos/add" element={<VideoManager />} />
            <Route path="students" element={<StudentManager />} />
            <Route path="stats" element={<TeacherStats />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
