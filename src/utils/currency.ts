// Todos los importes se guardan como enteros (centavos) en la base de
// datos para evitar errores de coma flotante. Estas funciones son el unico
// lugar donde se convierte entre esa representacion y lo que ve el usuario.

export function formatCurrency(amountInCents: number, currency = 'COP', locale = 'es-CO'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amountInCents / 100)
}

/**
 * Convierte texto escrito por el usuario (ej. "12.345,67" o "12345.67" o
 * "12345") a centavos enteros, sin pasar por parseFloat sobre el numero
 * completo (que puede acumular error de redondeo con decimales largos).
 */
export function parseAmountToCents(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Acepta "." o "," como separador decimal; si aparecen ambos, el ultimo
  // que aparece es el decimal y el otro se trata como separador de miles.
  const lastDot = trimmed.lastIndexOf('.')
  const lastComma = trimmed.lastIndexOf(',')
  const decimalIndex = Math.max(lastDot, lastComma)

  let integerPart: string
  let fractionPart: string
  if (decimalIndex === -1) {
    integerPart = trimmed
    fractionPart = ''
  } else {
    integerPart = trimmed.slice(0, decimalIndex)
    fractionPart = trimmed.slice(decimalIndex + 1)
  }

  const cleanInteger = integerPart.replace(/[^0-9-]/g, '')
  const cleanFraction = fractionPart.replace(/[^0-9]/g, '').padEnd(2, '0').slice(0, 2)

  if (!cleanInteger || cleanInteger === '-') return null
  const isNegative = cleanInteger.startsWith('-')
  const digitsOnly = cleanInteger.replace('-', '')
  if (!/^\d+$/.test(digitsOnly)) return null

  const cents = BigInt(digitsOnly) * 100n + BigInt(cleanFraction || '0')
  const signed = isNegative ? -cents : cents
  return Number(signed)
}
