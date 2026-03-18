export default function PrivacyPolicy() {
  return (
    <div className="sup-page">
      <div className="sup-hero">
        <div className="sup-hero-inner">
          <h1 className="sup-hero-title">Privacy Policy</h1>
          <p className="sup-hero-sub">Last updated: March 2025 · Effective immediately</p>
        </div>
      </div>

      <div className="sup-container">
        <div className="policy-doc">

          <section className="policy-section">
            <h2>1. Introduction</h2>
            <p>Welcome to ElectroNest ("we", "our", "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.</p>
            <p>By using ElectroNest, you agree to the collection and use of information in accordance with this policy.</p>
          </section>

          <section className="policy-section">
            <h2>2. Information We Collect</h2>
            <p>We collect information you provide directly to us, including:</p>
            <ul>
              <li><strong>Account Information:</strong> Name, email address, password, and phone number when you create an account.</li>
              <li><strong>Transaction Data:</strong> Purchase history, billing address, shipping address, and payment method details (we do not store full card numbers).</li>
              <li><strong>Communications:</strong> Messages you send to our support team, reviews, and feedback.</li>
              <li><strong>Usage Data:</strong> Pages visited, products viewed, search queries, and interactions with our platform.</li>
              <li><strong>Device Information:</strong> IP address, browser type, operating system, and device identifiers.</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Process and fulfill your orders</li>
              <li>Send order confirmations, shipping updates, and receipts</li>
              <li>Provide customer support and respond to inquiries</li>
              <li>Personalize your shopping experience and show relevant products</li>
              <li>Send promotional emails and offers (you can opt out at any time)</li>
              <li>Detect, prevent, and address fraud or security issues</li>
              <li>Improve our website, products, and services</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>4. Sharing of Information</h2>
            <p>We do not sell, trade, or rent your personal information to third parties. We may share your information with:</p>
            <ul>
              <li><strong>Service Providers:</strong> Trusted partners who assist in payment processing, order delivery, and customer support. They are bound by confidentiality agreements.</li>
              <li><strong>Legal Compliance:</strong> When required by law, court order, or governmental authority.</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, user data may be transferred.</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>5. Data Security</h2>
            <p>We implement industry-standard security measures to protect your data, including SSL encryption for data transmission, secure password hashing, and restricted access to personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.</p>
          </section>

          <section className="policy-section">
            <h2>6. Cookies</h2>
            <p>We use cookies and similar tracking technologies to enhance your experience. Cookies help us remember your preferences, keep you logged in, and understand how you use our site. You can control cookie settings through your browser preferences. Note that disabling cookies may affect certain features.</p>
          </section>

          <section className="policy-section">
            <h2>7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your personal data (subject to legal obligations)</li>
              <li>Opt out of marketing communications</li>
              <li>Lodge a complaint with the relevant data protection authority</li>
            </ul>
            <p>To exercise these rights, contact us at <a href="mailto:support@electronest.com">support@electronest.com</a>.</p>
          </section>

          <section className="policy-section">
            <h2>8. Children's Privacy</h2>
            <p>Our services are not directed to children under the age of 13. We do not knowingly collect personal information from children. If you believe we have collected data from a child, please contact us immediately.</p>
          </section>

          <section className="policy-section">
            <h2>9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by email or a prominent notice on our website. Continued use of our services after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section className="policy-section">
            <h2>10. Contact Us</h2>
            <p>If you have questions about this Privacy Policy, please contact us:</p>
            <ul className="policy-contact-list">
              <li><strong>Email:</strong> <a href="mailto:support@electronest.com">support@electronest.com</a></li>
              <li><strong>Phone:</strong> +977 9869465432</li>
              <li><strong>Address:</strong> Sankhamul, Kathmandu, Nepal 44600</li>
            </ul>
          </section>

        </div>
      </div>

      <style>{`
        .sup-page { min-height: 100vh; background: #f8fafc; font-family: 'Inter', system-ui, sans-serif; }
        .sup-hero { background: linear-gradient(135deg, #232F3E 0%, #37475A 100%); padding: 3rem 2rem; }
        .sup-hero-inner { max-width: 800px; margin: 0 auto; }
        .sup-hero-title { color: #fff; font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem; }
        .sup-hero-sub { color: rgba(255,255,255,0.5); font-size: 0.9rem; }

        .sup-container { max-width: 800px; margin: 0 auto; padding: 2.5rem 2rem; }

        .policy-doc { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 2.5rem; }
        .policy-section { margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 1px solid #f1f5f9; }
        .policy-section:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }

        .policy-section h2 {
          font-size: 1.05rem; font-weight: 700; color: #1e293b; margin-bottom: 0.75rem;
        }
        .policy-section p {
          font-size: 0.9rem; color: #475569; line-height: 1.8; margin-bottom: 0.75rem;
        }
        .policy-section p:last-child { margin-bottom: 0; }
        .policy-section ul {
          list-style: disc; padding-left: 1.5rem; margin: 0.5rem 0;
          display: flex; flex-direction: column; gap: 0.4rem;
        }
        .policy-section li { font-size: 0.9rem; color: #475569; line-height: 1.7; }
        .policy-section a { color: #F97316; }
        .policy-section a:hover { color: #ea580c; }
        .policy-contact-list { list-style: none; padding: 0; }

        @media (max-width: 640px) {
          .sup-hero { padding: 2rem 1rem; }
          .sup-hero-title { font-size: 1.5rem; }
          .sup-container { padding: 1rem; }
          .policy-doc { padding: 1.25rem; }
        }
      `}</style>
    </div>
  )
}
