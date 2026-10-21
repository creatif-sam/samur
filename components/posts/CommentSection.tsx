import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import type { PostComment } from '@/lib/types';
import { CommentItem } from './CommentItem';

interface CommentSectionProps {
  comments: PostComment[];
  newComment: string;
  setNewComment: (value: string) => void;
  onComment: () => void;
  onReply: (parentId: string, content: string) => Promise<boolean>;
  onEdit: (commentId: string, content: string) => Promise<boolean>;
  onDelete: (commentId: string) => void;
  currentUserId: string;
  loading: boolean;
}

export function CommentSection({
  comments, newComment, setNewComment, onComment, onReply, onEdit, onDelete, currentUserId, loading,
}: CommentSectionProps) {
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
        <Button size="sm" onClick={onComment} disabled={!newComment.trim() || loading} className="self-end" aria-label="Post comment">
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-3">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            currentUserId={currentUserId}
            onReply={onReply}
            onEdit={onEdit}
            onDelete={onDelete}
            loading={loading}
          />
        ))}
      </div>
    </div>
  );
}
