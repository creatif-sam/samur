'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Goal, Post, Profile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function HomePage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [posts, setPosts] = useState<(Post & { profiles: Profile })[]>([]);
  const [todayPlanner, setTodayPlanner] = useState<{
    id: string;
    week_id: string;
    day: string;
    tasks?: Record<string, { text: string; completed: boolean }>;
    reflection?: string;
    visibility: 'private' | 'shared';
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get shared goals
    const { data: goalsData } = await supabase
      .from('goals')
      .select('*')
      .or(`owner_id.eq.${user.id},partner_id.eq.${user.id}`)
      .eq('visibility', 'shared')
      .order('created_at', { ascending: false })
      .limit(5);

    // Get recent posts
    const { data: postsData } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:author_id (name, avatar_url)
      `)
      .or(`author_id.eq.${user.id},partner_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(3);

    // Get today's planner
    const today = new Date().toISOString().split('T')[0];
    const { data: plannerData } = await supabase
      .from('planner_days')
      .select(`
        *,
        planner_weeks (
          planner_months (
            planner_quarters (
              planner_years (*)
            )
          )
        )
      `)
      .eq('day', today)
      .or(`visibility.eq.shared,visibility.eq.private`)
      .single();

    setGoals(goalsData || []);
    setPosts(postsData || []);
    setTodayPlanner(plannerData);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="p-4 space-y-6">
        <div className="text-center py-4">
          <h1 className="text-2xl font-bold text-primary">Together</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold text-primary">Together</h1>
        <p className="text-muted-foreground">Goals & Habits</p>
      </div>

      {/* Shared Goals Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Shared Goals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {goals?.length ? (
            goals.map((goal) => (
              <div key={goal.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">{goal.title}</h3>
                  <Badge variant={goal.status === 'completed' ? 'default' : 'secondary'}>
                    {goal.status.replace('_', ' ')}
                  </Badge>
                </div>
                <Progress value={goal.progress} className="h-2" />
                <p className="text-sm text-muted-foreground">{goal.progress}% complete</p>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No shared goals yet</p>
          )}
        </CardContent>
      </Card>

      {/* Today's Focus */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Today</CardTitle>
        </CardHeader>
        <CardContent>
          {todayPlanner ? (
            <div className="space-y-2">
              <p className="text-sm">{todayPlanner.reflection || 'No reflection yet'}</p>
              {todayPlanner.tasks && (
                <div className="text-sm text-muted-foreground">
                  {Object.keys(todayPlanner.tasks).length} tasks planned
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">No plans for today</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Posts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Posts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {posts?.length ? (
            posts.map((post) => (
              <div key={post.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    {(post.profiles as Profile)?.name?.[0] || 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{(post.profiles as Profile)?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(post.created_at), 'MMM d')}
                    </p>
                  </div>
                </div>
                <p className="text-sm">{post.content}</p>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No posts yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
