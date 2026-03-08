import { ref, onUnmounted } from 'vue'

export interface BarcodeScannerState {
  isSupported: boolean
  isScanning: boolean
  hasPermission: boolean | null
  error: string | null
  barcode: string | null
}

export const useBarcodeScanner = () => {
  const state = ref<BarcodeScannerState>({
    isSupported: false,
    isScanning: false,
    hasPermission: null,
    error: null,
    barcode: null,
  })

  let videoElement: HTMLVideoElement | null = null
  let stream: MediaStream | null = null
  let barcodeDetector: any = null
  let animationFrameId: number | null = null

  // Check if BarcodeDetector is supported
  const checkSupport = () => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      state.value.isSupported = true
      return true
    }
    state.value.isSupported = false
    state.value.error =
      'Barcode scanning is not supported on this device. Please use Android Chrome.'
    return false
  }

  // Initialize barcode detector
  const initDetector = () => {
    if (!state.value.isSupported) return false

    try {
      // @ts-expect-error - BarcodeDetector is not in standard types yet
      barcodeDetector = new window.BarcodeDetector({
        formats: ['ean_8', 'ean_13', 'upc_a', 'upc_e', 'code_128'],
      })
      return true
    } catch (err) {
      state.value.error = 'Failed to initialize barcode scanner'
      return false
    }
  }

  // Start camera and scanning
  const startScanning = async (videoEl: HTMLVideoElement): Promise<boolean> => {
    if (!checkSupport()) return false

    videoElement = videoEl

    try {
      // Request camera permission with rear camera
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      // Set up video element
      videoElement.srcObject = stream
      await videoElement.play()

      state.value.hasPermission = true
      state.value.isScanning = true
      state.value.error = null

      // Initialize detector
      if (!initDetector()) return false

      // Start detection loop
      detectBarcodes()

      return true
    } catch (err: unknown) {
      state.value.hasPermission = false

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          state.value.error =
            'Camera permission denied. Please enable camera access in your browser settings and reload the page.'
        } else if (err.name === 'NotFoundError') {
          state.value.error = 'No camera found. Please ensure your device has a camera.'
        } else {
          state.value.error = `Camera error: ${err.message}`
        }
      } else {
        state.value.error = 'Camera initialization failed'
      }

      return false
    }
  }

  // Detection loop
  const detectBarcodes = async () => {
    if (!state.value.isScanning || !videoElement || !barcodeDetector) return

    try {
      // Check if video is ready
      if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        // Detect barcodes
        const barcodes = await barcodeDetector.detect(videoElement)

        if (barcodes.length > 0) {
          // Get first barcode
          const barcode = barcodes[0]
          state.value.barcode = barcode.rawValue

          // Stop scanning - we found a barcode
          stopScanning()
          return
        }
      }

      // Continue scanning
      animationFrameId = requestAnimationFrame(detectBarcodes)
    } catch (err) {
      console.error('Barcode detection error:', err)
      // Continue scanning even if detection fails
      animationFrameId = requestAnimationFrame(detectBarcodes)
    }
  }

  // Stop camera and scanning
  const stopScanning = () => {
    state.value.isScanning = false

    // Cancel animation frame
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    // Stop video stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      stream = null
    }

    // Clear video element
    if (videoElement) {
      videoElement.srcObject = null
      videoElement = null
    }

    barcodeDetector = null
  }

  // Reset state
  const reset = () => {
    stopScanning()
    state.value.barcode = null
    state.value.error = null
    state.value.hasPermission = null
  }

  // Auto-cleanup on unmount
  onUnmounted(() => {
    stopScanning()
  })

  return {
    state: readonly(state),
    startScanning,
    stopScanning,
    reset,
    checkSupport,
  }
}
