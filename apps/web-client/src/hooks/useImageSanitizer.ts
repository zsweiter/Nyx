import { useCallback } from 'react'

export const useImageSanitizer = () => {
    const sanitizeImage = useCallback((file: File, type = 'image/jpeg', quality = 0.95) => {
        return new Promise<Blob>((resolve, reject) => {
            if (!file.type.startsWith('image/')) {
                reject(new Error('Not an image'))
                return
            }

            const img = new Image()
            const url = URL.createObjectURL(file)

            img.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = img.width
                canvas.height = img.height

                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0)

                canvas.toBlob(
                    blob => {
                        URL.revokeObjectURL(url)
                        resolve(new File([blob], file.name, { type }))
                    },
                    type,
                    quality
                )
            }

            img.onerror = reject
            img.src = url
        })
    }, [])

    return { sanitize: sanitizeImage }
}
