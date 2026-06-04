import type { BrandBible } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

type Props = { bible: BrandBible }

export function BrandBiblePreview({ bible }: Props) {
  const {
    colors, typography, layout, tone, tagline, rules,
    brandStory, mission, targetAudience, personality,
    voiceAndTone, imageryStyle, messagingPillars,
    competitorDifferentiators, colorUsageNotes, typographyNotes,
  } = bible

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Brand Bible</CardTitle>
        {tagline && <p className="text-sm text-muted-foreground italic">&ldquo;{tagline}&rdquo;</p>}
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Colors */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Colors</p>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(colors).map(([name, hex]) => (
              <div key={name} className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded border" style={{ background: hex }} />
                <span className="text-xs">
                  {name} <span className="text-muted-foreground">{hex}</span>
                </span>
              </div>
            ))}
          </div>
          {colorUsageNotes && (
            <p className="text-xs text-muted-foreground mt-2">{colorUsageNotes}</p>
          )}
        </div>

        <Separator />

        {/* Brand Story */}
        {brandStory && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Brand Story</p>
            <p className="text-sm leading-relaxed whitespace-pre-line">{brandStory}</p>
          </div>
        )}

        {/* Mission */}
        {mission && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Mission</p>
            <p className="text-sm leading-relaxed">{mission}</p>
          </div>
        )}

        {/* Target Audience */}
        {targetAudience && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Target Audience</p>
            <p className="text-sm leading-relaxed">{targetAudience}</p>
          </div>
        )}

        {/* Personality */}
        {personality && personality.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Brand Personality</p>
            <div className="flex flex-wrap gap-1">
              {personality.map((trait, i) => (
                <Badge key={i} variant="outline" className="text-xs">{trait}</Badge>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Voice & Tone */}
        {voiceAndTone && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Voice & Tone</p>
            <p className="text-sm leading-relaxed mb-3">{voiceAndTone.description}</p>
            <div className="grid grid-cols-2 gap-3">
              {voiceAndTone.dos.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-green-600 mb-1">Do</p>
                  <ul className="space-y-1">
                    {voiceAndTone.dos.map((d, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1">
                        <span className="text-green-500 shrink-0">✓</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {voiceAndTone.donts.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-red-500 mb-1">Don&apos;t</p>
                  <ul className="space-y-1">
                    {voiceAndTone.donts.map((d, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1">
                        <span className="text-red-400 shrink-0">✗</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tone fallback (if no voiceAndTone) */}
        {!voiceAndTone && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Tone</p>
            <p className="text-sm">{tone}</p>
          </div>
        )}

        {/* Imagery Style */}
        {imageryStyle && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Imagery Style</p>
            <p className="text-sm leading-relaxed">{imageryStyle}</p>
          </div>
        )}

        <Separator />

        {/* Messaging Pillars */}
        {messagingPillars && messagingPillars.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Messaging Pillars</p>
            <ul className="space-y-1.5">
              {messagingPillars.map((pillar, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                  {pillar}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Differentiators */}
        {competitorDifferentiators && competitorDifferentiators.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Key Differentiators</p>
            <ul className="space-y-1">
              {competitorDifferentiators.map((d, i) => (
                <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                  <span className="shrink-0">—</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Separator />

        {/* Design Rules */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Design Rules</p>
          <div className="flex flex-wrap gap-1">
            {rules.map((r, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{r}</Badge>
            ))}
          </div>
        </div>

        {/* Typography Notes */}
        {typographyNotes && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Typography</p>
            <p className="text-xs text-muted-foreground">{typographyNotes}</p>
          </div>
        )}

        {/* Technical summary */}
        <p className="text-xs text-muted-foreground border-t pt-3">
          {typography.headingSize} heading / {typography.bodySize} body · weight {typography.weight} · tracking {typography.letterSpacing}
          {' · '}padding {layout.padding} · logo {layout.logoPosition}
        </p>

      </CardContent>
    </Card>
  )
}
