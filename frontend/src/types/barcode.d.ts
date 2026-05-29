// Minimal ambient types for the experimental BarcodeDetector API (Chromium).
interface DetectedBarcode {
  rawValue: string
}

declare class BarcodeDetector {
  constructor(options?: { formats: string[] })
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>
}
