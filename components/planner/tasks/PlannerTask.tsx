export interface PlannerTask {
  id: string
  text: string
  start: string
  end: string
  completed: boolean
  recurring?: {
    interval: number
    unit: 'day' | 'week'
    daysOfWeek: number[]
    until?: string
  }
}
