<script setup lang="ts">
import BaseModal from './BaseModal.vue'
import RecipeForm from './foods/RecipeForm.vue'

interface Props {
  show: boolean
  recipe?: any | null
}

const props = withDefaults(defineProps<Props>(), {
  recipe: null,
})

const emit = defineEmits<{
  save: [recipe: any]
  close: []
}>()

const handleSave = (savedRecipe: any) => {
  emit('save', savedRecipe)
}

const handleCancel = () => {
  emit('close')
}
</script>

<template>
  <BaseModal
    :show="show"
    :title="recipe ? 'Edit Recipe' : 'Create Recipe'"
    size="lg"
    @close="emit('close')"
  >
    <RecipeForm :recipe="recipe" @save="handleSave" @cancel="handleCancel" />
  </BaseModal>
</template>
