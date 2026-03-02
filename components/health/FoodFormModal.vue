<script setup lang="ts">
import { useFoodSearch, type CustomFood } from '~/composables/health/useFoodSearch'
import BaseModal from './BaseModal.vue'
import FoodForm from './foods/FoodForm.vue'

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

const handleSave = (savedFood: any) => {
  emit('save', savedFood)
}

const handleCancel = () => {
  emit('close')
}
</script>

<template>
  <BaseModal
    :show="show"
    :title="food ? 'Edit Food' : 'Create Food'"
    size="md"
    @close="emit('close')"
  >
    <FoodForm :food="food" @save="handleSave" @cancel="handleCancel" />
  </BaseModal>
</template>
