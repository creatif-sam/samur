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
