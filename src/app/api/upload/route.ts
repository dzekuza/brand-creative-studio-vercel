import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'svg', 'ttf', 'otf', 'woff', 'woff2']
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 413 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json({ error: `File type .${ext} not allowed` }, { status: 415 })
  }

  const filename = `${uuidv4()}.${ext}`
  const isVercel = !!process.env.VERCEL

  if (isVercel && !process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Blob storage not configured. Add a Vercel Blob store to this project in the Vercel dashboard (Storage → Create → Blob).' },
      { status: 503 },
    )
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`uploads/${filename}`, file, { access: 'public' })
    return NextResponse.json({ url: blob.url, name: file.name })
  }

  // Local dev: write to public/uploads/
  const uploadsDir = join(process.cwd(), 'public', 'uploads')
  await mkdir(uploadsDir, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(join(uploadsDir, filename), buffer)
  return NextResponse.json({ url: `/uploads/${filename}`, name: file.name })
}
