import { FiTruck, FiMapPin, FiClock, FiPackage, FiAlertCircle } from 'react-icons/fi'

const zones = [
  { zone: 'Kathmandu Valley', locations: 'Kathmandu, Lalitpur, Bhaktapur', time: '1–2 Business Days', cost: 'Free over Rs. 5,000 · Rs. 100 below', icon: FiMapPin },
  { zone: 'Major Cities', locations: 'Pokhara, Biratnagar, Birgunj, Butwal', time: '2–4 Business Days', cost: 'Free over Rs. 5,000 · Rs. 120 below', icon: FiTruck },
  { zone: 'Other Districts', locations: 'All other areas of Nepal', time: '4–7 Business Days', cost: 'Free over Rs. 5,000 · Rs. 150 below', icon: FiPackage },
]

export default function ShippingInfo() {
  return (
    <div className="sup-page">
      <div className="sup-hero">
        <div className="sup-hero-inner">
          <h1 className="sup-hero-title">Shipping Information</h1>
          <p className="sup-hero-sub">Everything you need to know about how we deliver your orders.</p>
        </div>
      </div>

      <div className="sup-container">
        {/* Delivery Zones */}
        <section className="sup-section">
          <h2 className="sup-section-title">Delivery Zones & Timelines</h2>
          <div className="ship-zones-grid">
            {zones.map(z => {
              const Icon = z.icon
              return (
                <div key={z.zone} className="ship-zone-card">
                  <div className="ship-zone-icon"><Icon size={22} /></div>
                  <h3 className="ship-zone-title">{z.zone}</h3>
                  <p className="ship-zone-locations">{z.locations}</p>
                  <div className="ship-zone-meta">
                    <div className="ship-meta-row"><FiClock size={13} /> <span>{z.time}</span></div>
                    <div className="ship-meta-row"><FiTruck size={13} /> <span>{z.cost}</span></div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* How It Works */}
        <section className="sup-section">
          <h2 className="sup-section-title">How Shipping Works</h2>
          <div className="ship-steps">
            {[
              { num: '01', title: 'Place Your Order', desc: 'Add items to cart and complete checkout. You\'ll receive an order confirmation instantly.' },
              { num: '02', title: 'Order Processing', desc: 'We verify and process your order within 2–4 hours on business days. You\'ll get a dispatch notification.' },
              { num: '03', title: 'Pickup & Dispatch', desc: 'Our logistics partner picks up your parcel and dispatches it from our Kathmandu warehouse.' },
              { num: '04', title: 'Out for Delivery', desc: 'You\'ll receive an SMS and email when your order is out for delivery. Track it using your tracking ID.' },
              { num: '05', title: 'Delivered!', desc: 'Package delivered to your doorstep. Sign and inspect before accepting. Contact us if there\'s any issue.' },
            ].map(step => (
              <div key={step.num} className="ship-step">
                <div className="ship-step-num">{step.num}</div>
                <div>
                  <div className="ship-step-title">{step.title}</div>
                  <div className="ship-step-desc">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Notes */}
        <section className="sup-section">
          <h2 className="sup-section-title">Important Notes</h2>
          <div className="ship-notes">
            {[
              'Orders placed before 2 PM (NST) on business days are dispatched the same day.',
              'Delivery times are estimates and may vary during festivals, public holidays, or adverse weather.',
              'Ensure your delivery address and phone number are correct — we cannot be responsible for non-delivery due to incorrect details.',
              'For fragile or high-value items, additional packaging is used. Handle with care upon receipt.',
              'We currently deliver within Nepal only. International shipping is not available.',
            ].map((note, i) => (
              <div key={i} className="ship-note">
                <FiAlertCircle size={15} />
                <span>{note}</span>
              </div>
            ))}
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
        .sup-section { margin-bottom: 3rem; }
        .sup-section-title { font-size: 1.2rem; font-weight: 700; color: #1e293b; margin-bottom: 1.25rem; }

        .ship-zones-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; }
        .ship-zone-card {
          background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 1.5rem;
        }
        .ship-zone-icon {
          width: 44px; height: 44px; border-radius: 10px;
          background: rgba(249,115,22,0.1); color: #F97316;
          display: flex; align-items: center; justify-content: center; margin-bottom: 0.85rem;
        }
        .ship-zone-title { font-size: 1rem; font-weight: 700; color: #1e293b; margin-bottom: 0.3rem; }
        .ship-zone-locations { font-size: 0.82rem; color: #94a3b8; margin-bottom: 0.85rem; line-height: 1.5; }
        .ship-zone-meta { display: flex; flex-direction: column; gap: 0.4rem; }
        .ship-meta-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; color: #64748b; }
        .ship-meta-row svg { color: #F97316; flex-shrink: 0; }

        .ship-steps { display: flex; flex-direction: column; gap: 0; }
        .ship-step {
          display: flex; align-items: flex-start; gap: 1.25rem;
          padding: 1.1rem 1.25rem; background: #fff; border: 1px solid #e2e8f0;
          border-bottom: none;
        }
        .ship-step:first-child { border-radius: 12px 12px 0 0; }
        .ship-step:last-child { border-radius: 0 0 12px 12px; border-bottom: 1px solid #e2e8f0; }
        .ship-step-num {
          width: 36px; height: 36px; border-radius: 50%; background: #F97316; color: #fff;
          font-size: 0.78rem; font-weight: 700; display: flex; align-items: center;
          justify-content: center; flex-shrink: 0;
        }
        .ship-step-title { font-size: 0.92rem; font-weight: 700; color: #1e293b; margin-bottom: 0.2rem; }
        .ship-step-desc { font-size: 0.85rem; color: #64748b; line-height: 1.6; }

        .ship-notes { display: flex; flex-direction: column; gap: 0.75rem; }
        .ship-note {
          display: flex; align-items: flex-start; gap: 0.75rem;
          padding: 0.85rem 1.1rem; background: #fff7ed; border: 1px solid #fed7aa;
          border-radius: 8px; font-size: 0.88rem; color: #92400e;
        }
        .ship-note svg { flex-shrink: 0; color: #F97316; margin-top: 1px; }

        @media (max-width: 768px) {
          .ship-zones-grid { grid-template-columns: 1fr; }
          .sup-hero { padding: 2rem 1rem; }
          .sup-hero-title { font-size: 1.5rem; }
          .sup-container { padding: 1.5rem 1rem; }
        }
        @media (max-width: 480px) {
          .ship-zones-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
