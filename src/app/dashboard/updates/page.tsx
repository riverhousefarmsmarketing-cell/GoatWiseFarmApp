'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Megaphone, Pin, Pencil, Trash2, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFarm, useFarmMembers, memberName } from '@/hooks/useFarm';
import { FarmPost, useDeletePost, useFarmPosts, useMarkPostsRead, useSavePost } from '@/hooks/useFarmWork';
import { Badge, Button, Card, EmptyState, Input, LoadingSpinner } from '@/components/ui';

export default function FarmUpdatesPage() {
  const { user } = useAuth();
  const { farm, isManager } = useFarm();
  const { data: members } = useFarmMembers();
  const { data: posts = [], isLoading } = useFarmPosts();
  const savePost = useSavePost();
  const deletePost = useDeletePost();
  const markRead = useMarkPostsRead();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [seenOpen, setSeenOpen] = useState<string | null>(null);

  // Opening this page counts as reading everything on it.
  const unreadIds = useMemo(
    () => posts.filter((p) => !p.farm_post_reads.some((r) => r.user_id === user?.id)).map((p) => p.id),
    [posts, user?.id]
  );
  const unreadKey = unreadIds.join(',');
  useEffect(() => {
    if (unreadIds.length > 0 && !markRead.isPending) markRead.mutate(unreadIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadKey]);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setBody('');
    setPinned(false);
  };

  const startEdit = (p: FarmPost) => {
    setEditingId(p.id);
    setTitle(p.title ?? '');
    setBody(p.body);
    setPinned(p.pinned);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    savePost.mutate(
      { id: editingId ?? undefined, title, body, pinned },
      { onSuccess: resetForm, onError: (err: any) => alert(err.message) }
    );
  };

  const others = (members ?? []).filter((m) => m.user_id !== user?.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Farm Updates</h1>
        <p className="text-gray-500">
          {isManager ? `Post notes for everyone on ${farm?.name ?? 'the farm'}.` : `News and notes from ${farm?.name ?? 'the farm'}.`}
        </p>
      </div>

      {isManager && (
        <Card>
          <form onSubmit={submit} className="space-y-3">
            <h2 className="font-semibold text-gray-900">{editingId ? 'Edit update' : 'Post an update'}</h2>
            <Input label="Headline (optional)" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Vet visit Thursday" />
            <div className="space-y-1">
              <label htmlFor="post-body" className="block text-sm font-medium text-[#384E42]">
                Message<span className="text-[#9B1C1C] ml-1">*</span>
              </label>
              <textarea
                id="post-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                required
                placeholder="What does everyone need to know?"
                className="w-full rounded-lg border border-[#DDD8D4] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#105040]"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="rounded" />
              Pin to the top
            </label>
            <div className="flex gap-2">
              <Button type="submit" loading={savePost.isPending} leftIcon={<Megaphone className="h-4 w-4" />}>
                {editingId ? 'Save changes' : 'Post update'}
              </Button>
              {editingId && (
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="p-8 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Megaphone className="h-10 w-10" />}
            title="No updates yet"
            description={isManager ? 'Your first update will show here and on everyone’s dashboard.' : 'Updates from the farm will show here.'}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => {
            const readers = p.farm_post_reads.filter((r) => r.user_id !== p.author_id);
            const seenBy = others.filter((m) => readers.some((r) => r.user_id === m.user_id));
            const notSeen = others.filter((m) => m.user_id !== p.author_id && !readers.some((r) => r.user_id === m.user_id));
            return (
              <Card key={p.id} className={p.pinned ? 'border-[#105040]' : undefined}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {p.pinned && (
                        <Badge variant="success">
                          <Pin className="h-3 w-3 mr-1" /> Pinned
                        </Badge>
                      )}
                      {p.title && <h2 className="font-semibold text-gray-900">{p.title}</h2>}
                    </div>
                    <p className="mt-1 text-gray-800 whitespace-pre-wrap break-words">{p.body}</p>
                    <p className="mt-2 text-xs text-gray-500" title={format(new Date(p.created_at), 'PPpp')}>
                      {memberName(members, p.author_id)} · {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                      {p.updated_at !== p.created_at && new Date(p.updated_at).getTime() - new Date(p.created_at).getTime() > 60_000 ? ' · edited' : ''}
                    </p>
                    {isManager && others.length > 0 && (
                      <div className="mt-2">
                        <button onClick={() => setSeenOpen(seenOpen === p.id ? null : p.id)} className="inline-flex items-center gap-1 text-xs text-[#105040] hover:underline">
                          <Eye className="h-3.5 w-3.5" /> Seen by {seenBy.length} of {seenBy.length + notSeen.length}
                        </button>
                        {seenOpen === p.id && (
                          <div className="mt-1 text-xs text-gray-600 space-y-0.5">
                            {seenBy.length > 0 && <p>Seen: {seenBy.map((m) => m.display_name || m.email).join(', ')}</p>}
                            {notSeen.length > 0 && <p>Not yet: {notSeen.map((m) => m.display_name || m.email).join(', ')}</p>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {isManager && (
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" aria-label="Edit update" onClick={() => startEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Remove update"
                        onClick={() => {
                          if (confirm('Remove this update for everyone?')) deletePost.mutate(p.id, { onError: (err: any) => alert(err.message) });
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-[#9B1C1C]" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
