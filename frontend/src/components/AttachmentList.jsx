import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, FileText, Trash2, Download, X } from 'lucide-react';
import api from '../services/api';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentList({ companyId }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const fetchFiles = useCallback(async () => {
    try {
      const { data } = await api.get(`/attachments/company/${companyId}`);
      setFiles(data);
    } catch {}
  }, [companyId]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const uploadFile = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    setProgress(0);
    try {
      await api.post(`/attachments/company/${companyId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      fetchFiles();
    } catch {
      // ignore
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/attachments/${id}`);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch {}
  };

  const handleDownload = async (id, fileName) => {
    try {
      const { data } = await api.get(`/attachments/${id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
          ${dragOver
            ? 'border-brand-400 bg-brand-50/50 dark:bg-brand-900/10'
            : 'border-border dark:border-dark-border hover:border-brand-300 dark:hover:border-brand-700'
          }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => uploadFile(e.target.files[0])}
        />
        <Upload className="w-6 h-6 mx-auto text-text-tertiary dark:text-dark-text-tertiary mb-2" />
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary font-body">
          Datei hierher ziehen oder klicken zum Hochladen
        </p>
        <p className="text-xs text-text-tertiary dark:text-dark-text-tertiary font-body mt-1">
          Max. 10 MB
        </p>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="h-1.5 bg-surface-elevated dark:bg-dark-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full"
            style={{ width: `${progress}%`, transition: 'width 200ms ease' }}
          />
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 px-4 py-3 bg-surface-elevated dark:bg-dark-elevated rounded-xl"
            >
              <FileText className="w-5 h-5 text-brand-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-body font-medium text-text-primary dark:text-dark-text-primary truncate">
                  {file.fileName}
                </p>
                <p className="text-[11px] text-text-tertiary dark:text-dark-text-tertiary font-body">
                  {formatSize(file.fileSize)} · {file.uploadedBy?.name} · {new Date(file.createdAt).toLocaleDateString('de-DE')}
                </p>
              </div>
              <button
                onClick={() => handleDownload(file.id, file.fileName)}
                className="p-1.5 rounded-lg text-text-secondary dark:text-dark-text-secondary hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                title="Herunterladen"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(file.id)}
                className="p-1.5 rounded-lg text-text-secondary dark:text-dark-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                title="Löschen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
