import { Link } from 'react-router-dom'
import { FiFacebook, FiTwitter, FiInstagram, FiYoutube, FiMail, FiPhone, FiMapPin, FiTruck, FiShield, FiCreditCard, FiHeadphones } from 'react-icons/fi'

const features = [
  { icon: FiTruck, title: 'Free Shipping', desc: 'On orders over ₹5000' },
  { icon: FiShield, title: 'Secure Payment', desc: '100% protected' },
  { icon: FiCreditCard, title: 'Easy Returns', desc: '30-day returns' },
  { icon: FiHeadphones, title: '24/7 Support', desc: 'Dedicated support' },
]

const quickLinks = ['Laptops', 'Smartphones', 'Audio', 'Cameras', 'Tablets', 'Wearables', 'Gaming', 'Accessories']
const supportLinks = ['Contact Us', 'FAQ', 'Shipping Info', 'Returns & Exchanges', 'Warranty']
const socials = [FiFacebook, FiTwitter, FiInstagram, FiYoutube]

export default function Footer() {
  return (
    <footer className="footer">
      {/* Features Bar */}
      <div className="features-bar">
        {features.map((f, i) => (
          <div key={i} className="feature">
            <div className="feature-icon"><f.icon size={20} /></div>
            <div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="footer-main">
        <div className="footer-grid">
          {/* Brand */}
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <div className="footer-logo-icon">EN</div>
              <span className="footer-logo-text">Electro<span className="accent">Nest</span></span>
            </Link>
            <p className="footer-desc">Your premium destination for cutting-edge technology and electronics at competitive prices.</p>
            <div className="social-links">
              {socials.map((Icon, i) => (
                <a key={i} href="#" className="social-link"><Icon size={16} /></a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="footer-heading">Quick Links</h3>
            <ul className="footer-list">
              {quickLinks.map((link) => (
                <li key={link}><a href="#">{link}</a></li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="footer-heading">Support</h3>
            <ul className="footer-list">
              {supportLinks.map((link) => (
                <li key={link}><a href="#">{link}</a></li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="footer-heading">Contact</h3>
            <ul className="footer-list contact-list">
              <li><FiMapPin size={14} /> Sankhamul, KTM City</li>
              <li><FiPhone size={14} /> +977 9869465432</li>
              <li><FiMail size={14} /> support@electronest.com</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} ElectroNest. All rights reserved.</p>
          <div className="footer-bottom-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
      </div>

      <style>{`
        .footer {
          font-family: 'Inter', system-ui, sans-serif;
          background: #232F3E;
          color: rgba(255,255,255,0.6);
        }

        .features-bar {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2rem;
          padding: 1.5rem 2.5rem;
          background: #37475A;
        }

        .feature {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .feature-icon {
          width: 44px;
          height: 44px;
          background: rgba(255,255,255,0.08);
          color: #F97316;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .feature-title {
          color: #fff;
          font-weight: 600;
          font-size: 0.88rem;
        }

        .feature-desc {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.45);
          margin-top: 0.1rem;
        }

        .footer-main {
          padding: 2.5rem 2.5rem 2rem;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1fr;
          gap: 3rem;
          margin-bottom: 2.5rem;
        }

        .footer-logo {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          text-decoration: none;
          margin-bottom: 1rem;
        }

        .footer-logo-icon {
          width: 36px;
          height: 36px;
          background: #F97316;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 0.85rem;
        }

        .footer-logo-text {
          font-size: 1.25rem;
          font-weight: 700;
          color: #fff;
        }

        .footer-logo-text .accent {
          color: #F97316;
        }

        .footer-desc {
          font-size: 0.88rem;
          line-height: 1.6;
          margin-bottom: 1.25rem;
        }

        .social-links {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .social-link {
          width: 36px;
          height: 36px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.5);
          text-decoration: none;
          transition: all 0.2s;
        }

        .social-link:hover {
          background: rgba(255,255,255,0.1);
          color: #fff;
        }

        .footer-heading {
          color: #fff;
          font-size: 0.95rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .footer-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .footer-list li {
          margin-bottom: 0.6rem;
        }

        .footer-list a {
          color: rgba(255,255,255,0.55);
          text-decoration: none;
          font-size: 0.88rem;
          transition: color 0.15s;
        }

        .footer-list a:hover {
          color: #F97316;
        }

        .contact-list li {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.88rem;
        }

        .footer-bottom {
          border-top: 1px solid rgba(255,255,255,0.08);
          padding-top: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.82rem;
          color: rgba(255,255,255,0.35);
        }

        .footer-bottom-links {
          display: flex;
          gap: 1.25rem;
        }

        .footer-bottom-links a {
          color: rgba(255,255,255,0.35);
          text-decoration: none;
          transition: color 0.15s;
        }

        .footer-bottom-links a:hover {
          color: rgba(255,255,255,0.7);
        }

        @media (max-width: 768px) {
          .features-bar {
            grid-template-columns: repeat(2, 1fr);
            padding: 1.25rem 1rem;
          }
          .footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
          }
          .footer-brand {
            grid-column: 1 / -1;
          }
          .footer-bottom {
            flex-direction: column;
            gap: 0.75rem;
            text-align: center;
          }
        }

        @media (max-width: 480px) {
          .features-bar {
            grid-template-columns: 1fr;
          }
          .footer-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </footer>
  )
}
