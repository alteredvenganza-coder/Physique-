// Compress an image File into a base64 JPEG string (no data: prefix).
// Default cap is 1568px on the long side at quality 0.85 — Anthropic's
// recommended size for vision input, keeping cost + latency in check.
export function compressImage(file, maxSize = 1568, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('Nessun file'))
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error || new Error('FileReader error'))
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => reject(new Error('Impossibile decodificare l\'immagine'))
      img.onload = () => {
        try {
          let { width, height } = img
          if (width > maxSize || height > maxSize) {
            if (width >= height) {
              height = Math.round(height * (maxSize / width))
              width = maxSize
            } else {
              width = Math.round(width * (maxSize / height))
              height = maxSize
            }
          }
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          const dataUrl = canvas.toDataURL('image/jpeg', quality)
          const base64 = dataUrl.split(',')[1] || dataUrl
          resolve({ base64, dataUrl, width, height, sizeBytes: Math.round(base64.length * 0.75) })
        } catch (err) { reject(err) }
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}
