export type Granularity = 'month' | 'week' | 'day'

const DAY_MS = 86400000

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function startOfWeek(d: Date): Date {
  // Semana de lunes a domingo.
  const day = (d.getDay() + 6) % 7 // lunes = 0 ... domingo = 6
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day)
}

export function getPeriodRange(granularity: Granularity, anchor: Date): { from: Date; to: Date } {
  if (granularity === 'day') {
    const from = startOfDay(anchor)
    return { from, to: from }
  }
  if (granularity === 'week') {
    const from = startOfWeek(anchor)
    return { from, to: new Date(from.getTime() + 6 * DAY_MS) }
  }
  const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
  return { from, to }
}

export function shiftPeriod(granularity: Granularity, anchor: Date, direction: 1 | -1): Date {
  if (granularity === 'day') return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + direction)
  if (granularity === 'week') return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + direction * 7)
  return new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1)
}

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const WEEKDAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

export function formatPeriodLabel(granularity: Granularity, anchor: Date): string {
  if (granularity === 'day') {
    return `${WEEKDAY_NAMES[anchor.getDay()]} ${anchor.getDate()} de ${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`
  }
  if (granularity === 'week') {
    const { from, to } = getPeriodRange('week', anchor)
    const sameMonth = from.getMonth() === to.getMonth()
    const fromLabel = `${from.getDate()}${sameMonth ? '' : ' ' + MONTH_NAMES[from.getMonth()].slice(0, 3)}`
    return `${fromLabel} – ${to.getDate()} ${MONTH_NAMES[to.getMonth()].slice(0, 3)} ${to.getFullYear()}`
  }
  return `${MONTH_NAMES[anchor.getMonth()][0].toUpperCase()}${MONTH_NAMES[anchor.getMonth()].slice(1)} ${anchor.getFullYear()}`
}

export function toDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function toMonthInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function isoWeekInfo(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const firstThursdayDay = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDay + 3)
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * DAY_MS))
  return { year: d.getUTCFullYear(), week }
}

export function toWeekInputValue(d: Date): string {
  const { year, week } = isoWeekInfo(d)
  return `${year}-W${String(week).padStart(2, '0')}`
}

export function dateInputValueToDate(value: string): Date {
  const [y, m, day] = value.split('-').map(Number)
  return new Date(y, m - 1, day)
}

export function monthInputValueToDate(value: string): Date {
  const [y, m] = value.split('-').map(Number)
  return new Date(y, m - 1, 1)
}

export function weekInputValueToDate(value: string): Date {
  const [yPart, wPart] = value.split('-W')
  const year = Number(yPart)
  const week = Number(wPart)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = (jan4.getUTCDay() + 6) % 7
  const week1Monday = new Date(jan4)
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day)
  const monday = new Date(week1Monday)
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7)
  return new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate())
}
