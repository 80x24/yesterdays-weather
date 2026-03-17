import { describe, it, expect, vi } from 'vitest'
import {
  validateLat,
  validateLon,
  validateDate,
  validateCoords,
  isValidationError,
  fetchWithTimeout,
} from './validation'

describe('validateLat', () => {
  it('returns number for valid latitude', () => {
    expect(validateLat('37.5665')).toBe(37.5665)
    expect(validateLat('0')).toBe(0)
    expect(validateLat('-90')).toBe(-90)
    expect(validateLat('90')).toBe(90)
  })

  it('returns error for undefined', () => {
    const result = validateLat(undefined)
    expect(isValidationError(result)).toBe(true)
    if (isValidationError(result)) {
      expect(result.error).toContain('required')
    }
  })

  it('returns error for non-numeric', () => {
    const result = validateLat('abc')
    expect(isValidationError(result)).toBe(true)
  })

  it('returns error for out of range', () => {
    expect(isValidationError(validateLat('91'))).toBe(true)
    expect(isValidationError(validateLat('-91'))).toBe(true)
    expect(isValidationError(validateLat('200'))).toBe(true)
  })

  it('rejects empty string', () => {
    expect(isValidationError(validateLat(''))).toBe(true)
  })
})

describe('validateLon', () => {
  it('returns number for valid longitude', () => {
    expect(validateLon('126.978')).toBe(126.978)
    expect(validateLon('0')).toBe(0)
    expect(validateLon('-180')).toBe(-180)
    expect(validateLon('180')).toBe(180)
  })

  it('returns error for undefined', () => {
    expect(isValidationError(validateLon(undefined))).toBe(true)
  })

  it('returns error for out of range', () => {
    expect(isValidationError(validateLon('181'))).toBe(true)
    expect(isValidationError(validateLon('-181'))).toBe(true)
  })

  it('returns error for non-numeric', () => {
    expect(isValidationError(validateLon('xyz'))).toBe(true)
  })
})

describe('validateDate', () => {
  it('returns date string for valid format', () => {
    expect(validateDate('2026-03-15')).toBe('2026-03-15')
    expect(validateDate('2020-01-01')).toBe('2020-01-01')
  })

  it('returns error for undefined', () => {
    expect(isValidationError(validateDate(undefined))).toBe(true)
  })

  it('returns error for wrong format', () => {
    expect(isValidationError(validateDate('03-15-2026'))).toBe(true)
    expect(isValidationError(validateDate('2026/03/15'))).toBe(true)
    expect(isValidationError(validateDate('20260315'))).toBe(true)
  })

  it('returns error for invalid calendar date', () => {
    expect(isValidationError(validateDate('2026-02-30'))).toBe(true)
    expect(isValidationError(validateDate('2026-13-01'))).toBe(true)
  })
})

describe('validateCoords', () => {
  it('returns coords for valid input', () => {
    const result = validateCoords('37.5665', '126.978')
    expect(result).toEqual({ lat: 37.5665, lon: 126.978 })
  })

  it('returns error if lat is invalid', () => {
    const result = validateCoords('999', '126.978')
    expect(isValidationError(result)).toBe(true)
  })

  it('returns error if lon is invalid', () => {
    const result = validateCoords('37.5665', '999')
    expect(isValidationError(result)).toBe(true)
  })

  it('returns error if both missing', () => {
    const result = validateCoords(undefined, undefined)
    expect(isValidationError(result)).toBe(true)
  })
})

describe('fetchWithTimeout', () => {
  it('returns response for successful fetch', async () => {
    const mockResponse = new Response(JSON.stringify({ ok: true }), { status: 200 })
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse)

    const result = await fetchWithTimeout('https://example.com', 5000)
    expect(result.status).toBe(200)

    vi.restoreAllMocks()
  })

  it('passes AbortSignal to fetch', async () => {
    const mockResponse = new Response('ok')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse)

    await fetchWithTimeout('https://example.com', 5000)

    expect(fetchSpy).toHaveBeenCalledWith('https://example.com', {
      signal: expect.any(AbortSignal),
    })

    vi.restoreAllMocks()
  })

  it('aborts on timeout', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          const signal = (init as RequestInit)?.signal
          if (signal) {
            signal.addEventListener('abort', () => {
              reject(new DOMException('The operation was aborted.', 'AbortError'))
            })
          }
        })
    )

    await expect(fetchWithTimeout('https://example.com', 50)).rejects.toThrow('aborted')

    vi.restoreAllMocks()
  })
})
