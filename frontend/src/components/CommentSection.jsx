import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Send, Trash2, MessageSquare } from 'lucide-react';

export default function CommentSection({ entityType, entityId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [entityType, entityId]);

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
      alert(err.response?.data?.error || 'Fehler beim Speichern.');
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
      alert(err.response?.data?.error || 'Fehler beim Löschen.');
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
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Kommentar schreiben..."
              className="input-field text-sm flex-1"
            />
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
                <p className="text-sm text-gray-700 font-body whitespace-pre-wrap leading-relaxed">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
