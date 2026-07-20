import { google } from 'googleapis'

export type SheetEntry = {
  date: string
  type: 'expense' | 'income'
  category: string
  note: string | null
  person: string
  amount: number
}

// 서비스 계정 키 발급이 조직 정책(iam.disableServiceAccountKeyCreation)으로 막혀서
// 개인 구글 계정으로 OAuth 인증 + refresh token 방식 사용 (OAuth Playground에서 1회 발급)
function getAuth() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REFRESH_TOKEN 환경변수가 설정되지 않았어요.')
  }
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  return oauth2Client
}

// 연/월에 해당하는 탭이 이미 있으면 그 탭을 지우고 다시 쓰고, 없으면 새로 만들어서 씀
export async function exportMonthToGoogleSheet(year: number, month: number, entries: SheetEntry[]) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID 환경변수가 설정되지 않았어요.')
  }

  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const title = `${year}년 ${month}월`

  const meta = await sheets.spreadsheets.get({ spreadsheetId })
  const existing = meta.data.sheets?.find((s) => s.properties?.title === title)

  let sheetId: number
  if (existing?.properties?.sheetId != null) {
    sheetId = existing.properties.sheetId
    await sheets.spreadsheets.values.clear({ spreadsheetId, range: `'${title}'` })
  } else {
    const addRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title } } }] },
    })
    sheetId = addRes.data.replies?.[0]?.addSheet?.properties?.sheetId as number
  }

  const totalIncome = entries.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const totalExpense = entries.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0)

  const values = [
    ['날짜', '구분', '카테고리', '메모', '결제자/수취인', '금액'],
    ...entries.map((e) => [
      e.date,
      e.type === 'expense' ? '지출' : '소득',
      e.category,
      e.note ?? '',
      e.person,
      e.amount,
    ]),
    [],
    ['소득 합계', '', '', '', '', totalIncome],
    ['지출 합계', '', '', '', '', totalExpense],
    ['잔액', '', '', '', '', totalIncome - totalExpense],
  ]

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${title}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  })

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true },
                backgroundColor: { red: 0.95, green: 0.95, blue: 0.96 },
              },
            },
            fields: 'userEnteredFormat(textFormat,backgroundColor)',
          },
        },
      ],
    },
  })

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`
}
