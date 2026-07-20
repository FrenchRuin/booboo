export type ExportEntry = {
  date: string
  type: 'expense' | 'income'
  category: string
  note: string | null
  person: string
  amount: number
}

export async function exportMonthToExcel(year: number, month: number, entries: ExportEntry[]) {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(`${year}년 ${month}월`)

  sheet.columns = [
    { header: '날짜', key: 'date', width: 12 },
    { header: '구분', key: 'type', width: 8 },
    { header: '카테고리', key: 'category', width: 14 },
    { header: '메모', key: 'note', width: 26 },
    { header: '결제자/수취인', key: 'person', width: 14 },
    { header: '금액', key: 'amount', width: 14 },
  ]

  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
  headerRow.alignment = { vertical: 'middle' }

  entries.forEach((e) => {
    const row = sheet.addRow({
      date: e.date,
      type: e.type === 'expense' ? '지출' : '소득',
      category: e.category,
      note: e.note ?? '',
      person: e.person,
      amount: e.amount,
    })
    row.getCell('amount').numFmt = '#,##0"원"'
    row.getCell('type').font = { color: { argb: e.type === 'expense' ? 'FFDC2626' : 'FF2563EB' } }
  })

  const totalIncome = entries.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const totalExpense = entries.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0)

  sheet.addRow([])
  const incomeRow = sheet.addRow({ date: '소득 합계', amount: totalIncome })
  incomeRow.font = { bold: true, color: { argb: 'FF2563EB' } }
  incomeRow.getCell('amount').numFmt = '#,##0"원"'

  const expenseRow = sheet.addRow({ date: '지출 합계', amount: totalExpense })
  expenseRow.font = { bold: true, color: { argb: 'FFDC2626' } }
  expenseRow.getCell('amount').numFmt = '#,##0"원"'

  const balanceRow = sheet.addRow({ date: '잔액', amount: totalIncome - totalExpense })
  balanceRow.font = { bold: true }
  balanceRow.getCell('amount').numFmt = '#,##0"원"'

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `가계부_${year}년${String(month).padStart(2, '0')}월.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
