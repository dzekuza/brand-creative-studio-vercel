'use client'

import { useEffect, useId, useRef, useState } from 'react'

type Props = {
  label: string
  accept: string
  multiple?: boolean
  maxFiles?: number
  onUploaded: (urls: string[], names: string[]) => void
  initialUrls?: string[]
}

const IMAGE_ACCEPT = ['image/jpeg', 'image/png', 'image/webp']

function filenameFromUrl(url: string): string {
  return url.split('/').pop()?.split('?')[0] ?? url
}

export function FileUploadZone({ label, accept, multiple = false, maxFiles = 10, onUploaded, initialUrls }: Props) {
  const inputId = useId()
  const showPreviews = IMAGE_ACCEPT.some(t => accept.includes(t))

  const [uploading, setUploading] = useState(false)
  const [previewUrls, setPreviewUrls] = useState<string[]>(() =>
    showPreviews && initialUrls?.length ? initialUrls : []
  )
  const [uploaded, setUploaded] = useState<string[]>(() =>
    initialUrls?.length ? initialUrls.map(filenameFromUrl) : []
  )
  const [error, setError] = useState<string>()

  // Sync when parent loads persisted URLs after hydration
  useEffect(() => {
    if (!initialUrls?.length) return
    if (showPreviews) setPreviewUrls(initialUrls)
    setUploaded(initialUrls.map(filenameFromUrl))
  }, [initialUrls?.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

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
      if (showPreviews) setPreviewUrls(urls)
      onUploaded(urls, names)
    } catch (e) {
      setError(String(e))
    } finally {
      setUploading(false)
    }
  }

  const hasPreview = showPreviews && previewUrls.length > 0

  return (
    <label
      htmlFor={inputId}
      className="block border-2 border-dashed border-border rounded-lg overflow-hidden cursor-pointer hover:border-primary transition-colors"
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        e.preventDefault()
        if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
      }}
    >
      <input
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={e => e.target.files && handleFiles(e.target.files)}
      />

      {hasPreview ? (
        <div className="relative">
          {previewUrls.length === 1 ? (
            <img src={previewUrls[0]} alt="Preview" className="w-full h-40 object-cover pointer-events-none" />
          ) : (
            <div className="grid grid-cols-3 gap-0.5 bg-border pointer-events-none">
              {previewUrls.map((url, i) => (
                <img key={i} src={url} alt={`Preview ${i + 1}`} className="w-full h-24 object-cover bg-muted" />
              ))}
            </div>
          )}
          <div className="absolute bottom-0 inset-x-0 bg-black/40 px-3 py-1.5 flex items-center justify-between pointer-events-none">
            <span className="text-xs text-white font-medium truncate">
              {uploaded.length === 1 ? uploaded[0] : `${uploaded.length} files`}
            </span>
            <span className="text-xs text-white/70 shrink-0 ml-2">Click to replace</span>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {uploading && <p className="text-xs text-muted-foreground mt-2">Uploading…</p>}
          {uploaded.length > 0 && !uploading && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">✓ {uploaded.join(', ')}</p>
          )}
          {error && <p className="text-xs text-destructive mt-2">{error}</p>}
          {!uploading && uploaded.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">Click or drag & drop</p>
          )}
        </div>
      )}

      {uploading && (
        <div className="px-3 py-2 bg-muted text-center">
          <p className="text-xs text-muted-foreground">Uploading…</p>
        </div>
      )}
      {error && (
        <div className="px-3 py-2">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
    </label>
  )
}
