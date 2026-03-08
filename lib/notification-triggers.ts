import { pushNotificationService } from '@/lib/push-notifications';
import { createClient } from '@/lib/supabase/server';

/**
 * Notification trigger functions for different app events
 */

export class NotificationTriggers {
  private async getSupabase() {
    return await createClient();
  }

  /**
   * Send notification when a new message is received
   */
  async notifyNewMessage(recipientId: string, senderName: string, messagePreview: string) {
    await pushNotificationService.sendToUser(recipientId, {
      title: 'New Message',
      body: `${senderName}: ${messagePreview}`,
      data: { type: 'message', senderName },
      url: '/protected',
    }, 'message');
  }

  /**
   * Send notification for planner reminders
   */
  async notifyPlannerReminder(userId: string, taskTitle: string, dueTime: string) {
    await pushNotificationService.sendToUser(userId, {
      title: 'Planner Reminder',
      body: `${taskTitle} is due at ${dueTime}`,
      data: { type: 'planner_reminder', taskTitle, dueTime },
      url: '/protected/planner',
    }, 'planner_reminder');
  }

  /**
   * Send notification for goal deadlines
   */
  async notifyGoalDeadline(userId: string, goalTitle: string, daysRemaining: number) {
    const title = daysRemaining === 0 ? 'Goal Deadline Today!' : `Goal Deadline Soon`;
    const body = daysRemaining === 0
      ? `${goalTitle} is due today!`
      : `${goalTitle} is due in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`;

    await pushNotificationService.sendToUser(userId, {
      title,
      body,
      data: { type: 'goal_deadline', goalTitle, daysRemaining },
      url: '/protected/goals',
    }, 'goal_deadline');
  }

  /**
   * Send notification for goal progress updates
   */
  async notifyGoalProgress(userId: string, goalTitle: string, progressPercent: number) {
    await pushNotificationService.sendToUser(userId, {
      title: 'Goal Progress Update',
      body: `${goalTitle} is ${progressPercent}% complete!`,
      data: { type: 'goal_progress', goalTitle, progressPercent },
      url: '/protected/goals',
    }, 'goal_progress');
  }

  /**
   * Send notification when new goal is created
   */
  async notifyGoalCreated(userId: string, goalTitle: string, partnerId?: string) {
    // Notify the user
    await pushNotificationService.sendToUser(userId, {
      title: 'Goal Created! 🎯',
      body: `Keep focused on: ${goalTitle}`,
      data: { type: 'goal_created', goalTitle },
      url: '/protected/goals',
    }, 'goal_created');

    // If shared with partner, notify them too
    if (partnerId) {
      const supabase = await this.getSupabase();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      const userName = profile?.full_name || 'Your partner';

      await pushNotificationService.sendToUser(partnerId, {
        title: 'Shared Goal Created',
        body: `${userName} created a new goal: ${goalTitle}`,
        data: { type: 'partner_goal_created', goalTitle, fromUserId: userId },
        url: '/protected/goals',
      }, 'goal_created');
    }
  }

  /**
   * Send notification when partner updates goal progress
   */
  async notifyPartnerGoalProgress(userId: string, partnerId: string, goalTitle: string, progressPercent: number) {
    const supabase = await this.getSupabase();
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    const userName = profile?.full_name || 'Your partner';

    await pushNotificationService.sendToUser(partnerId, {
      title: 'Partner Goal Progress',
      body: `${userName} made progress on ${goalTitle} - ${progressPercent}% complete!`,
      data: { type: 'partner_goal_progress', goalTitle, progressPercent, fromUserId: userId },
      url: '/protected/goals',
    }, 'goal_progress');
  }

  /**
   * Send notification for new posts
   */
  async notifyNewPost(userId: string, authorName: string, postPreview: string) {
    await pushNotificationService.sendToUser(userId, {
      title: 'New Post',
      body: `${authorName}: ${postPreview}`,
      data: { type: 'post', authorName },
      url: '/protected/posts',
    }, 'post');
  }

  /**
   * Send notification to all users (for system announcements)
   */
  async notifyAllUsers(title: string, body: string, data?: any) {
    // Get all user IDs
    const supabase = await this.getSupabase();
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id');

    if (error || !users) {
      console.error('Error fetching users for notification:', error);
      return;
    }

    const userIds = users.map(user => user.id);

    await pushNotificationService.sendToUsers(userIds, {
      title,
      body,
      data: { ...data, type: 'system' },
      url: '/protected',
    }, 'system');
  }

  /**
   * Send notification to partner/couple
   */
  async notifyPartner(userId: string, partnerId: string, title: string, body: string, data?: any) {
    await pushNotificationService.sendToUser(partnerId, {
      title,
      body,
      data: { ...data, fromUserId: userId },
      url: '/protected',
    }, 'message');
  }

  /**
   * Send notification when partner completes meditation
   */
  async notifyPartnerMeditation(userId: string, partnerId: string, userName: string) {
    await pushNotificationService.sendToUser(partnerId, {
      title: 'Partner Meditation',
      body: `${userName} completed their meditation today! 🙏`,
      data: { type: 'partner_meditation', fromUserId: userId },
      url: '/protected/meditations',
    }, 'meditation');
  }

  /**
   * Send notification when user starts meditation streak
   */
  async notifyMeditationStreak(userId: string, days: number) {
    await pushNotificationService.sendToUser(userId, {
      title: 'Meditation Streak! 🔥',
      body: `You've meditated for ${days} days in a row. Keep it up!`,
      data: { type: 'meditation_streak', days },
      url: '/protected/meditations',
    }, 'meditation');
  }

  /**
   * Send reminder for daily meditation
   */
  async notifyMeditationReminder(userId: string, period: 'morning' | 'evening') {
    const timeText = period === 'morning' ? 'Start your day' : 'End your day';
    await pushNotificationService.sendToUser(userId, {
      title: 'Time for Meditation',
      body: `${timeText} with scripture and reflection 📖`,
      data: { type: 'meditation_reminder', period },
      url: '/protected/meditations',
    }, 'meditation');
  }

  /**
   * Check for upcoming goal deadlines and send reminders
   * This should be called by a cron job or scheduled function
   */
  async checkGoalDeadlines() {
    const supabase = await this.getSupabase();
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    // Get goals that are due soon (today, tomorrow, or within a week)
    const { data: goals, error } = await supabase
      .from('goals')
      .select('id, title, target_date, user_id')
      .gte('target_date', today.toISOString().split('T')[0])
      .lte('target_date', weekFromNow.toISOString().split('T')[0]);

    if (error || !goals) {
      console.error('Error fetching goals for deadline check:', error);
      return;
    }

    for (const goal of goals) {
      const deadline = new Date(goal.target_date);
      const daysDiff = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Send notification for goals due today, tomorrow, or in 3 days
      if (daysDiff <= 3) {
        await this.notifyGoalDeadline(goal.user_id, goal.title, daysDiff);
      }
    }
  }

  /**
   * Check for planner tasks that are due soon
   * This should be called by a cron job or scheduled function
   */
  async checkPlannerReminders() {
    const supabase = await this.getSupabase();
    const now = new Date();
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000);

    // Get planner days with tasks due in the next hour
    const { data: plannerDays, error } = await supabase
      .from('planner_days')
      .select('day, tasks, user_id')
      .eq('day', now.toISOString().split('T')[0]);

    if (error || !plannerDays) {
      console.error('Error fetching planner data for reminders:', error);
      return;
    }

    for (const day of plannerDays) {
      if (!day.tasks) continue;

      const tasks = typeof day.tasks === 'string' ? JSON.parse(day.tasks) : day.tasks;

      for (const task of tasks) {
        if (task.time && task.title) {
          const [hours, minutes] = task.time.split(':').map(Number);
          const taskTime = new Date(now);
          taskTime.setHours(hours, minutes, 0, 0);

          // If task is due within the next hour and not completed
          if (taskTime >= now && taskTime <= nextHour && !task.completed) {
            const timeString = taskTime.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            });
            await this.notifyPlannerReminder(day.user_id, task.title, timeString);
          }
        }
      }
    }
  }
}

// Export singleton instance
export const notificationTriggers = new NotificationTriggers();