/**
 * Input validation and fetch timeout utilities
 */

export interface ValidationError {
  error: string
  field?: string
}

/**
 * Validate latitude: must be a number between -90 and 90
 */
export function validateLat(value: string | undefined): number | ValidationError {
  if (!value) return { error: 'lat is required', field: 'lat' }
  const num = Number(value)
  if (isNaN(num) || num < -90 || num > 90) {
    return { error: 'lat must be a number between -90 and 90', field: 'lat' }
  }
  return num
}

/**
 * Validate longitude: must be a number between -180 and 180
 */
export function validateLon(value: string | undefined): number | ValidationError {
  if (!value) return { error: 'lon is required', field: 'lon' }
  const num = Number(value)
  if (isNaN(num) || num < -180 || num > 180) {
    return { error: 'lon must be a number between -180 and 180', field: 'lon' }
  }
  return num
}

/**
 * Validate date string: must be YYYY-MM-DD format
 */
export function validateDate(value: string | undefined): string | ValidationError {
  if (!value) return { error: 'date is required', field: 'date' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { error: 'date must be in YYYY-MM-DD format', field: 'date' }
  }
  // Check if it's a real date by parsing and comparing back
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (
    isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return { error: 'date is not a valid calendar date', field: 'date' }
  }
  return value
}

/**
 * Validate lat/lon pair, return validated numbers or error
 */
export function validateCoords(lat: string | undefined, lon: string | undefined): { lat: number; lon: number } | ValidationError {
  const latResult = validateLat(lat)
  if (typeof latResult !== 'number') return latResult

  const lonResult = validateLon(lon)
  if (typeof lonResult !== 'number') return lonResult

  return { lat: latResult, lon: lonResult }
}

export function isValidationError(value: unknown): value is ValidationError {
  return typeof value === 'object' && value !== null && 'error' in value
}

/**
 * Fetch with timeout using AbortController
 */
export async function fetchWithTimeout(url: string, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { signal: controller.signal })
    return response
  } finally {
    clearTimeout(timeout)
  }
}
