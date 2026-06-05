import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';

// ─── Supabase ───────────────────────────────────────────────
const supabaseUrl = 'https://kklvtfuvxudckuxkoysc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbHZ0ZnV2eHVkY2t1eGtveXNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0Mjc1NzEsImV4cCI6MjA5MDAwMzU3MX0.SsBoGWSP81U6A_VR4XwsA8WafXjfO_opxeUHKFPtYvM';
const supabase = createClient(supabaseUrl, supabaseKey);

function genCode(len = 5) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const CHUNK_SIZE = 50000;
const BASE_URL = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';

// ─── Encryption helpers (AES-GCM) ──────────────────────────
async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptText(text, password, roomCode) {
  const key = await deriveKey(password, roomCode);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decryptText(b64, password, roomCode) {
  try {
    const key = await deriveKey(password, roomCode);
    const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const iv = raw.slice(0, 12);
    const ciphertext = raw.slice(12);
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(plainBuf);
  } catch {
    return '[Decryption failed - wrong key?]';
  }
}

// ─── Link detection ─────────────────────────────────────────
const URL_REGEX = /(https?:\/\/[^\s<]+[^\s<.,;:!?"')\]])/g;

function Linkify({ text }) {
  const parts = text.split(URL_REGEX);
  return (
    <>
      {parts.map((part, i) =>
        URL_REGEX.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="link-detected">{part}</a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ─── Icons (SVG, no emoji) ──────────────────────────────────
const Icon = ({ d, size = 18, className = '', ...p }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...p}>{d}</svg>
);
const IconSend = (p) => <Icon {...p} d={<><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>} />;
const IconClip = (p) => <Icon {...p} d={<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>} />;
const IconFile = (p) => <Icon {...p} size={20} d={<><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></>} />;
const IconDownload = (p) => <Icon {...p} d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></>} />;
const IconCopy = (p) => <Icon {...p} size={14} d={<><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></>} />;
const IconCheck = (p) => <Icon {...p} size={14} d={<path d="M20 6 9 17l-5-5"/>} />;
const IconGlobe = (p) => <Icon {...p} size={14} d={<><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></>} />;
const IconLock = (p) => <Icon {...p} size={14} d={<><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>} />;
const IconUnlock = (p) => <Icon {...p} size={14} d={<><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></>} />;
const IconUsers = (p) => <Icon {...p} size={14} d={<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>} />;
const IconLoader = (p) => <Icon {...p} className="animate-spin" d={<path d="M21 12a9 9 0 1 1-6.219-8.56"/>} />;
const IconX = (p) => <Icon {...p} size={16} d={<><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>} />;
const IconText = (p) => <Icon {...p} size={14} d={<><path d="M17 6.1H3"/><path d="M21 12.1H3"/><path d="M15.1 18H3"/></>} />;
const IconTrash = (p) => <Icon {...p} size={14} d={<><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></>} />;
const IconTrash2 = (p) => <Icon {...p} size={16} d={<><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></>} />;
const IconArrowRight = (p) => <Icon {...p} size={13} d={<><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>} />;
const IconQR = (p) => <Icon {...p} size={16} d={<><rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><path d="M14 14h2v2h-2z"/><path d="M20 14h2v2h-2z"/><path d="M14 20h2v2h-2z"/><path d="M20 20h2v2h-2z"/><path d="M17 17h2v2h-2z"/></>} />;
const IconCamera = (p) => <Icon {...p} size={16} d={<><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></>} />;
const IconClock = (p) => <Icon {...p} size={14} d={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} />;
const IconArchive = (p) => <Icon {...p} size={16} d={<><path d="m21 8-2-2H5L3 8"/><rect x="3" y="8" width="18" height="12" rx="1"/><path d="M10 12h4"/></>} />;
const IconShield = (p) => <Icon {...p} size={14} d={<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></>} />;
const IconPlus = (p) => <Icon {...p} size={18} d={<><path d="M12 5v14"/><path d="M5 12h14"/></>} />;
const IconArrowLeft = (p) => <Icon {...p} size={18} d={<><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></>} />;

// ─── Logo SVG (hollow circle monogram) ──────────────────────
function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="20" cy="20" r="6" stroke="currentColor" strokeWidth="2" />
      <line x1="20" y1="2" x2="20" y2="14" stroke="currentColor" strokeWidth="1.5" />
      <line x1="20" y1="26" x2="20" y2="38" stroke="currentColor" strokeWidth="1.5" />
      <line x1="2" y1="20" x2="14" y2="20" stroke="currentColor" strokeWidth="1.5" />
      <line x1="26" y1="20" x2="38" y2="20" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

// ─── QR Scanner Modal ───────────────────────────────────────
function QRScannerModal({ onScan, onClose }) {
  const scannerRef = useRef(null);

  useEffect(() => {
    let scanner = null;
    const initScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        scanner = new Html5Qrcode('qr-reader-container');
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
          (text) => {
            scanner.stop().catch(() => {});
            onScan(text);
          },
          () => {}
        );
      } catch (err) {
        console.error('QR Scanner error:', err);
      }
    };
    initScanner();
    return () => {
      if (scannerRef.current) scannerRef.current.stop().catch(() => {});
    };
  }, [onScan]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Scan QR Code</h3>
          <button onClick={onClose} className="btn p-2 rounded-xl" style={{ color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
            <IconX />
          </button>
        </div>
        <div id="qr-reader-container" style={{ borderRadius: '12px', overflow: 'hidden' }} />
        <p className="text-[10px] text-center mt-3 font-medium" style={{ color: 'var(--text-muted)' }}>
          Point camera at a BEENHOLLOW QR code
        </p>
      </div>
    </div>
  );
}

// ─── QR Display Modal ───────────────────────────────────────
function QRDisplayModal({ roomCode, onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const roomUrl = `${BASE_URL}?room=${roomCode}`;

  useEffect(() => {
    QRCode.toDataURL(roomUrl, {
      width: 280, margin: 2,
      color: { dark: '#000000', light: '#fafafa' },
      errorCorrectionLevel: 'M'
    }).then(setQrDataUrl).catch(console.error);
  }, [roomUrl]);

  const copyUrl = () => navigator.clipboard.writeText(roomUrl);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Share Room</h3>
          <button onClick={onClose} className="btn p-2 rounded-xl" style={{ color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
            <IconX />
          </button>
        </div>
        <div className="flex flex-col items-center gap-5">
          {qrDataUrl ? (
            <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-primary)', border: '2px solid var(--border-accent)' }}>
              <img src={qrDataUrl} alt="Room QR Code" className="block" style={{ width: '240px', height: '240px', borderRadius: '12px' }} />
            </div>
          ) : (
            <div className="w-[240px] h-[240px] rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-card)' }}>
              <IconLoader size={24} style={{ color: 'var(--accent)' }} />
            </div>
          )}
          <div className="text-center">
            <p className="text-[10px] uppercase font-black mb-1 tracking-wider" style={{ color: 'var(--text-muted)' }}>Room Code</p>
            <p className="text-3xl code-display" style={{ color: 'var(--accent)' }}>{roomCode}</p>
          </div>
          <button onClick={copyUrl} className="btn w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all" style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-accent)', color: 'var(--accent)' }}>
            <IconCopy size={14} /> Copy Link
          </button>
          <p className="text-[10px] text-center break-all px-2 font-medium" style={{ color: 'var(--text-muted)' }}>{roomUrl}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Encryption Password Modal ──────────────────────────────
function EncryptionModal({ onSubmit, onClose, isJoining }) {
  const [password, setPassword] = useState('');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
            {isJoining ? 'Enter Room Key' : 'Set Encryption Key'}
          </h3>
          <button onClick={onClose} className="btn p-2 rounded-xl" style={{ color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
            <IconX />
          </button>
        </div>
        <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {isJoining
            ? 'This room is encrypted. Enter the passphrase to decrypt messages.'
            : 'Set a passphrase to encrypt all messages in this room. Share this passphrase with participants.'}
        </p>
        <input
          type="password" value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && password.trim() && onSubmit(password.trim())}
          placeholder="Enter passphrase..."
          autoFocus
          className="w-full px-4 py-3 rounded-xl text-sm font-semibold input-ring mb-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
        />
        <button
          onClick={() => password.trim() && onSubmit(password.trim())}
          disabled={!password.trim()}
          className="btn w-full py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all disabled:opacity-30"
          style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}
        >
          {isJoining ? 'Decrypt Room' : 'Enable Encryption'}
        </button>
      </div>
    </div>
  );
}

// ─── Password Gate Modal (shown on room entry) ─────────────
function PasswordGateModal({ onSubmit, onCancel }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (password.trim()) {
      setError('');
      onSubmit(password.trim());
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
            Room Locked
          </h3>
        </div>
        <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          This room is encrypted. Enter the passphrase to access.
        </p>
        {error && <p className="text-xs mb-3 font-bold" style={{ color: '#ef4444' }}>{error}</p>}
        <input
          type="password" value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Enter room passphrase..."
          autoFocus
          className="w-full px-4 py-3 rounded-xl text-sm font-semibold input-ring mb-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
        />
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="btn flex-1 py-3 rounded-xl text-sm font-bold transition-all"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={!password.trim()}
            className="btn flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all disabled:opacity-30"
            style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}
          >
            Unlock
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Modal ──────────────────────────────────────────
function ConfirmModal({ title, message, onConfirm, onClose, confirmLabel = 'Confirm', danger = false }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          <button onClick={onClose} className="btn p-2 rounded-xl" style={{ color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
            <IconX />
          </button>
        </div>
        <p className="text-xs mb-5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn flex-1 py-3 rounded-xl text-sm font-bold transition-all" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>Cancel</button>
          <button onClick={onConfirm} className="btn flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all" style={{ background: danger ? '#ef4444' : 'var(--accent)', color: '#fff' }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Hold Room Duration Modal ───────────────────────────────
function HoldRoomModal({ onSubmit, onClose }) {
  const durations = [
    { label: '12 Hours', hours: 12 },
    { label: '24 Hours', hours: 24 },
    { label: '48 Hours', hours: 48 },
    { label: '96 Hours', hours: 96 },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Hold Room</h3>
          <button onClick={onClose} className="btn p-2 rounded-xl" style={{ color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
            <IconX />
          </button>
        </div>
        <p className="text-xs mb-5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Files and messages will persist in this room for the selected duration. Anyone with the room code can access them.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {durations.map(d => (
            <button
              key={d.hours}
              onClick={() => onSubmit(d.hours)}
              className="btn py-4 rounded-xl text-center transition-all"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            >
              <div className="text-lg font-black">{d.hours}h</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>{d.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── LANDING PAGE ───────────────────────────────────────────
function LandingPage({ onCreateRoom, onJoinRoom, publicRooms, onJoinPublic, onScanQR }) {
  const [joinCode, setJoinCode] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (code) onJoinRoom(code);
  };

  const handleQRScan = (text) => {
    setShowScanner(false);
    onScanQR(text);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo & Title */}
        <div className="text-center mb-12">
          <div className="mb-6 flex justify-center" style={{ color: 'var(--text-primary)' }}>
            <Logo size={56} />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter mb-3" style={{ color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>
            BEENHOLLOW
          </h1>
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            Drop files into the void.
          </p>
        </div>

        {/* Action cards */}
        <div className="w-full max-w-sm space-y-4">
          {/* Create Room */}
          <button
            onClick={onCreateRoom}
            className="w-full py-5 px-6 rounded-2xl text-left transition-all active:scale-[0.98] cursor-pointer"
            style={{ background: 'var(--accent)', color: 'var(--bg-primary)', border: 'none' }}
          >
            <div className="flex items-center justify-between w-full">
              <div>
                <div className="text-sm font-black uppercase tracking-wider">Create Room</div>
                <div className="text-[11px] font-medium mt-1 opacity-50">Start a new void</div>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <IconPlus size={20} />
              </div>
            </div>
          </button>

          {/* Join Room */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <div className="p-5">
              <div className="text-sm font-black uppercase tracking-wider mb-4" style={{ color: 'var(--text-primary)' }}>Join Room</div>
              <div className="flex gap-2">
                <input
                  type="text" value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  placeholder="ENTER CODE"
                  maxLength={5}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-center code-display input-ring"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                />
                <button onClick={handleJoin} className="btn px-5 py-3 rounded-xl text-sm font-black transition-all" style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-accent)', color: 'var(--accent)' }}>
                  Go
                </button>
              </div>
            </div>
            <div className="px-5 pb-4">
              <button onClick={() => setShowScanner(true)} className="btn w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <IconCamera size={16} /> Scan QR Code
              </button>
            </div>
          </div>
        </div>

        {/* Public rooms */}
        {publicRooms.length > 0 && (
          <div className="w-full max-w-sm mt-8">
            <div className="flex items-center gap-2 mb-3">
              <IconGlobe size={12} style={{ color: 'var(--text-muted)' }} />
              <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Public Rooms</p>
            </div>
            <div className="space-y-2">
              {publicRooms.map(room => (
                <button
                  key={room.code}
                  onClick={() => onJoinPublic(room.code)}
                  className="btn w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                    <span className="text-sm font-black code-display" style={{ color: 'var(--text-primary)' }}>{room.code}</span>
                    <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>{room.peers} online</span>
                  </div>
                  <IconArrowRight style={{ color: 'var(--text-muted)' }} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer credit */}
      <footer className="py-6 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          by alchemist4real
        </p>
      </footer>

      {showScanner && <QRScannerModal onScan={handleQRScan} onClose={() => setShowScanner(false)} />}
    </div>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────
export default function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing' | 'room'
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [peerCount, setPeerCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [myCode, setMyCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState({});
  const [isPublic, setIsPublic] = useState(false);
  const [publicRooms, setPublicRooms] = useState([]);
  const [showPublicRooms, setShowPublicRooms] = useState(false);
  const [currentRoom, setCurrentRoom] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Host/owner tracking
  const [isHost, setIsHost] = useState(false);

  // Encryption state
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [encryptionPassword, setEncryptionPassword] = useState('');
  const [showEncryptionModal, setShowEncryptionModal] = useState(false);
  const [showPasswordGate, setShowPasswordGate] = useState(false);
  const [pendingRoomCode, setPendingRoomCode] = useState('');

  // Hold room state
  const [holdDuration, setHoldDuration] = useState(0); // hours, 0 = no hold
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Delete / Empty room state
  const [showConfirmEmpty, setShowConfirmEmpty] = useState(false);
  const [deletingMsgId, setDeletingMsgId] = useState(null);

  const channelRef = useRef(null);
  const lobbyRef = useRef(null);
  const scrollRef = useRef(null);
  const fileChunksRef = useRef({});
  const heartbeatRef = useRef(null);
  const myCodeRef = useRef('');
  const hasAutoJoined = useRef(false);
  const encryptRef = useRef({ enabled: false, password: '' });
  const isHostRef = useRef(false);

  // Keep refs in sync
  useEffect(() => {
    encryptRef.current = { enabled: isEncrypted, password: encryptionPassword };
  }, [isEncrypted, encryptionPassword]);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);

  // ─── Check URL for ?room= param ──────────────────────────
  const getUrlRoomCode = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room')?.trim().toUpperCase() || null;
  }, []);

  // ─── Lobby ────────────────────────────────────────────────
  useEffect(() => {
    const lobby = supabase.channel('beenhollow_lobby', { config: { broadcast: { ack: false } } });
    lobby.on('broadcast', { event: 'room_announce' }, ({ payload }) => {
      setPublicRooms(prev => {
        const filtered = prev.filter(r => r.code !== payload.code);
        return [{ ...payload, lastSeen: Date.now() }, ...filtered].slice(0, 20);
      });
    });
    lobby.on('broadcast', { event: 'room_close' }, ({ payload }) => {
      setPublicRooms(prev => prev.filter(r => r.code !== payload.code));
    });
    lobby.subscribe();
    lobbyRef.current = lobby;
    return () => supabase.removeChannel(lobby);
  }, []);

  // Stale cleanup
  useEffect(() => {
    const t = setInterval(() => {
      setPublicRooms(prev => prev.filter(r => Date.now() - r.lastSeen < 30000));
    }, 15000);
    return () => clearInterval(t);
  }, []);

  // ─── Init ─────────────────────────────────────────────────
  useEffect(() => {
    const urlRoom = getUrlRoomCode();
    const code = genCode();
    setMyCode(code);
    myCodeRef.current = code;
    if (urlRoom) {
      // Check if room is encrypted before entering
      (async () => {
        const { data } = await supabase.from('rooms').select('*').eq('code', urlRoom).single();
        if (data?.is_encrypted) {
          setPendingRoomCode(urlRoom);
          setShowPasswordGate(true);
          hasAutoJoined.current = true;
        } else {
          setCurrentRoom(urlRoom);
          hasAutoJoined.current = true;
          if (data?.owner === code) setIsHost(true);
          if (data?.hold_hours) setHoldDuration(data.hold_hours);
          setCurrentView('room');
        }
      })();
    }
  }, [getUrlRoomCode]);

  // ─── Heartbeat ────────────────────────────────────────────
  useEffect(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (isPublic && currentRoom) {
      const announce = () => {
        lobbyRef.current?.send({ type: 'broadcast', event: 'room_announce', payload: { code: currentRoom, peers: peerCount + 1 } });
      };
      announce();
      heartbeatRef.current = setInterval(announce, 10000);
    }
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, [isPublic, peerCount, currentRoom]);

  // ─── Load persisted messages ──────────────────────────────
  const loadPersistedMessages = useCallback(async (roomCode) => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('room_messages')
        .select('*')
        .eq('room_code', roomCode)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (error) { console.error('Failed to load history:', error); return; }
      if (!data || data.length === 0) return;

      const loaded = data.map(row => {
        if (row.msg_type === 'text') {
          return {
            id: row.id, type: 'text', text: row.content,
            isMe: false, sender: row.sender || 'saved', time: new Date(row.created_at), persisted: true
          };
        } else if (row.msg_type === 'file') {
          let url = null;
          if (row.file_data) {
            try {
              const bs = atob(row.file_data);
              const ab = new ArrayBuffer(bs.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < bs.length; i++) ia[i] = bs.charCodeAt(i);
              url = URL.createObjectURL(new Blob([ab], { type: row.file_mime || 'application/octet-stream' }));
            } catch (e) { console.error('File restore error:', e); }
          }
          return {
            id: row.id, type: 'file', fileName: row.file_name || 'file',
            fileSize: row.file_size || 0, url, isMe: false, sender: row.sender || 'saved',
            time: new Date(row.created_at), persisted: true
          };
        }
        return null;
      }).filter(Boolean);

      setMessages(prev => [...loaded, ...prev]);
    } catch (err) { console.error('Load history error:', err); }
    finally { setIsLoadingHistory(false); }
  }, []);

  // ─── Persist a message to Supabase ────────────────────────
  const persistMessage = useCallback(async (roomCode, msg, fileBase64 = null) => {
    if (holdDuration <= 0) return;
    const expiresAt = new Date(Date.now() + holdDuration * 3600 * 1000).toISOString();
    try {
      await supabase.from('room_messages').insert({
        room_code: roomCode,
        sender: myCodeRef.current,
        msg_type: msg.type === 'file' ? 'file' : 'text',
        content: msg.type === 'text' ? msg.text : null,
        file_name: msg.fileName || null,
        file_mime: msg.fileMime || null,
        file_size: msg.fileSize || null,
        file_data: fileBase64 || null,
        expires_at: expiresAt
      });
    } catch (err) { console.error('Persist error:', err); }
  }, [holdDuration]);

  // ─── Channel setup ────────────────────────────────────────
  const setupChannel = useCallback((code, isHost) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase.channel(`room_${code}`, {
      config: { broadcast: { ack: false }, presence: { key: myCodeRef.current || code } }
    });
    channelRef.current = channel;
    setCurrentRoom(code);

    channel.on('broadcast', { event: 'message' }, async ({ payload }) => {
      let text = payload.text;
      if (payload.encrypted && encryptRef.current.enabled) {
        text = await decryptText(payload.text, encryptRef.current.password, code);
      }
      setMessages(prev => [...prev, {
        id: `${Date.now()}-${Math.random()}`, type: 'text', text,
        isMe: false, sender: payload.sender || 'anon', time: new Date(),
        encrypted: payload.encrypted || false
      }]);
    });

    channel.on('broadcast', { event: 'file_chunk' }, ({ payload }) => {
      const { fileId, fileName, fileMime, fileSize, totalChunks, chunkIndex, chunkData } = payload;
      if (!fileChunksRef.current[fileId]) {
        fileChunksRef.current[fileId] = { chunks: new Array(totalChunks), receivedCount: 0, fileName, fileMime, fileSize };
      }
      const fd = fileChunksRef.current[fileId];
      if (!fd.chunks[chunkIndex]) {
        fd.chunks[chunkIndex] = chunkData;
        fd.receivedCount++;
        setDownloadProgress(prev => ({ ...prev, [fileId]: Math.floor((fd.receivedCount / totalChunks) * 100) }));
        if (fd.receivedCount === totalChunks) {
          try {
            const bs = atob(fd.chunks.join(''));
            const ab = new ArrayBuffer(bs.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < bs.length; i++) ia[i] = bs.charCodeAt(i);
            const url = URL.createObjectURL(new Blob([ab], { type: fileMime }));
            setMessages(prev => [...prev, { id: fileId, type: 'file', fileName, fileSize, url, isMe: false, sender: payload.sender || 'anon', time: new Date() }]);
            delete fileChunksRef.current[fileId];
            setDownloadProgress(prev => { const n = { ...prev }; delete n[fileId]; return n; });
          } catch (e) { console.error("Reassemble error", e); }
        }
      }
    });

    channel.on('presence', { event: 'sync' }, () => {
      const count = Object.keys(channel.presenceState()).length;
      setPeerCount(Math.max(0, count - 1));
      setIsConnected(count > 1);
    });
    channel.on('presence', { event: 'join' }, ({ key }) => {
      if (key !== myCodeRef.current) setMessages(prev => [...prev, { id: `sys-${Date.now()}`, type: 'system', text: 'A device joined the room', time: new Date() }]);
    });
    channel.on('presence', { event: 'leave' }, ({ key }) => {
      if (key !== myCodeRef.current) setMessages(prev => [...prev, { id: `sys-${Date.now()}`, type: 'system', text: 'A device left the room', time: new Date() }]);
    });
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await channel.track({ online_at: new Date().toISOString() });
    });

    // Load persisted messages
    loadPersistedMessages(code);
  }, [loadPersistedMessages]);

  // Auto-connect when room is set and we're in room view
  useEffect(() => {
    if (currentRoom && currentView === 'room') {
      setupChannel(currentRoom, !hasAutoJoined.current);
    }
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [currentRoom, currentView, setupChannel]);

  // ─── Create Room ──────────────────────────────────────────
  const createRoom = useCallback(async () => {
    const code = myCode || genCode();
    setMessages([]);
    setCurrentRoom(code);
    setIsHost(true);
    isHostRef.current = true;
    window.history.replaceState({}, '', `${window.location.pathname}?room=${code}`);
    // Register room in Supabase
    await supabase.from('rooms').upsert({ code, owner: myCodeRef.current }, { onConflict: 'code' });
    setCurrentView('room');
  }, [myCode]);

  // ─── Join Room ────────────────────────────────────────────
  const joinRoom = useCallback(async (codeOverride) => {
    const code = (codeOverride || '').trim().toUpperCase();
    if (!code) return;
    setMessages([]);
    if (isPublic) {
      lobbyRef.current?.send({ type: 'broadcast', event: 'room_close', payload: { code: currentRoom } });
      setIsPublic(false);
    }

    // Check if room is encrypted
    const { data } = await supabase.from('rooms').select('*').eq('code', code).single();
    if (data?.is_encrypted) {
      setPendingRoomCode(code);
      if (data?.owner === myCodeRef.current) setIsHost(true);
      if (data?.hold_hours) setHoldDuration(data.hold_hours);
      setShowPasswordGate(true);
      setShowPublicRooms(false);
      setShowScanner(false);
      return;
    }

    if (data?.owner === myCodeRef.current) setIsHost(true);
    else setIsHost(false);
    if (data?.hold_hours) setHoldDuration(data.hold_hours);

    window.history.replaceState({}, '', `${window.location.pathname}?room=${code}`);
    setCurrentRoom(code);
    setCurrentView('room');
    setShowPublicRooms(false);
    setShowScanner(false);
  }, [isPublic, currentRoom]);

  // ─── Password gate handler ────────────────────────────────
  const handlePasswordGateSubmit = useCallback((password) => {
    setEncryptionPassword(password);
    setIsEncrypted(true);
    setShowPasswordGate(false);
    const code = pendingRoomCode;
    setPendingRoomCode('');
    window.history.replaceState({}, '', `${window.location.pathname}?room=${code}`);
    setCurrentRoom(code);
    setCurrentView('room');
  }, [pendingRoomCode]);

  const handlePasswordGateCancel = useCallback(() => {
    setShowPasswordGate(false);
    setPendingRoomCode('');
    setCurrentView('landing');
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  // ─── Back to landing ──────────────────────────────────────
  const goToLanding = useCallback(() => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    if (isPublic) {
      lobbyRef.current?.send({ type: 'broadcast', event: 'room_close', payload: { code: currentRoom } });
      setIsPublic(false);
    }
    setMessages([]);
    setCurrentView('landing');
    setIsEncrypted(false);
    setEncryptionPassword('');
    setHoldDuration(0);
    setIsHost(false);
    isHostRef.current = false;
    window.history.replaceState({}, '', window.location.pathname);
  }, [isPublic, currentRoom]);

  // ─── QR scan handler ──────────────────────────────────────
  const handleQRScan = useCallback((text) => {
    try {
      const url = new URL(text);
      const code = url.searchParams.get('room');
      if (code) joinRoom(code);
    } catch {
      if (/^[A-Z0-9]{4,6}$/.test(text.trim().toUpperCase())) joinRoom(text.trim().toUpperCase());
    }
  }, [joinRoom]);

  // ─── Toggle public ────────────────────────────────────────
  const togglePublic = useCallback(() => {
    if (isPublic) {
      lobbyRef.current?.send({ type: 'broadcast', event: 'room_close', payload: { code: currentRoom } });
      setIsPublic(false);
    } else {
      setIsPublic(true);
    }
  }, [isPublic, currentRoom]);

  // ─── Toggle encryption (host only) ────────────────────────
  const handleEnableEncryption = useCallback(async (password) => {
    setEncryptionPassword(password);
    setIsEncrypted(true);
    setShowEncryptionModal(false);
    setMessages(prev => [...prev, { id: `sys-enc-${Date.now()}`, type: 'system', text: 'Encryption enabled for this room', time: new Date() }]);
    // Persist encryption state to Supabase
    await supabase.from('rooms').upsert({ code: currentRoom, owner: myCodeRef.current, is_encrypted: true }, { onConflict: 'code' });
  }, [currentRoom]);

  const toggleEncryption = useCallback(async () => {
    if (!isHost) return; // Only host can toggle
    if (isEncrypted) {
      setIsEncrypted(false);
      setEncryptionPassword('');
      setMessages(prev => [...prev, { id: `sys-enc-${Date.now()}`, type: 'system', text: 'Encryption disabled', time: new Date() }]);
      await supabase.from('rooms').update({ is_encrypted: false, encryption_hash: null }).eq('code', currentRoom);
    } else {
      setShowEncryptionModal(true);
    }
  }, [isEncrypted, isHost, currentRoom]);

  // ─── Hold room ────────────────────────────────────────────
  const handleHoldRoom = useCallback(async (hours) => {
    setHoldDuration(hours);
    setShowHoldModal(false);
    setMessages(prev => [...prev, { id: `sys-hold-${Date.now()}`, type: 'system', text: `Room held for ${hours} hours`, time: new Date() }]);
    await supabase.from('rooms').upsert({ code: currentRoom, owner: myCodeRef.current, hold_hours: hours }, { onConflict: 'code' });
  }, [currentRoom]);

  // ─── Delete single message (host only) ────────────────────
  const deleteMessage = useCallback(async (msgId) => {
    if (!isHost) return;
    setMessages(prev => prev.filter(m => m.id !== msgId));
    // Also delete from Supabase if persisted
    await supabase.from('room_messages').delete().eq('id', msgId);
    setDeletingMsgId(null);
  }, [isHost]);

  // ─── Empty room (host only) ───────────────────────────────
  const emptyRoom = useCallback(async () => {
    if (!isHost) return;
    setMessages([]);
    setShowConfirmEmpty(false);
    // Delete all messages from Supabase for this room
    await supabase.from('room_messages').delete().eq('room_code', currentRoom);
    setMessages([{ id: `sys-empty-${Date.now()}`, type: 'system', text: 'Room cleared by owner', time: new Date() }]);
  }, [isHost, currentRoom]);

  // Auto-scroll
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, downloadProgress]);

  // ─── Send text ────────────────────────────────────────────
  const handleSendText = useCallback(async (e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || !channelRef.current) return;

    setMessages(prev => [...prev, { id: `${Date.now()}`, type: 'text', text, isMe: true, time: new Date(), encrypted: isEncrypted }]);

    let sendText = text;
    if (isEncrypted && encryptionPassword) {
      sendText = await encryptText(text, encryptionPassword, currentRoom);
    }

    channelRef.current.send({
      type: 'broadcast', event: 'message',
      payload: { text: sendText, sender: myCodeRef.current, encrypted: isEncrypted }
    });

    // Persist if held
    if (holdDuration > 0) {
      persistMessage(currentRoom, { type: 'text', text });
    }

    setInputText('');
  }, [inputText, isEncrypted, encryptionPassword, currentRoom, holdDuration, persistMessage]);

  // ─── Send file ────────────────────────────────────────────
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || !channelRef.current) return;
    setIsSending(true); setUploadProgress(0);
    try {
      const reader = new FileReader();
      const base64 = await new Promise((res, rej) => { reader.onload = () => res(reader.result.split(',')[1]); reader.onerror = rej; reader.readAsDataURL(file); });
      const url = URL.createObjectURL(new Blob([file], { type: file.type }));
      const fileId = `${Date.now()}-${Math.random()}`;
      setMessages(prev => [...prev, { id: fileId, type: 'file', fileName: file.name, fileSize: file.size, url, isMe: true, time: new Date() }]);
      const totalChunks = Math.ceil(base64.length / CHUNK_SIZE);
      for (let i = 0; i < totalChunks; i++) {
        await channelRef.current.send({ type: 'broadcast', event: 'file_chunk', payload: { fileId, fileName: file.name, fileMime: file.type, fileSize: file.size, totalChunks, chunkIndex: i, chunkData: base64.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE), sender: myCodeRef.current } });
        setUploadProgress(Math.floor(((i + 1) / totalChunks) * 100));
        await new Promise(r => setTimeout(r, 20));
      }
      // Persist if held
      if (holdDuration > 0) {
        persistMessage(currentRoom, { type: 'file', fileName: file.name, fileMime: file.type, fileSize: file.size }, base64);
      }
    } catch (err) { console.error('File send error:', err); }
    finally { setIsSending(false); setUploadProgress(0); e.target.value = null; }
  }, [holdDuration, currentRoom, persistMessage]);

  // ─── Download all files + texts ────────────────────────────
  const downloadAllFiles = useCallback(async () => {
    const fileMessages = messages.filter(m => m.type === 'file' && m.url);
    const textMessages = messages.filter(m => m.type === 'text');

    if (fileMessages.length === 0 && textMessages.length === 0) return;

    // Single file, no text → direct download
    if (fileMessages.length === 1 && textMessages.length === 0) {
      const a = document.createElement('a');
      a.href = fileMessages[0].url;
      a.download = fileMessages[0].fileName;
      a.click();
      return;
    }

    // Dynamic import JSZip
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Add files
      for (const fm of fileMessages) {
        try {
          const resp = await fetch(fm.url);
          const blob = await resp.blob();
          zip.file(fm.fileName, blob);
        } catch (e) { console.error('Failed to add file to zip:', fm.fileName, e); }
      }

      // Add text messages + links as a .txt file
      if (textMessages.length > 0) {
        const lines = textMessages.map(m => {
          const time = m.time instanceof Date ? m.time.toLocaleString() : '';
          const sender = m.isMe ? 'You' : (m.sender || 'Remote');
          return `[${time}] ${sender}: ${m.text}`;
        });
        const header = `BEENHOLLOW Room: ${currentRoom}\nExported: ${new Date().toLocaleString()}\n${'─'.repeat(40)}\n\n`;
        zip.file(`messages_${currentRoom}.txt`, header + lines.join('\n'));
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `beenhollow_${currentRoom}_all.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { console.error('Download all error:', err); }
  }, [messages, currentRoom]);

  // ─── Copy text ────────────────────────────────────────────
  const copyMessageText = useCallback((msgId, text) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  }, []);

  // ─── Utils ────────────────────────────────────────────────
  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(currentRoom);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [currentRoom]);

  const fmt = (b) => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
  const fmtTime = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const ext = (n) => { const e = n.split('.').pop()?.toUpperCase() || '?'; return e.length > 5 ? e.slice(0, 4) : e; };

  const fileCount = useMemo(() => messages.filter(m => m.type === 'file' && m.url).length, [messages]);
  const contentCount = useMemo(() => messages.filter(m => m.type === 'file' || m.type === 'text').length, [messages]);

  // ─── LANDING VIEW ─────────────────────────────────────────
  if (currentView === 'landing') {
    return (
      <>
        <LandingPage
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          publicRooms={publicRooms}
          onJoinPublic={joinRoom}
          onScanQR={handleQRScan}
        />
        {showPasswordGate && <PasswordGateModal onSubmit={handlePasswordGateSubmit} onCancel={handlePasswordGateCancel} />}
      </>
    );
  }

  // ─── ROOM VIEW ────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg-primary)' }}>

      {/* HEADER */}
      <header className="flex-shrink-0 px-4 sm:px-6 py-3 flex items-center justify-between gap-3" style={{ borderBottom: '2px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={goToLanding} className="btn p-2 rounded-xl flex-shrink-0 transition-all" style={{ color: 'var(--text-secondary)' }}>
            <IconArrowLeft />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
              <Logo size={24} />
            </div>
            <h1 className="text-sm font-black tracking-tight truncate uppercase" style={{ color: 'var(--text-primary)' }}>BEENHOLLOW</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Peer count */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'animate-ping' : ''}`} style={{ background: isConnected ? 'var(--accent)' : 'var(--text-muted)' }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: isConnected ? 'var(--accent)' : 'var(--text-muted)' }} />
            </span>
            <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>{peerCount}</span>
          </div>
        </div>
      </header>

      {/* TOOLBAR */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
        {/* Room code */}
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl flex-shrink-0" style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-accent)' }}>
          <span className="text-[9px] uppercase font-black tracking-wider" style={{ color: 'var(--text-muted)' }}>Room</span>
          <span className="code-display text-xs" style={{ color: 'var(--accent)' }}>{currentRoom}</span>
          <button onClick={copyCode} className="p-1 rounded" style={{ color: 'var(--text-muted)' }}>
            {copied ? <IconCheck style={{ color: 'var(--accent)' }} /> : <IconCopy />}
          </button>
        </div>

        {/* QR */}
        <button onClick={() => setShowQR(true)} className="btn p-2.5 rounded-xl flex-shrink-0 transition-all" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }} title="Share QR">
          <IconQR />
        </button>

        {/* Scan */}
        <button onClick={() => setShowScanner(true)} className="btn p-2.5 rounded-xl flex-shrink-0 transition-all" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }} title="Scan QR">
          <IconCamera />
        </button>

        {/* Public toggle */}
        <button onClick={togglePublic} className="btn flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-bold flex-shrink-0 transition-all" style={{ background: isPublic ? 'var(--accent-dim)' : 'var(--bg-card)', border: `1px solid ${isPublic ? 'var(--border-accent)' : 'var(--border-subtle)'}`, color: isPublic ? 'var(--accent)' : 'var(--text-muted)' }}>
          {isPublic ? <IconGlobe /> : <IconLock />}
          <span className="hidden sm:inline">{isPublic ? 'Public' : 'Private'}</span>
        </button>

        {/* Encryption toggle */}
        <button onClick={toggleEncryption} className={`btn flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-bold flex-shrink-0 transition-all ${!isHost && !isEncrypted ? 'opacity-30 cursor-not-allowed' : ''}`} style={{ background: isEncrypted ? 'var(--accent-dim)' : 'var(--bg-card)', border: `1px solid ${isEncrypted ? 'var(--border-accent)' : 'var(--border-subtle)'}`, color: isEncrypted ? 'var(--accent)' : 'var(--text-muted)' }} title={isEncrypted ? 'Encrypted' : isHost ? 'Encrypt' : 'Only owner can encrypt'}>
          {isEncrypted ? <IconShield /> : <IconUnlock />}
          <span className="hidden sm:inline">{isEncrypted ? 'Encrypted' : 'Encrypt'}</span>
        </button>

        {/* Hold room */}
        <button onClick={() => setShowHoldModal(true)} className="btn flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-bold flex-shrink-0 transition-all" style={{ background: holdDuration > 0 ? 'var(--accent-dim)' : 'var(--bg-card)', border: `1px solid ${holdDuration > 0 ? 'var(--border-accent)' : 'var(--border-subtle)'}`, color: holdDuration > 0 ? 'var(--accent)' : 'var(--text-muted)' }} title="Hold Room">
          <IconClock />
          <span className="hidden sm:inline">{holdDuration > 0 ? `${holdDuration}h` : 'Hold'}</span>
        </button>

        {/* Download all */}
        {contentCount > 0 && (
          <button onClick={downloadAllFiles} className="btn flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-bold flex-shrink-0 transition-all" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }} title="Download All">
            <IconArchive />
            <span className="hidden sm:inline">All ({contentCount})</span>
          </button>
        )}

        {/* Empty room (host only) */}
        {isHost && messages.length > 0 && (
          <button onClick={() => setShowConfirmEmpty(true)} className="btn flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-bold flex-shrink-0 transition-all" style={{ background: 'var(--bg-card)', border: '1px solid #ef4444', color: '#ef4444' }} title="Empty Room">
            <IconTrash2 />
            <span className="hidden sm:inline">Empty</span>
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1 min-w-[4px]" />

        {/* Browse public rooms */}
        <button onClick={() => setShowPublicRooms(!showPublicRooms)} className="btn p-2.5 rounded-xl flex-shrink-0 transition-all relative" style={{ background: showPublicRooms ? 'var(--accent-dim)' : 'var(--bg-card)', border: `1px solid ${showPublicRooms ? 'var(--border-accent)' : 'var(--border-subtle)'}`, color: showPublicRooms ? 'var(--accent)' : 'var(--text-muted)' }}>
          <IconGlobe />
          {publicRooms.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-black flex items-center justify-center" style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}>{publicRooms.length}</span>
          )}
        </button>
      </div>

      {/* PUBLIC ROOMS PANEL */}
      {showPublicRooms && (
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 fade-in" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Public Rooms</p>
            <button onClick={() => setShowPublicRooms(false)} className="p-1 rounded" style={{ color: 'var(--text-muted)' }}><IconX /></button>
          </div>
          {publicRooms.length === 0 ? (
            <p className="text-xs py-1" style={{ color: 'var(--text-muted)' }}>No public rooms available. Toggle yours public.</p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
              {publicRooms.map(room => (
                <button key={room.code} onClick={() => joinRoom(room.code)} className="btn flex-shrink-0 px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />
                  <span className="text-xs font-black code-display" style={{ color: 'var(--text-primary)' }}>{room.code}</span>
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>{room.peers}</span>
                  <IconArrowRight style={{ color: 'var(--text-muted)' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 grid-bg" style={{ WebkitOverflowScrolling: 'touch' }}>
        {isLoadingHistory && (
          <div className="flex items-center justify-center py-4 fade-in">
            <IconLoader size={16} style={{ color: 'var(--text-muted)' }} />
            <span className="ml-2 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Loading saved messages...</span>
          </div>
        )}

        {messages.length === 0 && Object.keys(downloadProgress).length === 0 && !isLoadingHistory ? (
          <div className="h-full flex flex-col items-center justify-center px-4">
            <div className="text-center max-w-xs space-y-6">
              <div className="float-anim" style={{ color: 'var(--text-primary)' }}>
                <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-accent)' }}>
                  <Logo size={40} />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-black mb-2 uppercase tracking-tight" style={{ color: 'var(--text-primary)' }}>The Void Awaits</h2>
                <p className="text-xs leading-relaxed font-medium" style={{ color: 'var(--text-muted)' }}>
                  Drop files and text into this room. Share via QR code or room code.
                </p>
              </div>
              <div className="p-5 rounded-2xl text-left" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-accent)' }}>
                <div className="text-center mb-4">
                  <p className="text-[9px] uppercase font-black mb-1 tracking-wider" style={{ color: 'var(--text-muted)' }}>Your Room</p>
                  <p className="text-3xl code-display" style={{ color: 'var(--accent)' }}>{currentRoom}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowQR(true)} className="btn flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all" style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}>
                    <IconQR size={14} /> Share QR
                  </button>
                  <button onClick={() => setShowScanner(true)} className="btn flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    <IconCamera size={14} /> Scan QR
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-3">
            {messages.map((msg, idx) => {
              if (msg.type === 'system') {
                return (
                  <div key={msg.id} className="card-enter text-center py-1.5" style={{ animationDelay: `${Math.min(idx * 20, 200)}ms` }}>
                    <span className="text-[10px] px-4 py-1.5 rounded-full font-bold uppercase tracking-wider" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>{msg.text}</span>
                  </div>
                );
              }
              if (msg.type === 'text') {
                return (
                  <div key={msg.id} className="card-enter message-bubble p-4 sm:p-5 group" style={{ animationDelay: `${Math.min(idx * 20, 200)}ms` }}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: msg.isMe ? 'var(--accent)' : 'var(--bg-card)', border: msg.isMe ? 'none' : '1px solid var(--border-subtle)' }}>
                        <IconText style={{ color: msg.isMe ? 'var(--bg-primary)' : 'var(--text-muted)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words font-medium" style={{ color: 'var(--text-primary)' }}>
                          <Linkify text={msg.text} />
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{msg.isMe ? 'You' : msg.sender || 'Remote'}</span>
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{fmtTime(msg.time)}</span>
                          {msg.encrypted && <IconShield size={10} style={{ color: 'var(--text-muted)' }} />}
                          {msg.persisted && <IconClock size={10} style={{ color: 'var(--text-muted)' }} />}
                        </div>
                      </div>
                      <button
                        onClick={() => copyMessageText(msg.id, msg.text)}
                        className="btn p-2 rounded-lg flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity sm:opacity-100"
                        style={{ color: 'var(--text-muted)' }}
                        title="Copy text"
                      >
                        {copiedMsgId === msg.id ? <IconCheck size={14} style={{ color: 'var(--accent)' }} /> : <IconCopy size={14} />}
                      </button>
                      {isHost && (
                        <button
                          onClick={() => setDeletingMsgId(msg.id)}
                          className="btn p-2 rounded-lg flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity sm:opacity-100"
                          style={{ color: '#ef4444' }}
                          title="Delete message"
                        >
                          <IconTrash size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              }
              if (msg.type === 'file') {
                return (
                  <div key={msg.id} className="card-enter message-bubble p-4 sm:p-5" style={{ animationDelay: `${Math.min(idx * 20, 200)}ms` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ background: msg.isMe ? 'var(--accent)' : 'var(--bg-card)', border: msg.isMe ? 'none' : '1px solid var(--border-subtle)' }}>
                        <IconFile style={{ color: msg.isMe ? 'var(--bg-primary)' : 'var(--text-secondary)' }} />
                        <span className="text-[7px] font-black mt-0.5" style={{ color: msg.isMe ? 'var(--bg-primary)' : 'var(--text-secondary)' }}>{ext(msg.fileName)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }} title={msg.fileName}>{msg.fileName}</p>
                        <p className="text-[10px] mt-0.5 font-semibold" style={{ color: 'var(--text-muted)' }}>{fmt(msg.fileSize)}</p>
                      </div>
                      {msg.url && (
                        <a href={msg.url} download={msg.fileName} className="btn p-3 rounded-xl flex-shrink-0 transition-all" style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}>
                          <IconDownload />
                        </a>
                      )}
                      {isHost && (
                        <button
                          onClick={() => setDeletingMsgId(msg.id)}
                          className="btn p-3 rounded-xl flex-shrink-0 transition-all"
                          style={{ background: 'var(--bg-card)', border: '1px solid #ef4444', color: '#ef4444' }}
                          title="Delete file"
                        >
                          <IconTrash />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{msg.isMe ? 'You' : msg.sender || 'Remote'}</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{fmtTime(msg.time)}</span>
                      {msg.persisted && <IconClock size={10} style={{ color: 'var(--text-muted)' }} />}
                    </div>
                  </div>
                );
              }
              return null;
            })}

            {Object.entries(downloadProgress).map(([fileId, pct]) => (
              <div key={`dl-${fileId}`} className="card-enter message-bubble p-4 sm:p-5">
                <div className="flex items-center gap-3 mb-3">
                  <IconLoader size={14} style={{ color: 'var(--accent)' }} />
                  <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>Receiving file...</span>
                  <span className="ml-auto text-xs font-black code-display" style={{ color: 'var(--accent)' }}>{pct}%</span>
                </div>
                <div className="w-full rounded-full h-1.5" style={{ background: 'var(--bg-card)' }}>
                  <div className="progress-bar h-1.5" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        )}
      </main>

      {/* INPUT */}
      <footer className="flex-shrink-0 px-4 sm:px-6 py-3 safe-bottom" style={{ borderTop: '2px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
        {/* Status indicators */}
        <div className="max-w-3xl mx-auto flex items-center gap-2 mb-2 flex-wrap">
          {isEncrypted && (
            <span className="encrypt-badge flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider" style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-accent)', color: 'var(--accent)' }}>
              <IconShield size={10} /> Encrypted
            </span>
          )}
          {holdDuration > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider" style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-accent)', color: 'var(--accent)' }}>
              <IconClock size={10} /> Held {holdDuration}h
            </span>
          )}
        </div>

        {isSending && uploadProgress > 0 && (
          <div className="max-w-3xl mx-auto mb-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Sending...</span>
              <span className="text-[10px] font-black code-display" style={{ color: 'var(--accent)' }}>{uploadProgress}%</span>
            </div>
            <div className="w-full rounded-full h-1.5" style={{ background: 'var(--bg-card)' }}><div className="progress-bar h-1.5" style={{ width: `${uploadProgress}%` }} /></div>
          </div>
        )}
        <form onSubmit={handleSendText} className="max-w-3xl mx-auto flex items-center gap-2 p-1.5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <label className={`btn p-3 rounded-xl cursor-pointer flex-shrink-0 ${!isConnected || isSending ? 'opacity-30 pointer-events-none' : ''}`} style={{ color: 'var(--text-muted)' }}>
            <input type="file" className="hidden" onChange={handleFileUpload} disabled={!isConnected || isSending} />
            <IconClip size={18} />
          </label>
          <input
            type="text" value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={isConnected ? "Drop into the void..." : "Waiting for peers..."}
            disabled={!isConnected}
            className="flex-1 bg-transparent border-none text-sm py-3 px-2 focus:outline-none disabled:opacity-40 min-w-0 font-medium"
            style={{ color: 'var(--text-primary)' }}
          />
          <button type="submit" disabled={!inputText.trim() || !isConnected} className="btn p-3 rounded-xl flex-shrink-0 disabled:opacity-20 transition-all" style={{ background: inputText.trim() && isConnected ? 'var(--accent)' : 'var(--bg-card)', color: inputText.trim() && isConnected ? 'var(--bg-primary)' : 'var(--text-muted)' }}>
            {isSending ? <IconLoader size={18} /> : <IconSend size={18} />}
          </button>
        </form>
        {!isConnected && (
          <p className="max-w-3xl mx-auto text-center mt-2">
            <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
              Share code <strong className="code-display" style={{ color: 'var(--accent)' }}>{currentRoom}</strong> or scan QR to connect
            </span>
          </p>
        )}
        {/* Credit */}
        <p className="text-center mt-2">
          <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>by alchemist4real</span>
        </p>
      </footer>

      {/* MODALS */}
      {showQR && <QRDisplayModal roomCode={currentRoom} onClose={() => setShowQR(false)} />}
      {showScanner && <QRScannerModal onScan={handleQRScan} onClose={() => setShowScanner(false)} />}
      {showEncryptionModal && <EncryptionModal onSubmit={handleEnableEncryption} onClose={() => setShowEncryptionModal(false)} isJoining={false} />}
      {showHoldModal && <HoldRoomModal onSubmit={handleHoldRoom} onClose={() => setShowHoldModal(false)} />}
      {showPasswordGate && <PasswordGateModal onSubmit={handlePasswordGateSubmit} onCancel={handlePasswordGateCancel} />}
      {showConfirmEmpty && <ConfirmModal title="Empty Room" message="This will permanently delete all messages and files in this room. This action cannot be undone." confirmLabel="Empty Room" danger onConfirm={emptyRoom} onClose={() => setShowConfirmEmpty(false)} />}
      {deletingMsgId && <ConfirmModal title="Delete Message" message="Are you sure you want to delete this message?" confirmLabel="Delete" danger onConfirm={() => deleteMessage(deletingMsgId)} onClose={() => setDeletingMsgId(null)} />}
    </div>
  );
}
