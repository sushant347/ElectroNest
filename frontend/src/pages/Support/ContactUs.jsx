import { useState } from 'react'
import { FiMail, FiPhone, FiMapPin, FiMessageSquare, FiClock } from 'react-icons/fi'
import { customerAPI } from '../../services/api'

export default function ContactUs() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    subject: '',
    phone: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState({ type: '', text: '' })

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (status.text) setStatus({ type: '', text: '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setStatus({ type: '', text: '' })

    try {
      await customerAPI.submitContactQuery({
        ...form,
        source_page: window.location.pathname,
      })

      setStatus({ type: 'success', text: 'Your message was sent successfully. Our team will contact you soon.' })
      setForm({ first_name: '', last_name: '', email: '', subject: '', phone: '', message: '' })
    } catch (err) {
      const detail = err?.response?.data?.detail
      setStatus({ type: 'error', text: detail || 'Failed to send your message. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="sup-page">
      <div className="sup-hero">
        <div className="sup-hero-inner">
          <h1 className="sup-hero-title">Contact Us</h1>
          <p className="sup-hero-sub">We're here to help. Reach out through any channel below.</p>
        </div>
      </div>

      <div className="sup-container">
        <div className="contact-grid">
          {/* Contact Info */}
          <div className="contact-info-col">
            <h2 className="sup-section-title">Get in Touch</h2>
            <p className="sup-text">Have a question, concern, or feedback? Our support team is available to assist you during business hours.</p>

            <div className="contact-cards">
              <div className="contact-card">
                <div className="contact-card-icon"><FiPhone size={20} /></div>
                <div>
                  <div className="contact-card-label">Phone Support</div>
                  <div className="contact-card-value">+977 9869465432</div>
                  <div className="contact-card-note">Mon–Sat, 9 AM – 6 PM (NST)</div>
                </div>
              </div>
              <div className="contact-card">
                <div className="contact-card-icon"><FiMail size={20} /></div>
                <div>
                  <div className="contact-card-label">Email Support</div>
                  <div className="contact-card-value">support@electronest.com</div>
                  <div className="contact-card-note">Response within 24 hours</div>
                </div>
              </div>
              <div className="contact-card">
                <div className="contact-card-icon"><FiMapPin size={20} /></div>
                <div>
                  <div className="contact-card-label">Visit Us</div>
                  <div className="contact-card-value">Sankhamul, Kathmandu</div>
                  <div className="contact-card-note">Nepal, 44600</div>
                </div>
              </div>
              <div className="contact-card">
                <div className="contact-card-icon"><FiClock size={20} /></div>
                <div>
                  <div className="contact-card-label">Business Hours</div>
                  <div className="contact-card-value">Mon–Fri: 9 AM – 6 PM</div>
                  <div className="contact-card-note">Sat: 10 AM – 4 PM · Sun: Closed</div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="contact-form-col">
            <h2 className="sup-section-title">Send a Message</h2>
            <form className="contact-form" onSubmit={handleSubmit}>
              {status.text && (
                <div className={`contact-form-status ${status.type}`}>
                  {status.text}
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    placeholder="John"
                    value={form.first_name}
                    onChange={e => handleChange('first_name', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    placeholder="Doe"
                    value={form.last_name}
                    onChange={e => handleChange('last_name', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={e => handleChange('email', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  placeholder="+977 98XXXXXXXX"
                  value={form.phone}
                  onChange={e => handleChange('phone', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Subject</label>
                <select
                  value={form.subject}
                  onChange={e => handleChange('subject', e.target.value)}
                  required
                >
                  <option value="">Select a topic</option>
                  <option value="Order Issue">Order Issue</option>
                  <option value="Product Question">Product Question</option>
                  <option value="Return / Exchange">Return / Exchange</option>
                  <option value="Warranty Claim">Warranty Claim</option>
                  <option value="Shipping Inquiry">Shipping Inquiry</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea
                  rows={5}
                  placeholder="Describe your issue or question in detail..."
                  value={form.message}
                  onChange={e => handleChange('message', e.target.value)}
                  required
                  minLength={10}
                />
              </div>
              <button type="submit" className="contact-submit-btn" disabled={submitting}>
                <FiMessageSquare size={16} /> {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        .sup-page { min-height: 100vh; background: #f8fafc; font-family: 'Inter', system-ui, sans-serif; }

        .sup-hero {
          background: linear-gradient(135deg, #232F3E 0%, #37475A 100%);
          padding: 3rem 2rem;
        }
        .sup-hero-inner { max-width: 1100px; margin: 0 auto; }
        .sup-hero-title { color: #fff; font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem; }
        .sup-hero-sub { color: rgba(255,255,255,0.6); font-size: 1rem; }

        .sup-container { max-width: 1100px; margin: 0 auto; padding: 2.5rem 2rem; }
        .sup-section-title { font-size: 1.25rem; font-weight: 700; color: #1e293b; margin-bottom: 0.75rem; }
        .sup-text { color: #64748b; font-size: 0.95rem; line-height: 1.7; margin-bottom: 1.5rem; }

        .contact-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 3rem; }

        .contact-cards { display: flex; flex-direction: column; gap: 1rem; }
        .contact-card {
          display: flex; align-items: flex-start; gap: 1rem;
          background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.1rem 1.25rem;
        }
        .contact-card-icon {
          width: 42px; height: 42px; border-radius: 10px;
          background: rgba(249,115,22,0.1); color: #F97316;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .contact-card-label { font-size: 0.75rem; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.2rem; }
        .contact-card-value { font-size: 0.92rem; font-weight: 600; color: #1e293b; }
        .contact-card-note { font-size: 0.78rem; color: #94a3b8; margin-top: 0.15rem; }

        .contact-form { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 2rem; }
        .contact-form-status {
          border-radius: 8px;
          padding: 0.7rem 0.85rem;
          font-size: 0.82rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }
        .contact-form-status.success { background: #ecfdf5; border: 1px solid #bbf7d0; color: #166534; }
        .contact-form-status.error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 1rem; }
        .form-group label { font-size: 0.82rem; font-weight: 600; color: #475569; }
        .form-group input, .form-group select, .form-group textarea {
          border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 0.6rem 0.85rem;
          font-size: 0.88rem; font-family: inherit; color: #1e293b; background: #fff;
          outline: none; transition: border-color 0.15s; width: 100%; box-sizing: border-box;
        }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
          border-color: #F97316;
        }
        .form-group textarea { resize: vertical; }
        .contact-submit-btn {
          display: flex; align-items: center; gap: 0.5rem; justify-content: center;
          width: 100%; padding: 0.75rem; background: #F97316; color: #fff;
          border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 600;
          font-family: inherit; cursor: pointer; transition: background 0.15s;
        }
        .contact-submit-btn:hover { background: #ea580c; }
        .contact-submit-btn:disabled { background: #cbd5e1; cursor: not-allowed; }

        @media (max-width: 768px) {
          .contact-grid { grid-template-columns: 1fr; gap: 2rem; }
          .sup-hero { padding: 2rem 1rem; }
          .sup-hero-title { font-size: 1.5rem; }
          .sup-container { padding: 1.5rem 1rem; }
        }
        @media (max-width: 480px) {
          .form-row { grid-template-columns: 1fr; }
          .contact-form { padding: 1.25rem; }
        }
      `}</style>
    </div>
  )
}
