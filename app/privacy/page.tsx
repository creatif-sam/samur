import React from 'react';
import { Shield, Lock, Users, Database, Trash2, Mail } from 'lucide-react';
import Link from 'next/link';

const PrivacyPolicy = () => {
  const lastUpdated = "March 23, 2026";

  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans">
      {/* Header */}
      <header className="bg-purple-700 py-16 px-6 text-center text-white">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-purple-100 text-lg">How we protect your journey on Espirito</p>
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
            Welcome to <strong>Espirito</strong>, developed by <strong>Samuel Gyasi and Urbright</strong>. 
            We are committed to protecting your privacy and ensuring a secure experience as you manage your 
            spiritual and personal growth journey through partnership and community. 
            This policy explains our data practices in alignment with our 2026 mission of institutionalization and excellence.
          </p>
        </section>

        {/* Section 2: Data Collection */}
        <section className="mb-12 bg-purple-50 p-8 rounded-2xl border border-purple-100">
          <div className="flex items-center mb-4">
            <Database className="text-purple-700 mr-3" size={28} />
            <h2 className="text-2xl font-semibold text-purple-900">2. Data We Collect</h2>
          </div>
          <ul className="list-disc ml-6 space-y-3">
            <li><strong>Personal Information:</strong> Email address and name (via Supabase Auth) for identification.</li>
            <li><strong>User Content:</strong> Goals, vision board images, daily tasks, and progress statistics.</li>
            <li><strong>Shared Data:</strong> Goals shared specifically with your designated partner.</li>
            <li><strong>Device Information:</strong> Basic technical data to ensure app stability.</li>
          </ul>
        </section>

        {/* Section 3: Usage */}
        <section className="mb-12">
          <div className="flex items-center mb-4">
            <Lock className="text-purple-700 mr-3" size={28} />
            <h2 className="text-2xl font-semibold text-purple-900">3. How We Use Your Data</h2>
          </div>
          <p className="mb-4">We use your information strictly for:</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-100 rounded-lg shadow-sm">
              <span className="font-bold text-purple-700 block mb-1">App Functionality</span>
              Syncing your spiritual blueprints across all your devices.
            </div>
            <div className="p-4 border border-gray-100 rounded-lg shadow-sm">
              <span className="font-bold text-purple-700 block mb-1">Partnership Features</span>
              Enabling shared goals and community accountability.
            </div>
          </div>
        </section>

        {/* Section 4: Sharing */}
        <section className="mb-12">
          <div className="flex items-center mb-4">
            <Users className="text-purple-700 mr-3" size={28} />
            <h2 className="text-2xl font-semibold text-purple-900">4. Data Sharing</h2>
          </div>
          <p>
            We use <strong>Supabase</strong> for secure database hosting. We <strong>do not sell</strong> your data. 
            Sharing only occurs when you explicitly initiate a "Shared Goal" connection with a partner.
          </p>
        </section>

        {/* Section 5: Deletion */}
        <section className="mb-12">
          <div className="flex items-center mb-4">
            <Trash2 className="text-purple-700 mr-3" size={28} />
            <h2 className="text-2xl font-semibold text-purple-900">5. Data Retention</h2>
          </div>
          <p>
            You may request the full deletion of your account and all associated data at any time through 
            the app settings or by contacting our technical team.
          </p>
        </section>

        {/* Section 6: Contact */}
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
        <p>&copy; {new Date().getFullYear()} Espirito. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;