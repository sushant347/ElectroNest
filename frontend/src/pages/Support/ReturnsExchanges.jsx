import { FiRotateCcw, FiCheck, FiX, FiAlertCircle, FiPackage } from 'react-icons/fi'

const eligibleItems = [
  'Electronics in original, unused condition with all accessories',
  'Items with manufacturing defects or damage on arrival',
  'Wrong item received (different from what was ordered)',
  'Items within 30 days of delivery date',
]

const nonEligibleItems = [
  'Opened software, digital downloads, or license keys',
  'Items damaged due to misuse, accidents, or unauthorized repair',
  'Perishable goods or consumable products',
  'Items returned after 30 days of delivery',
  'Products without original packaging or missing accessories',
]

const steps = [
  { num: '01', title: 'Initiate Return', desc: 'Log into your account, go to My Orders, select the item and click "Return Item". Choose the reason and submit your request.' },
  { num: '02', title: 'Approval', desc: 'Our team reviews your request within 1–2 business days. You\'ll receive an approval email with pickup details.' },
  { num: '03', title: 'Pickup', desc: 'We arrange a free pickup from your delivery address. Ensure the item is securely packaged in its original box.' },
  { num: '04', title: 'Inspection', desc: 'Once received, our team inspects the item within 2–3 business days to verify the return condition.' },
  { num: '05', title: 'Refund / Exchange', desc: 'For returns: refund credited within 5–7 business days. For exchanges: replacement dispatched after inspection.' },
]

export default function ReturnsExchanges() {
  return (
    <div className="sup-page">
      <div className="sup-hero">
        <div className="sup-hero-inner">
          <h1 className="sup-hero-title">Returns & Exchanges</h1>
          <p className="sup-hero-sub">Easy 30-day returns and hassle-free exchanges. Your satisfaction is our priority.</p>
        </div>
      </div>

      <div className="sup-container">
        {/* Policy Summary */}
        <section className="sup-section">
          <div className="re-policy-banner">
            <div className="re-policy-item">
              <FiRotateCcw size={22} />
              <div>
                <div className="re-policy-label">Return Window</div>
                <div className="re-policy-value">30 Days</div>
              </div>
            </div>
            <div className="re-policy-item">
              <FiPackage size={22} />
              <div>
                <div className="re-policy-label">Free Pickup</div>
                <div className="re-policy-value">We Come to You</div>
              </div>
            </div>
            <div className="re-policy-item">
              <FiCheck size={22} />
              <div>
                <div className="re-policy-label">Refund Timeline</div>
                <div className="re-policy-value">5–7 Business Days</div>
              </div>
            </div>
          </div>
        </section>

        {/* Eligible / Non-Eligible */}
        <section className="sup-section">
          <h2 className="sup-section-title">What Can Be Returned?</h2>
          <div className="re-eligibility-grid">
            <div className="re-eligible-col">
              <h3 className="re-col-title eligible">Eligible for Return</h3>
              <ul className="re-list">
                {eligibleItems.map((item, i) => (
                  <li key={i} className="re-list-item eligible">
                    <FiCheck size={14} /> <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="re-eligible-col">
              <h3 className="re-col-title not-eligible">Not Eligible for Return</h3>
              <ul className="re-list">
                {nonEligibleItems.map((item, i) => (
                  <li key={i} className="re-list-item not-eligible">
                    <FiX size={14} /> <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Return Process */}
        <section className="sup-section">
          <h2 className="sup-section-title">Return Process</h2>
          <div className="re-steps">
            {steps.map(step => (
              <div key={step.num} className="re-step">
                <div className="re-step-num">{step.num}</div>
                <div>
                  <div className="re-step-title">{step.title}</div>
                  <div className="re-step-desc">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Exchange Info */}
        <section className="sup-section">
          <h2 className="sup-section-title">Exchanges</h2>
          <div className="re-exchange-box">
            <FiAlertCircle size={18} />
            <div>
              <p>Exchanges are available for the same product (different size, color, or variant) or a product of equal value. If the replacement item costs more, you'll only pay the difference. If it costs less, the balance will be refunded.</p>
              <p style={{marginTop:'0.75rem'}}>To request an exchange, follow the same return process and select "Exchange" as your resolution preference.</p>
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

        .re-policy-banner {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;
          background: linear-gradient(135deg, #232F3E, #37475A); border-radius: 16px; padding: 1.5rem 2rem;
        }
        .re-policy-item { display: flex; align-items: center; gap: 0.85rem; color: #fff; }
        .re-policy-item svg { color: #F97316; flex-shrink: 0; }
        .re-policy-label { font-size: 0.72rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.05em; }
        .re-policy-value { font-size: 0.98rem; font-weight: 700; }

        .re-eligibility-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        .re-eligible-col { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 1.25rem; }
        .re-col-title { font-size: 0.9rem; font-weight: 700; margin-bottom: 0.85rem; padding-bottom: 0.5rem; border-bottom: 2px solid; }
        .re-col-title.eligible { color: #16a34a; border-color: #16a34a; }
        .re-col-title.not-eligible { color: #dc2626; border-color: #dc2626; }
        .re-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.6rem; }
        .re-list-item { display: flex; align-items: flex-start; gap: 0.6rem; font-size: 0.85rem; line-height: 1.5; }
        .re-list-item.eligible { color: #166534; }
        .re-list-item.eligible svg { color: #16a34a; flex-shrink: 0; margin-top: 2px; }
        .re-list-item.not-eligible { color: #991b1b; }
        .re-list-item.not-eligible svg { color: #dc2626; flex-shrink: 0; margin-top: 2px; }

        .re-steps { display: flex; flex-direction: column; gap: 0; }
        .re-step {
          display: flex; align-items: flex-start; gap: 1.25rem;
          padding: 1.1rem 1.25rem; background: #fff; border: 1px solid #e2e8f0; border-bottom: none;
        }
        .re-step:first-child { border-radius: 12px 12px 0 0; }
        .re-step:last-child { border-radius: 0 0 12px 12px; border-bottom: 1px solid #e2e8f0; }
        .re-step-num {
          width: 36px; height: 36px; border-radius: 50%; background: #F97316; color: #fff;
          font-size: 0.78rem; font-weight: 700; display: flex; align-items: center;
          justify-content: center; flex-shrink: 0;
        }
        .re-step-title { font-size: 0.92rem; font-weight: 700; color: #1e293b; margin-bottom: 0.2rem; }
        .re-step-desc { font-size: 0.85rem; color: #64748b; line-height: 1.6; }

        .re-exchange-box {
          display: flex; align-items: flex-start; gap: 1rem;
          background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 1.25rem 1.5rem;
          color: #92400e; font-size: 0.88rem; line-height: 1.7;
        }
        .re-exchange-box svg { flex-shrink: 0; color: #F97316; margin-top: 2px; }

        @media (max-width: 768px) {
          .re-policy-banner { grid-template-columns: 1fr; gap: 0.75rem; padding: 1.25rem; }
          .re-eligibility-grid { grid-template-columns: 1fr; }
          .sup-hero { padding: 2rem 1rem; }
          .sup-hero-title { font-size: 1.5rem; }
          .sup-container { padding: 1.5rem 1rem; }
        }
      `}</style>
    </div>
  )
}
