// Macro formatting utility for consistent display
export const useMacroFormatting = () => {
  /**
   * Format calories - always round to whole number
   * 81.5 → "82"
   */
  const formatCalories = (val: number | string | undefined | null): string => {
    if (val === undefined || val === null || val === '') return '--'
    const num = Number(val)
    if (isNaN(num)) return '--'
    return Math.round(num).toString()
  }

  /**
   * Format macros (protein, carbs, fat, fiber)
   * - Values < 1: 2 decimals (0.75g)
   * - Values >= 1: 1 decimal, strip trailing .0 (7.5g or 8g)
   */
  const formatMacro = (val: number | string | undefined | null): string => {
    if (val === undefined || val === null || val === '') return '--'
    const num = Number(val)
    if (isNaN(num)) return '--'
    if (num === 0) return '0'

    // Small values: 2 decimal places
    if (num < 1) {
      return num.toFixed(2)
    }

    // Regular values: 1 decimal place, strip .0
    const formatted = num.toFixed(1)
    return formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted
  }

  /**
   * Format servings - keep full precision for editing, but can format for display
   * Used when you want to show rounded servings in read-only displays
   */
  const formatServings = (val: number | string | undefined | null): string => {
    if (val === undefined || val === null || val === '') return '--'
    const num = Number(val)
    if (isNaN(num)) return '--'
    if (num === 0) return '0'
    if (num < 1) return num.toFixed(2)

    const formatted = num.toFixed(1)
    return formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted
  }

  return {
    formatCalories,
    formatMacro,
    formatServings,
  }
}
