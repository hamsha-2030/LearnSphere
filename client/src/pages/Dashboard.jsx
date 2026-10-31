
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Auth.css'

function Dashboard() {
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [enrollments, setEnrollments] = useState([])
  const [adminCourses, setAdminCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profileMessage, setProfileMessage] = useState('')

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    const token = localStorage.getItem('learnsphereToken')
    const savedUser = localStorage.getItem('learnsphereUser')

    if (!token || !savedUser) {
      navigate('/login')
      return
    }

    let loggedInUser

    try {
      loggedInUser = JSON.parse(savedUser)
      setUser(loggedInUser)
    } catch {
      localStorage.removeItem('learnsphereToken')
      localStorage.removeItem('learnsphereUser')
      navigate('/login')
      return
    }

    const admin = loggedInUser.role === 'admin'

    async function fetchProfile() {
      try {
        const response = await fetch(
          'http://localhost:5000/api/profile',
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )

        const data = await response.json()

        if (response.status === 401) {
          handleSessionExpired()
          return
        }

        if (!response.ok) {
          throw new Error(data.message || 'Failed to load profile.')
        }

        setProfile(data.user)
        setUser(data.user)

        const currentUser = JSON.parse(
          localStorage.getItem('learnsphereUser') || '{}'
        )

        localStorage.setItem(
          'learnsphereUser',
          JSON.stringify({
            ...currentUser,
            id: data.user._id,
            name: data.user.name,
            email: data.user.email,
            role: data.user.role
          })
        )
      } catch (error) {
        setProfileError(error.message)
      } finally {
        setProfileLoading(false)
      }
    }

    async function fetchCourses() {
      try {
        const url = admin
          ? 'http://localhost:5000/api/courses'
          : 'http://localhost:5000/api/enrollments/my-courses'

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        const data = await response.json()

        if (response.status === 401) {
          handleSessionExpired()
          return
        }

        if (!response.ok) {
          throw new Error(data.message || 'Failed to load courses.')
        }

        if (admin) {
          setAdminCourses(Array.isArray(data) ? data : [])
        } else {
          setEnrollments(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
    fetchCourses()
  }, [navigate])

  function handleSessionExpired() {
    localStorage.removeItem('learnsphereToken')
    localStorage.removeItem('learnsphereUser')
    navigate('/login')
  }

  function handleLogout() {
    localStorage.removeItem('learnsphereToken')
    localStorage.removeItem('learnsphereUser')
    navigate('/login')
  }

  function handleProfileChange(event) {
    const { name, value } = event.target

    setProfile(previous => ({
      ...previous,
      [name]: value
    }))
  }

  async function handleCancelEdit() {
    const token = localStorage.getItem('learnsphereToken')

    setEditing(false)
    setProfileError('')
    setProfileMessage('')

    try {
      const response = await fetch(
        'http://localhost:5000/api/profile',
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      const data = await response.json()

      if (data.user) {
        setProfile(data.user)
      }
    } catch {
      setProfileError('Unable to reload your profile.')
    }
  }

  async function handleProfileSave(event) {
    event.preventDefault()

    const token = localStorage.getItem('learnsphereToken')

    setSaving(true)
    setProfileError('')
    setProfileMessage('')

    try {
      const response = await fetch(
        'http://localhost:5000/api/profile',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            name: profile.name,
            phone: profile.phone || '',
            department: profile.department || '',
            year: profile.year === '' || profile.year === null
              ? null
              : Number(profile.year),
            bio: profile.bio || '',
            profilePicture: profile.profilePicture || ''
          })
        }
      )

      const data = await response.json()

      if (response.status === 401) {
        handleSessionExpired()
        return
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile.')
      }

      setProfile(data.user)
      setUser(data.user)

      const currentUser = JSON.parse(
        localStorage.getItem('learnsphereUser') || '{}'
      )

      localStorage.setItem(
        'learnsphereUser',
        JSON.stringify({
          ...currentUser,
          id: data.user._id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role
        })
      )

      setEditing(false)
      setProfileMessage('Your profile has been updated successfully! 💜')
    } catch (error) {
      setProfileError(error.message)
    } finally {
      setSaving(false)
    }
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

  const totalAdminLessons = adminCourses.reduce(
    (total, course) => total + (course.lessons?.length || 0),
    0
  )

  const displayedCourses = isAdmin ? adminCourses : enrollments

  return (
    <div className="dashboard-page">

      <header className="dashboard-header">
        <Link to="/" className="dashboard-logo">
          LearnSphere
        </Link>

        <nav className="dashboard-nav">
          <Link to="/">Home</Link>
          <Link to="/#courses">Browse Courses</Link>
          <Link to="/verify-certificate">🏅 Verify Certificate</Link>

          {!isAdmin && (
            <Link to="/my-progress">My Progress 📊</Link>
          )}

          {isAdmin && (
            <Link to="/manage-courses">Manage Courses</Link>
          )}

          <button onClick={handleLogout} className="dashboard-logout">
            Logout
          </button>
        </nav>
      </header>

      <main className="dashboard-main">

        <section className="dashboard-welcome">
          <div>
            <p className="dashboard-eyebrow">
              {isAdmin ? 'ADMIN DASHBOARD' : 'STUDENT DASHBOARD'}
            </p>

            <h1>
              Welcome back{user?.name ? `, ${user.name}` : ''}! 👋
            </h1>

            <p>
              {isAdmin
                ? 'Manage courses and keep the learning experience up to date.'
                : 'Continue learning and keep making progress.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/#courses" className="dashboard-browse-button">
              Explore Courses →
            </Link>

            <Link
              to="/verify-certificate"
              className="dashboard-browse-button"
            >
              🏅 Verify Certificate
            </Link>

            {!isAdmin && (
              <Link to="/my-progress" className="dashboard-browse-button">
                My Progress 📊
              </Link>
            )}

            {isAdmin && (
              <Link
                to="/manage-courses"
                className="dashboard-browse-button"
              >
                Manage Courses ⚙️
              </Link>
            )}
          </div>
        </section>

        <section className="profile-section">
          <div className="profile-card">

            <div className="profile-card-heading">
              <div>
                <p className="dashboard-eyebrow">YOUR ACCOUNT</p>
                <h2>My Profile</h2>
                <p>Manage your personal learning profile.</p>
              </div>

              {!editing && !profileLoading && (
                <button
                  className="profile-edit-button"
                  onClick={() => {
                    setEditing(true)
                    setProfileError('')
                    setProfileMessage('')
                  }}
                >
                  ✏️ Edit Profile
                </button>
              )}
            </div>

            {profileLoading && (
              <p className="dashboard-message">
                Loading your profile...
              </p>
            )}

            {!profileLoading && profile && (
              <form onSubmit={handleProfileSave}>

                <div className="profile-main">
                  <div className="profile-picture-area">
                    {profile.profilePicture ? (
                      <img
                        src={profile.profilePicture}
                        alt="Profile"
                        className="profile-picture"
                        onError={event => {
                          event.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="profile-picture-placeholder">
                        {profile.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>

                  <div className="profile-basic-info">
                    <h3>{profile.name}</h3>
                    <p>{profile.email}</p>
                    <span className="profile-role-badge">
                      {profile.role || 'student'}
                    </span>
                  </div>
                </div>

                {editing && (
                  <div className="profile-form-grid">

                    <label className="profile-field">
                      Full Name
                      <input
                        type="text"
                        name="name"
                        value={profile.name || ''}
                        onChange={handleProfileChange}
                        required
                      />
                    </label>

                    <label className="profile-field">
                      Phone Number
                      <input
                        type="tel"
                        name="phone"
                        value={profile.phone || ''}
                        onChange={handleProfileChange}
                        placeholder="Enter your phone number"
                      />
                    </label>

                    <label className="profile-field">
                      Department
                      <input
                        type="text"
                        name="department"
                        value={profile.department || ''}
                        onChange={handleProfileChange}
                        placeholder="Example: AIML"
                      />
                    </label>

                    <label className="profile-field">
                      Academic Year
                      <select
                        name="year"
                        value={profile.year ?? ''}
                        onChange={handleProfileChange}
                      >
                        <option value="">Select year</option>
                        <option value="1">First Year</option>
                        <option value="2">Second Year</option>
                        <option value="3">Third Year</option>
                        <option value="4">Fourth Year</option>
                        <option value="5">Fifth Year</option>
                        <option value="6">Sixth Year</option>
                      </select>
                    </label>

                    <label className="profile-field profile-full-width">
                      Profile Picture URL
                      <input
                        type="url"
                        name="profilePicture"
                        value={profile.profilePicture || ''}
                        onChange={handleProfileChange}
                        placeholder="Paste an image URL"
                      />
                    </label>

                    <label className="profile-field profile-full-width">
                      About Me
                      <textarea
                        name="bio"
                        value={profile.bio || ''}
                        onChange={handleProfileChange}
                        placeholder="Write a short introduction about yourself..."
                        maxLength="300"
                        rows="4"
                      />
                      <small>
                        {(profile.bio || '').length}/300 characters
                      </small>
                    </label>

                  </div>
                )}

                {!editing && (
                  <div className="profile-details-grid">

                    <div className="profile-detail">
                      <span>📱 Phone Number</span>
                      <strong>{profile.phone || 'Not added yet'}</strong>
                    </div>

                    <div className="profile-detail">
                      <span>🎓 Department</span>
                      <strong>{profile.department || 'Not added yet'}</strong>
                    </div>

                    <div className="profile-detail">
                      <span>📚 Academic Year</span>
                      <strong>
                        {profile.year
                          ? `Year ${profile.year}`
                          : 'Not added yet'}
                      </strong>
                    </div>

                    <div className="profile-detail profile-full-width">
                      <span>💜 About Me</span>
                      <strong>{profile.bio || 'No bio added yet.'}</strong>
                    </div>

                  </div>
                )}

                {profileError && (
                  <p className="profile-error">{profileError}</p>
                )}

                {profileMessage && (
                  <p className="profile-success">{profileMessage}</p>
                )}

                {editing && (
                  <div className="profile-actions">

                    <button
                      type="button"
                      className="profile-cancel-button"
                      onClick={handleCancelEdit}
                      disabled={saving}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="profile-save-button"
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Changes 💜'}
                    </button>

                  </div>
                )}

              </form>
            )}

            {!profileLoading && !profile && profileError && (
              <p className="profile-error">{profileError}</p>
            )}

          </div>
        </section>

        <section className="dashboard-stats">

          <article className="dashboard-stat-card">
            <span className="dashboard-stat-icon">📚</span>
            <p>{isAdmin ? 'Available Courses' : 'Enrolled Courses'}</p>
            <h2>
              {isAdmin ? adminCourses.length : totalEnrolled}
            </h2>
          </article>

          <article className="dashboard-stat-card">
            <span className="dashboard-stat-icon">🏆</span>
            <p>{isAdmin ? 'Total Lessons' : 'Completed Courses'}</p>
            <h2>
              {isAdmin ? totalAdminLessons : completedCourses}
            </h2>
          </article>

          <article className="dashboard-stat-card">
            <span className="dashboard-stat-icon">📈</span>
            <p>{isAdmin ? 'Platform' : 'Average Progress'}</p>
            <h2>
              {isAdmin ? 'Active' : `${averageProgress}%`}
            </h2>
          </article>

        </section>

        <section className="dashboard-courses-section">

          <div className="dashboard-section-heading">
            <div>
              <h2>{isAdmin ? 'All Available Courses' : 'My Learning'}</h2>
              <p>
                {isAdmin
                  ? 'View and manage all courses on LearnSphere.'
                  : 'Your enrolled courses and learning progress.'}
              </p>
            </div>
          </div>

          {loading && (
            <p className="dashboard-message">
              Loading your courses...
            </p>
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

          {!loading && !error && displayedCourses.length === 0 && (
            <div className="dashboard-empty">
              <span>🎓</span>

              <h3>
                {isAdmin
                  ? 'No courses available yet'
                  : 'Ready to start learning?'}
              </h3>

              <p>
                {isAdmin
                  ? 'Add your first course using course management.'
                  : "You haven't enrolled in any courses yet. Explore our courses and start your learning journey!"}
              </p>

              <Link
                to={isAdmin ? '/manage-courses' : '/#courses'}
                className="dashboard-browse-button"
              >
                {isAdmin ? 'Manage Courses' : 'Browse Courses'}
              </Link>
            </div>
          )}

          {!loading && !error && displayedCourses.length > 0 && (
            <div className="dashboard-course-grid">

              {displayedCourses.map(item => {
                const course = isAdmin ? item : item.course

                if (!course) return null

                const progress = isAdmin
                  ? 0
                  : Math.min(
                      100,
                      Math.max(0, item.progress || 0)
                    )

                return (
                  <article
                    className="dashboard-course-card"
                    key={isAdmin ? course._id : item._id}
                  >

                    <div className="dashboard-course-top">
                      <span className="dashboard-course-category">
                        {course.category}
                      </span>

                      {!isAdmin && item.completed && (
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

                    {!isAdmin && (
                      <>
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
                          {item.enrolledAt
                            ? new Date(item.enrolledAt).toLocaleDateString()
                            : 'N/A'}
                        </p>
                      </>
                    )}

                    {isAdmin && (
                      <p className="dashboard-enrolled-date">
                        {course.lessons?.length || 0} Lessons available
                      </p>
                    )}

                    <Link
                      to={isAdmin
                        ? '/manage-courses'
                        : `/courses/${course._id}/learn`}
                      className="open-course-button"
                    >
                      {isAdmin
                        ? 'Manage Course →'
                        : item.completed
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
        <p>
          © {new Date().getFullYear()} LearnSphere. Keep learning!
        </p>
      </footer>

    </div>
  )
}

export default Dashboard
