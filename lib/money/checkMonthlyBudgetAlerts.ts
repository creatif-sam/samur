export async function checkMonthlyBudgetAlerts() {
  try {
    const response = await fetch('/api/money/budget-alerts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return { sent: [] as number[] }
    }

    return (await response.json()) as {
      sent: number[]
      spentPercent?: number
    }
  } catch {
    return { sent: [] as number[] }
  }
}