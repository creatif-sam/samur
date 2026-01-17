export type Goal = {
  id: string;
  title: string;
  description?: string;
  goal_type: 'personal' | 'shared';
  visibility: 'private' | 'shared';
  owner_id: string;
  partner_id?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'paused';
  progress: number;
  due_date?: string;
  created_at: string;
};

export type Post = {
  id: string;
  content: string;
  visibility: 'private' | 'shared';
  author_id: string;
  partner_id?: string;
  related_goal_id?: string;
  created_at: string;
};

export type Profile = {
  id: string;
  name?: string;
  created_at: string;
  avatar_url?: string;
};

export type PlannerYear = {
  id: string;
  user_id: string;
  year: number;
  theme?: string;
  visibility: 'private' | 'shared';
  created_at: string;
};

export type PlannerQuarter = {
  id: string;
  year_id: string;
  quarter: number;
  focus?: string;
  visibility: 'private' | 'shared';
};

export type PlannerMonth = {
  id: string;
  quarter_id: string;
  month: number;
  objectives?: string;
  visibility: 'private' | 'shared';
};

export type PlannerWeek = {
  id: string;
  month_id: string;
  week_number: number;
  plan?: string;
  visibility: 'private' | 'shared';
};

export type PlannerDay = {
  id: string;
  week_id: string;
  day: string;
  tasks?: Record<string, { text: string; completed: boolean }>;
  reflection?: string;
  visibility: 'private' | 'shared';
};