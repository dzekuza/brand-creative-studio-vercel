import type { BrandBible } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Props = { bible: BrandBible }

export function BrandBiblePreview({ bible }: Props) {
  const { colors, typography, layout, tone, tagline, rules } = bible
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Brand Bible</CardTitle>
        {tagline && <p className="text-sm text-muted-foreground italic">&ldquo;{tagline}&rdquo;</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">COLORS</p>
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
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">TONE</p>
          <p className="text-sm">{tone}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">RULES</p>
          <div className="flex flex-wrap gap-1">
            {rules.map((r, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{r}</Badge>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Type: {typography.headingSize} heading / {typography.bodySize} body
          {' · '}Padding: {layout.padding}
          {' · '}Logo: {layout.logoPosition}
        </p>
      </CardContent>
    </Card>
  )
}
