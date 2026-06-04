import type { BrandCategory } from '@/types'

/**
 * "Root reference" ad-design knowledge — distilled from the curated reference
 * library (PRODUCT_AD_REFERENCES.md) so the image model knows what a strong,
 * high-converting ad looks like. This is BASELINE design knowledge only; the
 * user's own brand-setup style references remain the primary visual style.
 *
 * Category-aware: physical-product ads, app/SaaS ads, and a general fallback
 * follow very different conventions (a phone-app hero vs. a packshot hero).
 */

type RefProfile = 'physical' | 'app' | 'general'

function profileFor(category?: BrandCategory): RefProfile {
  switch (category) {
    case 'physical-product':
    case 'ecommerce':
    case 'beauty-wellness':
    case 'food-beverage':
      return 'physical'
    case 'mobile-app':
    case 'saas':
      return 'app'
    default:
      return 'general'
  }
}

// Composition/visual guidance — safe to use even for text-free backgrounds.
const COMPOSITION: Record<RefProfile, string> = {
  physical:
    'PROVEN AD PATTERNS (physical product): The product packshot is the hero — sharp, fully visible, 40–60% of the frame, never obscured. Stage it on ONE clean background strategy: a soft gradient that matches the product color, warm greige/off-white, a clean light-grey studio sweep, or a real lifestyle context. Optionally add a subtle pedestal or a few on-brand ingredient/use props at the base. Match one background tone to the product packaging color so the product feels native to the scene.',
  app:
    'PROVEN AD PATTERNS (app / SaaS — modeled on top fintech/app promo ads): The app screen is the hero — show it on a real device held in a hand (or a clean floating mockup), upright or slightly tilted, with the on-screen UI sharp and fully legible. Use a bold, on-brand solid or subtly textured background. You MAY place an oversized brand wordmark or a large editorial headline behind/beside the device. Keep the scene uncluttered so the screen reads clearly. Do NOT add physical-product props (no jars, pedestals, or ingredient scatter). Device occupies ~45–65% of the frame; keep the logo small at top-center or top-left.',
  general:
    'PROVEN AD PATTERNS: The subject is the hero — sharp, fully visible, dominant in the frame, never obscured. Use ONE clean background strategy (soft on-brand gradient, warm off-white, light studio sweep, or real lifestyle context) and keep it uncluttered. Tie one background tone to the brand color so the subject feels native to the scene.',
}

// Copy / typography / trust guidance — only relevant when text is baked in.
const COPY: Record<RefProfile, string> = {
  physical:
    'COPY & TYPE: Use a proven formula — reverse-psychology hook ("Don\'t buy this… unless you want [result]"), a problem→solution pair, a benefit-forward line, or science credibility ("The science of [benefit]"). Headline is bold and oversized; color ONLY the key benefit word/phrase in the brand accent (two-tone headline), or bold just the emotionally-charged word. Include exactly ONE trust signal (a star rating + review count, a guarantee badge, or up to 3 short checkmark benefits) — never more. Use a bold condensed sans for direct-response, an editorial serif for luxury.',
  app:
    'COPY & TYPE: Lead with the outcome, not features — e.g. "All your [X]. One simple app." or an "Introducing…" launch line. Headline is bold, clean sans; color ONLY the key word in the brand accent (two-tone). Keep body to one short benefit line. If — and only if — feature highlights are wanted, use 2–4 short, product-specific chips (derived from the real app\'s value, never generic words like "premium/eco/protection"). One trust signal max (rating, "#1", or download count).',
  general:
    'COPY & TYPE: Use a clear formula — benefit-forward, problem→solution, or "Introducing…". Bold oversized headline; color ONLY the key word/phrase in the brand accent (two-tone). Keep body to one short line. At most one trust signal, and any benefit labels must be specific to this brand — never generic filler.',
}

/**
 * Returns the reference-design guidance block to inject into an image prompt.
 * @param category brand category (selected in setup); undefined → general.
 * @param withCopy include copy/typography/trust guidance (only when text is baked in).
 */
export function adReferenceGuidance(category: BrandCategory | undefined, withCopy: boolean): string {
  const p = profileFor(category)
  return withCopy ? `${COMPOSITION[p]} ${COPY[p]}` : COMPOSITION[p]
}
