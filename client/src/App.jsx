
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './Home'
import Register from './pages/Register'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import LearnCourse from './pages/learnCourses'
import CourseManagement from './pages/CourseManagement'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/courses/:courseId/learn" element={<LearnCourse />} />
        <Route path="/manage-courses" element={<CourseManagement />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
