import React from 'react';
import { FileText, UserCheck, Shield, AlertCircle, Scale, Gavel } from 'lucide-react';
import Link from 'next/link';

const TermsAndConditions = () => {
  const lastUpdated = "March 23, 2026";

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-gray-800 dark:text-gray-200 font-sans">
      {/* Header */}
      <header className="bg-purple-700 dark:bg-purple-900 py-16 px-6 text-center text-white">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms & Conditions</h1>
        <p className="text-purple-100 text-lg">Your agreement to use Espirito</p>
        <div className="mt-6 inline-block bg-purple-800 dark:bg-purple-950 px-4 py-2 rounded-full text-sm">
          Last Updated: {lastUpdated}
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-12 px-6 leading-relaxed">
        
        {/* Section 1: Acceptance of Terms */}
        <section className="mb-12">
          <div className="flex items-center mb-4">
            <FileText className="text-purple-700 dark:text-purple-400 mr-3" size={28} />
            <h2 className="text-2xl font-semibold text-purple-900 dark:text-purple-300">1. Acceptance of Terms</h2>
          </div>
          <p className="mb-4">
            By accessing or using <strong>Espirito</strong>, you agree to be bound by these Terms and Conditions. 
            If you do not agree with any part of these terms, you may not use our service.
          </p>
          <p>
            Espirito is a personal productivity and spiritual growth application developed by 
            <strong> Samuel Gyasi and Urbright</strong>. These terms govern your use of the platform, 
            including all features, services, and content.
          </p>
        </section>

        {/* Section 2: User Accounts */}
        <section className="mb-12 bg-purple-50 dark:bg-slate-900 p-8 rounded-2xl border border-purple-100 dark:border-purple-900">
          <div className="flex items-center mb-4">
            <UserCheck className="text-purple-700 dark:text-purple-400 mr-3" size={28} />
            <h2 className="text-2xl font-semibold text-purple-900 dark:text-purple-300">2. User Accounts & Responsibilities</h2>
          </div>
          <ul className="list-disc ml-6 space-y-3">
            <li><strong>Account Creation:</strong> You must provide accurate and complete information when creating your account.</li>
            <li><strong>Account Security:</strong> You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li><strong>Age Requirement:</strong> You must be at least 13 years old to use Espirito. Users under 18 should have parental consent.</li>
            <li><strong>One Account:</strong> Each user is permitted one account. Multiple accounts for the same person are not allowed.</li>
            <li><strong>Account Termination:</strong> We reserve the right to suspend or terminate accounts that violate these terms.</li>
          </ul>
        </section>

        {/* Section 3: Acceptable Use */}
        <section className="mb-12">
          <div className="flex items-center mb-4">
            <Shield className="text-purple-700 dark:text-purple-400 mr-3" size={28} />
            <h2 className="text-2xl font-semibold text-purple-900 dark:text-purple-300">3. Acceptable Use Policy</h2>
          </div>
          <p className="mb-4">You agree <strong>NOT</strong> to use Espirito to:</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-950/20">
              <span className="font-bold text-red-700 dark:text-red-400 block mb-1">❌ Prohibited Content</span>
              Post illegal, harmful, threatening, abusive, or offensive content
            </div>
            <div className="p-4 border border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-950/20">
              <span className="font-bold text-red-700 dark:text-red-400 block mb-1">❌ Spam & Fraud</span>
              Engage in spamming, phishing, or fraudulent activities
            </div>
            <div className="p-4 border border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-950/20">
              <span className="font-bold text-red-700 dark:text-red-400 block mb-1">❌ Impersonation</span>
              Impersonate others or misrepresent your identity
            </div>
            <div className="p-4 border border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-950/20">
              <span className="font-bold text-red-700 dark:text-red-400 block mb-1">❌ System Interference</span>
              Attempt to hack, disrupt, or damage our systems
            </div>
          </div>
        </section>

        {/* Section 4: Intellectual Property */}
        <section className="mb-12">
          <div className="flex items-center mb-4">
            <Scale className="text-purple-700 dark:text-purple-400 mr-3" size={28} />
            <h2 className="text-2xl font-semibold text-purple-900 dark:text-purple-300">4. Intellectual Property</h2>
          </div>
          <p className="mb-4">
            All content, features, and functionality of Espirito, including but not limited to text, graphics, 
            logos, icons, images, and software, are the exclusive property of <strong>Samuel Gyasi and Urbright</strong>.
          </p>
          <p>
            <strong>Your Content:</strong> You retain ownership of the content you create (goals, visions, posts, etc.). 
            By using Espirito, you grant us a license to store, display, and process this content to provide our services.
          </p>
        </section>

        {/* Section 5: Service Availability */}
        <section className="mb-12 bg-amber-50 dark:bg-amber-950/20 p-8 rounded-2xl border border-amber-200 dark:border-amber-900">
          <div className="flex items-center mb-4">
            <AlertCircle className="text-amber-700 dark:text-amber-400 mr-3" size={28} />
            <h2 className="text-2xl font-semibold text-amber-900 dark:text-amber-300">5. Service Availability & Modifications</h2>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-amber-600 dark:text-amber-400 mt-1">⚠️</span>
              <p>
                Espirito is provided "as is" without warranties. We do not guarantee uninterrupted or error-free service.
              </p>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 dark:text-amber-400 mt-1">⚠️</span>
              <p>
                We reserve the right to modify, suspend, or discontinue any feature or the entire service at any time.
              </p>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 dark:text-amber-400 mt-1">⚠️</span>
              <p>
                We may update these Terms and Conditions periodically. Continued use after changes constitutes acceptance.
              </p>
            </li>
          </ul>
        </section>

        {/* Section 6: Limitation of Liability */}
        <section className="mb-12">
          <div className="flex items-center mb-4">
            <Gavel className="text-purple-700 dark:text-purple-400 mr-3" size={28} />
            <h2 className="text-2xl font-semibold text-purple-900 dark:text-purple-300">6. Limitation of Liability</h2>
          </div>
          <p className="mb-4">
            To the fullest extent permitted by law, <strong>Espirito, Samuel Gyasi, and Urbright</strong> shall not be 
            liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service.
          </p>
          <p>
            This includes but is not limited to: loss of data, loss of profits, or interruption of service.
          </p>
        </section>

        {/* Section 7: Termination */}
        <section className="mb-12">
          <div className="flex items-center mb-4">
            <AlertCircle className="text-purple-700 dark:text-purple-400 mr-3" size={28} />
            <h2 className="text-2xl font-semibold text-purple-900 dark:text-purple-300">7. Account Termination</h2>
          </div>
          <p className="mb-4">
            You may terminate your account at any time through the app settings. Upon termination:
          </p>
          <ul className="list-disc ml-6 space-y-2">
            <li>Your access to Espirito will be immediately revoked</li>
            <li>Your data will be deleted according to our Privacy Policy</li>
            <li>Shared goals with partners will be unlinked but not deleted from their accounts</li>
          </ul>
          <p className="mt-4">
            We may terminate or suspend your account if you violate these terms, with or without notice.
          </p>
        </section>

        {/* Section 8: Governing Law */}
        <section className="mb-12">
          <div className="flex items-center mb-4">
            <Scale className="text-purple-700 dark:text-purple-400 mr-3" size={28} />
            <h2 className="text-2xl font-semibold text-purple-900 dark:text-purple-300">8. Governing Law</h2>
          </div>
          <p>
            These Terms and Conditions are governed by and construed in accordance with the laws of 
            <strong> Morocco</strong>, without regard to its conflict of law provisions. Any disputes 
            arising from these terms will be resolved in the courts of Rabat, Morocco.
          </p>
        </section>

        {/* Contact Section */}
        <section className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-800 text-center">
          <h2 className="text-2xl font-semibold text-purple-900 dark:text-purple-300 mb-4">Questions or Concerns?</h2>
          <p className="mb-4">
            If you have any questions about these Terms and Conditions, please contact us:
          </p>
          <p className="mb-2 font-medium">Samuel Gyasi & Urbright</p>
          <a href="mailto:tech@samuelgyasi.com" className="text-purple-700 dark:text-purple-400 hover:underline font-bold text-lg">
            tech@samuelgyasi.com
          </a>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 italic">Rabat, Morocco</p>
        </section>

        {/* Back to Home */}
        <div className="mt-12 text-center">
          <Link 
            href="/" 
            className="inline-block px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-full transition-colors"
          >
            Back to Home
          </Link>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-slate-900 py-8 text-center text-gray-400 text-sm border-t border-gray-100 dark:border-gray-800">
        <div className="flex justify-center gap-6 mb-4">
          <Link href="/privacy" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
            Terms & Conditions
          </Link>
        </div>
        <p>&copy; {new Date().getFullYear()} Espirito. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default TermsAndConditions;
