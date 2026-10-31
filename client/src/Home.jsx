
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './App.css'

function Home() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [messages, setMessages] = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchCourses() {
      try {
        const response = await fetch('http://localhost:5000/api/courses')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Failed to load courses')
        }

        setCourses(data)
      } catch {
        setError('Unable to load courses. Please check that the server is running.')
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [])

  async function handleEnroll(courseId) {
    const token = localStorage.getItem('learnsphereToken')

    if (!token) {
      navigate('/login')
      return
    }

    try {
      const response = await fetch('http://localhost:5000/api/enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ courseId })
      })

      const data = await response.json()

      if (response.status === 401) {
        localStorage.removeItem('learnsphereToken')
        localStorage.removeItem('learnsphereUser')
        navigate('/login')
        return
      }

      if (!response.ok) {
        setMessages(previous => ({
          ...previous,
          [courseId]: data.message || 'Unable to enroll in this course.'
        }))
        return
      }

      setMessages(previous => ({
        ...previous,
        [courseId]: 'Successfully enrolled! Visit your dashboard to start learning.'
      }))
    } catch {
      setMessages(previous => ({
        ...previous,
        [courseId]: 'Unable to connect to the server.'
      }))
    }
  }

  return (
    <div className="home-page">
      <header className="navbar">
        <Link to="/" className="logo">
          LearnSphere
        </Link>

        <nav className="nav-links">
          <a href="#home">Home</a>
          <a href="#courses">Courses</a>
          <a href="#about">About</a>
        </nav>

        <div className="nav-actions">
          <Link to="/verify-certificate" className="dashboard-browse-button">
            🏅 Verify Certificate
          </Link>

          <Link to="/manage-courses" className="dashboard-browse-button">
            Manage Courses ⚙️
          </Link>

          {localStorage.getItem('learnsphereToken') ? (
            <Link to="/dashboard" className="nav-button">
              My Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="nav-button">
                Sign In
              </Link>
              <Link to="/register" className="nav-button nav-button-primary">
                Get Started
              </Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <p className="hero-eyebrow">YOUR JOURNEY STARTS HERE</p>
            <h1>
              Learn New Skills.
              <br />
              <span>Build Your Future.</span>
            </h1>
            <p className="hero-description">
              Discover courses, learn at your own pace, and turn your
              curiosity into skills with LearnSphere.
            </p>

            <div className="hero-actions">
              <a href="#courses" className="hero-button">
                Explore Courses →
              </a>
              <Link to="/verify-certificate" className="hero-button hero-button-secondary">
                🏅 Verify Certificate
              </Link>
              <Link to="/manage-courses" className="hero-button hero-button-secondary">
                Manage Courses ⚙️
              </Link>
            </div>

            <div className="hero-stats">
              <div>
                <strong>{courses.length}+</strong>
                <span>Courses</span>
              </div>
              <div>
                <strong>Learn</strong>
                <span>At Your Pace</span>
              </div>
              <div>
                <strong>Anytime</strong>
                <span>Anywhere</span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-emoji">📚</div>
            <div className="floating-card floating-card-one">
              <span>✨</span> Keep Growing
            </div>
            <div className="floating-card floating-card-two">
              <span>🎯</span> Reach Your Goals
            </div>
          </div>
        </section>

        <section className="features-section">
          <div className="section-heading">
            <p className="section-eyebrow">WHY LEARNSPHERE?</p>
            <h2>A Better Way to Learn</h2>
            <p>Everything you need to keep moving forward.</p>
          </div>

          <div className="features-grid">
            <article className="feature-card">
              <span>🎓</span>
              <h3>Learn Your Way</h3>
              <p>Explore learning content at your own pace.</p>
            </article>
            <article className="feature-card">
              <span>📈</span>
              <h3>Track Progress</h3>
              <p>Follow your progress as you complete lessons.</p>
            </article>
            <article className="feature-card">
              <span>🌱</span>
              <h3>Grow Every Day</h3>
              <p>Build knowledge through consistent practice.</p>
            </article>
          </div>
        </section>

        <section className="courses-section" id="courses">
          <div className="section-heading">
            <p className="section-eyebrow">FIND YOUR NEXT SKILL</p>
            <h2>Explore Our Courses</h2>
            <p>Choose a course and begin your learning journey.</p>
          </div>

          {loading && <p className="status-message">Loading courses...</p>}

          {!loading && error && (
            <p className="status-message">{error}</p>
          )}

          {!loading && !error && courses.length === 0 && (
            <p className="status-message">
              No courses are available right now.
            </p>
          )}

          {!loading && !error && courses.length > 0 && (
            <div className="courses-grid">
              {courses.map(course => (
                <article className="course-card" key={course._id}>
                  <div className="course-card-icon">
                    {course.category?.toLowerCase().includes('ai')
                      ? '🤖'
                      : course.category?.toLowerCase().includes('python')
                        || course.title?.toLowerCase().includes('python')
                        ? '🐍'
                        : '💻'}
                  </div>

                  <p className="course-category">{course.category}</p>
                  <h3>{course.title}</h3>
                  <p className="course-description">{course.description}</p>

                  <div className="course-meta">
                    <span>👨‍🏫 {course.instructor}</span>
                    <span>⏱️ {course.duration}</span>
                  </div>

                  <div className="course-card-bottom">
                    <strong>
                      {course.price > 0 ? `₹${course.price}` : 'Free'}
                    </strong>
                    <button
                      className="enroll-button"
                      onClick={() => handleEnroll(course._id)}
                    >
                      Enroll Now →
                    </button>
                  </div>

                  {messages[course._id] && (
                    <p className="course-message" role="status">
                      {messages[course._id]}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}

          <div className="manage-courses-bottom">
            <p>Need to add or update learning content?</p>
            <Link to="/manage-courses" className="hero-button">
              Open Course Management ⚙️
            </Link>
          </div>
        </section>

        <section className="about-section" id="about">
          <div className="about-illustration">🌈</div>
          <div>
            <p className="section-eyebrow">ABOUT LEARNSPHERE</p>
            <h2>Your Learning Journey, All in One Place</h2>
            <p>
              LearnSphere is an online learning platform where students can
              discover courses, enroll, access lessons, and track their
              learning progress through a simple dashboard.
            </p>
            <Link to="/register" className="hero-button">
              Start Learning →
            </Link>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <Link to="/" className="logo">LearnSphere</Link>
        <p>Learn something new every day. 💗</p>
        <p>© {new Date().getFullYear()} LearnSphere. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default Home
