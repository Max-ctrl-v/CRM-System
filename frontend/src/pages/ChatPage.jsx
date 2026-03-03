import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Send,
  Paperclip,
  FileText,
  Download,
  Trash2,
  X,
  MessageCircle,
  AtSign,
  Users,
  Image,
  File,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCompanies } from '../context/CompaniesContext';
import { useToast } from '../context/ToastContext';

function formatSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateSeparator(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Heute';
  if (d.toDateString() === yesterday.toDateString()) return 'Gestern';
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function renderContent(text) {
  if (!text) return null;
  return text
    .split(/(@all|@[\wäöüÄÖÜß][.\s\wäöüÄÖÜß]*?)(?=\s@|\s*$|[,!?;:]|\s[a-zäöü])/)
    .map((part, i) =>
      part.startsWith('@') ? (
        <span
          key={i}
          className="font-semibold text-brand-600 bg-brand-50 rounded px-0.5"
        >
          {part.trim()}
        </span>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
}

const AVATAR_COLORS = [
  'linear-gradient(135deg, #0D7377, #094e51)',
  'linear-gradient(135deg, #6366f1, #4338ca)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #ec4899, #be185d)',
  'linear-gradient(135deg, #10b981, #047857)',
  'linear-gradient(135deg, #8b5cf6, #6d28d9)',
];

function getAvatarColor(userId) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function isImageFile(mimeType) {
  return mimeType?.startsWith('image/');
}

export default function ChatPage() {
  const { user } = useAuth();
  const { allUsers } = useCompanies();
  const { addToast } = useToast();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [content, setContent] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);

  const [dragOver, setDragOver] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastPollTime = useRef(null);

  // --- Initial Load ---
  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    try {
      const { data } = await api.get('/chat/messages?limit=50');
      const reversed = data.reverse();
      setMessages(reversed);
      setHasMore(data.length === 50);
      lastPollTime.current = reversed.length > 0
        ? reversed[reversed.length - 1].createdAt
        : new Date().toISOString();
    } catch {
      addToast('Chat konnte nicht geladen werden.', 'error');
    } finally {
      setLoading(false);
      setTimeout(() => scrollToBottom('auto'), 100);
    }
  }

  // --- Polling every 4s ---
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!lastPollTime.current) return;
      try {
        const { data } = await api.get(
          `/chat/messages/new?since=${encodeURIComponent(lastPollTime.current)}`,
        );
        if (data.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const fresh = data.filter((m) => !existingIds.has(m.id));
            if (fresh.length === 0) return prev;
            return [...prev, ...fresh];
          });
          lastPollTime.current = data[data.length - 1].createdAt;
          const container = messagesContainerRef.current;
          if (container) {
            const isNearBottom =
              container.scrollHeight - container.scrollTop - container.clientHeight < 150;
            if (isNearBottom) setTimeout(() => scrollToBottom('smooth'), 50);
          }
        }
      } catch {
        /* silent */
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // --- Load Older ---
  async function loadOlder() {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    const oldestId = messages[0].id;
    const container = messagesContainerRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;

    try {
      const { data } = await api.get(
        `/chat/messages?cursor=${oldestId}&limit=30`,
      );
      const older = data.reverse();
      setMessages((prev) => [...older, ...prev]);
      setHasMore(data.length === 30);
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - prevScrollHeight;
        }
      });
    } catch {
      /* silent */
    } finally {
      setLoadingMore(false);
    }
  }

  function handleScroll() {
    const container = messagesContainerRef.current;
    if (container && container.scrollTop < 60 && hasMore && !loadingMore) {
      loadOlder();
    }
  }

  function scrollToBottom(behavior = 'smooth') {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }

  // --- @Mention logic ---
  const mentionOptions = useMemo(() => {
    const users = allUsers
      .filter((u) => u.id !== user?.id)
      .map((u) => ({ id: u.id, name: u.name, type: 'user' }));
    return [{ id: '__all__', name: 'all', type: 'all' }, ...users];
  }, [allUsers, user?.id]);

  const filteredMentionOptions = mentionOptions.filter((o) =>
    o.name.toLowerCase().includes(mentionSearch.toLowerCase()),
  );

  function handleContentChange(e) {
    const val = e.target.value;
    setContent(val);
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

  function insertMention(name) {
    const cursorPos = inputRef.current?.selectionStart || content.length;
    const textBeforeCursor = content.slice(0, cursorPos);
    const atPos = textBeforeCursor.lastIndexOf('@');
    if (atPos === -1) return;
    const before = content.slice(0, atPos);
    const after = content.slice(cursorPos);
    setContent(`${before}@${name} ${after}`);
    setShowMentions(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleKeyDown(e) {
    if (showMentions && filteredMentionOptions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % filteredMentionOptions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(
          (i) =>
            (i - 1 + filteredMentionOptions.length) %
            filteredMentionOptions.length,
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredMentionOptions[mentionIndex].name);
        return;
      }
      if (e.key === 'Escape') {
        setShowMentions(false);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // --- Send ---
  async function handleSend() {
    if (sending) return;
    if (!content.trim() && !pendingFile) return;

    setSending(true);
    setUploadProgress(0);

    try {
      let res;
      if (pendingFile) {
        // File attached → send as multipart FormData
        const formData = new FormData();
        if (content.trim()) formData.append('content', content.trim());
        formData.append('file', pendingFile);
        res = await api.post('/chat/messages', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
          },
        });
      } else {
        // Text only → send as JSON
        res = await api.post('/chat/messages', { content: content.trim() });
      }
      setMessages((prev) => [...prev, res.data]);
      setContent('');
      setPendingFile(null);
      lastPollTime.current = res.data.createdAt;
      setTimeout(() => scrollToBottom('smooth'), 50);
    } catch (err) {
      addToast(err.response?.data?.error || 'Fehler beim Senden.', 'error');
    } finally {
      setSending(false);
      setUploadProgress(0);
    }
  }

  // --- File handling ---
  function handleFileSelect(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      addToast('Datei zu groß (max. 10 MB).', 'error');
      return;
    }
    setPendingFile(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }

  async function handleDownload(messageId, fileName) {
    try {
      const { data } = await api.get(`/chat/messages/${messageId}/download`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      addToast('Download fehlgeschlagen.', 'error');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Nachricht wirklich löschen?')) return;
    try {
      await api.delete(`/chat/messages/${id}`);
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      addToast(err.response?.data?.error || 'Fehler beim Löschen.', 'error');
    }
  }

  // --- File icon helper ---
  function getFileIcon(mimeType) {
    if (mimeType?.startsWith('image/')) return Image;
    return File;
  }

  return (
    <div
      className="h-[calc(100vh-56px)] flex flex-col relative"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragOver(false);
      }}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div
        className="px-6 py-3 bg-white/80 backdrop-blur-sm border-b border-gray-200/60 flex items-center gap-3 shrink-0"
        style={{
          boxShadow:
            '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{
            background:
              'linear-gradient(135deg, #0D7377 0%, #094e51 100%)',
            boxShadow:
              '0 2px 8px rgba(13,115,119,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
        >
          <MessageCircle className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-[15px] font-display font-bold text-gray-900 leading-tight">
            Team Chat
          </h2>
          <p className="text-[11px] text-gray-400 font-body leading-tight">
            {allUsers.length} Mitglieder
          </p>
        </div>

        {/* Online avatars */}
        <div className="ml-auto flex -space-x-2">
          {allUsers.slice(0, 5).map((u) => (
            <div
              key={u.id}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-display font-bold text-white border-2 border-white"
              style={{ background: getAvatarColor(u.id) }}
              title={u.name}
            >
              {u.name?.charAt(0)?.toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-6 py-4"
        onScroll={handleScroll}
        style={{ background: 'linear-gradient(180deg, #f8f9fb 0%, #f3f4f8 100%)' }}
      >
        {loadingMore && (
          <div className="flex justify-center py-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-brand-500 border-t-transparent" />
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
            <span className="text-sm text-gray-400 font-body">
              Chat wird geladen...
            </span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background:
                  'linear-gradient(135deg, rgba(13,115,119,0.08), rgba(13,115,119,0.03))',
              }}
            >
              <MessageCircle className="w-8 h-8 text-brand-300" />
            </div>
            <h3 className="text-base font-display font-bold text-gray-700 mb-1">
              Noch keine Nachrichten
            </h3>
            <p className="text-sm text-gray-400 font-body max-w-xs">
              Starte eine Unterhaltung mit deinem Team. Verwende @Name oder
              @all um Kollegen zu erwähnen.
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {messages.map((msg, idx) => {
              const showDateSep =
                idx === 0 ||
                new Date(msg.createdAt).toDateString() !==
                  new Date(messages[idx - 1].createdAt).toDateString();
              const isOwn = msg.userId === user?.id;
              const showAvatar =
                idx === 0 || messages[idx - 1].userId !== msg.userId ||
                showDateSep;
              const FileIcon = getFileIcon(msg.mimeType);

              return (
                <div key={msg.id}>
                  {showDateSep && (
                    <div className="flex items-center gap-3 my-5">
                      <div className="flex-1 h-px bg-gray-200/80" />
                      <span className="text-[11px] font-body text-gray-400 font-medium px-2">
                        {formatDateSeparator(msg.createdAt)}
                      </span>
                      <div className="flex-1 h-px bg-gray-200/80" />
                    </div>
                  )}

                  <div
                    className={`flex gap-2.5 mb-1 group ${isOwn ? 'flex-row-reverse' : ''} ${showAvatar ? 'mt-3' : ''}`}
                  >
                    {/* Avatar */}
                    <div className="w-8 shrink-0">
                      {showAvatar && (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-display font-bold text-white"
                          style={{
                            background: getAvatarColor(msg.userId),
                            boxShadow:
                              '0 2px 6px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)',
                          }}
                        >
                          {msg.user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Bubble */}
                    <div
                      className={`max-w-[70%] min-w-[120px] ${
                        isOwn
                          ? 'bg-brand-600 text-white rounded-2xl rounded-tr-md'
                          : 'bg-white text-gray-800 rounded-2xl rounded-tl-md border border-gray-100'
                      } px-3.5 py-2.5`}
                      style={{
                        boxShadow: isOwn
                          ? '0 1px 3px rgba(13,115,119,0.3), 0 2px 8px rgba(13,115,119,0.15)'
                          : '0 1px 2px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.03)',
                      }}
                    >
                      {/* Name + time */}
                      {showAvatar && (
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={`text-[12px] font-display font-bold ${
                              isOwn ? 'text-white/90' : 'text-gray-900'
                            }`}
                          >
                            {msg.user?.name}
                          </span>
                          <span
                            className={`text-[10px] font-body ${
                              isOwn ? 'text-white/50' : 'text-gray-400'
                            }`}
                          >
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                      )}

                      {/* Text */}
                      {msg.content && (
                        <p
                          className={`text-[13px] font-body whitespace-pre-wrap leading-relaxed ${
                            isOwn ? 'text-white' : 'text-gray-700'
                          }`}
                        >
                          {isOwn ? msg.content : renderContent(msg.content)}
                        </p>
                      )}

                      {/* File attachment */}
                      {msg.fileName && (
                        <div
                          className={`mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2 ${
                            isOwn
                              ? 'bg-white/10 border border-white/10'
                              : 'bg-gray-50 border border-gray-100'
                          }`}
                        >
                          <FileIcon
                            className={`w-4 h-4 shrink-0 ${
                              isOwn ? 'text-white/70' : 'text-brand-500'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-[12px] font-body font-medium truncate ${
                                isOwn ? 'text-white' : 'text-gray-800'
                              }`}
                            >
                              {msg.fileName}
                            </p>
                            <p
                              className={`text-[10px] ${
                                isOwn ? 'text-white/50' : 'text-gray-400'
                              }`}
                            >
                              {formatSize(msg.fileSize)}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              handleDownload(msg.id, msg.fileName)
                            }
                            className={`p-1.5 rounded-lg ${
                              isOwn
                                ? 'hover:bg-white/10 text-white/70 hover:text-white'
                                : 'hover:bg-brand-50 text-gray-400 hover:text-brand-600'
                            }`}
                            style={{
                              transition:
                                'background-color 150ms ease, color 150ms ease',
                            }}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Delete button */}
                    {(isOwn || user?.role === 'ADMIN') && (
                      <button
                        onClick={() => handleDelete(msg.id)}
                        className="opacity-0 group-hover:opacity-100 self-center p-1 rounded text-gray-300 hover:text-red-500 active:scale-95
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                        style={{
                          transition:
                            'opacity 150ms ease, color 150ms ease, transform 100ms ease',
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Drag-drop overlay */}
      {dragOver && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{
            background: 'rgba(13,115,119,0.08)',
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            className="rounded-2xl border-2 border-dashed border-brand-400 bg-white/90 px-10 py-8 text-center"
            style={{
              boxShadow:
                '0 8px 32px rgba(13,115,119,0.15), 0 2px 8px rgba(0,0,0,0.05)',
            }}
          >
            <Paperclip className="w-8 h-8 text-brand-500 mx-auto mb-2" />
            <p className="text-sm font-display font-bold text-brand-700">
              Datei hier ablegen
            </p>
            <p className="text-xs text-gray-400 font-body mt-0.5">
              Max. 10 MB
            </p>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div
        className="border-t border-gray-200/60 bg-white/80 backdrop-blur-sm px-6 py-3 shrink-0"
        style={{
          boxShadow: '0 -1px 3px rgba(0,0,0,0.03)',
        }}
      >
        {/* Pending file preview */}
        {pendingFile && (
          <div
            className="flex items-center gap-2.5 mb-2.5 bg-brand-50/60 rounded-xl px-3.5 py-2.5 border border-brand-100"
            style={{
              boxShadow: '0 1px 2px rgba(13,115,119,0.06)',
            }}
          >
            <FileText className="w-4 h-4 text-brand-500 shrink-0" />
            <span className="text-sm font-body text-gray-700 truncate flex-1">
              {pendingFile.name}
            </span>
            <span className="text-xs text-gray-400 font-body">
              {formatSize(pendingFile.size)}
            </span>
            <button
              onClick={() => setPendingFile(null)}
              className="p-1 hover:bg-brand-100 rounded-lg active:scale-95
                focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              style={{
                transition:
                  'background-color 150ms ease, transform 100ms ease',
              }}
            >
              <X className="w-3.5 h-3.5 text-brand-600" />
            </button>
          </div>
        )}

        {/* Upload progress */}
        {sending && pendingFile && uploadProgress > 0 && (
          <div className="h-1 bg-gray-100 rounded-full mb-2.5 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${uploadProgress}%`,
                background:
                  'linear-gradient(90deg, #0D7377, #36c0c5)',
                transition: 'width 200ms ease',
              }}
            />
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2 relative max-w-3xl mx-auto">
          {/* @mention dropdown */}
          {showMentions && filteredMentionOptions.length > 0 && (
            <div
              className="absolute bottom-full left-10 mb-2 w-64 bg-white rounded-xl border border-gray-100 overflow-hidden z-50"
              style={{
                boxShadow:
                  '0 4px 16px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider font-body border-b border-gray-100">
                <AtSign className="w-3 h-3 inline mr-1" />
                Erwähnen
              </div>
              {filteredMentionOptions.slice(0, 6).map((opt, idx) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm font-body flex items-center gap-2.5
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300
                    ${
                      idx === mentionIndex
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  style={{
                    transition: 'background-color 100ms ease',
                  }}
                  onClick={() => insertMention(opt.name)}
                  onMouseEnter={() => setMentionIndex(idx)}
                >
                  {opt.type === 'all' ? (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{
                        background:
                          'linear-gradient(135deg, #f59e0b, #d97706)',
                      }}
                    >
                      <Users className="w-3 h-3 text-white" />
                    </div>
                  ) : (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{
                        background: getAvatarColor(opt.id),
                      }}
                    >
                      {opt.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="truncate">
                    {opt.type === 'all'
                      ? 'Alle benachrichtigen'
                      : opt.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* File attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl text-gray-400 hover:text-brand-600 hover:bg-brand-50 active:scale-95
              focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            style={{
              transition:
                'background-color 150ms ease, color 150ms ease, transform 100ms ease',
            }}
            title="Datei anhängen"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              handleFileSelect(e.target.files[0]);
              e.target.value = '';
            }}
          />

          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              placeholder="Nachricht schreiben... (@Name oder @all)"
              rows={1}
              className="input-field w-full resize-none text-sm min-h-[42px] max-h-[120px] pr-3"
              style={{ fieldSizing: 'content' }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={sending || (!content.trim() && !pendingFile)}
            className="btn-primary px-3 py-2.5 rounded-xl disabled:opacity-40 active:scale-95
              focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
            style={{
              transition: 'transform 100ms ease, opacity 150ms ease',
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
