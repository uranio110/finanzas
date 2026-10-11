export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  const escape = (value: unknown) => {
    const str = value === null || value === undefined ? '' : String(value)
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
    return str
  }
  const lines = [headers.join(','), ...rows.map((row) => headers.map((h) => escape(row[h])).join(','))]
  const csv = lines.join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
