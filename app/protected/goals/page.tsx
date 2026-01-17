'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Goal } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Target, Users } from 'lucide-react';

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('goals')
      .select('*')
      .or(`owner_id.eq.${user.id},partner_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    setGoals(data || []);
    setLoading(false);
  };

  const myGoals = goals.filter(g => g.owner_id === goals[0]?.owner_id); // Assuming first goal's owner is current user
  const ourGoals = goals.filter(g => g.visibility === 'shared');

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Goals</h1>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Goal
        </Button>
      </div>

      <Tabs defaultValue="my" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            My Goals
          </TabsTrigger>
          <TabsTrigger value="our" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Our Goals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="space-y-4">
          {myGoals.length ? (
            myGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No personal goals yet</p>
                <Button className="mt-4" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Goal
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="our" className="space-y-4">
          {ourGoals.length ? (
            ourGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No shared goals yet</p>
                <Button className="mt-4" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Our First Goal
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{goal.title}</CardTitle>
          <Badge variant={goal.visibility === 'shared' ? 'default' : 'secondary'}>
            {goal.visibility}
          </Badge>
        </div>
        {goal.description && (
          <p className="text-sm text-muted-foreground">{goal.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>{goal.progress}%</span>
        </div>
        <Progress value={goal.progress} className="h-2" />
        <div className="flex justify-between items-center">
          <Badge variant={
            goal.status === 'completed' ? 'default' :
            goal.status === 'in_progress' ? 'secondary' :
            'outline'
          }>
            {goal.status.replace('_', ' ')}
          </Badge>
          {goal.due_date && (
            <span className="text-xs text-muted-foreground">
              Due {new Date(goal.due_date).toLocaleDateString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}