import React, { useState, useEffect, useRef, useCallback } from 'react';
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
const BASE_URL = window.location.origin + window.location.pathname;

// ─── Icons ──────────────────────────────────────────────────
const Icon = ({ d, size = 18, ...p }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>{d}</svg>
);
const IconSend = (p) => <Icon {...p} d={<><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>} />;
const IconClip = (p) => <Icon {...p} d={<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>} />;
const IconFile = (p) => <Icon {...p} size={20} d={<><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></>} />;
const IconDownload = (p) => <Icon {...p} d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></>} />;
const IconCopy = (p) => <Icon {...p} size={14} d={<><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></>} />;
const IconCheck = (p) => <Icon {...p} size={14} d={<path d="M20 6 9 17l-5-5"/>} />;
const IconGlobe = (p) => <Icon {...p} size={14} d={<><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></>} />;
const IconLock = (p) => <Icon {...p} size={14} d={<><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>} />;
const IconUsers = (p) => <Icon {...p} size={14} d={<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>} />;
const IconLoader = (p) => <Icon {...p} className="animate-spin" d={<path d="M21 12a9 9 0 1 1-6.219-8.56"/>} />;
const IconX = (p) => <Icon {...p} size={16} d={<><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>} />;
const IconText = (p) => <Icon {...p} size={14} d={<><path d="M17 6.1H3"/><path d="M21 12.1H3"/><path d="M15.1 18H3"/></>} />;
const IconArrowRight = (p) => <Icon {...p} size={13} d={<><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>} />;
const IconQR = (p) => <Icon {...p} size={16} d={<><rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><path d="M14 14h2v2h-2z"/><path d="M20 14h2v2h-2z"/><path d="M14 20h2v2h-2z"/><path d="M20 20h2v2h-2z"/><path d="M17 17h2v2h-2z"/></>} />;
const IconCamera = (p) => <Icon {...p} size={16} d={<><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></>} />;

// ─── QR Scanner Modal ───────────────────────────────────────
function QRScannerModal({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const containerRef = useRef(null);

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
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content p-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Scan QR Code</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
            <IconX />
          </button>
        </div>
        <div id="qr-reader-container" ref={containerRef} style={{ borderRadius: '12px', overflow: 'hidden' }} />
        <p className="text-[10px] text-center mt-3" style={{ color: 'var(--text-muted)' }}>
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
      width: 280,
      margin: 2,
      color: { dark: '#a855f7', light: '#0a0a0f' },
      errorCorrectionLevel: 'M'
    }).then(setQrDataUrl).catch(console.error);
  }, [roomUrl]);

  const copyUrl = () => {
    navigator.clipboard.writeText(roomUrl);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Share Room</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
            <IconX />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          {qrDataUrl ? (
            <div className="p-3 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-accent)' }}>
              <img src={qrDataUrl} alt="Room QR Code" className="block" style={{ width: '240px', height: '240px', borderRadius: '12px' }} />
            </div>
          ) : (
            <div className="w-[240px] h-[240px] rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-card)' }}>
              <IconLoader size={24} style={{ color: 'var(--accent)' }} />
            </div>
          )}

          <div className="text-center">
            <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--text-muted)' }}>Room Code</p>
            <p className="text-2xl code-display" style={{ color: 'var(--accent)' }}>{roomCode}</p>
          </div>

          <button
            onClick={copyUrl}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-accent)', color: 'var(--accent)' }}
          >
            <IconCopy size={14} />
            Copy Link
          </button>

          <p className="text-[10px] text-center break-all px-2" style={{ color: 'var(--text-muted)' }}>
            {roomUrl}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────
export default function App() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [peerCount, setPeerCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [myCode, setMyCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState({});
  const [isPublic, setIsPublic] = useState(false);
  const [publicRooms, setPublicRooms] = useState([]);
  const [showPublicRooms, setShowPublicRooms] = useState(false);
  const [currentRoom, setCurrentRoom] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const channelRef = useRef(null);
  const lobbyRef = useRef(null);
  const scrollRef = useRef(null);
  const fileChunksRef = useRef({});
  const heartbeatRef = useRef(null);
  const myCodeRef = useRef('');
  const hasAutoJoined = useRef(false);

  // ─── Check URL for ?room= param ──────────────────────────
  const getUrlRoomCode = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room')?.trim().toUpperCase() || null;
  }, []);

  // ─── Lobby ────────────────────────────────────────────────
  useEffect(() => {
    const lobby = supabase.channel('beenhollow_lobby', {
      config: { broadcast: { ack: false } }
    });
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

  // ─── Init room code ───────────────────────────────────────
  useEffect(() => {
    const urlRoom = getUrlRoomCode();
    const code = genCode();
    setMyCode(code);
    myCodeRef.current = code;
    if (urlRoom) {
      setCurrentRoom(urlRoom);
      hasAutoJoined.current = true;
    } else {
      setCurrentRoom(code);
    }
  }, [getUrlRoomCode]);

  // ─── Heartbeat ────────────────────────────────────────────
  useEffect(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (isPublic && currentRoom) {
      const announce = () => {
        lobbyRef.current?.send({
          type: 'broadcast', event: 'room_announce',
          payload: { code: currentRoom, peers: peerCount + 1 }
        });
      };
      announce();
      heartbeatRef.current = setInterval(announce, 10000);
    }
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, [isPublic, peerCount, currentRoom]);

  // ─── Channel setup ────────────────────────────────────────
  const setupChannel = useCallback((code, isHost) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase.channel(`room_${code}`, {
      config: { broadcast: { ack: false }, presence: { key: myCodeRef.current || code } }
    });
    channelRef.current = channel;
    setCurrentRoom(code);

    channel.on('broadcast', { event: 'message' }, ({ payload }) => {
      setMessages(prev => [...prev, {
        id: `${Date.now()}-${Math.random()}`, type: 'text', text: payload.text,
        isMe: false, sender: payload.sender || 'anon', time: new Date()
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
      if (key !== myCodeRef.current) setMessages(prev => [...prev, { id: `sys-${Date.now()}`, type: 'system', text: 'A device joined', time: new Date() }]);
    });
    channel.on('presence', { event: 'leave' }, ({ key }) => {
      if (key !== myCodeRef.current) setMessages(prev => [...prev, { id: `sys-${Date.now()}`, type: 'system', text: 'A device left', time: new Date() }]);
    });
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await channel.track({ online_at: new Date().toISOString() });
    });
  }, []);

  // Auto-connect
  useEffect(() => {
    if (currentRoom) {
      setupChannel(currentRoom, !hasAutoJoined.current);
    }
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [currentRoom, setupChannel]);

  // ─── Join ─────────────────────────────────────────────────
  const joinRoom = useCallback((codeOverride) => {
    const code = (codeOverride || joinCode).trim().toUpperCase();
    if (!code) return;
    setMessages([]);
    if (isPublic) {
      lobbyRef.current?.send({ type: 'broadcast', event: 'room_close', payload: { code: currentRoom } });
      setIsPublic(false);
    }
    // Update URL without reload
    window.history.replaceState({}, '', `${window.location.pathname}?room=${code}`);
    setupChannel(code, false);
    setJoinCode('');
    setShowPublicRooms(false);
    setShowScanner(false);
  }, [joinCode, setupChannel, isPublic, currentRoom]);

  // ─── QR scan handler ──────────────────────────────────────
  const handleQRScan = useCallback((text) => {
    try {
      const url = new URL(text);
      const code = url.searchParams.get('room');
      if (code) {
        joinRoom(code);
      }
    } catch {
      // Maybe it's just a room code directly
      if (/^[A-Z0-9]{4,6}$/.test(text.trim().toUpperCase())) {
        joinRoom(text.trim().toUpperCase());
      }
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

  // Auto-scroll
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, downloadProgress]);

  // ─── Send text ────────────────────────────────────────────
  const handleSendText = useCallback((e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || !channelRef.current) return;
    setMessages(prev => [...prev, { id: `${Date.now()}`, type: 'text', text, isMe: true, time: new Date() }]);
    channelRef.current.send({ type: 'broadcast', event: 'message', payload: { text, sender: myCodeRef.current } });
    setInputText('');
  }, [inputText]);

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
    } catch (err) { console.error('File send error:', err); }
    finally { setIsSending(false); setUploadProgress(0); e.target.value = null; }
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

  // ─── RENDER ───────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg-primary)' }}>

      {/* ━━━ HEADER ━━━ */}
      <header className="flex-shrink-0 px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{ background: 'var(--accent-dim)' }}>🌌</div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>BEENHOLLOW</h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Scan QR */}
          <button onClick={() => setShowScanner(true)} className="p-2 rounded-lg transition-colors" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }} title="Scan QR">
            <IconCamera />
          </button>
          {/* Public rooms */}
          <button onClick={() => setShowPublicRooms(!showPublicRooms)} className="p-2 rounded-lg transition-colors relative" style={{ background: showPublicRooms ? 'var(--accent-dim)' : 'var(--bg-card)', border: `1px solid ${showPublicRooms ? 'var(--border-accent)' : 'var(--border-subtle)'}`, color: showPublicRooms ? 'var(--accent)' : 'var(--text-muted)' }}>
            <IconGlobe />
            {publicRooms.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center" style={{ background: 'var(--green)', color: '#fff' }}>{publicRooms.length}</span>
            )}
          </button>
          {/* Peer count */}
          <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <span className="relative flex h-1.5 w-1.5">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'animate-ping' : ''}`} style={{ background: isConnected ? 'var(--green)' : '#f59e0b' }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: isConnected ? 'var(--green)' : '#f59e0b' }} />
            </span>
            <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{peerCount}</span>
          </div>
        </div>
      </header>

      {/* ━━━ PUBLIC ROOMS PANEL ━━━ */}
      {showPublicRooms && (
        <div className="flex-shrink-0 px-3 sm:px-5 py-2.5 fade-in" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Public Rooms</p>
            <button onClick={() => setShowPublicRooms(false)} className="p-1 rounded" style={{ color: 'var(--text-muted)' }}><IconX /></button>
          </div>
          {publicRooms.length === 0 ? (
            <p className="text-[11px] py-1" style={{ color: 'var(--text-muted)' }}>No public rooms. Toggle yours public!</p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {publicRooms.map(room => (
                <button key={room.code} onClick={() => joinRoom(room.code)} className="flex-shrink-0 glass-card px-3 py-2 rounded-lg flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--green)' }} />
                  <span className="text-[11px] font-bold code-display" style={{ color: 'var(--text-primary)' }}>{room.code}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{room.peers}</span>
                  <IconArrowRight style={{ color: 'var(--text-muted)' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ━━━ ROOM BAR ━━━ */}
      <div className="flex-shrink-0 px-3 sm:px-5 py-2 flex items-center gap-1.5 overflow-x-auto" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
        {/* Room code */}
        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg flex-shrink-0" style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-accent)' }}>
          <span className="text-[9px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Room</span>
          <span className="code-display text-xs" style={{ color: 'var(--accent)' }}>{currentRoom}</span>
          <button onClick={copyCode} className="p-0.5 rounded" style={{ color: 'var(--text-muted)' }}>
            {copied ? <IconCheck style={{ color: 'var(--green)' }} /> : <IconCopy />}
          </button>
        </div>

        {/* Show QR */}
        <button onClick={() => setShowQR(true)} className="p-2 rounded-lg flex-shrink-0 transition-colors" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }} title="Show QR Code">
          <IconQR />
        </button>

        {/* Public toggle */}
        <button onClick={togglePublic} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex-shrink-0 transition-colors" style={{ background: isPublic ? 'var(--green-dim)' : 'var(--bg-card)', border: `1px solid ${isPublic ? 'rgba(34,197,94,0.3)' : 'var(--border-subtle)'}`, color: isPublic ? 'var(--green)' : 'var(--text-muted)' }}>
          {isPublic ? <IconGlobe /> : <IconLock />}
          <span className="hidden sm:inline">{isPublic ? 'Public' : 'Private'}</span>
        </button>

        {/* Spacer */}
        <div className="flex-1 min-w-[8px]" />

        {/* Join input */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <input
            type="text" value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && joinRoom()}
            placeholder="CODE" maxLength={5}
            className="w-[72px] px-2 py-1.5 rounded-lg text-[11px] font-bold text-center code-display input-ring"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          />
          <button onClick={() => joinRoom()} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors" style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-accent)', color: 'var(--accent)' }}>
            Join
          </button>
        </div>
      </div>

      {/* ━━━ MAIN CONTENT ━━━ */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-5 grid-bg">
        {messages.length === 0 && Object.keys(downloadProgress).length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center px-4">
            <div className="text-center max-w-xs space-y-5">
              <div className="float-anim">
                <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-2xl glass-card" style={{ borderColor: 'var(--border-accent)' }}>🌌</div>
              </div>
              <div>
                <h2 className="text-lg font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Welcome to the Void</h2>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Drop files & text into this room. Share via QR code or room code.
                </p>
              </div>
              <div className="glass-card p-4 text-left" style={{ borderColor: 'var(--border-accent)' }}>
                <div className="text-center mb-3">
                  <p className="text-[9px] uppercase font-bold mb-1" style={{ color: 'var(--text-muted)' }}>Your Room</p>
                  <p className="text-2xl code-display" style={{ color: 'var(--accent)' }}>{currentRoom}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowQR(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-colors" style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-accent)', color: 'var(--accent)' }}>
                    <IconQR /> Share QR
                  </button>
                  <button onClick={() => setShowScanner(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-colors" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    <IconCamera /> Scan QR
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
                  <div key={msg.id} className="card-enter text-center py-1" style={{ animationDelay: `${Math.min(idx * 20, 200)}ms` }}>
                    <span className="text-[10px] px-3 py-1 rounded-full font-medium" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>{msg.text}</span>
                  </div>
                );
              }
              if (msg.type === 'text') {
                return (
                  <div key={msg.id} className="card-enter glass-card glow-card p-3 sm:p-4" style={{ animationDelay: `${Math.min(idx * 20, 200)}ms` }}>
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: msg.isMe ? 'var(--accent-dim)' : 'var(--bg-card)', border: `1px solid ${msg.isMe ? 'var(--border-accent)' : 'var(--border-subtle)'}` }}>
                        <IconText style={{ color: msg.isMe ? 'var(--accent)' : 'var(--text-muted)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words" style={{ color: 'var(--text-primary)' }}>{msg.text}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{msg.isMe ? 'You' : msg.sender || 'Remote'}</span>
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>·</span>
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{fmtTime(msg.time)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              if (msg.type === 'file') {
                return (
                  <div key={msg.id} className="card-enter glass-card glow-card p-3 sm:p-4" style={{ animationDelay: `${Math.min(idx * 20, 200)}ms` }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ background: msg.isMe ? 'var(--accent-dim)' : 'rgba(59,130,246,0.1)', border: `1px solid ${msg.isMe ? 'var(--border-accent)' : 'rgba(59,130,246,0.2)'}` }}>
                        <IconFile style={{ color: msg.isMe ? 'var(--accent)' : '#3b82f6' }} />
                        <span className="text-[7px] font-bold mt-0.5" style={{ color: msg.isMe ? 'var(--accent)' : '#3b82f6' }}>{ext(msg.fileName)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }} title={msg.fileName}>{msg.fileName}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{fmt(msg.fileSize)}</p>
                      </div>
                      <a href={msg.url} download={msg.fileName} className="p-2 rounded-xl flex-shrink-0 transition-colors" style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-accent)', color: 'var(--accent)' }}>
                        <IconDownload />
                      </a>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2.5 pt-2.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{msg.isMe ? 'You' : msg.sender || 'Remote'}</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>·</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{fmtTime(msg.time)}</span>
                    </div>
                  </div>
                );
              }
              return null;
            })}

            {Object.entries(downloadProgress).map(([fileId, pct]) => (
              <div key={`dl-${fileId}`} className="card-enter glass-card p-3 sm:p-4">
                <div className="flex items-center gap-2.5 mb-2">
                  <IconLoader size={14} style={{ color: 'var(--accent)' }} />
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Receiving…</span>
                  <span className="ml-auto text-[11px] font-bold code-display" style={{ color: 'var(--accent)' }}>{pct}%</span>
                </div>
                <div className="w-full rounded-full h-1" style={{ background: 'var(--bg-card)' }}>
                  <div className="progress-bar h-1" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        )}
      </main>

      {/* ━━━ INPUT ━━━ */}
      <footer className="flex-shrink-0 px-3 sm:px-5 py-2.5 safe-bottom" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
        {isSending && uploadProgress > 0 && (
          <div className="max-w-3xl mx-auto mb-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Sending…</span>
              <span className="text-[10px] font-bold code-display" style={{ color: 'var(--accent)' }}>{uploadProgress}%</span>
            </div>
            <div className="w-full rounded-full h-1" style={{ background: 'var(--bg-card)' }}><div className="progress-bar h-1" style={{ width: `${uploadProgress}%` }} /></div>
          </div>
        )}
        <form onSubmit={handleSendText} className="max-w-3xl mx-auto flex items-center gap-1.5 p-1 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <label className={`p-2 rounded-lg cursor-pointer flex-shrink-0 ${!isConnected || isSending ? 'opacity-30 pointer-events-none' : ''}`} style={{ color: 'var(--text-muted)' }}>
            <input type="file" className="hidden" onChange={handleFileUpload} disabled={!isConnected || isSending} />
            <IconClip size={18} />
          </label>
          <input
            type="text" value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={isConnected ? "Drop into the void…" : "Waiting for peers…"}
            disabled={!isConnected}
            className="flex-1 bg-transparent border-none text-[13px] py-2 px-1 focus:outline-none disabled:opacity-40 min-w-0"
            style={{ color: 'var(--text-primary)' }}
          />
          <button type="submit" disabled={!inputText.trim() || !isConnected} className="p-2 rounded-lg flex-shrink-0 disabled:opacity-20 transition-colors" style={{ background: inputText.trim() && isConnected ? 'var(--accent)' : 'var(--bg-card)', color: inputText.trim() && isConnected ? '#fff' : 'var(--text-muted)' }}>
            {isSending ? <IconLoader size={18} /> : <IconSend size={18} />}
          </button>
        </form>
        {!isConnected && (
          <p className="max-w-3xl mx-auto text-center mt-1.5">
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
              Share code <strong className="code-display" style={{ color: 'var(--accent)' }}>{currentRoom}</strong> or scan QR to connect
            </span>
          </p>
        )}
      </footer>

      {/* ━━━ MODALS ━━━ */}
      {showQR && <QRDisplayModal roomCode={currentRoom} onClose={() => setShowQR(false)} />}
      {showScanner && <QRScannerModal onScan={handleQRScan} onClose={() => setShowScanner(false)} />}
    </div>
  );
}
