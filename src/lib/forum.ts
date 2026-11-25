// Who may do what on a forum post or reply. The API enforces the same rules; these only decide
// which buttons to show.
import type { Author, ModerationStatus, Role } from './types';

interface Viewer {
  id: number;
  role: Role;
}

interface ForumItem {
  author: Author;
  moderation_status: ModerationStatus;
}

export const isOwn = (viewer: Viewer | null | undefined, item: ForumItem) =>
  !!viewer && viewer.id === item.author.id;

/** Members report other people's published content (admins moderate directly instead). */
export const canReport = (viewer: Viewer | null | undefined, item: ForumItem) =>
  !!viewer && viewer.role !== 'admin' && !isOwn(viewer, item) && item.moderation_status === 'published';

/** Authors delete their own published content. */
export const canDelete = (viewer: Viewer | null | undefined, item: ForumItem) =>
  isOwn(viewer, item) && item.moderation_status === 'published';

/** Admin moderation action available for an item, if any. */
export function moderationAction(viewer: Viewer | null | undefined, status: ModerationStatus): 'hide' | 'restore' | null {
  if (!viewer || viewer.role !== 'admin') return null;
  if (status === 'published') return 'hide';
  if (status === 'hidden') return 'restore';
  return null;
}

/** First ``max`` characters on a word boundary, with an ellipsis. */
export function excerpt(text: string, max = 180): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
