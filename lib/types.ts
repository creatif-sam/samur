export type Goal = {
  id: string;
  title: string;
  description?: string;
  goal_type: 'single' | 'combined';
  visibility: 'private' | 'shared';
  owner_id: string;
  deliverable: string | null
  partner_id?: string;
  status: 'to_do' | 'doing' | 'blocked' | 'done';
  progress: number;
  due_date?: string;
  created_at: string;
  completed_at?: string;
  category_id?: string;
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

export type PostReaction = {
  id: string;
  post_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
};

export type PostComment = {
  id: string;
  post_id: string;
  author_id: string;
  parent_comment_id?: string;
  content: string;
  created_at: string;
  profiles?: Profile;
  replies?: PostComment[];
};

export type Profile = {
  id: string;
  name?: string;
  created_at: string;
  avatar_url?: string;
  last_seen?: string;
  partner_id?: string;
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


export interface PlannerTask {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  notes?: string;
}



export type ReadingStatus =
  | 'to_read'
  | 'reading'
  | 'done'
  | 'applied';


  export type ReadingCategory =
  | 'faith'
  | 'self_development'
  | 'skill'
  | 'philosophy'
  | 'psychology'
  | 'leadership'
  | 'productivity'
  | 'miscellaneous';


  export interface GoalCategory {
  id: string
  name: string
  emoji?: string
}


export type MeditationDB = {
  id: string
  author_id: string
  title: string
  scripture: string
  lesson: string
  application: string
  prayer: string
  visibility: 'private' | 'shared'
  period: 'morning' | 'evening'
  created_at: string
}


export type MoneyEntry = {
  id: string
  user_id: string
  title: string
  amount: number
  type: 'income' | 'expense'
  category: string | null
  entry_date: string
  created_at: string
}
