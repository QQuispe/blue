<script setup lang="ts">
interface Props {
  show: boolean
  title?: string
  width?: string
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  title: '',
  width: '480px',
})

const emit = defineEmits<{
  close: []
}>()

const handleBackdropClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) {
    emit('close')
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  if (props.show) {
    document.body.style.overflow = 'hidden'
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})

watch(
  () => props.show,
  newVal => {
    document.body.style.overflow = newVal ? 'hidden' : ''
  }
)
</script>

<template>
  <Teleport to="body">
    <Transition name="slide-over">
      <div v-if="show" class="slide-over-backdrop" @click="handleBackdropClick">
        <div class="slide-over-panel" :style="{ maxWidth: width }" @click.stop>
          <div v-if="title" class="slide-over-header">
            <h3>{{ title }}</h3>
            <button class="close-btn" @click="emit('close')" aria-label="Close">
              <Icon name="mdi:close" size="20" />
            </button>
          </div>
          <div class="slide-over-content">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.slide-over-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: flex-end;
  z-index: 1000;
}

.slide-over-panel {
  width: 100%;
  height: 100%;
  background: var(--color-bg-card);
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  animation: slideIn 0.2s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.slide-over-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.slide-over-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.close-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.slide-over-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* Transitions */
.slide-over-enter-active,
.slide-over-leave-active {
  transition: opacity 0.2s ease;
}

.slide-over-enter-active .slide-over-panel,
.slide-over-leave-active .slide-over-panel {
  transition: transform 0.2s ease;
}

.slide-over-enter-from,
.slide-over-leave-to {
  opacity: 0;
}

.slide-over-enter-from .slide-over-panel,
.slide-over-leave-to .slide-over-panel {
  transform: translateX(100%);
}

@media (max-width: 640px) {
  .slide-over-panel {
    max-width: 100% !important;
  }
}
</style>
