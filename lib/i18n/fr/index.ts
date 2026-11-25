// French for every tr('…') string, keyed by the exact English text.
// Written with "tu", the warm form the whole app uses.
// Split by area so each part stays readable; a test checks that every tr('…') has an entry.

import { COMMON } from '@/lib/i18n/fr/common'
import { SHARED } from '@/lib/i18n/fr/shared'
import { SPIRIT } from '@/lib/i18n/fr/spirit'
import { SOCIAL } from '@/lib/i18n/fr/social'
import { COMPASS } from '@/lib/i18n/fr/compass'
import { PLANNER } from '@/lib/i18n/fr/planner'
import { LIBRARY } from '@/lib/i18n/fr/library'
import { EXTRAS } from '@/lib/i18n/fr/extras'

export const FR: Record<string, string> = {
  ...COMMON,
  ...SHARED,
  ...SPIRIT,
  ...SOCIAL,
  ...COMPASS,
  ...PLANNER,
  ...LIBRARY,
  ...EXTRAS,
}
