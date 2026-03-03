<script setup lang="ts">
import { ref, watch, computed } from 'vue'

interface FoodFormData {
  name: string
  brand: string
  serving_size: string | number
  serving_unit: string
  calories: string | number
  protein: string | number
  carbs: string | number
  fat: string | number
  fiber: string | number
}

interface Props {
  food?: any | null
}

const props = withDefaults(defineProps<Props>(), {
  food: null,
})

const emit = defineEmits<{
  save: [food: any]
  cancel: []
}>()

const { $toast } = useNuxtApp()

const isEditing = computed(() => !!props.food)
const isSaving = ref(false)

const form = ref<FoodFormData>({
  name: '',
  brand: '',
  serving_size: '',
  serving_unit: 'g',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  fiber: '',
})

const servingUnits = [
  { value: 'g', label: 'g' },
  { value: 'ml', label: 'ml' },
  { value: 'oz', label: 'oz' },
  { value: 'cup', label: 'cup' },
  { value: 'tbsp', label: 'tbsp' },
  { value: 'tsp', label: 'tsp' },
  { value: 'piece', label: 'piece' },
  { value: 'serving', label: 'serving' },
]

const resetForm = () => {
  form.value = {
    name: '',
    brand: '',
    serving_size: '',
    serving_unit: 'g',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    fiber: '',
  }
}

watch(
  () => props.food,
  newFood => {
    if (newFood) {
      form.value = {
        name: newFood.name || '',
        brand: newFood.brand || '',
        serving_size: newFood.serving_size || '',
        serving_unit: newFood.serving_unit || 'g',
        calories: newFood.calories || '',
        protein: newFood.protein || '',
        carbs: newFood.carbs || '',
        fat: newFood.fat || '',
        fiber: newFood.fiber || '',
      }
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

const handleSave = async () => {
  if (!form.value.name) {
    $toast?.error('Name is required')
    return
  }

  isSaving.value = true

  try {
    const payload = {
      name: form.value.name,
      brand: form.value.brand || null,
      serving_size: form.value.serving_size ? Number(form.value.serving_size) : 100,
      serving_unit: form.value.serving_unit,
      calories: form.value.calories ? Number(form.value.calories) : 0,
      protein: form.value.protein ? Number(form.value.protein) : 0,
      carbs: form.value.carbs ? Number(form.value.carbs) : 0,
      fat: form.value.fat ? Number(form.value.fat) : 0,
      fiber: form.value.fiber ? Number(form.value.fiber) : 0,
    }

    let response

    if (isEditing.value && props.food) {
      response = await fetch(`/api/health/foods/custom/${props.food.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
    } else {
      response = await fetch('/api/health/foods/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
    }

    if (!response.ok) {
      throw new Error('Failed to save food')
    }

    const savedFood = await response.json()
    $toast?.success(isEditing.value ? 'Food updated!' : 'Food created!')
    emit('save', savedFood.food || payload)
  } catch (err) {
    console.error('Error saving food:', err)
    $toast?.error('Failed to save food')
  } finally {
    isSaving.value = false
  }
}

const handleCancel = () => {
  resetForm()
  emit('cancel')
}

defineExpose({
  resetForm,
})
</script>

<template>
  <div class="food-form">
    <div class="form-header">
      <h3>{{ isEditing ? 'Edit Food' : 'Add Custom Food' }}</h3>
      <p class="form-subtitle">
        {{ isEditing ? 'Update the food details below' : 'Create a custom food for your database' }}
      </p>
    </div>

    <div class="form-body">
      <div class="form-group">
        <label>Name *</label>
        <input
          v-model="form.name"
          type="text"
          placeholder="e.g., Kirkland Eggs"
          class="form-input"
        />
      </div>

      <div class="form-group">
        <label>Brand</label>
        <input v-model="form.brand" type="text" placeholder="e.g., Kirkland" class="form-input" />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Serving Size</label>
          <input v-model="form.serving_size" type="number" placeholder="100" class="form-input" />
        </div>
        <div class="form-group">
          <label>Unit</label>
          <select v-model="form.serving_unit" class="form-input">
            <option v-for="unit in servingUnits" :key="unit.value" :value="unit.value">
              {{ unit.label }}
            </option>
          </select>
        </div>
      </div>

      <div class="form-section">
        <label class="section-label">Macros (per serving)</label>
        <div class="macros-grid">
          <div class="macro-input">
            <label>Calories</label>
            <input v-model="form.calories" type="number" placeholder="0" class="form-input" />
          </div>
          <div class="macro-input">
            <label>Protein (g)</label>
            <input v-model="form.protein" type="number" placeholder="0" class="form-input" />
          </div>
          <div class="macro-input">
            <label>Carbs (g)</label>
            <input v-model="form.carbs" type="number" placeholder="0" class="form-input" />
          </div>
          <div class="macro-input">
            <label>Fat (g)</label>
            <input v-model="form.fat" type="number" placeholder="0" class="form-input" />
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>Fiber (g)</label>
        <input v-model="form.fiber" type="number" placeholder="0" class="form-input" />
      </div>
    </div>

    <div class="form-footer">
      <button type="button" class="btn btn-secondary" :disabled="isSaving" @click="handleCancel">
        Cancel
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="isSaving || !form.name"
        @click="handleSave"
      >
        {{ isSaving ? 'Saving...' : isEditing ? 'Update Food' : 'Add Food' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.food-form {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.form-header {
  padding: 24px;
  border-bottom: 1px solid var(--color-border);
}

.form-header h3 {
  margin: 0 0 4px 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.form-subtitle {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.form-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text-primary);
  font-size: 0.9375rem;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input::placeholder {
  color: var(--color-text-muted);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-section {
  margin-bottom: 20px;
}

.section-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
}

.macros-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.macro-input label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.form-footer {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
}

.btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-bg);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-bg-hover);
}

.btn-primary {
  background: var(--color-accent);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-dark);
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .macros-grid {
    grid-template-columns: 1fr;
  }

  .form-header,
  .form-body,
  .form-footer {
    padding: 16px;
  }
}
</style>
