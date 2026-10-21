import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Trash2, Lock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Post, Profile } from '@/lib/types';

interface PostHeaderProps {
  post: Post & { profiles?: Profile | null };
  currentUserId: string;
  onEdit: () => void;
  onDelete: () => void;
}

export function PostHeader({ post, currentUserId, onEdit, onDelete }: PostHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 pb-3">
      <div className="flex items-center space-x-3 min-w-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={post.profiles?.avatar_url} />
          <AvatarFallback>{post.profiles?.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{post.profiles?.name || 'Anonymous'}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2 shrink-0">
        {post.visibility === 'shared' ? (
          <Badge variant="secondary" className="text-xs">Shared</Badge>
        ) : (
          <Badge variant="outline" className="text-xs gap-1"><Lock className="h-3 w-3" /> Only me</Badge>
        )}
        {currentUserId === post.author_id && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Post options"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}><Edit className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
