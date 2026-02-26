<script setup lang="ts">
import { useFoodSearch, type CustomFood } from '~/composables/health/useFoodSearch'

interface Props {
  show: boolean
  food?: CustomFood | null
}

const props = withDefaults(defineProps<Props>(), {
  food: null,
})

const emit = defineEmits<{
  save: [food: CustomFood]
  close: []
}>()

const { $toast } = useNuxtApp()

const isEditing = computed(() => !!props.food)
const isSaving = ref(false)

const form = ref({
  name: '',
  brand: '',
  serving_size: '' as string | number,
  serving_unit: 'g',
  calories: '' as string | number,
  protein: '' as string | number,
  carbs: '' as string | number,
  fat: '' as string | number,
  fiber: '' as string | number,
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

watch(
  () => props.show,
  newVal => {
    if (newVal) {
      if (props.food) {
        form.value = {
          name: props.food.name,
          brand: props.food.brand || '',
          serving_size: props.food.serving_size,
          serving_unit: props.food.serving_unit,
          calories: props.food.calories,
          protein: props.food.protein,
          carbs: props.food.carbs,
          fat: props.food.fat,
          fiber: (props.food as any).fiber || '',
        }
      } else {
        resetForm()
      }
    }
  }
)

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
    emit('close')
  } catch (err) {
    console.error('Error saving food:', err)
    $toast?.error('Failed to save food')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <BaseModal
    :show="show"
    :title="isEditing ? 'Edit Food' : 'Create Food'"
    size="md"
    @close="emit('close')"
  >
    <div class="form-group">
      <label>Name *</label>
      <input v-model="form.name" type="text" placeholder="e.g., Kirkland Eggs" />
    </div>

    <div class="form-group">
      <label>Brand</label>
      <input v-model="form.brand" type="text" placeholder="e.g., Kirkland" />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Serving Size</label>
        <input v-model="form.serving_size" type="number" placeholder="100" />
      </div>
      <div class="form-group">
        <label>Unit</label>
        <select v-model="form.serving_unit">
          <option v-for="unit in servingUnits" :key="unit.value" :value="unit.value">
            {{ unit.label }}
          </option>
        </select>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Calories</label>
        <input v-model="form.calories" type="number" placeholder="0" />
      </div>
      <div class="form-group">
        <label>Protein (g)</label>
        <input v-model="form.protein" type="number" placeholder="0" />
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Carbs (g)</label>
        <input v-model="form.carbs" type="number" placeholder="0" />
      </div>
      <div class="form-group">
        <label>Fat (g)</label>
        <input v-model="form.fat" type="number" placeholder="0" />
      </div>
    </div>

    <div class="form-group">
      <label>Fiber (g)</label>
      <input v-model="form.fiber" type="number" placeholder="0" />
    </div>

    <template #footer>
      <button class="btn btn-secondary" :disabled="isSaving" @click="emit('close')">Cancel</button>
      <button class="btn btn-primary" :disabled="isSaving || !form.name" @click="handleSave">
        {{ isSaving ? 'Saving...' : isEditing ? 'Update' : 'Create' }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text-primary);
  font-size: 0.9375rem;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--color-accent);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
  min-width: 80px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-bg-hover);
}

.btn-primary {
  background: var(--color-accent);
  color: var(--color-bg-primary);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-dark);
}
</style>
