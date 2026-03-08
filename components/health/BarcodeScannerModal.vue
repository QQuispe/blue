<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useBarcodeScanner } from '~/composables/health/useBarcodeScanner'
import BaseModal from './BaseModal.vue'

interface ScannedFood {
  barcode: string
  name: string
  brand: string | null
  serving_size: number
  serving_unit: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number | null
  source: string
}

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  found: [food: ScannedFood, servings: number]
  notfound: [barcode: string]
  close: []
}>()

const { $toast } = useNuxtApp()
const {
  state: scannerState,
  startScanning,
  stopScanning,
  reset: resetScanner,
} = useBarcodeScanner()

const videoRef = ref<HTMLVideoElement | null>(null)
const currentState = ref<'camera' | 'loading' | 'result'>('camera')
const scannedFood = ref<ScannedFood | null>(null)
const servingMultiplier = ref(1)
const isLookingUp = ref(false)

// Start scanning when modal opens
onMounted(() => {
  if (props.show && videoRef.value) {
    startScanningFlow()
  }
})

// Watch for modal open/close
watch(
  () => props.show,
  newVal => {
    if (newVal) {
      reset()
      nextTick(() => {
        if (videoRef.value) {
          startScanningFlow()
        }
      })
    } else {
      stopScanning()
    }
  }
)

const startScanningFlow = async () => {
  currentState.value = 'camera'
  scannedFood.value = null
  servingMultiplier.value = 1

  if (videoRef.value) {
    const success = await startScanning(videoRef.value)
    if (!success && scannerState.value.error) {
      // Error is already set in state, will be displayed
    }
  }
}

// Watch for detected barcode
watch(
  () => scannerState.value.barcode,
  async barcode => {
    if (barcode && !isLookingUp.value) {
      await lookupBarcode(barcode)
    }
  }
)

const lookupBarcode = async (barcode: string) => {
  isLookingUp.value = true
  currentState.value = 'loading'

  try {
    const response = await fetch(`/api/health/barcode/${barcode}`, {
      credentials: 'include',
    })

    const data = await response.json()

    if (data.statusCode === 200 && data.data) {
      scannedFood.value = data.data
      currentState.value = 'result'
    } else if (data.statusCode === 404) {
      // Product not found - emit notfound event
      emit('notfound', barcode)
      return
    } else {
      throw new Error('Failed to lookup product')
    }
  } catch (err) {
    $toast.error('Failed to lookup barcode')
    currentState.value = 'camera'
    resetScanner()
  } finally {
    isLookingUp.value = false
  }
}

const handleConfirm = () => {
  if (!scannedFood.value) return

  // Calculate adjusted macros based on serving multiplier
  const adjustedFood: ScannedFood = {
    ...scannedFood.value,
    serving_size: scannedFood.value.serving_size * servingMultiplier.value,
    calories: scannedFood.value.calories * servingMultiplier.value,
    protein: scannedFood.value.protein * servingMultiplier.value,
    carbs: scannedFood.value.carbs * servingMultiplier.value,
    fat: scannedFood.value.fat * servingMultiplier.value,
    fiber: scannedFood.value.fiber ? scannedFood.value.fiber * servingMultiplier.value : null,
  }

  emit('found', adjustedFood, servingMultiplier.value)
}

const handleScanAgain = () => {
  reset()
  startScanningFlow()
}

const handleClose = () => {
  stopScanning()
  emit('close')
}

const reset = () => {
  currentState.value = 'camera'
  scannedFood.value = null
  servingMultiplier.value = 1
  isLookingUp.value = false
  resetScanner()
}

const incrementServing = () => {
  servingMultiplier.value = Math.min(servingMultiplier.value + 1, 99)
}

const decrementServing = () => {
  servingMultiplier.value = Math.max(servingMultiplier.value - 1, 0.5)
}

const handleServingInput = (e: Event) => {
  const val = parseFloat((e.target as HTMLInputElement).value)
  if (!isNaN(val) && val > 0) {
    servingMultiplier.value = Math.min(val, 99)
  }
}

const formatNumber = (num: number): string => {
  if (num === 0) return '0'
  if (num < 1) return num.toFixed(2)
  return num.toFixed(1).replace(/\.0$/, '')
}
</script>

<template>
  <BaseModal :show="show" title="Scan Barcode" size="md" @close="handleClose">
    <div class="barcode-scanner">
      <!-- Camera State -->
      <div v-if="currentState === 'camera'" class="camera-view">
        <div v-if="!scannerState.isSupported" class="error-message">
          <Icon name="mdi:cellphone-off" size="48" />
          <p>{{ scannerState.error || 'Barcode scanning is not supported on this device.' }}</p>
          <p class="hint">Please use Android Chrome for barcode scanning.</p>
        </div>

        <div v-else-if="scannerState.error" class="error-message">
          <Icon name="mdi:camera-off" size="48" />
          <p>{{ scannerState.error }}</p>
          <BaseButton variant="secondary" @click="startScanningFlow"> Try Again </BaseButton>
        </div>

        <div v-else class="camera-container">
          <video ref="videoRef" class="camera-video" playsinline muted></video>

          <div class="scan-overlay">
            <div class="scan-frame">
              <div class="corner top-left"></div>
              <div class="corner top-right"></div>
              <div class="corner bottom-left"></div>
              <div class="corner bottom-right"></div>
            </div>
            <p class="scan-hint">Point camera at barcode</p>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-else-if="currentState === 'loading'" class="loading-view">
        <div class="spinner"></div>
        <p>Looking up nutrition data...</p>
        <p class="hint">Checking multiple databases</p>
      </div>

      <!-- Result State -->
      <div v-else-if="currentState === 'result' && scannedFood" class="result-view">
        <div class="product-info">
          <h4 class="product-name">{{ scannedFood.name }}</h4>
          <p v-if="scannedFood.brand" class="product-brand">{{ scannedFood.brand }}</p>
          <p class="product-source">
            <Icon
              :name="
                scannedFood.source === 'openfoodfacts'
                  ? 'mdi:database'
                  : scannedFood.source === 'nutritionix'
                    ? 'mdi:nutrition'
                    : scannedFood.source === 'usda'
                      ? 'mdi:leaf'
                      : 'mdi:help-circle'
              "
              size="14"
            />
            From {{ scannedFood.source }}
          </p>
        </div>

        <div class="serving-control">
          <label>Servings</label>
          <div class="serving-input-group">
            <button class="step-btn" @click="decrementServing" :disabled="servingMultiplier <= 0.5">
              <Icon name="mdi:minus" size="14" />
            </button>
            <input
              type="number"
              class="serving-input"
              :value="servingMultiplier"
              min="0.5"
              max="99"
              step="0.5"
              @input="handleServingInput"
            />
            <button class="step-btn" @click="incrementServing" :disabled="servingMultiplier >= 99">
              <Icon name="mdi:plus" size="14" />
            </button>
          </div>
        </div>

        <div class="macros-grid">
          <div class="macro-item">
            <span class="macro-value">{{
              formatNumber(scannedFood.calories * servingMultiplier)
            }}</span>
            <span class="macro-label">cal</span>
          </div>
          <div class="macro-item">
            <span class="macro-value"
              >{{ formatNumber(scannedFood.protein * servingMultiplier) }}g</span
            >
            <span class="macro-label">protein</span>
          </div>
          <div class="macro-item">
            <span class="macro-value"
              >{{ formatNumber(scannedFood.carbs * servingMultiplier) }}g</span
            >
            <span class="macro-label">carbs</span>
          </div>
          <div class="macro-item">
            <span class="macro-value"
              >{{ formatNumber(scannedFood.fat * servingMultiplier) }}g</span
            >
            <span class="macro-label">fat</span>
          </div>
        </div>

        <div class="serving-info">
          <small
            >Per {{ formatNumber(scannedFood.serving_size) }}{{ scannedFood.serving_unit }} ×
            {{ servingMultiplier }}</small
          >
        </div>

        <div class="action-buttons">
          <BaseButton variant="secondary" @click="handleScanAgain">
            <Icon name="mdi:barcode-scan" size="16" />
            Scan Again
          </BaseButton>
          <BaseButton variant="primary" @click="handleConfirm">
            <Icon name="mdi:check" size="16" />
            Add to Meal
          </BaseButton>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.barcode-scanner {
  min-height: 300px;
}

/* Camera View */
.camera-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.error-message {
  text-align: center;
  padding: 32px;
  color: var(--color-text-secondary);
}

.error-message p {
  margin: 12px 0;
}

.error-message .hint {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.camera-container {
  position: relative;
  width: 100%;
  max-width: 400px;
  aspect-ratio: 4/3;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scan-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
}

.scan-frame {
  width: 200px;
  height: 120px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  position: relative;
}

.corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border-color: var(--color-accent);
  border-style: solid;
}

.corner.top-left {
  top: -2px;
  left: -2px;
  border-width: 3px 0 0 3px;
}

.corner.top-right {
  top: -2px;
  right: -2px;
  border-width: 3px 3px 0 0;
}

.corner.bottom-left {
  bottom: -2px;
  left: -2px;
  border-width: 0 0 3px 3px;
}

.corner.bottom-right {
  bottom: -2px;
  right: -2px;
  border-width: 0 3px 3px 0;
}

.scan-hint {
  margin-top: 16px;
  color: #fff;
  font-size: 0.875rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

/* Loading View */
.loading-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 32px;
  text-align: center;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-view p {
  margin-top: 16px;
  color: var(--color-text-secondary);
}

.loading-view .hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* Result View */
.result-view {
  padding: 16px;
}

.product-info {
  text-align: center;
  margin-bottom: 20px;
}

.product-name {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.product-brand {
  margin: 4px 0 0 0;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.product-source {
  margin: 8px 0 0 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.serving-control {
  margin-bottom: 20px;
  padding: 16px;
  background: var(--color-bg-card);
  border-radius: 8px;
}

.serving-control label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.serving-input-group {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.step-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-bg-elevated);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.step-btn:hover:not(:disabled) {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
  border-color: var(--color-accent);
}

.step-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.serving-input {
  width: 70px;
  padding: 6px 8px;
  text-align: center;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-bg);
  color: var(--color-text-primary);
  font-size: 1rem;
  font-weight: 500;
}

.serving-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

/* Hide number input arrows */
.serving-input::-webkit-outer-spin-button,
.serving-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.serving-input[type='number'] {
  -moz-appearance: textfield;
}

.macros-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}

.macro-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  background: var(--color-bg-card);
  border-radius: 6px;
}

.macro-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.macro-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.serving-info {
  text-align: center;
  margin-bottom: 20px;
}

.serving-info small {
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.action-buttons :deep(.btn) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>
