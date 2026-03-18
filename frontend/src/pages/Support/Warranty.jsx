import { FiShield, FiAlertCircle, FiCheckCircle, FiPhone, FiMail } from 'react-icons/fi'

const coverageItems = [
  'Manufacturing defects in materials and workmanship',
  'Hardware component failures under normal use',
  'Screen defects present from time of purchase',
  'Battery defects (capacity below 80% within warranty period)',
  'Software issues caused by firmware defects',
]

const notCoveredItems = [
  'Physical damage, drops, or water/liquid damage',
  'Unauthorized modifications or repairs',
  'Normal wear and tear (scratches, dents)',
  'Damage caused by power surges or incorrect voltage',
  'Consumable parts (batteries after 6 months of normal use)',
  'Cosmetic damage that doesn\'t affect functionality',
]

const warrantyPeriods = [
  { category: 'Laptops & Computers', period: '1 Year', type: 'Manufacturer Warranty' },
  { category: 'Smartphones', period: '1 Year', type: 'Manufacturer Warranty' },
  { category: 'Tablets', period: '1 Year', type: 'Manufacturer Warranty' },
  { category: 'Audio & Headphones', period: '1 Year', type: 'Manufacturer Warranty' },
  { category: 'Smart Watches', period: '1 Year', type: 'Manufacturer Warranty' },
  { category: 'Cameras', period: '1 Year', type: 'Manufacturer Warranty' },
  { category: 'Gaming Accessories', period: '6 Months', type: 'Manufacturer Warranty' },
  { category: 'Cables & Adapters', period: '6 Months', type: 'ElectroNest Warranty' },
  { category: 'Speakers', period: '1 Year', type: 'Manufacturer Warranty' },
]

export default function Warranty() {
  return (
    <div className="sup-page">
      <div className="sup-hero">
        <div className="sup-hero-inner">
          <h1 className="sup-hero-title">Warranty Policy</h1>
          <p className="sup-hero-sub">All products on ElectroNest are backed by genuine manufacturer warranties.</p>
        </div>
      </div>

      <div className="sup-container">
        {/* Overview */}
        <section className="sup-section">
          <div className="war-overview">
            <FiShield size={40} className="war-overview-icon" />
            <div>
              <h2 className="war-overview-title">Genuine Manufacturer Warranty</h2>
              <p className="war-overview-text">
                Every product sold on ElectroNest comes with the official manufacturer's warranty. We source all products directly from authorized distributors, ensuring your warranty is valid and can be claimed at any authorized service center in Nepal.
              </p>
            </div>
          </div>
        </section>

        {/* Warranty Periods */}
        <section className="sup-section">
          <h2 className="sup-section-title">Warranty Periods by Category</h2>
          <div className="war-table-wrap">
            <table className="war-table">
              <thead>
                <tr>
                  <th>Product Category</th>
                  <th>Warranty Period</th>
                  <th>Warranty Type</th>
                </tr>
              </thead>
              <tbody>
                {warrantyPeriods.map(row => (
                  <tr key={row.category}>
                    <td>{row.category}</td>
                    <td><span className="war-period-badge">{row.period}</span></td>
                    <td><span className="war-type">{row.type}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Coverage */}
        <section className="sup-section">
          <h2 className="sup-section-title">What's Covered & Not Covered</h2>
          <div className="war-coverage-grid">
            <div className="war-coverage-col">
              <h3 className="war-col-title covered"><FiCheckCircle size={16} /> Covered</h3>
              <ul className="war-list">
                {coverageItems.map((item, i) => (
                  <li key={i} className="war-list-item covered">
                    <FiCheckCircle size={13} /> <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="war-coverage-col">
              <h3 className="war-col-title not-covered"><FiAlertCircle size={16} /> Not Covered</h3>
              <ul className="war-list">
                {notCoveredItems.map((item, i) => (
                  <li key={i} className="war-list-item not-covered">
                    <FiAlertCircle size={13} /> <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* How to Claim */}
        <section className="sup-section">
          <h2 className="sup-section-title">How to Claim Warranty</h2>
          <div className="war-claim-steps">
            {[
              { step: '1', title: 'Contact Support', desc: 'Reach out to us via email at support@electronest.com or call +977 9869465432 with your order number and issue description.' },
              { step: '2', title: 'Verification', desc: 'Our team verifies your purchase and warranty eligibility. This takes 1–2 business days.' },
              { step: '3', title: 'Service Center', desc: 'We direct you to the nearest authorized service center, or arrange pickup for repair/replacement.' },
              { step: '4', title: 'Resolution', desc: 'Repair or replacement is completed within 7–21 business days depending on the issue and availability of parts.' },
            ].map(s => (
              <div key={s.step} className="war-claim-step">
                <div className="war-claim-num">{s.step}</div>
                <div>
                  <div className="war-claim-title">{s.title}</div>
                  <div className="war-claim-desc">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="sup-section">
          <div className="war-contact-box">
            <h3 className="war-contact-title">Need Warranty Support?</h3>
            <p className="war-contact-text">Contact us and we'll guide you through the claim process.</p>
            <div className="war-contact-links">
              <a href="mailto:support@electronest.com" className="war-contact-btn">
                <FiMail size={15} /> support@electronest.com
              </a>
              <a href="tel:+9779869465432" className="war-contact-btn">
                <FiPhone size={15} /> +977 9869465432
              </a>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        .sup-page { min-height: 100vh; background: #f8fafc; font-family: 'Inter', system-ui, sans-serif; }
        .sup-hero { background: linear-gradient(135deg, #232F3E 0%, #37475A 100%); padding: 3rem 2rem; }
        .sup-hero-inner { max-width: 1000px; margin: 0 auto; }
        .sup-hero-title { color: #fff; font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem; }
        .sup-hero-sub { color: rgba(255,255,255,0.6); font-size: 1rem; }

        .sup-container { max-width: 1000px; margin: 0 auto; padding: 2.5rem 2rem; }
        .sup-section { margin-bottom: 2.5rem; }
        .sup-section-title { font-size: 1.2rem; font-weight: 700; color: #1e293b; margin-bottom: 1.25rem; }

        .war-overview {
          display: flex; align-items: flex-start; gap: 1.5rem;
          background: linear-gradient(135deg, #232F3E, #37475A); border-radius: 16px; padding: 2rem;
          color: #fff;
        }
        .war-overview-icon { color: #F97316; flex-shrink: 0; }
        .war-overview-title { font-size: 1.15rem; font-weight: 700; margin-bottom: 0.5rem; }
        .war-overview-text { color: rgba(255,255,255,0.7); font-size: 0.9rem; line-height: 1.7; }

        .war-table-wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
        .war-table { width: 100%; border-collapse: collapse; }
        .war-table th {
          background: #f8fafc; padding: 0.85rem 1.1rem; text-align: left;
          font-size: 0.78rem; font-weight: 700; color: #64748b; text-transform: uppercase;
          letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0;
        }
        .war-table td { padding: 0.85rem 1.1rem; font-size: 0.88rem; color: #1e293b; border-bottom: 1px solid #f1f5f9; }
        .war-table tr:last-child td { border-bottom: none; }
        .war-table tr:hover td { background: #fafbfc; }
        .war-period-badge {
          background: rgba(249,115,22,0.1); color: #F97316; font-weight: 700;
          padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.82rem;
        }
        .war-type { font-size: 0.82rem; color: #64748b; }

        .war-coverage-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        .war-coverage-col { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 1.25rem; }
        .war-col-title { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; font-weight: 700; margin-bottom: 0.85rem; padding-bottom: 0.5rem; border-bottom: 2px solid; }
        .war-col-title.covered { color: #16a34a; border-color: #16a34a; }
        .war-col-title.not-covered { color: #dc2626; border-color: #dc2626; }
        .war-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.6rem; }
        .war-list-item { display: flex; align-items: flex-start; gap: 0.6rem; font-size: 0.85rem; line-height: 1.5; }
        .war-list-item.covered { color: #166534; }
        .war-list-item.covered svg { color: #16a34a; flex-shrink: 0; margin-top: 2px; }
        .war-list-item.not-covered { color: #991b1b; }
        .war-list-item.not-covered svg { color: #dc2626; flex-shrink: 0; margin-top: 2px; }

        .war-claim-steps { display: flex; flex-direction: column; gap: 0; }
        .war-claim-step {
          display: flex; align-items: flex-start; gap: 1.25rem;
          padding: 1.1rem 1.25rem; background: #fff; border: 1px solid #e2e8f0; border-bottom: none;
        }
        .war-claim-step:first-child { border-radius: 12px 12px 0 0; }
        .war-claim-step:last-child { border-radius: 0 0 12px 12px; border-bottom: 1px solid #e2e8f0; }
        .war-claim-num {
          width: 36px; height: 36px; border-radius: 50%; background: #F97316; color: #fff;
          font-size: 0.88rem; font-weight: 700; display: flex; align-items: center;
          justify-content: center; flex-shrink: 0;
        }
        .war-claim-title { font-size: 0.92rem; font-weight: 700; color: #1e293b; margin-bottom: 0.2rem; }
        .war-claim-desc { font-size: 0.85rem; color: #64748b; line-height: 1.6; }

        .war-contact-box {
          background: linear-gradient(135deg, #232F3E, #37475A); border-radius: 16px;
          padding: 2rem; text-align: center; color: #fff;
        }
        .war-contact-title { font-size: 1.15rem; font-weight: 700; margin-bottom: 0.4rem; }
        .war-contact-text { color: rgba(255,255,255,0.6); font-size: 0.9rem; margin-bottom: 1.25rem; }
        .war-contact-links { display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap; }
        .war-contact-btn {
          display: flex; align-items: center; gap: 0.5rem;
          background: #F97316; color: #fff; text-decoration: none;
          padding: 0.65rem 1.25rem; border-radius: 8px; font-size: 0.88rem; font-weight: 600;
          transition: background 0.15s;
        }
        .war-contact-btn:hover { background: #ea580c; color: #fff; }

        @media (max-width: 768px) {
          .war-overview { flex-direction: column; gap: 1rem; }
          .war-coverage-grid { grid-template-columns: 1fr; }
          .sup-hero { padding: 2rem 1rem; }
          .sup-hero-title { font-size: 1.5rem; }
          .sup-container { padding: 1.5rem 1rem; }
        }
      `}</style>
    </div>
  )
}
