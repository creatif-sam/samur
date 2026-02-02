import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { CommentItem } from './CommentItem'; // Move your existing CommentItem to its own file

export function CommentSection({ 
  comments, newComment, setNewComment, onComment, loading, currentUserId, ...props 
}: any) {
  return (
    <div className="border-t pt-3 space-y-3 px-4 pb-4">
      <div className="flex space-x-2">
        <Textarea
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="flex-1 text-sm min-h-[40px]"
          rows={1}
        />
        <Button size="sm" onClick={onComment} disabled={!newComment.trim() || loading} className="self-end">
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-3">
        {comments.map((comment: any) => (
          <CommentItem key={comment.id} comment={comment} currentUserId={currentUserId} {...props} />
        ))}
      </div>
    </div>
  );
}