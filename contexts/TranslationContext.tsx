'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type Language = 'en' | 'fr'

interface TranslationContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: typeof translations.en
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined)

export const translations = {
  en: {
    // Common
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    previous: 'Previous',
    next: 'Next',
    all: 'All',
    create: 'Create',
    
    // Navigation
    nav: {
      home: 'Home',
      goals: 'Goals',
      planner: 'Planner',
      posts: 'Posts',
      readApp: 'ReadApp',
      profile: 'Profile',
      appTitle: 'Espirito',
    },
    
    // Auth
    auth: {
      login: 'Login',
      signUp: 'Sign up',
      signIn: 'Sign in',
      logout: 'Logout',
      email: 'Email',
      password: 'Password',
      newPassword: 'New password',
      repeatPassword: 'Repeat Password',
      forgotPassword: 'Forgot your password?',
      resetPassword: 'Reset Your Password',
      updatePassword: 'Update Password',
      loggingIn: 'Logging in...',
      creatingAccount: 'Creating an account...',
      saving: 'Saving...',
      sendResetLink: 'Send reset link',
      saveNewPassword: 'Save new password',
      
      // Messages
      loginPrompt: 'Enter your email below to login to your account',
      signUpPrompt: 'Create a new account',
      resetPrompt: 'Type in your email and we\'ll send you a link',
      newPasswordPrompt: 'Please enter your new password below.',
      checkEmail: 'Check Your Email',
      resetSent: 'Password reset instructions sent',
      passwordsNoMatch: 'Passwords do not match',
      dontHaveAccount: 'Don\'t have an account?',
      alreadyHaveAccount: 'Already have an account?',
      greeting: 'Hey, {email}!',
    },
    
    // Profile
    profile: {
      title: 'Profile',
      editProfile: 'Edit Profile',
      goals: 'Goals',
      completed: 'Completed',
      posts: 'Posts',
      partner: 'Partner',
      selectPartner: 'Select partner',
      noPartner: 'No partner',
      accountManagement: 'Account & Data Management',
      deleteData: 'Delete Specific Data',
      deleteAccount: 'Delete My Account',
      gdprNote: 'These actions are permanent and comply with GDPR requirements',
      language: 'Language',
      changeLanguage: 'Change Language',
    },
    
    // Goals
    goals: {
      newGoal: 'New Goal',
      createGoal: 'Create Goal',
      saveChanges: 'Save Changes',
      addCategory: 'Add new category',
      createCategory: 'Create category',
      generalStrategy: 'General Strategy',
      visionBoard: 'Vision Board',
    },
    
    // Meditations
    meditations: {
      dailyBread: 'Daily Bread',
      morningIntention: 'Morning Intention',
      eveningReflection: 'Evening Reflection',
      morningPrompt: 'What good shall I do this day?',
      eveningPrompt: 'What good have I done today?',
      copied: 'Copied!',
      dailyVerse: 'Daily Verse',
    },
    
    // Planner
    planner: {
      mood: {
        great: 'Great',
        inspired: 'Inspired',
        okay: 'Okay',
        productive: 'Productive',
        tired: 'Tired',
        stressed: 'Stressed',
      },
      newCategory: 'New category',
      thisWeek: 'This week',
    },
    
    // ReadApp
    readApp: {
      read: 'Read',
      quiz: 'Quiz',
      create: 'Create',
      bookInfo: 'Book Information',
      bookTitle: 'Book or article title',
      enterTitle: 'Please enter a book title',
      author: 'Author (optional)',
      totalPages: 'Total pages',
      source: 'Source (e.g. Kindle, Bible, Library)',
      category: 'Category',
      categories: {
        faith: 'Faith',
        selfDevelopment: 'Self Development',
        skill: 'Skill',
        philosophy: 'Philosophy',
        psychology: 'Psychology',
        leadership: 'Leadership',
        productivity: 'Productivity',
        miscellaneous: 'Miscellaneous',
      },
      bookAdded: 'Book added to shelf! 📚',
    },
    
    // Money Planner
    money: {
      log: 'Log',
      charts: 'Charts',
      budget: 'Budget',
      addEntry: 'Add Entry',
      export: 'Export',
      title: 'Title',
      amount: 'Amount',
      category: 'Category',
      date: 'Date',
      type: 'Type',
      income: 'Income',
      expense: 'Expense',
      currency: 'Currency',
      noEntries: 'No money activity today',
      expenses: 'Expenses',
      
      // Budget
      setBudget: 'Set Budget',
      setTotalBudget: 'Set total budget',
      totalBudget: 'Total Budget',
      remaining: 'Remaining',
      spent: 'Spent',
      balance: 'Balance',
      overBudget: 'Over budget',
      nearLimit: 'Near limit',
      week: 'Week',
      month: 'Month',
      saveBudget: 'Save Budget',
      
      // Messages
      exportSuccess: 'Exported successfully',
      exportError: 'No entries to export',
      entriesExported: 'entries exported to CSV',
      deleteConfirm: 'Delete "{title}"?',
      deleteWarning: 'This action cannot be undone.',
      deleteSuccess: 'Entry deleted successfully',
      addSuccess: '{type} added successfully',
      updateSuccess: 'Entry updated successfully',
      fillAllFields: 'Please fill all fields',
    },
  },
  
  fr: {
    // Common
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    close: 'Fermer',
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    previous: 'Précédent',
    next: 'Suivant',
    all: 'Tout',
    create: 'Créer',
    
    // Navigation
    nav: {
      home: 'Accueil',
      goals: 'Objectifs',
      planner: 'Planificateur',
      posts: 'Publications',
      readApp: 'Lecture',
      profile: 'Profil',
      appTitle: 'Espirito',
    },
    
    // Auth
    auth: {
      login: 'Connexion',
      signUp: 'S\'inscrire',
      signIn: 'Se connecter',
      logout: 'Déconnexion',
      email: 'E-mail',
      password: 'Mot de passe',
      newPassword: 'Nouveau mot de passe',
      repeatPassword: 'Répéter le mot de passe',
      forgotPassword: 'Mot de passe oublié?',
      resetPassword: 'Réinitialiser le mot de passe',
      updatePassword: 'Mettre à jour le mot de passe',
      loggingIn: 'Connexion en cours...',
      creatingAccount: 'Création du compte...',
      saving: 'Enregistrement...',
      sendResetLink: 'Envoyer le lien de réinitialisation',
      saveNewPassword: 'Enregistrer le nouveau mot de passe',
      
      // Messages
      loginPrompt: 'Entrez votre e-mail ci-dessous pour vous connecter',
      signUpPrompt: 'Créer un nouveau compte',
      resetPrompt: 'Entrez votre e-mail et nous vous enverrons un lien',
      newPasswordPrompt: 'Veuillez entrer votre nouveau mot de passe ci-dessous.',
      checkEmail: 'Vérifiez votre e-mail',
      resetSent: 'Instructions de réinitialisation envoyées',
      passwordsNoMatch: 'Les mots de passe ne correspondent pas',
      dontHaveAccount: 'Vous n\'avez pas de compte?',
      alreadyHaveAccount: 'Vous avez déjà un compte?',
      greeting: 'Salut, {email}!',
    },
    
    // Profile
    profile: {
      title: 'Profil',
      editProfile: 'Modifier le profil',
      goals: 'Objectifs',
      completed: 'Terminé',
      posts: 'Publications',
      partner: 'Partenaire',
      selectPartner: 'Sélectionner un partenaire',
      noPartner: 'Aucun partenaire',
      accountManagement: 'Gestion du Compte et des Données',
      deleteData: 'Supprimer des Données Spécifiques',
      deleteAccount: 'Supprimer Mon Compte',
      gdprNote: 'Ces actions sont permanentes et conformes aux exigences RGPD',
      language: 'Langue',
      changeLanguage: 'Changer de langue',
    },
    
    // Goals
    goals: {
      newGoal: 'Nouvel objectif',
      createGoal: 'Créer un objectif',
      saveChanges: 'Enregistrer les modifications',
      addCategory: 'Ajouter une nouvelle catégorie',
      createCategory: 'Créer une catégorie',
      generalStrategy: 'Stratégie générale',
      visionBoard: 'Tableau de vision',
    },
    
    // Meditations
    meditations: {
      dailyBread: 'Pain quotidien',
      morningIntention: 'Intention du matin',
      eveningReflection: 'Réflexion du soir',
      morningPrompt: 'Quel bien vais-je faire aujourd\'hui?',
      eveningPrompt: 'Quel bien ai-je fait aujourd\'hui?',
      copied: 'Copié!',
      dailyVerse: 'Verset du jour',
    },
    
    // Planner
    planner: {
      mood: {
        great: 'Excellent',
        inspired: 'Inspiré',
        okay: 'Correct',
        productive: 'Productif',
        tired: 'Fatigué',
        stressed: 'Stressé',
      },
      newCategory: 'Nouvelle catégorie',
      thisWeek: 'Cette semaine',
    },
    
    // ReadApp
    readApp: {
      read: 'Lire',
      quiz: 'Quiz',
      create: 'Créer',
      bookInfo: 'Informations sur le livre',
      bookTitle: 'Titre du livre ou de l\'article',
      enterTitle: 'Veuillez entrer un titre de livre',
      author: 'Auteur (optionnel)',
      totalPages: 'Pages totales',
      source: 'Source (ex: Kindle, Bible, Bibliothèque)',
      category: 'Catégorie',
      categories: {
        faith: 'Foi',
        selfDevelopment: 'Développement personnel',
        skill: 'Compétence',
        philosophy: 'Philosophie',
        psychology: 'Psychologie',
        leadership: 'Leadership',
        productivity: 'Productivité',
        miscellaneous: 'Divers',
      },
      bookAdded: 'Livre ajouté à l\'étagère! 📚',
    },
    
    // Money Planner
    money: {
      log: 'Journal',
      charts: 'Graphiques',
      budget: 'Budget',
      addEntry: 'Ajouter une entrée',
      export: 'Exporter',
      title: 'Titre',
      amount: 'Montant',
      category: 'Catégorie',
      date: 'Date',
      type: 'Type',
      income: 'Revenu',
      expense: 'Dépense',
      currency: 'Devise',
      noEntries: 'Aucune activité financière aujourd\'hui',
      expenses: 'Dépenses',
      
      // Budget
      setBudget: 'Définir le budget',
      setTotalBudget: 'Définir le budget total',
      totalBudget: 'Budget Total',
      remaining: 'Restant',
      spent: 'Dépensé',
      balance: 'Solde',
      overBudget: 'Budget dépassé',
      nearLimit: 'Proche de la limite',
      week: 'Semaine',
      month: 'Mois',
      saveBudget: 'Enregistrer le budget',
      
      // Messages
      exportSuccess: 'Exporté avec succès',
      exportError: 'Aucune entrée à exporter',
      entriesExported: 'entrées exportées en CSV',
      deleteConfirm: 'Supprimer "{title}"?',
      deleteWarning: 'Cette action ne peut pas être annulée.',
      deleteSuccess: 'Entrée supprimée avec succès',
      addSuccess: '{type} ajouté avec succès',
      updateSuccess: 'Entrée mise à jour avec succès',
      fillAllFields: 'Veuillez remplir tous les champs',
    },
  },
}

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')

  useEffect(() => {
    // Load language preference from localStorage
    const savedLang = localStorage.getItem('app_language') as Language
    if (savedLang && (savedLang === 'en' || savedLang === 'fr')) {
      setLanguageState(savedLang)
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('app_language', lang)
  }

  const value: TranslationContextType = {
    language,
    setLanguage,
    t: translations[language],
  }

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(TranslationContext)
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider')
  }
  return context
}
