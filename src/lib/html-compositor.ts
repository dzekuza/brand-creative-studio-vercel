import type { CompositorInput } from '@/types'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function hexToRgb(hex: string): string {
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return isNaN(r) ? '0,0,0' : `${r},${g},${b}`
}

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  if (isNaN(r)) return false
  return (r * 0.299 + g * 0.587 + b * 0.114) > 186
}

type LayoutVariant = 'square' | 'story' | 'landscape' | 'banner'

function getLayoutVariant(width: number, height: number): LayoutVariant {
  if (height > width * 1.3) return 'story'
  if (width > height * 2.5) return 'banner'
  if (Math.abs(width - height) < width * 0.2) return 'square'
  return 'landscape'
}

export function buildCreativeHtml(input: CompositorInput): string {
  const { backgroundImageBase64, brandBible, fontUrl, fontName, iconSvgs, headline, body, platform } = input
  const { colors, typography, layout } = brandBible

  const variant = getLayoutVariant(platform.width, platform.height)
  const pad = layout.padding
  const textRgb = hexToRgb(colors.text)
  const bgRgb = hexToRgb(colors.background)
  const accentRgb = hexToRgb(colors.accent)
  const textIsLight = isLightColor(colors.text)

  // Scrim gradient direction based on copy position
  const copyAtBottom = layout.logoPosition.startsWith('top')
  const scrimGradient = copyAtBottom
    ? `linear-gradient(to top, rgba(${bgRgb},0.88) 0%, rgba(${bgRgb},0.55) 42%, rgba(${bgRgb},0.0) 72%)`
    : `linear-gradient(to bottom, rgba(${bgRgb},0.88) 0%, rgba(${bgRgb},0.55) 42%, rgba(${bgRgb},0.0) 72%)`

  const copyEdge = copyAtBottom ? `bottom:${pad}` : `top:${pad}`
  const iconEdge = copyAtBottom ? `top:${pad}` : `bottom:${pad}`

  const logoSideIsLeft = layout.logoPosition.endsWith('left')
  const iconAlignH = logoSideIsLeft ? `left:${pad}` : `right:${pad}`
  const copyAlignH = `left:${pad};right:${pad}`

  // Typography scale — respect brand bible but enforce hierarchy
  const headingPx = parseInt(typography.headingSize) || 48
  const bodyPx = parseInt(typography.bodySize) || 18
  const subheadPx = Math.round(headingPx * 0.42)
  const headingUnit = typography.headingSize.replace(/[\d.]/g, '') || 'px'
  const bodyUnit = typography.bodySize.replace(/[\d.]/g, '') || 'px'

  // Accent bar width proportional to canvas
  const accentBarW = Math.round(platform.width * 0.044)
  const accentBarH = Math.max(3, Math.round(platform.height * 0.004))

  // Icon strip — show up to 3 icons in a row
  const visibleIcons = iconSvgs.filter(Boolean).slice(0, 3)

  // Banner layout is special — single horizontal row
  if (variant === 'banner') {
    return buildBannerHtml({ backgroundImageBase64, brandBible, fontUrl, fontName, iconSvgs, headline, body, platform })
  }

  // Copy block layout: for story use asymmetric left-flush large type
  const headingLineH = variant === 'story' ? '1.0' : '1.1'
  const maxCopyWidth = variant === 'story'
    ? `${Math.round(platform.width * 0.78)}px`
    : `${Math.round(platform.width * 0.88)}px`

  // Tagline / body copy — clamp to 2 lines
  const bodyClamped = variant === 'story' ? 2 : 2

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @font-face {
    font-family: '${fontName}';
    src: url('${fontUrl}');
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:${platform.width}px;
    height:${platform.height}px;
    overflow:hidden;
    position:relative;
    font-family:'${fontName}', 'Helvetica Neue', Arial, sans-serif;
    background:${colors.background};
  }
  .bg {
    position:absolute;
    inset:0;
    background-image:url('data:image/jpeg;base64,${backgroundImageBase64}');
    background-size:cover;
    background-position:center;
  }
  .scrim {
    position:absolute;
    inset:0;
    background:${scrimGradient};
  }
  .icons {
    position:absolute;
    ${iconEdge};
    ${iconAlignH};
    display:flex;
    gap:${Math.round(parseInt(pad) * 0.5)}px;
    align-items:center;
  }
  .icon-wrap {
    width:${Math.round(platform.width * 0.059)}px;
    height:${Math.round(platform.width * 0.059)}px;
    display:flex;
    align-items:center;
    justify-content:center;
    flex-shrink:0;
  }
  .icon-wrap svg {
    width:100%;
    height:100%;
  }
  .copy {
    position:absolute;
    ${copyEdge};
    ${copyAlignH};
    max-width:${maxCopyWidth};
  }
  .accent-bar {
    width:${accentBarW}px;
    height:${accentBarH}px;
    background:${colors.accent};
    margin-bottom:${Math.round(parseInt(pad) * 0.55)}px;
    border-radius:${accentBarH}px;
  }
  .overline {
    font-size:${subheadPx}${headingUnit};
    font-weight:500;
    letter-spacing:0.18em;
    text-transform:uppercase;
    color:rgba(${accentRgb},0.9);
    margin-bottom:${Math.round(parseInt(pad) * 0.3)}px;
    line-height:1;
  }
  .headline {
    font-size:${typography.headingSize};
    font-weight:${typography.weight};
    letter-spacing:${typography.letterSpacing};
    color:${colors.text};
    line-height:${headingLineH};
    margin-bottom:${Math.round(parseInt(pad) * 0.5)}px;
    text-shadow: 0 2px 24px rgba(${bgRgb},0.55);
  }
  .body-copy {
    font-size:${typography.bodySize};
    color:rgba(${textRgb},0.78);
    line-height:1.45;
    display:-webkit-box;
    -webkit-line-clamp:${bodyClamped};
    -webkit-box-orient:vertical;
    overflow:hidden;
    text-shadow: 0 1px 8px rgba(${bgRgb},0.4);
  }
  .bottom-rule {
    position:absolute;
    bottom:0;
    left:0;
    right:0;
    height:${accentBarH * 2}px;
    background:${colors.accent};
    opacity:0.7;
  }
</style>
</head>
<body>
  <div class="bg"></div>
  <div class="scrim"></div>
  ${visibleIcons.length > 0 ? `<div class="icons">${visibleIcons.map(svg => `<div class="icon-wrap">${svg}</div>`).join('')}</div>` : ''}
  <div class="copy">
    <div class="accent-bar"></div>
    <div class="headline">${escapeHtml(headline)}</div>
    ${body ? `<div class="body-copy">${escapeHtml(body)}</div>` : ''}
  </div>
  <div class="bottom-rule"></div>
</body>
</html>`
}

function buildBannerHtml(input: CompositorInput): string {
  const { backgroundImageBase64, brandBible, fontUrl, fontName, iconSvgs, headline, body, platform } = input
  const { colors, typography } = brandBible
  const bgRgb = hexToRgb(colors.background)
  const textRgb = hexToRgb(colors.text)
  const accentRgb = hexToRgb(colors.accent)
  const firstIcon = iconSvgs.find(Boolean) ?? ''
  const iconSize = Math.round(platform.height * 0.52)
  const padH = Math.round(platform.height * 0.18)
  const headingPx = Math.min(parseInt(typography.headingSize) || 48, Math.round(platform.height * 0.36))
  const bodyPx = Math.min(parseInt(typography.bodySize) || 18, Math.round(platform.height * 0.22))

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @font-face { font-family:'${fontName}'; src:url('${fontUrl}'); }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:${platform.width}px;
    height:${platform.height}px;
    overflow:hidden;
    display:flex;
    align-items:center;
    font-family:'${fontName}','Helvetica Neue',Arial,sans-serif;
    background:${colors.background};
    position:relative;
  }
  .bg {
    position:absolute;
    inset:0;
    background-image:url('data:image/jpeg;base64,${backgroundImageBase64}');
    background-size:cover;
    background-position:center right;
    opacity:0.35;
  }
  .icon-wrap {
    position:relative;
    flex-shrink:0;
    width:${iconSize}px;
    height:${iconSize}px;
    margin:0 ${padH}px;
    display:flex;
    align-items:center;
    justify-content:center;
  }
  .icon-wrap svg { width:100%; height:100%; }
  .divider {
    width:2px;
    height:${Math.round(platform.height * 0.55)}px;
    background:rgba(${accentRgb},0.5);
    flex-shrink:0;
    margin-right:${padH}px;
  }
  .copy {
    position:relative;
    display:flex;
    flex-direction:column;
    gap:${Math.round(platform.height * 0.06)}px;
    flex:1;
  }
  .headline {
    font-size:${headingPx}px;
    font-weight:${typography.weight};
    letter-spacing:${typography.letterSpacing};
    color:${colors.text};
    line-height:1.1;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
  }
  .body-copy {
    font-size:${bodyPx}px;
    color:rgba(${textRgb},0.72);
    line-height:1.3;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
  }
  .cta {
    position:relative;
    margin-left:auto;
    margin-right:${padH}px;
    padding:${Math.round(platform.height * 0.14)}px ${Math.round(platform.height * 0.28)}px;
    background:${colors.accent};
    color:${colors.background};
    font-family:'${fontName}','Helvetica Neue',Arial,sans-serif;
    font-size:${Math.round(platform.height * 0.22)}px;
    font-weight:700;
    letter-spacing:0.04em;
    border:none;
    white-space:nowrap;
    flex-shrink:0;
  }
</style>
</head>
<body>
  <div class="bg"></div>
  ${firstIcon ? `<div class="icon-wrap">${firstIcon}</div><div class="divider"></div>` : ''}
  <div class="copy">
    <div class="headline">${escapeHtml(headline)}</div>
    ${body ? `<div class="body-copy">${escapeHtml(body)}</div>` : ''}
  </div>
  <div class="cta">Learn More</div>
</body>
</html>`
}
