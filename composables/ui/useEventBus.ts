import { ref, readonly } from 'vue'

// Simple event bus for cross-component communication
type EventCallback = (payload: any) => void

const listeners = ref<Map<string, Set<EventCallback>>>(new Map())
const debounceTimers = ref<Map<string, NodeJS.Timeout>>(new Map())

export function useEventBus() {
  const on = (event: string, callback: EventCallback, debounceMs: number = 0) => {
    if (!listeners.value.has(event)) {
      listeners.value.set(event, new Set())
    }

    const wrappedCallback =
      debounceMs > 0
        ? (payload: any) => {
            // Clear existing timer
            const existingTimer = debounceTimers.value.get(event)
            if (existingTimer) {
              clearTimeout(existingTimer)
            }

            // Set new timer
            const timer = setTimeout(() => {
              callback(payload)
              debounceTimers.value.delete(event)
            }, debounceMs)

            debounceTimers.value.set(event, timer)
          }
        : callback

    listeners.value.get(event)!.add(wrappedCallback)

    // Return unsubscribe function
    return () => {
      listeners.value.get(event)?.delete(wrappedCallback)
    }
  }

  const emit = (event: string, payload?: any) => {
    const eventListeners = listeners.value.get(event)
    if (eventListeners) {
      eventListeners.forEach(callback => callback(payload))
    }
  }

  const off = (event: string, callback?: EventCallback) => {
    if (callback) {
      listeners.value.get(event)?.delete(callback)
    } else {
      listeners.value.delete(event)
    }
  }

  return {
    on,
    emit,
    off,
  }
}

// Common event types
export const EVENTS = {
  FOOD_UPDATED: 'food-updated',
  FOOD_CREATED: 'food-created',
  FOOD_DELETED: 'food-deleted',
  RECIPE_UPDATED: 'recipe-updated',
  RECIPE_CREATED: 'recipe-created',
  RECIPE_DELETED: 'recipe-deleted',
} as const
