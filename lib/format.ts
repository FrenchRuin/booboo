export function formatAmount(val: string): string {
  const num = val.replace(/[^0-9]/g, '')
  return num ? parseInt(num, 10).toLocaleString('ko-KR') : ''
}

const KOREAN_AMOUNT_UNITS: [number, string][] = [
  [100000000, '억'],
  [10000, '만'],
  [1000, '천'],
  [100, '백'],
  [10, '십'],
]

export function formatKoreanAmount(num: number): string {
  if (!num || num <= 0) return ''
  let remaining = num
  let result = ''
  for (const [value, label] of KOREAN_AMOUNT_UNITS) {
    const count = Math.floor(remaining / value)
    if (count > 0) {
      result += `${count}${label}`
      remaining %= value
    }
  }
  if (remaining > 0) result += remaining
  return `${result}원`
}
