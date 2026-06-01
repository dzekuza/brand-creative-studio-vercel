import 'dotenv/config'
import { generateText } from 'ai'
import { writeFileSync } from 'fs'

const prompt = 'A futuristic skincare product on a minimalist marble surface, warm golden hour light from the left, shallow depth of field, editorial product photography. NO text, NO labels, NO UI overlays.'

async function main() {
  console.log('Generating image via Vercel AI Gateway...')
  console.log('Model: google/gemini-3.1-flash-image-preview')
  console.log('Prompt:', prompt)
  console.log('---')

  const result = await generateText({
    model: 'google/gemini-3.1-flash-image-preview',
    messages: [{ role: 'user', content: prompt }],
    providerOptions: {
      gateway: {
        tags: ['test:image-generation'],
      },
    },
  })

  const imageFile = result.files?.find(f => f.mediaType?.startsWith('image/'))

  if (!imageFile?.base64) {
    console.error('No image returned. Text response:', result.text)
    process.exit(1)
  }

  const outputPath = 'generated-image.png'
  writeFileSync(outputPath, Buffer.from(imageFile.base64, 'base64'))
  console.log(`Image saved to ${outputPath}`)
  console.log(`Media type: ${imageFile.mediaType}`)
  console.log(`Usage: ${JSON.stringify(result.usage)}`)
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
