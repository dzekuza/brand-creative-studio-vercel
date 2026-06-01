import { lookup } from 'dns/promises'

const ALLOWED_BLOB_SUFFIX = '.public.blob.vercel-storage.com'

// Private / loopback / link-local ranges — all forbidden for SSRF protection
function isPrivateIp(ip: string): boolean {
  // IPv6 loopback
  if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') return true

  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(n => isNaN(n))) return false

  const [a, b] = parts
  return (
    a === 0 ||                                   // 0.0.0.0/8
    a === 10 ||                                  // 10.0.0.0/8
    a === 127 ||                                 // 127.0.0.0/8
    a === 169 && b === 254 ||                    // 169.254.0.0/16 link-local
    a === 172 && b >= 16 && b <= 31 ||           // 172.16.0.0/12
    a === 192 && b === 168                       // 192.168.0.0/16
  )
}

/**
 * Fetch a Vercel Blob asset safely.
 * - Only https:// allowed
 * - Hostname must end with .public.blob.vercel-storage.com
 * - DNS-resolved IP must not be private/loopback/link-local
 * - Redirects are followed manually and each Location is re-validated
 * - Returns raw Buffer + resolved mimeType
 */
export async function fetchBlobAsset(
  rawUrl: string,
  expectedMime?: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  return _fetch(rawUrl, expectedMime, 0)
}

async function _fetch(
  rawUrl: string,
  expectedMime: string | undefined,
  redirectCount: number,
): Promise<{ buffer: Buffer; mimeType: string }> {
  if (redirectCount > 3) throw new Error('Too many redirects')

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error('Invalid URL')
  }

  if (parsed.protocol !== 'https:') throw new Error('Only https:// URLs are allowed')

  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '')
  if (!hostname.endsWith(ALLOWED_BLOB_SUFFIX)) {
    throw new Error(`URL host is not an allowed Vercel Blob domain: ${hostname}`)
  }

  // DNS check — resolve and reject private IPs (defeats DNS rebinding)
  const { address } = await lookup(hostname).catch(() => {
    throw new Error(`DNS resolution failed for ${hostname}`)
  })
  if (isPrivateIp(address)) {
    throw new Error(`Resolved IP ${address} is in a private range`)
  }

  const res = await fetch(rawUrl, { redirect: 'manual' })

  // Re-validate redirects
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location')
    if (!location) throw new Error('Redirect with no Location header')
    return _fetch(location, expectedMime, redirectCount + 1)
  }

  if (!res.ok) throw new Error(`Blob fetch failed: ${res.status} ${res.statusText}`)

  const contentType = res.headers.get('content-type')?.split(';')[0].trim() ?? ''
  if (expectedMime && contentType && !contentType.startsWith(expectedMime.split('/')[0])) {
    throw new Error(`Unexpected content-type: ${contentType} (expected ${expectedMime})`)
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  return { buffer, mimeType: contentType || expectedMime || 'application/octet-stream' }
}
