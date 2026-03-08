import { createError } from 'h3'
import { useRuntimeConfig } from '#imports'
import { getFoodByBarcode } from '~/server/db/queries/health'

export interface BarcodeResult {
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
  source: 'local' | 'openfoodfacts' | 'usda' | 'notfound'
}

/**
 * Lookup food by barcode across multiple sources
 */
export async function lookupBarcode(code: string): Promise<BarcodeResult> {
  // Validate barcode format (EAN-8, EAN-13, UPC-A)
  if (!/^\d{8,13}$/.test(code)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid barcode format',
    })
  }

  const config = useRuntimeConfig()

  // Step 1: Check local database (fastest, no API call needed)
  const localFood = await getFoodByBarcode(code)
  if (localFood) {
    return {
      barcode: localFood.barcode || code,
      name: localFood.name,
      brand: localFood.brand,
      serving_size: localFood.serving_size || 100,
      serving_unit: localFood.serving_unit || 'g',
      calories: localFood.calories || 0,
      protein: localFood.protein || 0,
      carbs: localFood.carbs || 0,
      fat: localFood.fat || 0,
      fiber: localFood.fiber,
      source: 'local',
    }
  }

  // Step 2: Open Food Facts (free, no key, largest database)
  try {
    const offResponse = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`, {
      headers: {
        'User-Agent': 'BlueApp - Personal Health Tracker',
      },
    })

    if (offResponse.ok) {
      const offData = await offResponse.json()

      if (offData.status === 1 && offData.product) {
        const product = offData.product
        const nutriments = product.nutriments || {}

        // Extract serving size
        let servingSize = 100
        let servingUnit = 'g'
        if (product.serving_size) {
          const match = product.serving_size.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/)
          if (match) {
            servingSize = parseFloat(match[1])
            servingUnit = match[2].toLowerCase()
          }
        }

        let calories =
          nutriments['energy-kcal_100g'] ||
          nutriments['energy-kcal_serving'] ||
          nutriments['energy-kcal'] ||
          0
        let protein =
          nutriments.proteins_100g || nutriments.proteins_serving || nutriments.proteins || 0
        let carbs =
          nutriments.carbohydrates_100g ||
          nutriments.carbohydrates_serving ||
          nutriments.carbohydrates ||
          0
        let fat = nutriments.fat_100g || nutriments.fat_serving || nutriments.fat || 0
        let fiber: number | null =
          nutriments.fiber_100g || nutriments.fiber_serving || nutriments.fiber || null

        // Convert to per-serving if data is per 100g
        if (nutriments['energy-kcal_100g'] && !nutriments['energy-kcal_serving']) {
          const factor = servingSize / 100
          calories = calories * factor
          protein = protein * factor
          carbs = carbs * factor
          fat = fat * factor
          if (fiber) fiber = fiber * factor
        }

        return {
          barcode: code,
          name: product.product_name || product.product_name_en || 'Unknown Product',
          brand: product.brands || null,
          serving_size: servingSize,
          serving_unit: servingUnit,
          calories,
          protein,
          carbs,
          fat,
          fiber,
          source: 'openfoodfacts',
        }
      }
    }
  } catch {
    // Continue to next source
  }

  // Step 3: USDA API (free, better for raw ingredients)
  if (config.usdaApiKey) {
    try {
      const usdaResponse = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${config.usdaApiKey}&query=${code}&dataType=Branded&pageSize=5`,
        { headers: { 'Content-Type': 'application/json' } }
      )

      if (usdaResponse.ok) {
        const usdaData = await usdaResponse.json()

        if (usdaData.foods && usdaData.foods.length > 0) {
          const food = usdaData.foods[0]
          const nutrients = food.foodNutrients || []

          const getNutrient = (nutrientNumber: number) => {
            const n = nutrients.find((nut: any) => nut.nutrientNumber === String(nutrientNumber))
            return n ? n.value : 0
          }

          const servingSize = food.servingSize || 100
          const servingUnit = food.servingSizeUnit || 'g'
          const conversionFactor = servingSize / 100

          return {
            barcode: code,
            name: food.description || 'Unknown Product',
            brand: food.brandOwner || food.brandName || null,
            serving_size: servingSize,
            serving_unit: servingUnit,
            calories: getNutrient(1008) * conversionFactor,
            protein: getNutrient(1003) * conversionFactor,
            carbs: getNutrient(1005) * conversionFactor,
            fat: getNutrient(1004) * conversionFactor,
            fiber: getNutrient(1079) * conversionFactor || null,
            source: 'usda',
          }
        }
      }
    } catch {
      // Continue to not found
    }
  }

  // Step 4: Not found in any database
  return {
    barcode: code,
    name: '',
    brand: null,
    serving_size: 100,
    serving_unit: 'g',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: null,
    source: 'notfound',
  }
}
