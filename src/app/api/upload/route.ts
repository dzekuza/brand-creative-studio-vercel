import { NextRequest, NextResponse } from 'next/server'
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
  const uploadsDir = join(process.cwd(), 'public', 'uploads')

  await mkdir(uploadsDir, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(join(uploadsDir, filename), buffer)

  return NextResponse.json({ url: `/uploads/${filename}`, name: file.name })
}
