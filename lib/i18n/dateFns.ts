import { fr } from 'date-fns/locale'
import { appLanguage } from '@/lib/i18n'

// date-fns words ("2 hours ago") in the app's language; English is date-fns's default
export const dateFnsLocale = () => (appLanguage() === 'fr' ? fr : undefined)
