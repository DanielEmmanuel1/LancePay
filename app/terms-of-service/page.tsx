import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export const metadata = {
  title: 'Terms of Service - LancePay',
  description: 'LancePay Terms of Service',
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-24">
        <h1 className="text-4xl font-bold text-brand-black mb-8">Terms of Service</h1>
        <p className="text-brand-gray mb-4">Last updated: December 2024</p>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-brand-black mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="text-brand-gray leading-relaxed">
              By accessing or using LancePay, you agree to be bound by these Terms of Service. If you do not 
              agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-brand-black mt-8 mb-4">2. Description of Services</h2>
            <p className="text-brand-gray leading-relaxed">
              LancePay provides payment infrastructure for freelancers to create invoices, receive international 
              payments, and withdraw funds to Nigerian bank accounts. We facilitate transactions through 
              blockchain technology and partner payment processors.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-brand-black mt-8 mb-4">3. User Responsibilities</h2>
            <p className="text-brand-gray leading-relaxed">
              You are responsible for maintaining the security of your account, providing accurate information, 
              and complying with applicable laws. You must not use LancePay for illegal activities, money 
              laundering, or fraud.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-brand-black mt-8 mb-4">4. Fees and Payments</h2>
            <p className="text-brand-gray leading-relaxed">
              LancePay charges fees for payment processing and withdrawals. Current fees are displayed in your 
              dashboard. We reserve the right to modify fees with 30 days notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-brand-black mt-8 mb-4">5. Limitation of Liability</h2>
            <p className="text-brand-gray leading-relaxed">
              LancePay is provided "as is" without warranties. We are not liable for indirect, incidental, 
              or consequential damages arising from your use of our services. Our liability is limited to 
              the fees paid by you in the preceding 12 months.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-brand-black mt-8 mb-4">6. Account Termination</h2>
            <p className="text-brand-gray leading-relaxed">
              We may suspend or terminate your account for violations of these terms, suspected fraud, 
              or as required by law. You may close your account at any time through your settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-brand-black mt-8 mb-4">7. Governing Law</h2>
            <p className="text-brand-gray leading-relaxed">
              These terms are governed by the laws of Nigeria. Any disputes shall be resolved in the courts 
              of Lagos, Nigeria.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-brand-black mt-8 mb-4">8. Contact</h2>
            <p className="text-brand-gray leading-relaxed">
              For questions about these Terms of Service, please contact us at legal@lancepay.com.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
