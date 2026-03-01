import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Send, Trash2, MessageSquare, AtSign } from 'lucide-react';

export default function CommentSection({ entityType, entityId }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const inputRef = useRef(null);
  const mentionRef = useRef(null);

  useEffect(() => {
    loadComments();
  }, [entityType, entityId]);

  useEffect(() => {
    api.get('/auth/users').then(({ data }) => setAllUsers(data)).catch(() => {});
  }, []);

  const filteredMentionUsers = allUsers.filter((u) =>
    u.name.toLowerCase().includes(mentionSearch.toLowerCase()) && u.id !== user?.id
  );

  function handleContentChange(e) {
    const val = e.target.value;
    setContent(val);
    // Detect @ trigger
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([\wäöüÄÖÜß]*)$/);
    if (atMatch) {
      setShowMentions(true);
      setMentionSearch(atMatch[1]);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
    }
  }

  function insertMention(userName) {
    const cursorPos = inputRef.current?.selectionStart || content.length;
    const textBeforeCursor = content.slice(0, cursorPos);
    const atPos = textBeforeCursor.lastIndexOf('@');
    if (atPos === -1) return;
    const before = content.slice(0, atPos);
    const after = content.slice(cursorPos);
    setContent(`${before}@${userName} ${after}`);
    setShowMentions(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleMentionKeyDown(e) {
    if (!showMentions || filteredMentionUsers.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionIndex((i) => (i + 1) % filteredMentionUsers.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionIndex((i) => (i - 1 + filteredMentionUsers.length) % filteredMentionUsers.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertMention(filteredMentionUsers[mentionIndex].name);
    } else if (e.key === 'Escape') {
      setShowMentions(false);
    }
  }

  async function loadComments() {
    try {
      const { data } = await api.get(`/comments?entityType=${entityType}&entityId=${entityId}`);
      setComments(data);
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);

    try {
      const { data } = await api.post('/comments', {
        content: content.trim(),
        entityType,
        entityId,
      });
      setComments((prev) => [data, ...prev]);
      setContent('');
    } catch (err) {
      addToast(err.response?.data?.error || 'Fehler beim Speichern.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Kommentar wirklich löschen?')) return;
    try {
      await api.delete(`/comments/${id}`);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      addToast(err.response?.data?.error || 'Fehler beim Löschen.', 'error');
    }
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div>
      {/* Comment Input */}
      <form onSubmit={handleSubmit} className="mb-5">
        <div className="flex gap-2.5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-display font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #0D7377, #094e51)', boxShadow: '0 2px 6px rgba(13,115,119,0.3)' }}
          >
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 flex gap-2 relative">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={content}
                onChange={handleContentChange}
                onKeyDown={handleMentionKeyDown}
                placeholder="Kommentar schreiben... (@Name für Erwähnung)"
                className="input-field text-sm w-full"
              />
              {showMentions && filteredMentionUsers.length > 0 && (
                <div
                  ref={mentionRef}
                  className="absolute bottom-full left-0 mb-1 w-64 bg-white rounded-lg border border-border-light overflow-hidden z-50"
                  style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)' }}
                >
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider font-body border-b border-border">
                    <AtSign className="w-3 h-3 inline mr-1" />Erwähnen
                  </div>
                  {filteredMentionUsers.slice(0, 5).map((u, idx) => (
                    <button
                      key={u.id}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm font-body flex items-center gap-2 ${
                        idx === mentionIndex ? 'bg-brand-50 text-brand-700' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      style={{ transition: 'background-color 100ms ease' }}
                      onClick={() => insertMention(u.name)}
                      onMouseEnter={() => setMentionIndex(idx)}
                    >
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">{u.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="btn-primary px-3"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>

      {/* Comments List */}
      {loading ? (
        <div className="animate-pulse text-gray-400 text-sm font-body">Kommentare laden...</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-body">Noch keine Kommentare.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2.5">
              <div className="w-9 h-9 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-sm font-display font-bold shrink-0">
                {comment.user?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-display font-bold text-gray-900">
                      {comment.user?.name || 'Unbekannt'}
                    </span>
                    <span className="text-xs text-gray-400 font-body">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  {(comment.userId === user?.id || user?.role === 'ADMIN') && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="icon-btn text-gray-300 hover:text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-700 font-body whitespace-pre-wrap leading-relaxed">
                  {comment.content.split(/(@[\wäöüÄÖÜß\s.]+?)(?=\s@|\s*$|[,!?;]|\s[a-zäöü])/).map((part, i) =>
                    part.startsWith('@') ? (
                      <span key={i} className="font-semibold text-brand-600 bg-brand-50 rounded px-0.5">{part.trim()}</span>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
