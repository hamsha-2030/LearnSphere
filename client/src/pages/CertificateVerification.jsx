
import { useState } from 'react'
import { Link } from 'react-router-dom'
import API_BASE_URL from '../config'
import './CertificateVerification.css'

function CertificateVerification() {
  const [certificateId, setCertificateId] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleVerify = async (e) => {
    e.preventDefault()

    if (!certificateId.trim()) {
      setResult({
        valid: false,
        message: 'Please enter a certificate ID.'
      })
      return
    }

    try {
      setLoading(true)
      setResult(null)

      const response = await fetch(
        `${API_BASE_URL}/api/certificates/verify/${encodeURIComponent(
          certificateId.trim()
        )}`
      )

      const data = await response.json()

      if (!response.ok) {
        setResult({
          valid: false,
          message: data.message || 'Certificate verification failed.'
        })
        return
      }

      setResult(data)
    } catch (error) {
      setResult({
        valid: false,
        message: 'Unable to connect to the server. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="verification-page">
      <nav className="verification-nav">
        <Link to="/" className="verification-logo">
          LearnSphere
        </Link>

        <Link to="/" className="verification-home">
          Home
        </Link>
      </nav>

      <main className="verification-container">
        <div className="verification-icon">🎓</div>

        <h1>Certificate Verification</h1>

        <p className="verification-description">
          Verify the authenticity of a LearnSphere course completion
          certificate using its unique certificate ID.
        </p>

        <form onSubmit={handleVerify} className="verification-form">
          <label htmlFor="certificateId">Certificate ID</label>

          <input
            id="certificateId"
            type="text"
            placeholder="Example: LS-XXXXXXXX"
            value={certificateId}
            onChange={(e) => {
              setCertificateId(e.target.value)
              setResult(null)
            }}
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify Certificate'}
          </button>
        </form>

        {result && (
          <div
            className={`verification-result ${
              result.valid ? 'valid-result' : 'invalid-result'
            }`}
          >
            {result.valid ? (
              <>
                <div className="result-icon">✓</div>

                <h2>Certificate Verified!</h2>

                <p className="result-message">{result.message}</p>

                <div className="certificate-details">
                  <div>
                    <span>Certificate ID</span>
                    <strong>{result.certificate.certificateId}</strong>
                  </div>

                  <div>
                    <span>Student Name</span>
                    <strong>{result.certificate.studentName}</strong>
                  </div>

                  <div>
                    <span>Course Name</span>
                    <strong>{result.certificate.courseTitle}</strong>
                  </div>

                  <div>
                    <span>Issue Date</span>
                    <strong>
                      {new Date(
                        result.certificate.issuedAt
                      ).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </strong>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="result-icon">✕</div>

                <h2>Verification Failed</h2>

                <p className="result-message">{result.message}</p>
              </>
            )}
          </div>
        )}

        <p className="verification-footer">
          LearnSphere — Learn, Grow and Achieve.
        </p>
      </main>
    </div>
  )
}

export default CertificateVerification
