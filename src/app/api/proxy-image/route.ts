import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export async function POST(req: NextRequest) {
  const { url } = (await req.json()) as { url: string }
  if (!url || !url.startsWith('http')) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  let imageRes: Response
  try {
    imageRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BrandStudio/1.0)' },
      signal: AbortSignal.timeout(15_000),
    })
    if (!imageRes.ok) throw new Error(`HTTP ${imageRes.status}`)
  } catch (e) {
    return NextResponse.json({ error: `Could not fetch image: ${String(e)}` }, { status: 422 })
  }

  const contentType = imageRes.headers.get('content-type') ?? 'image/jpeg'
  const baseMime = contentType.split(';')[0].trim()
  const ext = MIME_TO_EXT[baseMime] ?? 'jpg'

  const buffer = Buffer.from(await imageRes.arrayBuffer())
  if (buffer.length > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image too large (max 10 MB)' }, { status: 413 })
  }

  const filename = `${uuidv4()}.${ext}`

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`uploads/${filename}`, buffer, { access: 'public', contentType: baseMime })
    return NextResponse.json({ url: blob.url })
  }

  const uploadsDir = join(process.cwd(), 'public', 'uploads')
  await mkdir(uploadsDir, { recursive: true })
  await writeFile(join(uploadsDir, filename), buffer)
  return NextResponse.json({ url: `/uploads/${filename}` })
}
