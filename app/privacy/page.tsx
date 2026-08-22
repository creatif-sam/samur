import React from 'react';
import { Shield, Lock, Users, Database, Trash2, Mail, Bell, Baby, RefreshCw, Globe } from 'lucide-react';
import Link from 'next/link';

const PrivacyPolicy = () => {
  const lastUpdated = "August 22, 2026";

  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans">
      {/* Header */}
      <header className="bg-purple-700 py-16 px-6 text-center text-white">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-purple-100 text-lg">How we protect your journey on Mastery</p>
        <div className="mt-6 inline-block bg-purple-800 px-4 py-2 rounded-full text-sm">
          Last Updated: {lastUpdated}
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-12 px-6 leading-relaxed">

        {/* Section 1: Introduction */}
        <section className="mb-12">
          <div className="flex items-center mb-4">
            <Shield className="text-purple-700 mr-3" size={28} />
            <h2 className="text-2xl font-semibold text-purple-900">1. Introduction</h2>
          </div>
          <p>
            Welcome to <strong>Mastery</strong> ("we," "us," "our"), developed by <strong>Samuel Gyasi and Urbright</strong>.
            Mastery is a personal growth app covering planning, goals, journaling, meditation, prayer,
            Bible reading, and budgeting, available as a web app (mastery.samuelgyasi.com), an installable
            PWA, and an Android app on Google Play. This Privacy Policy explains what information we collect,
            how we use it, who we share it with, and the choices you have — including the deletion tools
            available in the app.
          </p>
          <p className="mt-4">
            By using Mastery, you agree to the collection and use of information as described here. If you
            do not agree, please do not use the app.
          </p>
        </section>

        {/* Section 2: Data Collection */}
        <section className="mb-12 bg-purple-50 p-8 rounded-2xl border border-purple-100">
          <div className="flex items-center mb-4">
            <Database className="text-purple-700 mr-3" size={28} />
            <h2 className="text-2xl font-semibold text-purple-900">2. Data We Collect</h2>
          </div>
          <ul className="list-disc ml-6 space-y-3">
            <li><strong>Account information:</strong> Email address, name, and password (handled securely via Supabase Auth). We never see or store your plaintext password.</li>
            <li><strong>Profile content:</strong> Profile photo, business card details, and any videos/images you choose to upload.</li>
            <li><strong>Personal content you create:</strong> Goals and vision boards (including images), daily planner entries and tasks, journal/notebook entries, meditation and prayer logs, Bible reading progress, quizzes, and work logs.</li>
            <li><strong>Financial data:</strong> Budget categories, transactions, and money-planner entries you manually enter. We do not connect to bank accounts or process payments — this data is for your personal tracking only.</li>
            <li><strong>Community content:</strong> Posts, comments, and goals you explicitly share with a partner or the community feed.</li>
            <li><strong>Notifications data:</strong> Push notification subscription details (a device/browser push token or Expo push token) and your notification preferences, used solely to deliver reminders to your device.</li>
            <li><strong>Technical data:</strong> Basic device and usage information (e.g. browser type, device type) needed for app stability and troubleshooting.</li>
          </ul>
        </section>

        {/* Section 3: Usage */}
        <section className="mb-12">
          <div className="flex items-center mb-4">
            <Lock className="text-purple-700 mr-3" size={28} />
            <h2 className="text-2xl font-semibold text-purple-900">3. How We Use Your Data</h2>
          </div>
          <p className="mb-4">We use your information strictly to operate and improve Mastery:</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-100 rounded-lg shadow-sm">
              <span className="font-bold text-purple-700 block mb-1">App Functionality</span>
              Storing and syncing your goals, journal, planner, and other content across your devices.
            </div>
            <div className="p-4 border border-gray-100 rounded-lg shadow-sm">
              <span className="font-bold text-purple-700 block mb-1">Reminders & Notifications</span>
              Sending scheduled reminders (task, planner, reading, prayer, goal-deadline) that you can turn on or off.
            </div>
            <div className="p-4 border border-gray-100 rounded-lg shadow-sm">
              <span className="font-bold text-purple-700 block mb-1">Partnership Features</span>
              Enabling shared goals, accountability, and community posts you choose to share.
            </div>
            <div className="p-4 border border-gray-100 rounded-lg shadow-sm">
              <span className="font-bold text-purple-700 block mb-1">Security & Support</span>
              Authenticating your account, preventing abuse, and responding to support requests.
            </div>
          </div>
        </section>

        {/* Section 4: Notifications */}
        <section className="mb-12">
          <div className="flex items-center mb-4">
            <Bell className="text-purple-700 mr-3" size={28} />
            <h2 className="text-2xl font-semibold text-purple-900">4. Push Notifications</h2>
          </div>
          <p>
            If you enable notifications, we store a push subscription token (web push endpoint/keys, or an
            Expo push token for the Android/mobile app) tied to your account so we can deliver reminders.
            Web notifications are sent via the Web Push standard; the Android app uses Expo's push
            notification service to deliver messages to your device. You can disable any notification type
            at any time in the app's notification settings, which stops future messages of that type.
          </p>
        </section>

        {/* Section 5: Sharing */}
        <section className="mb-12">
          <div className="flex items-center mb-4">
            <Users className="text-purple-700 mr-3" size={28} />
            <h2 className="text-2xl font-semibold text-purple-900">5. Data Sharing & Third Parties</h2>
          </div>
          <p className="mb-3">
            We <strong>do not sell</strong> your personal data. We only share data in these limited situations:
          </p>
          <ul className="list-disc ml-6 space-y-2">
            <li><strong>Supabase</strong> — our database, authentication, and file storage provider. Your account and content data are stored on Supabase's infrastructure under their security practices.</li>
            <li><strong>Vercel</strong> — hosts and serves the Mastery web app and API.</li>
            <li><strong>Expo Push Service</strong> — delivers push notifications to the Android app; it receives only the push token and notification content, not your account credentials.</li>
            <li><strong>Partner/community sharing</strong> — content only becomes visible to another user when you explicitly create a "Shared Goal" connection or post to the community feed.</li>
          </ul>
          <p className="mt-3">
            We may also disclose information if required by law, to protect our legal rights, or to
            investigate fraud or security issues.
          </p>
        </section>

        {/* Section 6: Data Retention & Deletion */}
        <section className="mb-12">
          <div className="flex items-center mb-4">
            <Trash2 className="text-purple-700 mr-3" size={28} />
            <h2 className="text-2xl font-semibold text-purple-900">6. Data Retention & Deletion</h2>
          </div>
          <p className="mb-3">
            We keep your data for as long as your account is active, so the app can function. You are in
            full control of your data:
          </p>
          <ul className="list-disc ml-6 space-y-2">
            <li>
              <strong>Delete specific data:</strong> Use the <em>Delete Data</em> option in your profile settings
              (available at <code>/protected/delete-data</code> in the app) to remove individual categories of content.
            </li>
            <li>
              <strong>Delete your account:</strong> Use the <em>Delete Account</em> option in your profile settings
              (available at <code>/protected/delete-account</code> in the app) to permanently delete your account
              and all associated personal data. This action is irreversible.
            </li>
            <li>
              You can also request deletion by emailing us at{' '}
              <a href="mailto:tech@samuelgyasi.com" className="text-purple-700 hover:underline">tech@samuelgyasi.com</a>,
              even without opening the app.
            </li>
          </ul>
          <p className="mt-3">
            Once a deletion request is processed, your personal data is removed from our active database,
            except where we are legally required to retain limited records.
          </p>
        </section>

        {/* Section 7: Security */}
        <section className="mb-12">
          <div className="flex items-center mb-4">
            <Lock className="text-purple-700 mr-3" size={28} />
            <h2 className="text-2xl font-semibold text-purple-900">7. Data Security</h2>
          </div>
          <p>
            Data is transmitted using HTTPS/TLS encryption and stored with Supabase, which enforces
            row-level security so your data is only accessible to your authenticated account. No method of
            transmission or storage is 100% secure, but we work to protect your information using
            industry-standard practices.
          </p>
        </section>

        {/* Section 8: International Transfers */}
        <section className="mb-12">
          <div className="flex items-center mb-4">
            <Globe className="text-purple-700 mr-3" size={28} />
            <h2 className="text-2xl font-semibold text-purple-900">8. International Data Transfers</h2>
          </div>
          <p>
            Our infrastructure providers (Supabase, Vercel) may process and store data in countries other
            than your own. By using Mastery, you consent to your data being transferred and processed
            outside your country of residence, with appropriate safeguards maintained by our providers.
          </p>
        </section>

        {/* Section 9: Children's Privacy */}
        <section className="mb-12">
          <div className="flex items-center mb-4">
            <Baby className="text-purple-700 mr-3" size={28} />
            <h2 className="text-2xl font-semibold text-purple-900">9. Children's Privacy</h2>
          </div>
          <p>
            Mastery is not directed at children under 13, and we do not knowingly collect personal
            information from children under 13. If you believe a child has provided us with personal data,
            contact us at <a href="mailto:tech@samuelgyasi.com" className="text-purple-700 hover:underline">tech@samuelgyasi.com</a> and we will delete it.
          </p>
        </section>

        {/* Section 10: Your Rights */}
        <section className="mb-12">
          <div className="flex items-center mb-4">
            <Shield className="text-purple-700 mr-3" size={28} />
            <h2 className="text-2xl font-semibold text-purple-900">10. Your Rights</h2>
          </div>
          <p>
            Depending on your location, you may have rights to access, correct, export, or delete your
            personal data, and to object to or restrict certain processing. You can exercise most of these
            rights directly in the app (profile, delete-data, delete-account), or by contacting us at{' '}
            <a href="mailto:tech@samuelgyasi.com" className="text-purple-700 hover:underline">tech@samuelgyasi.com</a>.
          </p>
        </section>

        {/* Section 11: Changes */}
        <section className="mb-12">
          <div className="flex items-center mb-4">
            <RefreshCw className="text-purple-700 mr-3" size={28} />
            <h2 className="text-2xl font-semibold text-purple-900">11. Changes to This Policy</h2>
          </div>
          <p>
            We may update this Privacy Policy from time to time. Material changes will be reflected by
            updating the "Last Updated" date above. Continued use of Mastery after changes take effect
            constitutes acceptance of the revised policy.
          </p>
        </section>

        {/* Section 12: Contact */}
        <section className="mt-16 pt-8 border-t border-gray-200 text-center">
          <div className="flex justify-center items-center mb-4">
            <Mail className="text-purple-700 mr-3" size={28} />
            <h2 className="text-2xl font-semibold text-purple-900">Contact Us</h2>
          </div>
          <p className="mb-2 font-medium">Samuel Gyasi & Urbright</p>
          <a href="mailto:tech@samuelgyasi.com" className="text-purple-700 hover:underline font-bold">
            tech@samuelgyasi.com
          </a>
          <p className="text-sm text-gray-500 mt-4 italic">Rabat, Morocco</p>
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
      <footer className="bg-gray-50 py-8 text-center text-gray-400 text-sm border-t border-gray-100">
        <div className="flex justify-center gap-6 mb-4">
          <Link href="/privacy" className="hover:text-purple-600 transition-colors">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-purple-600 transition-colors">
            Terms & Conditions
          </Link>
        </div>
        <p>&copy; {new Date().getFullYear()} Mastery. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
