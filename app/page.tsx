'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { LanguageSwitcher, Language } from '@/components/language-switcher';
import { translations } from '@/lib/translations';
import { 
  Target, 
  Calendar, 
  Heart, 
  Brain, 
  TrendingUp, 
  Users, 
  Sparkles,
  CheckCircle2,
  Smartphone,
  Monitor,
  Apple,
  ChevronRight
} from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function Home() {
  const router = useRouter();
  const [bibleVerse, setBibleVerse] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>('en');

  // Load language preference from localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'fr')) {
      setLanguage(savedLang);
    }
  }, []);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const t = translations[language];

  useEffect(() => {
    const fetchBibleVerse = async () => {
      try {
        const response = await fetch('https://beta.ourmanna.com/api/v1/get/?format=text');
        const verse = await response.text();
        setBibleVerse(verse);
      } catch (error) {
        console.error('Failed to fetch Scripture:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBibleVerse();
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) router.push('/protected');
    };
    checkAuth();
  }, [router]);

  const features = [
    { icon: Target },
    { icon: Calendar },
    { icon: Brain },
    { icon: Heart },
    { icon: TrendingUp },
    { icon: Users }
  ];

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden bg-background selection:bg-violet-500/30">
      
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 dark:bg-violet-600/20 blur-[120px]"
        />
        <motion.div 
          animate={{ 
            x: [0, -50, 0],
            y: [0, -30, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 dark:bg-blue-600/20 blur-[120px]"
        />
        <motion.div 
          animate={{ 
            x: [0, 30, 0],
            y: [0, -40, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[50%] left-[50%] w-[300px] h-[300px] rounded-full bg-purple-600/5 dark:bg-purple-600/10 blur-[100px]"
        />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 w-full flex justify-between items-center py-6 px-8 backdrop-blur-md border-b border-black/5 dark:border-white/10">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-black tracking-tighter text-foreground"
        >
          ESPIRITO<span className="text-violet-500">.</span>
        </motion.h1>

        <div className="flex items-center gap-2">
          <Link href="/privacy">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              {t.privacy}
            </Button>
          </Link>
          <Link href="/terms">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              {t.terms}
            </Button>
          </Link>
          <LanguageSwitcher currentLanguage={language} onLanguageChange={handleLanguageChange} />
          <ThemeSwitcher />
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center pt-12 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-4 inline-block"
          >
            <span className="bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 px-4 py-2 rounded-full text-sm font-semibold border border-violet-500/20">
              {t.tagline}
            </span>
          </motion.div>

          <motion.h2 
            className="text-5xl md:text-7xl font-bold text-foreground mb-6 tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {t.welcomeTo} <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-500 to-blue-500 dark:from-violet-400 dark:to-blue-400">Espirito</span>
          </motion.h2>
          
          <motion.p 
            className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {t.heroDescription}
          </motion.p>

          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                className="bg-violet-600 hover:bg-violet-500 text-white px-10 py-7 text-lg font-semibold rounded-full shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all"
                onClick={() => router.push('/auth/sign-up')}
              >
                {t.getStarted}
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                className="px-10 py-7 text-lg font-semibold rounded-full border-2"
                onClick={() => router.push('/auth/login')}
              >
                {t.signIn}
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Scripture Card */}
        <AnimatePresence>
          {bibleVerse && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.8 }}
              className="mt-16 p-6 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 backdrop-blur-lg max-w-md mx-auto"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-violet-500 dark:text-violet-400 mb-3 flex items-center justify-center gap-2">
                <Sparkles className="w-3 h-3" />
                {t.dailyInspiration}
              </p>
              <p className="text-foreground/80 dark:text-slate-300 italic leading-relaxed">"{bibleVerse}"</p>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20 px-6 bg-gradient-to-b from-transparent via-violet-50/30 to-transparent dark:via-violet-950/10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h3 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t.featuresTitle}
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t.featuresSubtitle}
            </p>
          </motion.div>

          <motion.div 
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {t.features.map((feature, index) => (
              <motion.div
                key={index}
                variants={item}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="p-6 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-black/5 dark:border-white/10 shadow-sm hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 flex items-center justify-center mb-4">
                  {(() => {
                    const Icon = features[index].icon;
                    return <Icon className="w-6 h-6 text-violet-600 dark:text-violet-400" />;
                  })()}
                </div>
                <h4 className="text-xl font-bold text-foreground mb-2">{feature.title}</h4>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Platform Availability Section */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h3 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t.platformTitle}
            </h3>
            <p className="text-lg text-muted-foreground">
              {t.platformSubtitle}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="grid md:grid-cols-3 gap-6"
          >
            {/* Android */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="p-8 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-600/5 border-2 border-green-500/20 dark:border-green-400/20"
            >
              <Smartphone className="w-12 h-12 text-green-600 dark:text-green-400 mb-4" />
              <h4 className="text-2xl font-bold mb-2 text-foreground">{t.androidTitle}</h4>
              <p className="text-muted-foreground mb-4">
                {t.androidDescription}
              </p>
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                <span>{t.androidBadge}</span>
              </div>
            </motion.div>

            {/* iOS PWA */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="p-8 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-2 border-blue-500/20 dark:border-blue-400/20"
            >
              <Apple className="w-12 h-12 text-blue-600 dark:text-blue-400 mb-4" />
              <h4 className="text-2xl font-bold mb-2 text-foreground">{t.iosTitle}</h4>
              <p className="text-muted-foreground mb-4">
                {t.iosDescription}
              </p>
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                <span>{t.iosBadge}</span>
              </div>
            </motion.div>

            {/* Desktop */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="p-8 rounded-2xl bg-gradient-to-br from-violet-500/10 to-violet-600/5 border-2 border-violet-500/20 dark:border-violet-400/20"
            >
              <Monitor className="w-12 h-12 text-violet-600 dark:text-violet-400 mb-4" />
              <h4 className="text-2xl font-bold mb-2 text-foreground">{t.desktopTitle}</h4>
              <p className="text-muted-foreground mb-4">
                {t.desktopDescription}
              </p>
              <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                <span>{t.desktopBadge}</span>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-12 p-6 rounded-2xl bg-violet-500/5 dark:bg-violet-500/10 border border-violet-500/20"
          >
            <h4 className="text-lg font-bold mb-3 text-foreground text-center">{t.pwaInstructionsTitle}</h4>
            <ol className="space-y-2 text-muted-foreground max-w-2xl mx-auto">
              {t.pwaSteps.map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500 text-white flex items-center justify-center text-sm font-bold">{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center p-12 rounded-3xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 border border-violet-500/20 backdrop-blur-sm"
        >
          <h3 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            {t.ctaTitle}
          </h3>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t.ctaDescription}
          </p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="lg"
              className="bg-violet-600 hover:bg-violet-500 text-white px-12 py-7 text-xl font-semibold rounded-full shadow-[0_0_30px_rgba(124,58,237,0.5)] transition-all"
              onClick={() => router.push('/auth/sign-up')}
            >
              {t.ctaButton}
              <ChevronRight className="ml-2 w-6 h-6" />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center text-muted-foreground text-sm border-t border-black/5 dark:border-white/10">
        <div className="flex justify-center gap-6 mb-4">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            {t.privacyPolicy}
          </Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            {t.termsConditions}
          </Link>
          <span>•</span>
          <Link href="/auth/login" className="hover:text-foreground transition-colors">
            {t.signIn}
          </Link>
          <span>•</span>
          <Link href="/auth/sign-up" className="hover:text-foreground transition-colors">
            {t.signUp}
          </Link>
        </div>
        <p>&copy; {new Date().getFullYear()} {t.copyright}</p>
      </footer>
    </div>
  );
}