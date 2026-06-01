import type { CompositorInput } from '@/types'

export function buildCreativeHtml(input: CompositorInput): string {
  const { backgroundImageBase64, brandBible, fontUrl, fontName, iconSvgs, headline, body, platform } = input
  const { colors, typography, layout } = brandBible

  const logoPositionStyle: Record<string, string> = {
    'top-left':     `top:${layout.padding};left:${layout.padding}`,
    'top-right':    `top:${layout.padding};right:${layout.padding}`,
    'bottom-left':  `bottom:${layout.padding};left:${layout.padding}`,
    'bottom-right': `bottom:${layout.padding};right:${layout.padding}`,
  }

  const iconPosition = logoPositionStyle[layout.logoPosition] ?? logoPositionStyle['top-left']
  const firstIcon = iconSvgs[0] ?? ''

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
    font-family:'${fontName}',sans-serif;
    background:${colors.background};
  }
  .bg {
    position:absolute;
    inset:0;
    background-image:url('data:image/jpeg;base64,${backgroundImageBase64}');
    background-size:cover;
    background-position:center;
  }
  .logo-icon {
    position:absolute;
    ${iconPosition};
    width:64px;
    height:64px;
  }
  .copy {
    position:absolute;
    bottom:${layout.padding};
    left:${layout.padding};
    right:${layout.padding};
  }
  .headline {
    font-size:${typography.headingSize};
    font-weight:${typography.weight};
    letter-spacing:${typography.letterSpacing};
    color:${colors.text};
    line-height:1.1;
    margin-bottom:16px;
  }
  .body {
    font-size:${typography.bodySize};
    color:${colors.secondary};
    line-height:1.4;
  }
  .accent-bar {
    width:48px;
    height:4px;
    background:${colors.accent};
    margin-bottom:20px;
  }
</style>
</head>
<body>
  <div class="bg"></div>
  <div class="logo-icon">${firstIcon}</div>
  <div class="copy">
    <div class="accent-bar"></div>
    <div class="headline">${escapeHtml(headline)}</div>
    <div class="body">${escapeHtml(body)}</div>
  </div>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
