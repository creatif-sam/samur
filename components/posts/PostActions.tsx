import { Button } from '@/components/ui/button';
import { Heart, MessageSquare } from 'lucide-react';

export function PostActions({ userReaction, likeCount, commentCount, onReaction, onToggleComments, loading }: any) {
  return (
    <div className="flex items-center space-x-4 px-4 mb-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={onReaction}
        disabled={loading}
        className={`flex items-center space-x-1 ${userReaction ? 'text-red-500' : 'text-gray-500'}`}
      >
        <Heart className={`h-4 w-4 ${userReaction ? 'fill-current' : ''}`} />
        <span className="text-xs">{likeCount}</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleComments}
        className="flex items-center space-x-1 text-gray-500"
      >
        <MessageSquare className="h-4 w-4" />
        <span className="text-xs">{commentCount}</span>
      </Button>
    </div>
  );
}