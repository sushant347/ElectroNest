import { Link } from 'react-router-dom'
import { FiAward, FiUsers, FiPackage, FiTruck, FiShield, FiHeadphones, FiMail, FiPhone, FiMapPin } from 'react-icons/fi'

const stats = [
    { icon: FiPackage, value: '500+', label: 'Products Listed' },
    { icon: FiUsers, value: '1,600+', label: 'Happy Customers' },
    { icon: FiTruck, value: '10+', label: 'Partner Stores' },
    { icon: FiAward, value: '5 Yrs', label: 'of Excellence' },
]

const values = [
    {
        icon: FiShield,
        title: 'Genuine Products',
        desc: 'Every product you buy on ElectroNest is authenticated and sourced directly from authorised distributors.',
    },
    {
        icon: FiTruck,
        title: 'Fast Delivery',
        desc: 'We partner with reliable courier networks to ensure your order reaches you as quickly as possible.',
    },
    {
        icon: FiHeadphones,
        title: '24/7 Support',
        desc: 'Our dedicated customer support team is available around the clock to help you with any concerns.',
    },
    {
        icon: FiAward,
        title: 'Best Prices',
        desc: 'We work closely with multiple store owners to bring you competitive pricing on all electronics.',
    },
]

const team = [
    { name: 'Sushant Gautam', role: 'Founder & CEO', initial: 'CEO' },
    { name: 'Suraj K.C', role: 'Head of Operations', initial: 'COO' },
    { name: 'Sachyam Dahal', role: 'AI Developer', initial: 'CDO' },
    { name: 'Sujal Shrestha', role: 'Manager', initial: 'CMO' },
]

export default function AboutUs() {
    return (
        <div className="about-page">

            {/* ─── Hero ─── */}
            <section className="about-hero">
                <div className="about-hero-inner">
                    <span className="about-hero-badge">🏆 About ElectroNest</span>
                    <h1 className="about-hero-title">
                        Nepal's Smart <span className="about-accent">Electronics</span> Marketplace
                    </h1>
                    <p className="about-hero-sub">
                        We are a multi-vendor electronics platform connecting trusted store owners with everyday customers.
                        From smartphones to smart home — discover it all in one place.
                    </p>
                    <div className="about-hero-btns">
                        <Link to="/?shop=all" className="about-btn-primary">Explore Products</Link>
                        <Link to="/support/contact" className="about-btn-outline">Contact Us</Link>
                    </div>
                </div>
            </section>

            {/* ─── Stats Bar ─── */}
            <section className="about-stats-bar">
                <div className="about-stats-inner">
                    {stats.map((s, i) => (
                        <div key={i} className="about-stat-card">
                            <div className="about-stat-icon">
                                <s.icon size={22} />
                            </div>
                            <span className="about-stat-value">{s.value}</span>
                            <span className="about-stat-label">{s.label}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* ─── Our Story ─── */}
            <section className="about-section">
                <div className="about-section-inner about-story-grid">
                    <div className="about-story-text">
                        <span className="about-sec-eyebrow">Our Story</span>
                        <h2 className="about-sec-title">Born from a Passion for Technology</h2>
                        <p className="about-sec-para">
                            ElectroNest started with a simple idea: make premium electronics accessible to everyone in Nepal.
                            We noticed that customers often struggled to find genuine products at fair prices, and small electronics
                            store owners lacked a digital platform to showcase their inventory.
                        </p>
                        <p className="about-sec-para">
                            So we built ElectroNest — a multi-store marketplace that empowers local store owners to sell online while
                            giving customers a safe, trusted shopping experience backed by real-time inventory, AI-powered recommendations,
                            and transparent pricing.
                        </p>
                        <p className="about-sec-para">
                            Today we serve thousands of customers across Nepal, with a growing network of partner stores and
                            a catalogue that spans every corner of consumer electronics.
                        </p>
                    </div>
                    <div className="about-story-visual">
                        <div className="about-story-card">
                            <span style={{ fontSize: '4rem' }}>⚡</span>
                            <h3>AI-Powered Shopping</h3>
                            <p>Smart recommendations, demand forecasting, and dynamic pricing — all working behind the scenes for you.</p>
                        </div>
                        <div className="about-story-card about-story-card-accent">
                            <span style={{ fontSize: '4rem' }}>🏪</span>
                            <h3>Multi-Store Marketplace</h3>
                            <p>Products from 10+ verified electronics stores, curated and quality-checked for your peace of mind.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Our Values ─── */}
            <section className="about-section about-values-section">
                <div className="about-section-inner">
                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                        <span className="about-sec-eyebrow">What We Stand For</span>
                        <h2 className="about-sec-title">Our Core Values</h2>
                    </div>
                    <div className="about-values-grid">
                        {values.map((v, i) => (
                            <div key={i} className="about-value-card">
                                <div className="about-value-icon">
                                    <v.icon size={24} />
                                </div>
                                <h3 className="about-value-title">{v.title}</h3>
                                <p className="about-value-desc">{v.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Team ─── */}
            <section className="about-section">
                <div className="about-section-inner">
                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                        <span className="about-sec-eyebrow">The People Behind ElectroNest</span>
                        <h2 className="about-sec-title">Meet Our Team</h2>
                    </div>
                    <div className="about-team-grid">
                        {team.map((m, i) => (
                            <div key={i} className="about-team-card">
                                <div className="about-team-avatar">
                                    {m.initial}
                                </div>
                                <h3 className="about-team-name">{m.name}</h3>
                                <span className="about-team-role">{m.role}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Contact Strip ─── */}
            <section className="about-contact-strip">
                <div className="about-contact-inner">
                    <div className="about-contact-info">
                        <h2 className="about-contact-title">Get in Touch</h2>
                        <p className="about-contact-sub">Have a question or want to become a partner store? We'd love to hear from you.</p>
                        <div className="about-contact-items">
                            <div className="about-contact-item">
                                <FiMail size={18} />
                                <span>support@electronest.com</span>
                            </div>
                            <div className="about-contact-item">
                                <FiPhone size={18} />
                                <span>+977 9869465432</span>
                            </div>
                            <div className="about-contact-item">
                                <FiMapPin size={18} />
                                <span>Kathmandu, Nepal</span>
                            </div>
                        </div>
                    </div>
                    <div className="about-contact-cta">
                        <Link to="/support/contact" className="about-btn-primary">Send a Message</Link>
                        <Link to="/?shop=all" className="about-btn-outline about-btn-outline-light">Browse Products</Link>
                    </div>
                </div>
            </section>

            <style>{`
        .about-page {
          min-height: 60vh;
          background: #fff;
        }

        /* Hero */
        .about-hero {
          background: linear-gradient(135deg, #232F3E 0%, #37475A 100%);
          padding: 5rem 2rem;
          text-align: center;
        }
        .about-hero-inner { max-width: 680px; margin: 0 auto; }
        .about-hero-badge {
          display: inline-block;
          background: rgba(249,115,22,0.18);
          color: #F97316;
          padding: 0.4rem 1.1rem;
          border-radius: 50px;
          font-size: 0.82rem;
          font-weight: 600;
          margin-bottom: 1.25rem;
        }
        .about-hero-title {
          font-size: 2.6rem;
          font-weight: 800;
          color: #fff;
          line-height: 1.2;
          margin-bottom: 1rem;
        }
        .about-accent { color: #F97316; }
        .about-hero-sub {
          color: rgba(255,255,255,0.7);
          font-size: 1rem;
          line-height: 1.65;
          margin-bottom: 2rem;
        }
        .about-hero-btns {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }
        .about-btn-primary {
          background: #F97316;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.85rem;
          font-size: 0.92rem;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.15s, transform 0.15s;
          display: inline-block;
        }
        .about-btn-primary:hover { background: #ea580c; transform: translateY(-1px); color: #fff; }
        .about-btn-outline {
          background: transparent;
          color: rgba(255,255,255,0.88);
          border: 1.5px solid rgba(255,255,255,0.3);
          border-radius: 8px;
          padding: 0.75rem 1.85rem;
          font-size: 0.92rem;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.15s;
          display: inline-block;
        }
        .about-btn-outline:hover { border-color: rgba(255,255,255,0.7); color: #fff; }

        /* Stats Bar */
        .about-stats-bar {
          background: #232F3E;
          border-top: 1px solid rgba(255,255,255,0.08);
          padding: 0;
        }
        .about-stats-inner {
          max-width: 900px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
        }
        .about-stat-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
          padding: 2rem 1rem;
          border-right: 1px solid rgba(255,255,255,0.08);
          transition: background 0.2s;
        }
        .about-stat-card:last-child { border-right: none; }
        .about-stat-card:hover { background: rgba(255,255,255,0.04); }
        .about-stat-icon {
          width: 46px; height: 46px;
          border-radius: 50%;
          background: rgba(249,115,22,0.15);
          color: #F97316;
          display: flex; align-items: center; justify-content: center;
        }
        .about-stat-value {
          font-size: 1.65rem;
          font-weight: 800;
          color: #F97316;
        }
        .about-stat-label {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.6);
          font-weight: 500;
        }

        /* Sections */
        .about-section {
          padding: 4.5rem 2rem;
        }
        .about-section-inner {
          max-width: 1100px;
          margin: 0 auto;
        }
        .about-sec-eyebrow {
          display: block;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #F97316;
          margin-bottom: 0.5rem;
        }
        .about-sec-title {
          font-size: 1.85rem;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 1.25rem;
          line-height: 1.25;
        }
        .about-sec-para {
          color: #64748b;
          font-size: 0.95rem;
          line-height: 1.75;
          margin-bottom: 1rem;
        }

        /* Story grid */
        .about-story-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 4rem;
          align-items: start;
        }
        .about-story-visual {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .about-story-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 1.75rem;
        }
        .about-story-card h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0.75rem 0 0.5rem;
        }
        .about-story-card p {
          font-size: 0.87rem;
          color: #64748b;
          line-height: 1.65;
          margin: 0;
        }
        .about-story-card-accent {
          background: linear-gradient(135deg, #FFF7ED, #FFEDD5);
          border-color: #fed7aa;
        }

        /* Values */
        .about-values-section { background: #f8fafc; }
        .about-values-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
        }
        .about-value-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 1.75rem 1.5rem;
          transition: box-shadow 0.2s, transform 0.2s;
          text-align: center;
        }
        .about-value-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        }
        .about-value-icon {
          width: 52px; height: 52px;
          border-radius: 14px;
          background: rgba(249,115,22,0.1);
          color: #F97316;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1rem;
        }
        .about-value-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.6rem;
        }
        .about-value-desc {
          font-size: 0.85rem;
          color: #64748b;
          line-height: 1.65;
          margin: 0;
        }

        /* Team */
        .about-team-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
        }
        .about-team-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 2rem 1.25rem;
          text-align: center;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .about-team-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        }
        .about-team-avatar {
          width: 72px; height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, #F97316, #ea580c);
          color: #fff;
          font-size: 1.75rem;
          font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1rem;
          box-shadow: 0 4px 14px rgba(249,115,22,0.3);
        }
        .about-team-name {
          font-size: 1rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.3rem;
        }
        .about-team-role {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 500;
        }

        /* Contact Strip */
        .about-contact-strip {
          background: linear-gradient(135deg, #232F3E 0%, #37475A 100%);
          padding: 4rem 2rem;
        }
        .about-contact-inner {
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 3rem;
          flex-wrap: wrap;
        }
        .about-contact-title {
          font-size: 1.85rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 0.6rem;
        }
        .about-contact-sub {
          color: rgba(255,255,255,0.65);
          font-size: 0.92rem;
          line-height: 1.55;
          margin-bottom: 1.25rem;
          max-width: 400px;
        }
        .about-contact-items {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .about-contact-item {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          color: rgba(255,255,255,0.78);
          font-size: 0.87rem;
        }
        .about-contact-item svg { color: #F97316; flex-shrink: 0; }
        .about-contact-cta {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          flex-shrink: 0;
        }
        .about-btn-outline-light {
          color: rgba(255,255,255,0.88);
          border-color: rgba(255,255,255,0.28);
        }
        .about-btn-outline-light:hover { border-color: rgba(255,255,255,0.6); color: #fff; }

        /* Responsive */
        @media (max-width: 900px) {
          .about-values-grid { grid-template-columns: repeat(2, 1fr); }
          .about-team-grid { grid-template-columns: repeat(2, 1fr); }
          .about-story-grid { grid-template-columns: 1fr; gap: 2.5rem; }
          .about-stats-inner { grid-template-columns: repeat(2, 1fr); }
          .about-stat-card:nth-child(2) { border-right: none; }
          .about-stat-card:nth-child(1), .about-stat-card:nth-child(2) {
            border-bottom: 1px solid rgba(255,255,255,0.08);
          }
        }
        @media (max-width: 640px) {
          .about-hero { padding: 3.5rem 1.25rem; }
          .about-hero-title { font-size: 1.9rem; }
          .about-values-grid { grid-template-columns: 1fr; }
          .about-team-grid { grid-template-columns: repeat(2, 1fr); }
          .about-section { padding: 3rem 1.25rem; }
          .about-contact-strip { padding: 3rem 1.25rem; }
          .about-contact-inner { flex-direction: column; gap: 2rem; }
          .about-contact-cta { flex-direction: row; }
        }
      `}</style>
        </div>
    )
}
