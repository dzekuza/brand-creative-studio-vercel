'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

type Props = {
  label: string
  accept: string
  multiple?: boolean
  maxFiles?: number
  onUploaded: (urls: string[], names: string[]) => void
}

export function FileUploadZone({ label, accept, multiple = false, maxFiles = 10, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState<string[]>([])
  const [error, setError] = useState<string>()

  async function handleFiles(files: FileList) {
    const list = Array.from(files).slice(0, maxFiles)
    setUploading(true)
    setError(undefined)
    try {
      const results = await Promise.all(
        list.map(async file => {
          const fd = new FormData()
          fd.append('file', file)
          const res = await fetch('/api/upload', { method: 'POST', body: fd })
          if (!res.ok) throw new Error(await res.text())
          return res.json() as Promise<{ url: string; name: string }>
        })
      )
      const urls = results.map(r => r.url)
      const names = results.map(r => r.name)
      setUploaded(names)
      onUploaded(urls, names)
    } catch (e) {
      setError(String(e))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
      onClick={() => inputRef.current?.click()}
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        e.preventDefault()
        if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={e => e.target.files && handleFiles(e.target.files)}
      />
      <p className="text-sm font-medium text-foreground">{label}</p>
      {uploading && <p className="text-xs text-muted-foreground mt-2">Uploading…</p>}
      {uploaded.length > 0 && !uploading && (
        <p className="text-xs text-green-600 mt-2">✓ {uploaded.join(', ')}</p>
      )}
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      {!uploading && uploaded.length === 0 && (
        <p className="text-xs text-muted-foreground mt-1">Click or drag & drop</p>
      )}
    </div>
  )
}
