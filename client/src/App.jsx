import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Home from './Home'
import Register from './pages/Register'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import LearnCourse from './pages/learnCourses'
import CourseManagement from './pages/CourseManagement'
import QuizManagement from './pages/QuizManagement'
import StudentProgress from './pages/StudentProgress'
import CertificateVerification from './pages/CertificateVerification'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/register" element={<Register />} />

        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={<Dashboard />} />

        <Route
          path="/courses/:courseId/learn"
          element={<LearnCourse />}
        />

        <Route
          path="/manage-courses"
          element={<CourseManagement />}
        />

        <Route
          path="/manage-quizzes"
          element={<QuizManagement />}
        />

        <Route
          path="/my-progress"
          element={<StudentProgress />}
        />

        <Route
          path="/verify-certificate"
          element={<CertificateVerification />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App