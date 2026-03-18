export default function TermsOfService() {
  return (
    <div className="sup-page">
      <div className="sup-hero">
        <div className="sup-hero-inner">
          <h1 className="sup-hero-title">Terms of Service</h1>
          <p className="sup-hero-sub">Last updated: March 2025 · Please read these terms carefully before using ElectroNest.</p>
        </div>
      </div>

      <div className="sup-container">
        <div className="policy-doc">

          <section className="policy-section">
            <h2>1. Acceptance of Terms</h2>
            <p>By accessing or using the ElectroNest website and services, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our services.</p>
          </section>

          <section className="policy-section">
            <h2>2. Use of the Platform</h2>
            <p>You agree to use ElectroNest only for lawful purposes and in accordance with these terms. You agree not to:</p>
            <ul>
              <li>Use the platform for any fraudulent or illegal activities</li>
              <li>Attempt to gain unauthorized access to any part of the platform</li>
              <li>Interfere with or disrupt the platform's operation</li>
              <li>Post or transmit harmful, offensive, or misleading content</li>
              <li>Use automated tools to scrape, crawl, or harvest data</li>
              <li>Impersonate any person or entity</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>3. Account Responsibilities</h2>
            <p>When you create an account with us:</p>
            <ul>
              <li>You must provide accurate, current, and complete information</li>
              <li>You are responsible for maintaining the confidentiality of your password</li>
              <li>You are responsible for all activities that occur under your account</li>
              <li>You must notify us immediately of any unauthorized use of your account</li>
              <li>You must be at least 18 years old, or have parental consent, to create an account</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>4. Orders and Payments</h2>
            <p>By placing an order on ElectroNest, you warrant that:</p>
            <ul>
              <li>You are legally capable of entering into binding contracts</li>
              <li>All personal and payment information you provide is accurate</li>
              <li>You are authorized to use the payment method provided</li>
            </ul>
            <p>We reserve the right to refuse or cancel orders for reasons including product availability, pricing errors, or suspected fraudulent activity. Payment must be completed before orders are dispatched.</p>
          </section>

          <section className="policy-section">
            <h2>5. Pricing and Product Information</h2>
            <p>We strive to provide accurate product descriptions, images, and pricing. However, errors may occasionally occur. In the event of a pricing error, we will notify you and give you the option to proceed at the correct price or cancel the order.</p>
            <p>Prices are inclusive of applicable taxes unless otherwise stated. Shipping fees are calculated at checkout based on your delivery location.</p>
          </section>

          <section className="policy-section">
            <h2>6. Intellectual Property</h2>
            <p>All content on ElectroNest — including text, images, logos, graphics, and software — is the property of ElectroNest or its content suppliers and is protected by applicable copyright and trademark laws. You may not reproduce, distribute, or create derivative works without our express written permission.</p>
          </section>

          <section className="policy-section">
            <h2>7. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, ElectroNest shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our services. Our total liability for any claim related to our services shall not exceed the amount you paid for the specific product or service giving rise to the claim.</p>
          </section>

          <section className="policy-section">
            <h2>8. Disclaimer of Warranties</h2>
            <p>Our services are provided "as is" and "as available" without any warranties of any kind, either express or implied. We do not warrant that our services will be uninterrupted, error-free, or free of viruses or other harmful components.</p>
          </section>

          <section className="policy-section">
            <h2>9. Third-Party Links</h2>
            <p>Our website may contain links to third-party websites. These links are provided for your convenience only. We have no control over the content of those sites and accept no responsibility for them or for any loss or damage that may arise from your use of them.</p>
          </section>

          <section className="policy-section">
            <h2>10. Governing Law</h2>
            <p>These Terms of Service shall be governed by and construed in accordance with the laws of Nepal. Any disputes arising from these terms or your use of our services shall be subject to the exclusive jurisdiction of the courts of Kathmandu, Nepal.</p>
          </section>

          <section className="policy-section">
            <h2>11. Changes to Terms</h2>
            <p>We reserve the right to modify these Terms of Service at any time. Changes will be effective immediately upon posting to the website. Your continued use of our services after changes constitutes your acceptance of the new terms.</p>
          </section>

          <section className="policy-section">
            <h2>12. Contact Us</h2>
            <p>For questions about these Terms of Service, please contact us:</p>
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

        .policy-section h2 { font-size: 1.05rem; font-weight: 700; color: #1e293b; margin-bottom: 0.75rem; }
        .policy-section p { font-size: 0.9rem; color: #475569; line-height: 1.8; margin-bottom: 0.75rem; }
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
