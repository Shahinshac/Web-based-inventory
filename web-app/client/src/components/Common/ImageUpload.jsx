/**
 * ImageUpload — reusable image upload widget
 * ─────────────────────────────────────────────────────────────────────────────
 * Features
 *   • Click-to-browse OR drag-and-drop file selection
 *   • Instant local preview before upload
 *   • Client-side validation: type (JPG/PNG/WEBP) + size (≤ 2 MB)
 *   • Upload progress indicator (spinner + "Uploading…" label)
 *   • Success / error feedback
 *   • Optimistic UI — shows new image immediately after upload
 *   • Optional delete button (?onDelete prop)
 *
 * Props
 *   currentImageUrl  {string|null}  – existing image URL to display
 *   onUpload         {(file) => Promise<string>}   – called with the chosen File; must return the new image URL
 *   onDelete?        {() => Promise<void>}          – called when user removes the photo
 *   shape?           {'circle'|'square'}             – default 'circle' (avatars) ; 'square' for products
 *   label?           {string}                        – helper text below the widget
 *   disabled?        {boolean}
 *   size?            {number}                        – pixel size of the preview (default 96)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useRef, useCallback } from 'react';
import './ImageUpload.css';

const MAX_BYTES         = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES     = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ALLOWED_EXT_REGEX = /\.(jpe?g|png|webp)$/i;

export default function ImageUpload({
  currentImageUrl = null,
  onUpload,
  onDelete,
  shape    = 'circle',
  label    = 'Click or drag & drop to upload',
  disabled = false,
  size     = 96
}) {
  const inputRef               = useRef(null);
  const [preview, setPreview]  = useState(null);   // local blob URL for preview
  const [loading, setLoading]  = useState(false);
  const [error,   setError]    = useState('');
  const [success, setSuccess]  = useState(false);
  const [isDragging, setDragging] = useState(false);

  // ── Validation ─────────────────────────────────────────────────────────────
  function validateFile(file) {
    if (!file) return 'No file selected';
    if (!ALLOWED_TYPES.has(file.type) || !ALLOWED_EXT_REGEX.test(file.name)) {
      return 'Invalid file type. Accepted: JPG, PNG, WEBP';
    }
    if (file.size > MAX_BYTES) {
      return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum: 2 MB`;
    }
    return null;
  }

  // ── Process a chosen/dropped file ──────────────────────────────────────────
  const processFile = useCallback(async (file) => {
    if (!file) return;

    setError('');
    setSuccess(false);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Show local preview immediately (optimistic)
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    setLoading(true);
    try {
      const savedUrl = await onUpload(file);
      setSuccess(true);
      // If the upload handler returns a CDN URL, switch the preview to it
      // so the correct URL is shown even after component remount
      if (savedUrl && typeof savedUrl === 'string') {
        URL.revokeObjectURL(localUrl);
        setPreview(savedUrl);
      }
      // else keep the blob preview until parent passes updated currentImageUrl
    } catch (err) {
      setError(err?.message || 'Upload failed — please try again');
      setPreview(null);   // revert preview on failure
    } finally {
      setLoading(false);
      // Revoke the object URL after a short delay
      setTimeout(() => URL.revokeObjectURL(localUrl), 60_000);
    }
  }, [onUpload]);

  // ── Input change ───────────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input value so the same file can be re-selected
    e.target.value = '';
  };

  // ── Drag & drop ────────────────────────────────────────────────────────────
  const handleDragOver = (e) => { e.preventDefault(); if (!disabled) setDragging(true); };
  const handleDragLeave = () => setDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!onDelete || disabled) return;
    setLoading(true);
    setError('');
    try {
      await onDelete();
      setPreview(null);
      setSuccess(false);
    } catch (err) {
      setError(err?.message || 'Failed to remove photo');
    } finally {
      setLoading(false);
    }
  };

  // ── Derived state ──────────────────────────────────────────────────────────
  const displayUrl = preview || currentImageUrl;

  return (
    <div className={`img-upload-root img-upload--${shape}`} style={{ '--img-upload-size': `${size}px` }}>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="img-upload-input"
        onChange={handleInputChange}
        disabled={disabled || loading}
        aria-label="Choose image file"
      />

      {/* Clickable / droppable zone */}
      <button
        type="button"
        className={[
          'img-upload-zone',
          isDragging  ? 'img-upload-zone--drag' : '',
          loading     ? 'img-upload-zone--loading' : '',
          disabled    ? 'img-upload-zone--disabled' : ''
        ].filter(Boolean).join(' ')}
        onClick={() => !disabled && !loading && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={disabled || loading}
        aria-label={label}
        title={label}
        style={{ width: size, height: size }}
      >
        {displayUrl ? (
          <>
            <img
              src={displayUrl}
              alt="Preview"
              className="img-upload-preview"
              /* Cache-safe: Cloudinary URLs already have a unique hash;
                 local blobs are ephemeral — no cache header needed */
            />
            {/* Overlay on hover (not while loading) */}
            {!loading && (
              <div className="img-upload-overlay" aria-hidden="true">
                <span className="img-upload-overlay-icon">📷</span>
                <span className="img-upload-overlay-text">Change</span>
              </div>
            )}
          </>
        ) : (
          <div className="img-upload-placeholder" aria-hidden="true">
            <span className="img-upload-placeholder-icon">
              {loading ? '⏳' : isDragging ? '📂' : '📷'}
            </span>
          </div>
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="img-upload-spinner" aria-label="Uploading…">
            <div className="img-upload-spinner-ring" />
          </div>
        )}
      </button>

      {/* Status bar */}
      <div className="img-upload-status" aria-live="polite">
        {loading && <span className="img-upload-status--uploading">Uploading…</span>}
        {!loading && success && !error && (
          <span className="img-upload-status--success">✓ Photo updated</span>
        )}
        {!loading && error && (
          <span className="img-upload-status--error" role="alert">{error}</span>
        )}
        {!loading && !success && !error && (
          <span className="img-upload-status--hint">{label}</span>
        )}
      </div>

      {/* Delete button */}
      {displayUrl && onDelete && !loading && (
        <button
          type="button"
          className="img-upload-delete-btn"
          onClick={handleDelete}
          disabled={disabled}
          aria-label="Remove photo"
          title="Remove photo"
        >
          ✕
        </button>
      )}
    </div>
  );
}
