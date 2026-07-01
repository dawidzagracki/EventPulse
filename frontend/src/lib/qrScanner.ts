import jsQR from 'jsqr'

export type QrScanStatus = 'on' | 'unsupported' | 'denied'

export interface QrScanHandle {
  stop: () => void
}

interface DetectedBarcode {
  rawValue?: string
}
interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>
}

/**
 * Start scanning QR codes from the device camera into `video`.
 *
 * Uses the native `BarcodeDetector` where available (Chrome/Android — fastest),
 * and falls back to decoding video frames with jsQR everywhere else. **Safari/iOS
 * has no BarcodeDetector**, so the fallback is what makes the scanner work on the
 * iPhones hostesses actually use. Requires HTTPS (or localhost) + camera permission.
 *
 * Returns a handle whose `stop()` releases the camera and cancels the loop.
 */
export async function startQrScanner(
  video: HTMLVideoElement,
  onResult: (raw: string) => void,
  onStatus: (status: QrScanStatus) => void,
): Promise<QrScanHandle> {
  if (!navigator.mediaDevices?.getUserMedia) {
    onStatus('unsupported')
    return { stop: () => {} }
  }

  let stopped = false
  let stream: MediaStream | undefined
  let timer: number | undefined
  const stop = () => {
    stopped = true
    if (timer) window.clearTimeout(timer)
    stream?.getTracks().forEach((tr) => tr.stop())
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    if (stopped) {
      stream.getTracks().forEach((tr) => tr.stop())
      return { stop }
    }
    video.srcObject = stream
    video.setAttribute('playsinline', 'true') // iOS: play inline instead of going fullscreen
    await video.play()
    onStatus('on')

    const Ctor = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => BarcodeDetectorLike })
      .BarcodeDetector
    const detector = Ctor ? new Ctor({ formats: ['qr_code'] }) : null
    const canvas = detector ? null : document.createElement('canvas')

    const tick = async () => {
      if (stopped) return
      try {
        if (detector) {
          const codes = await detector.detect(video)
          if (codes[0]?.rawValue) onResult(codes[0].rawValue)
        } else if (canvas && video.videoWidth > 0) {
          const w = video.videoWidth
          const h = video.videoHeight
          canvas.width = w
          canvas.height = h
          const cctx = canvas.getContext('2d', { willReadFrequently: true })
          if (cctx) {
            cctx.drawImage(video, 0, 0, w, h)
            const image = cctx.getImageData(0, 0, w, h)
            const found = jsQR(image.data, w, h, { inversionAttempts: 'dontInvert' })
            if (found?.data) onResult(found.data)
          }
        }
      } catch {
        // Transient decode/detect error — keep scanning.
      }
      // Native detection is cheap; the canvas fallback is heavier, so poll a touch slower.
      timer = window.setTimeout(() => void tick(), detector ? 400 : 250)
    }
    void tick()
  } catch {
    onStatus('denied')
  }

  return { stop }
}
