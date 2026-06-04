import type { AdType } from '@/types'

/**
 * Single source of truth for ad-type copy strategy.
 *
 * Three routes used to keep their own diverging copies of this mapping
 * (generate-image, compose-html, generate-copy). They now all derive from
 * this one record so the strategy stays consistent everywhere.
 *
 * Framework selection follows audience-awareness best practice:
 *   - AIDA for unaware / aspirational audiences (brand-awareness, launches)
 *   - PAS  for problem-aware audiences (sales)
 *   - BAB  (before–after–bridge) fits solution-aware audiences; use it in
 *     `custom` when the campaign context implies the reader already knows
 *     the solution category.
 */
type AdFramework = {
  /** Short framework label, e.g. "AIDA", "PAS". */
  framework: string
  /** Terse hint injected into the image-generation prompt. */
  imageHint: string
  /** Fuller art-direction copy strategy for the HTML compositor. */
  htmlGuidance: string
  /** Rule line for the bulk copy generator. */
  bulkRule: string
}

const AD_FRAMEWORKS: Record<AdType, AdFramework> = {
  'brand-awareness': {
    framework: 'AIDA',
    imageHint: 'emotionally resonant, aspirational copy — 3–6 word headline, no hard sell',
    htmlGuidance:
      'Write emotionally resonant, aspirational copy. Headline: short, poetic, evocative (3–6 words). Body: brand feeling, not features. No hard sell. Tone: warm, confident, human.',
    bulkRule:
      'Use AIDA framework — emotionally resonant, aspirational. 3–6 word headline, build desire, no hard sell.',
  },
  'sales': {
    framework: 'PAS',
    imageHint: 'offer-first, urgency-driven — lead with price/discount hook, include a clear CTA',
    htmlGuidance:
      'Write offer-first, conversion-focused copy. Headline: lead with the benefit or discount (e.g. "50% OFF", "Limited Drop"). Body: urgency + clear value proposition. Include a short CTA phrase (e.g. "Shop Now", "Get Yours").',
    bulkRule:
      'Use PAS framework — lead with pain point, agitate, offer solution. Include urgency/offer hook. Clear CTA.',
  },
  'product-launch': {
    framework: 'AIDA',
    imageHint: 'excitement and novelty — "Introducing…" framing, highlight the key differentiator',
    htmlGuidance:
      'Write excitement-building copy. Headline: announcement framing ("Introducing", "Meet", "Now Available"). Body: 1 key differentiator + novelty hook. Tone: energetic, confident.',
    bulkRule:
      'Use AIDA — excitement and novelty. "Introducing…" framing. Highlight key differentiator. Build anticipation.',
  },
  'engagement': {
    framework: 'Question-led',
    imageHint: 'community-first, question-led — relatable, invite participation or a share',
    htmlGuidance:
      'Write community-first, relatable copy. Headline: question, challenge, or bold opinion. Body: invite participation or reaction. Tone: conversational, fun, authentic.',
    bulkRule:
      'Community-first, question-led. Relatable, invite participation. End with a question or call to share.',
  },
  'custom': {
    framework: 'PAS/AIDA/BAB',
    imageHint: 'match the campaign context provided above',
    htmlGuidance:
      'Write copy exactly matching the campaign context provided. Use the tone, angle, and messaging described. Pick the framework that fits the audience awareness level: AIDA (unaware), PAS (problem-aware), or BAB (solution-aware).',
    bulkRule:
      'Match the brand tone exactly. Use PAS, AIDA, or BAB as best fits the copy context and audience awareness.',
  },
}

function resolve(adType: string | undefined): AdFramework {
  return AD_FRAMEWORKS[(adType as AdType)] ?? AD_FRAMEWORKS['custom']
}

/** Terse copy hint for the image-generation prompt. */
export function imageCopyHint(adType: string | undefined): string {
  return resolve(adType).imageHint
}

/** Fuller art-direction copy strategy for the HTML compositor. */
export function htmlCopyGuidance(adType: string | undefined): string {
  return resolve(adType).htmlGuidance
}

/** Framework label + rule for the bulk copy generator. */
export function bulkFramework(adType: AdType): { framework: string; rule: string } {
  const f = resolve(adType)
  return { framework: f.framework, rule: f.bulkRule }
}

export { AD_FRAMEWORKS }
