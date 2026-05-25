import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useToast } from '../context/ToastContext';

export default function FileUpload({ onFileSelect, dark = false }) {
  const [preview, setPreview] = useState(null);
  const { showToast } = useToast();

  const onDrop = useCallback(
    (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        showToast({ title: 'File too large', description: 'Max size is 10 MB.', status: 'warning', duration: 3000 });
        return;
      }
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result);
        reader.readAsDataURL(file);
      }
      onFileSelect(file);
    },
    [onFileSelect, showToast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
  });

  const textSecondary = dark ? 'rgba(238,242,255,0.52)' : 'rgba(17,24,39,0.48)';
  const textTertiary  = dark ? 'rgba(238,242,255,0.3)'  : 'rgba(17,24,39,0.3)';

  return (
    <div
      {...getRootProps()}
      style={{
        border: isDragActive
          ? dark ? '2px dashed rgba(96,165,250,0.55)' : '2px dashed rgba(30,80,180,0.4)'
          : dark ? '2px dashed rgba(255,255,255,0.12)' : '2px dashed rgba(0,0,0,0.12)',
        background: isDragActive
          ? dark ? 'rgba(96,165,250,0.07)' : 'rgba(30,80,180,0.04)'
          : dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.35)',
        borderRadius: 14,
        padding: '28px 20px',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        textAlign: 'center',
        outline: 'none',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <input {...getInputProps()} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 28, color: textTertiary, lineHeight: 1 }}>↑</div>
        <div style={{ fontSize: 13, color: textSecondary, lineHeight: 1.5 }}>
          {isDragActive ? 'Drop it here' : 'Drag & drop a file, or click to browse'}
        </div>
        <div style={{ fontSize: 11, color: textTertiary }}>
          PNG · JPG · PDF · DOC · XLS · TXT &nbsp;·&nbsp; max 10 MB
        </div>
      </div>

      {preview && (
        <div style={{ position: 'relative', marginTop: 16, display: 'inline-block' }}>
          <img
            src={preview}
            style={{ maxHeight: 200, borderRadius: 10, display: 'block' }}
            alt="Preview"
          />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setPreview(null); }}
            style={{
              position: 'absolute', top: 6, right: 6,
              width: 22, height: 22, borderRadius: '50%',
              background: 'rgba(220,50,50,0.85)',
              border: 'none', cursor: 'pointer',
              color: '#fff', fontSize: 14, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              outline: 'none',
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
