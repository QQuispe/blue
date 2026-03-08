import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { serverLogger } from '~/server/utils/logger'
import { getFoodByBarcode } from '~/server/db/queries/health'

interface FoodData {
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

export default defineEventHandler(async event => {
  const startTime = Date.now()
  const code = getRouterParam(event, 'code')

  if (!code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Barcode required',
    })
  }

  try {
    // Validate barcode format (EAN-8, EAN-13, UPC-A)
    if (!/^\d{8,13}$/.test(code)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid barcode format',
      })
    }

    const user = await requireAuth(event)
    const config = useRuntimeConfig()

    serverLogger.info(`[Barcode] Looking up: ${code} for user ${user.id}`)

    // Step 1: Check local database (fastest, no API call needed)
    const localFood = await getFoodByBarcode(code)
    if (localFood) {
      serverLogger.info(`[Barcode] Found in local database: ${code}`)
      const duration = Date.now() - startTime
      serverLogger.api('GET', `/api/health/barcode/${code}`, 200, duration, user.id)
      return {
        statusCode: 200,
        data: {
          barcode: localFood.barcode,
          name: localFood.name,
          brand: localFood.brand,
          serving_size: localFood.serving_size,
          serving_unit: localFood.serving_unit,
          calories: localFood.calories,
          protein: localFood.protein,
          carbs: localFood.carbs,
          fat: localFood.fat,
          fiber: localFood.fiber,
          source: 'local',
        },
      }
    }

    // Step 2: Open Food Facts (free, no key, largest database)
    try {
      const offResponse = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${code}.json`,
        {
          headers: {
            'User-Agent': 'BlueApp - Personal Health Tracker',
          },
        }
      )

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

          const foodData: FoodData = {
            barcode: code,
            name: product.product_name || product.product_name_en || 'Unknown Product',
            brand: product.brands || null,
            serving_size: servingSize,
            serving_unit: servingUnit,
            calories:
              nutriments['energy-kcal_100g'] ||
              nutriments['energy-kcal_serving'] ||
              nutriments['energy-kcal'] ||
              0,
            protein:
              nutriments.proteins_100g || nutriments.proteins_serving || nutriments.proteins || 0,
            carbs:
              nutriments.carbohydrates_100g ||
              nutriments.carbohydrates_serving ||
              nutriments.carbohydrates ||
              0,
            fat: nutriments.fat_100g || nutriments.fat_serving || nutriments.fat || 0,
            fiber: nutriments.fiber_100g || nutriments.fiber_serving || nutriments.fiber || null,
            source: 'openfoodfacts',
          }

          // Convert to per-serving if data is per 100g
          if (nutriments['energy-kcal_100g'] && !nutriments['energy-kcal_serving']) {
            foodData.calories = (foodData.calories / 100) * servingSize
            foodData.protein = (foodData.protein / 100) * servingSize
            foodData.carbs = (foodData.carbs / 100) * servingSize
            foodData.fat = (foodData.fat / 100) * servingSize
            if (foodData.fiber) {
              foodData.fiber = (foodData.fiber / 100) * servingSize
            }
          }

          serverLogger.info(`[Barcode] Found in Open Food Facts: ${code}`)
          const duration = Date.now() - startTime
          serverLogger.api('GET', `/api/health/barcode/${code}`, 200, duration, user.id)
          return { statusCode: 200, data: foodData }
        }
      }
    } catch (offError) {
      serverLogger.warn(`[Barcode] Open Food Facts lookup failed: ${offError}`)
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

            // USDA returns per 100g, convert to per serving
            const conversionFactor = servingSize / 100

            const foodData: FoodData = {
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

            serverLogger.info(`[Barcode] Found in USDA: ${code}`)
            const duration = Date.now() - startTime
            serverLogger.api('GET', `/api/health/barcode/${code}`, 200, duration, user.id)
            return { statusCode: 200, data: foodData }
          }
        }
      } catch (usdaError) {
        serverLogger.warn(`[Barcode] USDA lookup failed: ${usdaError}`)
      }
    }

    // Step 4: Not found in any database
    serverLogger.info(`[Barcode] Product not found: ${code}`)
    const duration = Date.now() - startTime
    serverLogger.api('GET', `/api/health/barcode/${code}`, 404, duration, user.id)

    // Return special response indicating not found but with barcode for manual entry
    return {
      statusCode: 404,
      data: {
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
      },
    }
  } catch (error) {
    serverLogger.error(`[Barcode] Lookup error: ${error}`)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to lookup barcode',
    })
  }
})
