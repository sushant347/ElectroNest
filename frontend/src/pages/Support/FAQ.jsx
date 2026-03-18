import { useState } from 'react'
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'

const faqs = [
  {
    category: 'Orders & Payments',
    items: [
      { q: 'How do I place an order?', a: 'Browse our products, add items to your cart, and proceed to checkout. You can pay using eSewa, Khalti, or Cash on Delivery. You\'ll receive an order confirmation email once payment is processed.' },
      { q: 'What payment methods do you accept?', a: 'We accept eSewa, Khalti, bank transfer, and Cash on Delivery (COD) for orders within Kathmandu Valley. COD availability may vary by location.' },
      { q: 'Can I cancel my order?', a: 'You can cancel your order within 2 hours of placing it, as long as it hasn\'t been dispatched. Go to My Orders and click "Cancel Order". Once dispatched, you\'ll need to initiate a return instead.' },
      { q: 'How do I track my order?', a: 'After your order is shipped, you\'ll receive a tracking number via email and SMS. You can also track your order under My Orders in your account.' },
    ]
  },
  {
    category: 'Shipping & Delivery',
    items: [
      { q: 'How long does delivery take?', a: 'Within Kathmandu Valley: 1–2 business days. Outside Valley: 3–7 business days depending on location. Orders placed before 2 PM on business days are usually dispatched the same day.' },
      { q: 'Is there free shipping?', a: 'Yes! Orders over Rs. 5,000 qualify for free shipping within Nepal. For orders below this amount, a flat shipping fee of Rs. 100–150 applies depending on your location.' },
      { q: 'Do you deliver outside Nepal?', a: 'Currently, we only deliver within Nepal. We are working on expanding our delivery network and will announce international shipping when available.' },
    ]
  },
  {
    category: 'Returns & Refunds',
    items: [
      { q: 'What is your return policy?', a: 'We offer a 30-day return policy on most items. Products must be in original condition, unused, and in original packaging. Some items like opened software or personalized products are non-returnable.' },
      { q: 'How do I initiate a return?', a: 'Go to My Orders, select the item, and click "Return Item". Fill in the reason and submit. Our team will review within 1–2 business days and arrange pickup.' },
      { q: 'When will I receive my refund?', a: 'Refunds are processed within 5–7 business days after we receive and inspect the returned item. The refund will be credited to your original payment method.' },
    ]
  },
  {
    category: 'Products & Warranty',
    items: [
      { q: 'Are all products genuine?', a: 'Yes, all products sold on ElectroNest are 100% genuine and sourced directly from authorized distributors and brand representatives.' },
      { q: 'Do products come with warranty?', a: 'All products include the standard manufacturer\'s warranty. The warranty period varies by brand and product category — typically 1 year for electronics. Check each product page for specific warranty details.' },
      { q: 'How do I claim warranty?', a: 'You can claim warranty by contacting our support team at support@electronest.com with your order number and a description of the issue. We\'ll guide you through the process.' },
    ]
  },
]

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`faq-item ${open ? 'open' : ''}`}>
      <button className="faq-question" onClick={() => setOpen(o => !o)}>
        <span>{q}</span>
        {open ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
      </button>
      {open && <div className="faq-answer">{a}</div>}
    </div>
  )
}

export default function FAQ() {
  return (
    <div className="sup-page">
      <div className="sup-hero">
        <div className="sup-hero-inner">
          <h1 className="sup-hero-title">Frequently Asked Questions</h1>
          <p className="sup-hero-sub">Find quick answers to common questions about orders, shipping, returns, and more.</p>
        </div>
      </div>

      <div className="sup-container">
        {faqs.map(section => (
          <div key={section.category} className="faq-section">
            <h2 className="faq-category-title">{section.category}</h2>
            <div className="faq-list">
              {section.items.map(item => (
                <FAQItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        ))}

        <div className="faq-cta">
          <p>Still have questions? <a href="mailto:support@electronest.com">Email our support team</a> or call <strong>+977 9869465432</strong>.</p>
        </div>
      </div>

      <style>{`
        .sup-page { min-height: 100vh; background: #f8fafc; font-family: 'Inter', system-ui, sans-serif; }
        .sup-hero { background: linear-gradient(135deg, #232F3E 0%, #37475A 100%); padding: 3rem 2rem; }
        .sup-hero-inner { max-width: 860px; margin: 0 auto; }
        .sup-hero-title { color: #fff; font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem; }
        .sup-hero-sub { color: rgba(255,255,255,0.6); font-size: 1rem; }

        .sup-container { max-width: 860px; margin: 0 auto; padding: 2.5rem 2rem; }

        .faq-section { margin-bottom: 2.5rem; }
        .faq-category-title {
          font-size: 1.05rem; font-weight: 700; color: #F97316;
          border-bottom: 2px solid #F97316; padding-bottom: 0.5rem; margin-bottom: 1rem;
          display: inline-block;
        }
        .faq-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .faq-item {
          background: #fff; border: 1.5px solid #e2e8f0; border-radius: 10px; overflow: hidden;
          transition: border-color 0.15s;
        }
        .faq-item.open { border-color: #F97316; }
        .faq-question {
          display: flex; justify-content: space-between; align-items: center; gap: 1rem;
          width: 100%; padding: 1rem 1.25rem; background: none; border: none;
          font-size: 0.92rem; font-weight: 600; color: #1e293b; cursor: pointer;
          text-align: left; font-family: inherit;
        }
        .faq-question:hover { background: #fafbfc; }
        .faq-question svg { flex-shrink: 0; color: #F97316; }
        .faq-answer { padding: 0 1.25rem 1rem; font-size: 0.88rem; color: #64748b; line-height: 1.7; }

        .faq-cta {
          background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
          padding: 1.25rem 1.5rem; text-align: center; font-size: 0.9rem; color: #64748b;
        }
        .faq-cta a { color: #F97316; font-weight: 600; text-decoration: none; }
        .faq-cta a:hover { text-decoration: underline; }

        @media (max-width: 640px) {
          .sup-hero { padding: 2rem 1rem; }
          .sup-hero-title { font-size: 1.5rem; }
          .sup-container { padding: 1.5rem 1rem; }
          .faq-question { font-size: 0.85rem; padding: 0.85rem 1rem; }
          .faq-answer { padding: 0 1rem 0.85rem; }
        }
      `}</style>
    </div>
  )
}
