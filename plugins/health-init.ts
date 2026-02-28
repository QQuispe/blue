export default defineNuxtPlugin(async nuxtApp => {
  const { init, dashboard, activeGoalId, hasCustomTargets } = useHealthData()
  await init()

  // Extract goal info from dashboard
  if (dashboard.value?.activeGoal) {
    activeGoalId.value = dashboard.value.activeGoal.id
    hasCustomTargets.value = !!(
      dashboard.value.activeGoal.targetCalories ||
      dashboard.value.activeGoal.targetProtein ||
      dashboard.value.activeGoal.targetCarbs ||
      dashboard.value.activeGoal.targetFat
    )
  }
})
