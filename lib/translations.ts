// Translations for the landing page
export const translations = {
  en: {
    // Navbar
    privacy: "Privacy",
    
    // Hero Section
    tagline: "✨ Your Spiritual Growth Companion",
    welcomeTo: "Welcome to",
    heroDescription: "Plan your days, achieve your goals, and grow spiritually with your partner. Track progress, build habits, and celebrate milestones together.",
    getStarted: "Get Started for Free",
    signIn: "Sign In",
    dailyInspiration: "Daily Inspiration",
    
    // Features Section
    featuresTitle: "Everything You Need in One Place",
    featuresSubtitle: "Comprehensive tools designed to help you and your partner grow together spiritually and personally.",
    
    features: [
      {
        title: "Goals & Vision Boards",
        description: "Set personal and shared goals with your partner. Create inspiring vision boards with images and track your progress together."
      },
      {
        title: "Daily Planner",
        description: "Plan your day with morning intentions, task timelines, and evening reflections. Never miss what matters most."
      },
      {
        title: "Meditation & Scripture",
        description: "Daily Bible verses, meditation tracking, and streak calendars. Build spiritual habits with your partner."
      },
      {
        title: "Partner Collaboration",
        description: "Share goals, encourage each other, and grow together. Accountability meets partnership."
      },
      {
        title: "Progress Analytics",
        description: "Beautiful charts and insights showing your growth journey. See how far you've come."
      },
      {
        title: "Social Feed",
        description: "Share updates, celebrate wins, and connect with your community. Stay motivated together."
      }
    ],
    
    // Platform Section
    platformTitle: "Available on Your Device",
    platformSubtitle: "Access Espirito anywhere, anytime",
    
    androidTitle: "Android App",
    androidDescription: "Download from Google Play Store. Full native experience with offline support.",
    androidBadge: "Live on Play Store",
    
    iosTitle: "iOS (PWA)",
    iosDescription: "Install as Progressive Web App. Tap the share button → \"Add to Home Screen\"",
    iosBadge: "Works on iOS 16.4+",
    
    desktopTitle: "Desktop",
    desktopDescription: "Install as PWA on Windows, Mac, or Linux. Full desktop experience in your browser.",
    desktopBadge: "Install from browser",
    
    pwaInstructionsTitle: "📱 How to Install PWA on iOS or Desktop:",
    pwaSteps: [
      "Open Espirito in Safari (iOS) or Chrome/Edge (Desktop)",
      "Tap the Share button (iOS) or click the install icon in the address bar (Desktop)",
      "Select \"Add to Home Screen\" and confirm"
    ],
    
    // CTA Section
    ctaTitle: "Start Your Journey Today",
    ctaDescription: "Join thousands of partners growing together spiritually and achieving their goals.",
    ctaButton: "Create Free Account",
    
    // Footer
    privacyPolicy: "Privacy Policy",
    signUp: "Sign Up",
    copyright: "Espirito. All rights reserved."
  },
  
  fr: {
    // Navbar
    privacy: "Confidentialité",
    
    // Hero Section
    tagline: "✨ Votre Compagnon de Croissance Spirituelle",
    welcomeTo: "Bienvenue chez",
    heroDescription: "Planifiez vos journées, atteignez vos objectifs et grandissez spirituellement avec votre partenaire. Suivez vos progrès, construisez des habitudes et célébrez les étapes ensemble.",
    getStarted: "Commencer Gratuitement",
    signIn: "Se Connecter",
    dailyInspiration: "Inspiration Quotidienne",
    
    // Features Section
    featuresTitle: "Tout Ce Dont Vous Avez Besoin en Un Seul Endroit",
    featuresSubtitle: "Des outils complets conçus pour vous aider, vous et votre partenaire, à grandir ensemble spirituellement et personnellement.",
    
    features: [
      {
        title: "Objectifs et Tableaux de Vision",
        description: "Définissez des objectifs personnels et partagés avec votre partenaire. Créez des tableaux de vision inspirants avec des images et suivez vos progrès ensemble."
      },
      {
        title: "Planificateur Quotidien",
        description: "Planifiez votre journée avec des intentions matinales, des chronologies de tâches et des réflexions du soir. Ne manquez jamais ce qui compte le plus."
      },
      {
        title: "Méditation et Écriture",
        description: "Versets bibliques quotidiens, suivi de méditation et calendriers de séquences. Construisez des habitudes spirituelles avec votre partenaire."
      },
      {
        title: "Collaboration Partenaire",
        description: "Partagez des objectifs, encouragez-vous mutuellement et grandissez ensemble. La responsabilité rencontre le partenariat."
      },
      {
        title: "Analyses de Progrès",
        description: "De beaux graphiques et aperçus montrant votre parcours de croissance. Voyez jusqu'où vous êtes arrivé."
      },
      {
        title: "Fil Social",
        description: "Partagez des mises à jour, célébrez les victoires et connectez-vous avec votre communauté. Restez motivé ensemble."
      }
    ],
    
    // Platform Section
    platformTitle: "Disponible sur Votre Appareil",
    platformSubtitle: "Accédez à Espirito n'importe où, n'importe quand",
    
    androidTitle: "Application Android",
    androidDescription: "Téléchargez depuis Google Play Store. Expérience native complète avec support hors ligne.",
    androidBadge: "En Direct sur Play Store",
    
    iosTitle: "iOS (PWA)",
    iosDescription: "Installez comme Progressive Web App. Appuyez sur le bouton de partage → \"Ajouter à l'écran d'accueil\"",
    iosBadge: "Fonctionne sur iOS 16.4+",
    
    desktopTitle: "Bureau",
    desktopDescription: "Installez comme PWA sur Windows, Mac ou Linux. Expérience de bureau complète dans votre navigateur.",
    desktopBadge: "Installer depuis le navigateur",
    
    pwaInstructionsTitle: "📱 Comment Installer PWA sur iOS ou Bureau:",
    pwaSteps: [
      "Ouvrez Espirito dans Safari (iOS) ou Chrome/Edge (Bureau)",
      "Appuyez sur le bouton Partager (iOS) ou cliquez sur l'icône d'installation dans la barre d'adresse (Bureau)",
      "Sélectionnez \"Ajouter à l'écran d'accueil\" et confirmez"
    ],
    
    // CTA Section
    ctaTitle: "Commencez Votre Voyage Aujourd'hui",
    ctaDescription: "Rejoignez des milliers de partenaires qui grandissent ensemble spirituellement et atteignent leurs objectifs.",
    ctaButton: "Créer un Compte Gratuit",
    
    // Footer
    privacyPolicy: "Politique de Confidentialité",
    signUp: "S'inscrire",
    copyright: "Espirito. Tous droits réservés."
  }
};

export type Language = keyof typeof translations;
export type TranslationKey = typeof translations.en;
