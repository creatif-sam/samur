export interface PlannerTask {
  id: string
  text: string
  start: string
  end: string
  completed: boolean
  vision_id?: string
  recurring?: {
    interval: number
    unit: 'day' | 'week'
    daysOfWeek: number[]
    until?: string
  }
}
