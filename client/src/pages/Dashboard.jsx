
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Auth.css'

function Dashboard() {
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('learnsphereToken')
    const savedUser = localStorage.getItem('learnsphereUser')

    if (!token || !savedUser) {
      navigate('/login')
      return
    }

    try {
      setUser(JSON.parse(savedUser))
    } catch {
      localStorage.removeItem('learnsphereToken')
      localStorage.removeItem('learnsphereUser')
      navigate('/login')
      return
    }

    async function fetchEnrollments() {
      try {
        const response = await fetch(
          'http://localhost:5000/api/enrollments/my-courses',
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )

        const data = await response.json()

        if (response.status === 401) {
          localStorage.removeItem('learnsphereToken')
          localStorage.removeItem('learnsphereUser')
          navigate('/login')
          return
        }

        if (!response.ok) {
          throw new Error(
            data.message || 'Failed to load your enrolled courses.'
          )
        }

        setEnrollments(data)
      } catch (error) {
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchEnrollments()
  }, [navigate])

  function handleLogout() {
    localStorage.removeItem('learnsphereToken')
    localStorage.removeItem('learnsphereUser')
    navigate('/login')
  }

  const totalEnrolled = enrollments.length

  const completedCourses = enrollments.filter(
    enrollment => enrollment.completed
  ).length

  const averageProgress = totalEnrolled > 0
    ? Math.round(
        enrollments.reduce(
          (total, enrollment) => total + (enrollment.progress || 0),
          0
        ) / totalEnrolled
      )
    : 0

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <Link to="/" className="dashboard-logo">
          LearnSphere
        </Link>

        <nav className="dashboard-nav">
          <Link to="/">Home</Link>
          <Link to="/#courses">Browse Courses</Link>
          <button onClick={handleLogout} className="dashboard-logout">
            Logout
          </button>
        </nav>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-welcome">
          <div>
            <p className="dashboard-eyebrow">STUDENT DASHBOARD</p>
            <h1>
              Welcome back{user?.name ? `, ${user.name}` : ''}! 👋
            </h1>
            <p>Continue learning and keep making progress.</p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/#courses" className="dashboard-browse-button">
              Explore Courses →
            </Link>

            <Link to="/manage-courses" className="dashboard-browse-button">
              Manage Courses ⚙️
            </Link>
          </div>
        </section>

        <section className="dashboard-stats">
          <article className="dashboard-stat-card">
            <span className="dashboard-stat-icon">📚</span>
            <p>Enrolled Courses</p>
            <h2>{totalEnrolled}</h2>
          </article>

          <article className="dashboard-stat-card">
            <span className="dashboard-stat-icon">🏆</span>
            <p>Completed Courses</p>
            <h2>{completedCourses}</h2>
          </article>

          <article className="dashboard-stat-card">
            <span className="dashboard-stat-icon">📈</span>
            <p>Average Progress</p>
            <h2>{averageProgress}%</h2>
          </article>
        </section>

        <section className="dashboard-courses-section">
          <div className="dashboard-section-heading">
            <div>
              <h2>My Learning</h2>
              <p>Your enrolled courses and learning progress.</p>
            </div>
          </div>

          {loading && (
            <p className="dashboard-message">Loading your courses...</p>
          )}

          {!loading && error && (
            <div className="dashboard-message">
              <p>{error}</p>
              <button
                className="dashboard-browse-button"
                onClick={() => window.location.reload()}
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && enrollments.length === 0 && (
            <div className="dashboard-empty">
              <span>🎓</span>
              <h3>Ready to start learning?</h3>
              <p>
                You haven't enrolled in any courses yet.
                Explore our courses and start your learning journey!
              </p>
              <Link to="/#courses" className="dashboard-browse-button">
                Browse Courses
              </Link>
            </div>
          )}

          {!loading && !error && enrollments.length > 0 && (
            <div className="dashboard-course-grid">
              {enrollments.map(enrollment => {
                const course = enrollment.course

                if (!course) return null

                const progress = Math.min(
                  100,
                  Math.max(0, enrollment.progress || 0)
                )

                return (
                  <article
                    className="dashboard-course-card"
                    key={enrollment._id}
                  >
                    <div className="dashboard-course-top">
                      <span className="dashboard-course-category">
                        {course.category}
                      </span>

                      {enrollment.completed && (
                        <span className="dashboard-completed-badge">
                          Completed ✓
                        </span>
                      )}
                    </div>

                    <h3>{course.title}</h3>

                    <p className="dashboard-course-description">
                      {course.description}
                    </p>

                    <div className="dashboard-course-info">
                      <span>👨‍🏫 {course.instructor}</span>
                      <span>⏱️ {course.duration}</span>
                    </div>

                    <div className="dashboard-progress-info">
                      <span>Course Progress</span>
                      <strong>{progress}%</strong>
                    </div>

                    <div
                      className="dashboard-progress-track"
                      role="progressbar"
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${course.title} progress`}
                    >
                      <div
                        className="dashboard-progress-fill"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <p className="dashboard-enrolled-date">
                      Enrolled on{' '}
                      {enrollment.enrolledAt
                        ? new Date(enrollment.enrolledAt).toLocaleDateString()
                        : 'N/A'}
                    </p>

                    <Link
                      to={`/courses/${course._id}/learn`}
                      className="open-course-button"
                    >
                      {enrollment.completed
                        ? 'Review Course →'
                        : progress > 0
                          ? 'Continue Learning →'
                          : 'Open Course →'}
                    </Link>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="dashboard-footer">
        <p>© {new Date().getFullYear()} LearnSphere. Keep learning!</p>
      </footer>
    </div>
  )
}

export default Dashboard
