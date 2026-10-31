
import React, { useEffect, useState } from 'react'
import './StudentProgress.css'
import API_BASE_URL from '../config'

function StudentProgress() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const token = localStorage.getItem('learnsphereToken')

        const response = await fetch(`${API_BASE_URL}/api/progress/my`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Unable to load progress')
        }

        setReports(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchProgress()
  }, [])

  if (loading) return <div className="progress-page">Loading progress...</div>

  if (error) {
    return <div className="progress-page error-message">{error}</div>
  }

  return (
    <div className="progress-page">
      <div className="progress-header">
        <h1>My Learning Progress</h1>
        <p>Track your learning journey and achievements.</p>
      </div>

      {reports.length === 0 ? (
        <p>You haven't enrolled in any courses yet.</p>
      ) : (
        reports.map((course) => (
          <div className="progress-card" key={course.courseId}>
            <div className="course-heading">
              <h2>{course.courseTitle}</h2>
              <span>{course.lessonProgress}% Completed</span>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${course.lessonProgress}%` }}
              />
            </div>

            <div className="progress-stats">
              <div>
                <strong>{course.completedLessons}/{course.totalLessons}</strong>
                <span>Lessons Completed</span>
              </div>

              <div>
                <strong>{course.pendingLessons}</strong>
                <span>Pending Lessons</span>
              </div>

              <div>
                <strong>
                  {course.quizzes.filter((quiz) => quiz.passed).length}/
                  {course.quizzes.length}
                </strong>
                <span>Quizzes Passed</span>
              </div>
            </div>

            <h3>Quiz Performance</h3>

            {course.quizzes.map((quiz) => (
              <div className="quiz-progress" key={quiz.quizId}>
                <div>
                  <strong>{quiz.title}</strong>
                  <span>
                    {quiz.attemptCount} attempt(s) | Best score: {quiz.bestPercentage}%
                  </span>
                </div>

                <span className={quiz.passed ? 'passed' : 'not-passed'}>
                  {quiz.passed ? 'Passed' : 'Not Passed'}
                </span>
              </div>
            ))}

            <div className="certificate-status">
              {course.certificateEligible ? (
                <a
                  href={`${API_BASE_URL}/api/certificates/${course.courseId}/download`}
                  onClick={(event) => {
                    event.preventDefault()
                    downloadCertificate(course.courseId)
                  }}
                >
                  Download Certificate
                </a>
              ) : (
                <span>
                  Complete all lessons and pass all quizzes to earn your certificate.
                </span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )

  async function downloadCertificate(courseId) {
    try {
      const token = localStorage.getItem('learnsphereToken')

      const response = await fetch(
        `${API_BASE_URL}/api/certificates/${courseId}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('Unable to download certificate')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = 'LearnSphere-Certificate.pdf'
      link.click()

      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert(err.message)
    }
  }
}

export default StudentProgress
