'use client'

// colorthief v3 exports standalone async functions, not a class
export async function extractColors(imageUrl: string, count = 5): Promise<string[]> {
  const { getPalette } = await import('colorthief')

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.onload = async () => {
      try {
        const palette = await getPalette(img, { colorCount: count })
        if (!palette) { resolve([]); return }
        resolve(palette.map(c => c.hex()))
      } catch (e) {
        reject(e)
      }
    }
    img.onerror = reject
    img.src = imageUrl
  })
}
