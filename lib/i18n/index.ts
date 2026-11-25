import { FR } from '@/lib/i18n/fr'

// Translation keyed by the English text: tr('Save') shows "Enregistrer" in French and
// "Save" in English. A string with no French entry falls back to English, so nothing
// breaks while translations are added. Values go in braces: tr('{n} goals', { n: 3 }); plurals pick a form: tr('{n} {n:goal|goals}', { n }).
//
// Components get tr and locale from useTranslation(). Plain functions in lib (date
// labels and the like) use trNow() and appLocale(), which follow the same language.

export type Language = 'en' | 'fr'
// Values render as React would: null, undefined and false show as nothing
export type Vars = Record<string, string | number | boolean | null | undefined>

let current: Language = 'en'

// Set by the TranslationProvider whenever the language changes
export function setAppLanguage(lang: Language) {
  current = lang
}

export const appLanguage = () => current

// For dates and numbers: French formatting in French, the device's own in English (as before)
export const localeFor = (lang: Language): string | undefined => (lang === 'fr' ? 'fr-FR' : undefined)
export const appLocale = () => localeFor(current)

// Plural forms: '{count:goal|goals}' picks the first form when count is singular.
// English: 1 is singular. French: 0 and 1 are singular.
const singular = (lang: Language, n: number) => (lang === 'fr' ? Math.abs(n) < 2 : Math.abs(n) === 1)

export function interpolate(text: string, vars?: Vars, lang: Language = current) {
  if (!vars) return text
  return text
    .replace(/\{(\w+):([^|{}]*)\|([^{}]*)\}/g, (whole, key: string, one: string, other: string) => {
      if (!(key in vars)) return whole
      return singular(lang, Number(vars[key])) ? one : other
    })
    .replace(/\{(\w+)\}/g, (whole, key: string) => {
      if (!(key in vars)) return whole
      const v = vars[key]
      return v === null || v === undefined || v === false || v === true ? '' : String(v)
    })
}

export function translate(lang: Language, text: string, vars?: Vars) {
  const out = lang === 'fr' ? FR[text] ?? text : text
  return interpolate(out, vars, lang)
}

// For code outside components
export const trNow = (text: string, vars?: Vars) => translate(current, text, vars)
