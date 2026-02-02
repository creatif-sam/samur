'use client';

import { useState } from 'react';
import { PostComment } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatDistanceToNow } from 'date-fns';
import { Reply, Edit, Trash2, CornerDownRight } from 'lucide-react';

interface CommentItemProps {
  comment: PostComment;
  currentUserId: string;
  onReply: (parentId: string, content: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  loading: boolean;
}

export function CommentItem({
  comment,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  loading
}: CommentItemProps) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [replyContent, setReplyContent] = useState('');

  const canManage = comment.author_id === currentUserId;

  const handleSaveEdit = async () => {
    await onEdit(comment.id, editContent);
    setIsEditing(false);
  };

  const handleReplySubmit = () => {
    if (!replyContent.trim()) return;
    onReply(comment.id, replyContent);
    setReplyContent('');
    setShowReplyInput(false);
  };

  return (
    <div className="group space-y-3 transition-all animate-in fade-in slide-in-from-left-2">
      <div className="flex items-start space-x-3">
        <Avatar className="h-8 w-8 border border-muted">
          <AvatarImage src={comment.profiles?.avatar_url} />
          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
            {comment.profiles?.name?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="bg-muted/40 rounded-2xl px-4 py-2 inline-block max-w-full">
            <div className="flex items-center space-x-2 mb-0.5">
              <span className="font-bold text-xs text-foreground">
                {comment.profiles?.name || 'Anonymous'}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>

            {isEditing ? (
              <div className="space-y-2 py-1">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="text-sm min-h-[60px] bg-background"
                />
                <div className="flex gap-2">
                  <Button size="xs" onClick={handleSaveEdit} disabled={loading}>Save</Button>
                  <Button size="xs" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-foreground/90 leading-relaxed break-words">
                {comment.content}
              </p>
            )}
          </div>

          {/* Comment Actions */}
          {!isEditing && (
            <div className="flex items-center space-x-4 mt-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => setShowReplyInput(!showReplyInput)}
                className="text-[11px] font-bold text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                <Reply className="w-3 h-3" /> Reply
              </button>
              
              {canManage && (
                <>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="text-[11px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <Edit className="w-3 h-3" /> Edit
                  </button>
                  <button 
                    onClick={() => onDelete(comment.id)}
                    className="text-[11px] font-bold text-red-400 hover:text-red-600 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reply Input Field */}
      {showReplyInput && (
        <div className="ml-11 flex items-start gap-2 animate-in zoom-in-95 duration-200">
          <CornerDownRight className="w-4 h-4 text-muted-foreground mt-2" />
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Write a reply..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="text-sm min-h-[40px] bg-muted/20"
              rows={1}
            />
            <div className="flex gap-2">
              <Button size="xs" onClick={handleReplySubmit} disabled={!replyContent.trim() || loading}>
                Post Reply
              </Button>
              <Button size="xs" variant="ghost" onClick={() => setShowReplyInput(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Nested Replies Rendering */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-11 space-y-4 pt-2 border-l-2 border-muted/30">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              loading={loading}
            />
          ))}
        </div>
      )}
    </div>
  );
}