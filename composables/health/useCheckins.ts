import { toHTMLDateString } from '~/utils/formatters'

export interface Checkin {
  id: number
  checkin_date: string
  weight: number | null
  chest: number | null
  waist: number | null
  hips: number | null
  biceps: number | null
  thighs: number | null
  notes: string | null
  created_at?: string
}

export interface CheckinFormData {
  checkin_date: string
  weight: number | null
  chest: number | null
  waist: number | null
  hips: number | null
  biceps: number | null
  thighs: number | null
  notes: string
}

export const useCheckins = () => {
  const { $toast } = useNuxtApp()

  const checkins = ref<Checkin[]>([])
  const isLoading = ref(false)
  const isSubmitting = ref(false)

  const showCheckinModal = ref(false)
  const isEditingCheckin = ref(false)
  const editingCheckinId = ref<number | null>(null)

  const defaultCheckinForm: CheckinFormData = {
    checkin_date: '',
    weight: null,
    chest: null,
    waist: null,
    hips: null,
    biceps: null,
    thighs: null,
    notes: '',
  }

  const checkinForm = ref<CheckinFormData>({ ...defaultCheckinForm })

  const checkinToDelete = ref<Checkin | null>(null)
  const showDeleteConfirmModal = ref(false)

  const resetCheckinForm = () => {
    checkinForm.value = {
      checkin_date: toHTMLDateString(new Date()),
      weight: null,
      chest: null,
      waist: null,
      hips: null,
      biceps: null,
      thighs: null,
      notes: '',
    }
    isEditingCheckin.value = false
    editingCheckinId.value = null
  }

  const openNewCheckinModal = async () => {
    // Ensure checkins are loaded before opening modal
    if (checkins.value.length === 0) {
      await fetchCheckins()
    }

    // Pre-fill with latest checkin data if available
    if (checkins.value.length > 0) {
      const latest = checkins.value[0]
      checkinForm.value = {
        checkin_date: toHTMLDateString(new Date()),
        weight: latest.weight,
        chest: latest.chest,
        waist: latest.waist,
        hips: latest.hips,
        biceps: latest.biceps,
        thighs: latest.thighs,
        notes: '',
      }
    } else {
      resetCheckinForm()
    }

    showCheckinModal.value = true
  }

  const openEditCheckinModal = (checkin: Checkin) => {
    checkinForm.value = {
      checkin_date: checkin.checkin_date,
      weight: checkin.weight,
      chest: checkin.chest,
      waist: checkin.waist,
      hips: checkin.hips,
      biceps: checkin.biceps,
      thighs: checkin.thighs,
      notes: checkin.notes || '',
    }
    isEditingCheckin.value = true
    editingCheckinId.value = checkin.id
    showCheckinModal.value = true
  }

  const closeCheckinModal = () => {
    showCheckinModal.value = false
    resetCheckinForm()
  }

  const confirmDeleteCheckin = (checkin: Checkin) => {
    checkinToDelete.value = checkin
    showDeleteConfirmModal.value = true
  }

  const cancelDeleteCheckin = () => {
    checkinToDelete.value = null
    showDeleteConfirmModal.value = false
  }

  const fetchCheckins = async () => {
    try {
      isLoading.value = true
      const response = await fetch('/api/health/checkins', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch check-ins')
      }

      const data = await response.json()
      checkins.value = (data.checkins || []).map((c: any) => ({
        ...c,
        checkin_date: c.checkinDate,
        weight: c.weight ? Number(c.weight) : null,
        chest: c.chest ? Number(c.chest) : null,
        waist: c.waist ? Number(c.waist) : null,
        hips: c.hips ? Number(c.hips) : null,
        biceps: c.biceps ? Number(c.biceps) : null,
        thighs: c.thighs ? Number(c.thighs) : null,
      }))
    } catch (err) {
      console.error('Error:', err)
    } finally {
      isLoading.value = false
    }
  }

  const submitCheckin = async () => {
    if (!checkinForm.value.weight) {
      $toast?.error('Weight is required')
      return { success: false }
    }

    try {
      isSubmitting.value = true

      const payload = {
        checkin_date: checkinForm.value.checkin_date,
        weight: checkinForm.value.weight,
        chest: checkinForm.value.chest,
        waist: checkinForm.value.waist,
        hips: checkinForm.value.hips,
        biceps: checkinForm.value.biceps,
        thighs: checkinForm.value.thighs,
        notes: checkinForm.value.notes || null,
      }

      let response

      if (isEditingCheckin.value && editingCheckinId.value) {
        response = await fetch(`/api/health/checkins/${editingCheckinId.value}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
      } else {
        response = await fetch('/api/health/checkins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
      }

      if (!response.ok) {
        throw new Error('Failed to save check-in')
      }

      $toast?.success('Check-in saved!')
      closeCheckinModal()
      fetchCheckins()
      return { success: true }
    } catch (err) {
      $toast?.error('Failed to save check-in')
      return { success: false }
    } finally {
      isSubmitting.value = false
    }
  }

  const deleteCheckin = async () => {
    if (!checkinToDelete.value) return

    try {
      await $fetch(`/api/health/checkins/${checkinToDelete.value.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      $toast?.success('Check-in deleted')
      cancelDeleteCheckin()
      fetchCheckins()
    } catch (err) {
      $toast?.error('Failed to delete check-in')
    }
  }

  return {
    checkins,
    isLoading,
    isSubmitting,
    showCheckinModal,
    isEditingCheckin,
    editingCheckinId,
    checkinForm,
    checkinToDelete,
    showDeleteConfirmModal,
    openNewCheckinModal,
    openEditCheckinModal,
    closeCheckinModal,
    confirmDeleteCheckin,
    cancelDeleteCheckin,
    fetchCheckins,
    submitCheckin,
    deleteCheckin,
  }
}
