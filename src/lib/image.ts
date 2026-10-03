import imageCompression from 'browser-image-compression'

/**
 * Shrinks a photo before upload: at most 1600px on the long edge, JPEG,
 * aiming for ~400 KB. storage.rules rejects anything 2 MB or larger.
 */
export async function compressPhoto(file: File): Promise<File> {
  return imageCompression(file, {
    maxWidthOrHeight: 1600,
    maxSizeMB: 0.4,
    fileType: 'image/jpeg',
    initialQuality: 0.82,
    useWebWorker: true,
  })
}
