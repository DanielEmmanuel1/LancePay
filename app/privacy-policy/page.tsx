import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export const metadata = {
  title: 'Privacy Policy - LancePay',
  description: 'LancePay Privacy Policy',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-24">
        <h1 className="text-4xl font-bold text-brand-black mb-8">Privacy Policy</h1>
        <p className="text-brand-gray mb-4">Last updated: December 2024</p>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-brand-black mt-8 mb-4">1. Information We Collect</h2>
            <p className="text-brand-gray leading-relaxed">
              We collect information you provide directly, including your email address, name, phone number, 
              and bank account details when you use LancePay. We also collect wallet addresses associated with 
              your account for payment processing.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-brand-black mt-8 mb-4">2. How We Use Your Information</h2>
            <p className="text-brand-gray leading-relaxed">
              We use your information to provide our payment services, process transactions, send invoices, 
              facilitate withdrawals to your bank account, and communicate with you about your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-brand-black mt-8 mb-4">3. Information Sharing</h2>
            <p className="text-brand-gray leading-relaxed">
              We share information with payment processors (MoonPay, Yellow Card) to facilitate transactions, 
              authentication providers (Privy) for account security, and as required by law. We do not sell 
              your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-brand-black mt-8 mb-4">4. Data Security</h2>
            <p className="text-brand-gray leading-relaxed">
              We implement industry-standard security measures to protect your data, including encryption 
              in transit and at rest, secure authentication, and regular security audits.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-brand-black mt-8 mb-4">5. Your Rights</h2>
            <p className="text-brand-gray leading-relaxed">
              You may access, update, or delete your personal information at any time through your account 
              settings. For data deletion requests, please contact us at privacy@lancepay.com.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-brand-black mt-8 mb-4">6. Contact Us</h2>
            <p className="text-brand-gray leading-relaxed">
              If you have questions about this Privacy Policy, please contact us at privacy@lancepay.com.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
