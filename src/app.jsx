import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = 'https://kklvtfuvxudckuxkoysc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbHZ0ZnV2eHVkY2t1eGtveXNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0Mjc1NzEsImV4cCI6MjA5MDAwMzU3MX0.SsBoGWSP81U6A_VR4XwsA8WafXjfO_opxeUHKFPtYvM';
const supabase = createClient(supabaseUrl, supabaseKey);

// Generate a short room code
function genCode(len = 5) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const CHUNK_SIZE = 50000; // 50KB per chunk

// ─── Icons (inline SVGs) ───────────────────────────────────
const IconSend = ({ size = 20, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
);
const IconClip = ({ size = 20, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
);
const IconFile = ({ size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
);
const IconDownload = ({ size = 20, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
);
const IconCopy = ({ size = 16, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
);
const IconCheck = ({ size = 16, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M20 6 9 17l-5-5"/></svg>
);
const IconGlobe = ({ size = 16, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
);
const IconLock = ({ size = 16, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
);
const IconUsers = ({ size = 16, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const IconLoader = ({ size = 16, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin" {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
const IconX = ({ size = 16, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);
const IconText = ({ size = 20, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M17 6.1H3"/><path d="M21 12.1H3"/><path d="M15.1 18H3"/></svg>
);
const IconArrowRight = ({ size = 16, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);

// ─── PUBLIC ROOM LOBBY ─────────────────────────────────────
// Uses a dedicated Supabase Realtime channel "lobby" where hosts
// broadcast their room info. No database table required.

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
  const [view, setView] = useState('lobby'); // 'lobby' | 'room'

  const channelRef = useRef(null);
  const lobbyRef = useRef(null);
  const scrollRef = useRef(null);
  const fileChunksRef = useRef({});
  const heartbeatRef = useRef(null);
  const myCodeRef = useRef('');

  // ─── Lobby channel for public rooms ───────────────────────
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

    return () => {
      supabase.removeChannel(lobby);
    };
  }, []);

  // Clean up stale public rooms every 15s
  useEffect(() => {
    const timer = setInterval(() => {
      setPublicRooms(prev => prev.filter(r => Date.now() - r.lastSeen < 30000));
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // ─── Generate room code on mount ──────────────────────────
  useEffect(() => {
    const code = genCode();
    setMyCode(code);
    myCodeRef.current = code;
    setCurrentRoom(code);
  }, []);

  // ─── Heartbeat for public rooms ───────────────────────────
  useEffect(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    
    if (isPublic && myCode) {
      const announce = () => {
        lobbyRef.current?.send({
          type: 'broadcast',
          event: 'room_announce',
          payload: { code: currentRoom, peers: peerCount + 1, name: `Room ${currentRoom}` }
        });
      };
      announce();
      heartbeatRef.current = setInterval(announce, 10000);
    }

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [isPublic, myCode, peerCount, currentRoom]);

  // ─── Room channel setup ───────────────────────────────────
  const setupChannel = useCallback((code, isHost) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const roomName = `room_${code}`;
    const channel = supabase.channel(roomName, {
      config: {
        broadcast: { ack: false },
        presence: { key: myCodeRef.current || code }
      }
    });

    channelRef.current = channel;
    setCurrentRoom(code);

    // Handle incoming text messages
    channel.on('broadcast', { event: 'message' }, ({ payload }) => {
      setMessages(prev => [...prev, {
        id: `${Date.now()}-${Math.random()}`,
        type: 'text',
        text: payload.text,
        isMe: false,
        sender: payload.sender || 'anonymous',
        time: new Date()
      }]);
    });

    // Handle incoming file chunks
    channel.on('broadcast', { event: 'file_chunk' }, ({ payload }) => {
      const { fileId, fileName, fileMime, fileSize, totalChunks, chunkIndex, chunkData } = payload;
      
      if (!fileChunksRef.current[fileId]) {
        fileChunksRef.current[fileId] = {
          chunks: new Array(totalChunks),
          receivedCount: 0,
          fileName, fileMime, fileSize
        };
      }
      
      const fileData = fileChunksRef.current[fileId];
      if (!fileData.chunks[chunkIndex]) {
        fileData.chunks[chunkIndex] = chunkData;
        fileData.receivedCount++;
        
        setDownloadProgress(prev => ({
          ...prev,
          [fileId]: Math.floor((fileData.receivedCount / totalChunks) * 100)
        }));
        
        if (fileData.receivedCount === totalChunks) {
          const fullBase64 = fileData.chunks.join('');
          try {
            const byteString = atob(fullBase64);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: fileMime });
            const url = URL.createObjectURL(blob);
            
            setMessages(prev => [...prev, {
              id: fileId,
              type: 'file',
              fileName, fileSize, url,
              isMe: false,
              sender: payload.sender || 'anonymous',
              time: new Date()
            }]);
            
            delete fileChunksRef.current[fileId];
            setDownloadProgress(prev => {
              const np = { ...prev };
              delete np[fileId];
              return np;
            });
          } catch (e) {
            console.error("Error reassembling file", e);
          }
        }
      }
    });

    // Presence
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const count = Object.keys(state).length;
      const peers = Math.max(0, count - 1);
      setPeerCount(peers);
      setIsConnected(count > 1);
    });

    channel.on('presence', { event: 'join' }, ({ key }) => {
      if (key !== myCodeRef.current) {
        setMessages(prev => [...prev, {
          id: `sys-${Date.now()}`,
          type: 'system',
          text: 'A device joined the room',
          time: new Date()
        }]);
      }
    });

    channel.on('presence', { event: 'leave' }, ({ key }) => {
      if (key !== myCodeRef.current) {
        setMessages(prev => [...prev, {
          id: `sys-${Date.now()}`,
          type: 'system',
          text: 'A device left the room',
          time: new Date()
        }]);
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ online_at: new Date().toISOString() });
      }
    });

    setView('room');
  }, []);

  // Auto-connect to own room on code generation
  useEffect(() => {
    if (myCode) {
      setupChannel(myCode, true);
    }
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [myCode]);

  // ─── Join a room ──────────────────────────────────────────
  const connectToCode = useCallback((codeOverride) => {
    const code = (codeOverride || joinCode).trim().toUpperCase();
    if (!code) return;
    setMessages([]);
    // close public announcement if switching rooms
    if (isPublic) {
      lobbyRef.current?.send({ type: 'broadcast', event: 'room_close', payload: { code: currentRoom } });
      setIsPublic(false);
    }
    setupChannel(code, false);
    setJoinCode('');
    setShowPublicRooms(false);
  }, [joinCode, setupChannel, isPublic, currentRoom]);

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
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, downloadProgress]);

  // ─── Send text ────────────────────────────────────────────
  const handleSendText = useCallback((e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || !channelRef.current) return;

    setMessages(prev => [...prev, {
      id: `${Date.now()}`,
      type: 'text',
      text,
      isMe: true,
      time: new Date()
    }]);

    channelRef.current.send({
      type: 'broadcast',
      event: 'message',
      payload: { text, sender: myCodeRef.current }
    });
    
    setInputText('');
  }, [inputText]);

  // ─── Send file ────────────────────────────────────────────
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || !channelRef.current) return;

    setIsSending(true);
    setUploadProgress(0);
    try {
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const blob = new Blob([file], { type: file.type });
      const url = URL.createObjectURL(blob);
      const fileId = `${Date.now()}-${Math.random()}`;

      setMessages(prev => [...prev, {
        id: fileId,
        type: 'file',
        fileName: file.name,
        fileSize: file.size,
        url,
        isMe: true,
        time: new Date()
      }]);

      const totalChunks = Math.ceil(base64.length / CHUNK_SIZE);
      for (let i = 0; i < totalChunks; i++) {
        const chunkData = base64.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        await channelRef.current.send({
          type: 'broadcast',
          event: 'file_chunk',
          payload: {
            fileId, fileName: file.name, fileMime: file.type,
            fileSize: file.size, totalChunks, chunkIndex: i, chunkData,
            sender: myCodeRef.current
          }
        });
        setUploadProgress(Math.floor(((i + 1) / totalChunks) * 100));
        await new Promise(r => setTimeout(r, 20));
      }
    } catch (err) {
      console.error('File send error:', err);
    } finally {
      setIsSending(false);
      setUploadProgress(0);
      e.target.value = null;
    }
  }, []);

  // ─── Utils ────────────────────────────────────────────────
  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(currentRoom);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [currentRoom]);

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const formatTime = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const getFileExt = (name) => {
    const ext = name.split('.').pop()?.toUpperCase() || '?';
    return ext.length > 5 ? ext.slice(0, 4) : ext;
  };

  // ─── RENDER ───────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg-primary)' }}>

      {/* ━━━ HEADER ━━━ */}
      <header className="flex-shrink-0 px-4 sm:px-6 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: 'var(--accent-dim)' }}>
            🌌
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>BEENHOLLOW</h1>
            <p className="text-[10px] font-medium tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>
              Realtime Transfer
            </p>
          </div>
        </div>

        {/* Room code + status */}
        <div className="flex items-center gap-2">
          {/* Public rooms toggle */}
          <button
            onClick={() => setShowPublicRooms(!showPublicRooms)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
            style={{
              background: showPublicRooms ? 'var(--accent-dim)' : 'var(--bg-card)',
              border: `1px solid ${showPublicRooms ? 'var(--border-accent)' : 'var(--border-subtle)'}`,
              color: showPublicRooms ? 'var(--accent)' : 'var(--text-secondary)'
            }}
          >
            <IconGlobe size={13} />
            <span className="hidden sm:inline">Public</span>
            {publicRooms.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'var(--green-dim)', color: 'var(--green)' }}>
                {publicRooms.length}
              </span>
            )}
          </button>

          {/* Peer count */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'animate-ping' : ''}`}
                style={{ background: isConnected ? 'var(--green)' : '#f59e0b' }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: isConnected ? 'var(--green)' : '#f59e0b' }} />
            </span>
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {peerCount}
            </span>
            <IconUsers size={13} style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>
      </header>

      {/* ━━━ PUBLIC ROOMS PANEL ━━━ */}
      {showPublicRooms && (
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 fade-in" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              <IconGlobe size={12} className="inline mr-1.5" style={{ verticalAlign: '-1px' }} />
              Public Rooms
            </p>
            <button onClick={() => setShowPublicRooms(false)} className="p-1 rounded" style={{ color: 'var(--text-muted)' }}>
              <IconX size={14} />
            </button>
          </div>
          {publicRooms.length === 0 ? (
            <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>
              No public rooms available right now. Make yours public to be the first!
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {publicRooms.map(room => (
                <button
                  key={room.code}
                  onClick={() => connectToCode(room.code)}
                  className="flex-shrink-0 glass-card px-3 py-2 rounded-lg flex items-center gap-2 cursor-pointer"
                  style={{ minWidth: '140px' }}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--green)' }} />
                  <div className="text-left">
                    <p className="text-xs font-bold code-display" style={{ color: 'var(--text-primary)' }}>{room.code}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{room.peers} online</p>
                  </div>
                  <IconArrowRight size={12} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ━━━ ROOM BAR ━━━ */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-2" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
        {/* Current room code */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-accent)' }}>
          <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Room</span>
          <span className="code-display text-sm" style={{ color: 'var(--accent)' }}>{currentRoom}</span>
          <button onClick={copyCode} className="ml-0.5 p-0.5 rounded transition-colors" style={{ color: 'var(--text-muted)' }}>
            {copied ? <IconCheck size={13} style={{ color: 'var(--green)' }} /> : <IconCopy size={13} />}
          </button>
        </div>

        {/* Public toggle */}
        <button
          onClick={togglePublic}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
          style={{
            background: isPublic ? 'var(--green-dim)' : 'var(--bg-card)',
            border: `1px solid ${isPublic ? 'rgba(34,197,94,0.3)' : 'var(--border-subtle)'}`,
            color: isPublic ? 'var(--green)' : 'var(--text-muted)'
          }}
        >
          {isPublic ? <IconGlobe size={13} /> : <IconLock size={13} />}
          {isPublic ? 'Public' : 'Private'}
        </button>

        {/* Join input */}
        <div className="flex items-center gap-1.5 ml-auto">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && connectToCode()}
            placeholder="CODE"
            maxLength={5}
            className="w-20 px-2 py-1.5 rounded-lg text-xs font-bold text-center code-display input-ring"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            onClick={() => connectToCode()}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200"
            style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-accent)', color: 'var(--accent)' }}
          >
            Join
          </button>
        </div>
      </div>

      {/* ━━━ MAIN CONTENT: FLOATING CARDS ━━━ */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 grid-bg">
        {messages.length === 0 && Object.keys(downloadProgress).length === 0 ? (
          /* ── Empty state ── */
          <div className="h-full flex flex-col items-center justify-center px-4">
            <div className="text-center max-w-sm space-y-6">
              <div className="float-anim">
                <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center text-3xl glass-card" style={{ borderColor: 'var(--border-accent)' }}>
                  🌌
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Welcome to the Void</h2>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Drop files &amp; text into this room. Everything appears as floating cards — not a chat, a shared space.
                </p>
              </div>

              <div className="glass-card p-5 text-left space-y-4" style={{ borderColor: 'var(--border-accent)' }}>
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold mb-2" style={{ color: 'var(--text-muted)' }}>Your Room Code</p>
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-3xl code-display" style={{ color: 'var(--accent)' }}>{currentRoom}</p>
                    <button onClick={copyCode} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
                      {copied ? <IconCheck size={18} style={{ color: 'var(--green)' }} /> : <IconCopy size={18} />}
                    </button>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border-subtle)' }} className="pt-4">
                  <ol className="text-xs space-y-2" style={{ color: 'var(--text-secondary)' }}>
                    <li className="flex gap-2"><span style={{ color: 'var(--accent)' }} className="font-bold">1.</span>Open on another device</li>
                    <li className="flex gap-2"><span style={{ color: 'var(--accent)' }} className="font-bold">2.</span>Enter this code to join</li>
                    <li className="flex gap-2"><span style={{ color: 'var(--accent)' }} className="font-bold">3.</span>Send files &amp; text instantly</li>
                  </ol>
                </div>
              </div>

              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                Or toggle <strong style={{ color: 'var(--green)' }}>Public</strong> so anyone can discover your room
              </p>
            </div>
          </div>
        ) : (
          /* ── Card grid ── */
          <div className="max-w-5xl mx-auto columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {messages.map((msg, idx) => {
              if (msg.type === 'system') {
                return (
                  <div key={msg.id} className="card-enter text-center py-2 break-inside-avoid" style={{ animationDelay: `${idx * 30}ms` }}>
                    <span className="text-[10px] px-3 py-1 rounded-full font-medium" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                      {msg.text}
                    </span>
                  </div>
                );
              }

              if (msg.type === 'text') {
                return (
                  <div key={msg.id} className="card-enter glass-card glow-card p-4 break-inside-avoid" style={{ animationDelay: `${idx * 30}ms` }}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: msg.isMe ? 'var(--accent-dim)' : 'var(--bg-card)', border: `1px solid ${msg.isMe ? 'var(--border-accent)' : 'var(--border-subtle)'}` }}>
                        <IconText size={14} style={{ color: msg.isMe ? 'var(--accent)' : 'var(--text-muted)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: 'var(--text-primary)' }}>
                          {msg.text}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                            {msg.isMe ? 'You' : (msg.sender || 'Remote')}
                          </span>
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>·</span>
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatTime(msg.time)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              if (msg.type === 'file') {
                return (
                  <div key={msg.id} className="card-enter glass-card glow-card p-4 break-inside-avoid" style={{ animationDelay: `${idx * 30}ms` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ background: msg.isMe ? 'var(--accent-dim)' : 'rgba(59,130,246,0.1)', border: `1px solid ${msg.isMe ? 'var(--border-accent)' : 'rgba(59,130,246,0.2)'}` }}>
                        <IconFile size={18} style={{ color: msg.isMe ? 'var(--accent)' : '#3b82f6' }} />
                        <span className="text-[8px] font-bold mt-0.5" style={{ color: msg.isMe ? 'var(--accent)' : '#3b82f6' }}>{getFileExt(msg.fileName)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }} title={msg.fileName}>
                          {msg.fileName}
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {formatSize(msg.fileSize)}
                        </p>
                      </div>
                      <a
                        href={msg.url}
                        download={msg.fileName}
                        className="p-2.5 rounded-xl transition-all duration-200 flex-shrink-0"
                        style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-accent)', color: 'var(--accent)' }}
                        title="Download"
                      >
                        <IconDownload size={18} />
                      </a>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                        {msg.isMe ? 'You' : (msg.sender || 'Remote')}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>·</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatTime(msg.time)}</span>
                    </div>
                  </div>
                );
              }
              return null;
            })}

            {/* Download progress cards */}
            {Object.entries(downloadProgress).map(([fileId, pct]) => (
              <div key={`dl-${fileId}`} className="card-enter glass-card p-4 break-inside-avoid">
                <div className="flex items-center gap-3 mb-3">
                  <IconLoader size={16} style={{ color: 'var(--accent)' }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Receiving file…</span>
                  <span className="ml-auto text-xs font-bold code-display" style={{ color: 'var(--accent)' }}>{pct}%</span>
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

      {/* ━━━ INPUT AREA ━━━ */}
      <footer className="flex-shrink-0 px-4 sm:px-6 py-3" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
        {/* Upload progress */}
        {isSending && uploadProgress > 0 && (
          <div className="max-w-4xl mx-auto mb-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Sending…</span>
              <span className="text-[10px] font-bold code-display" style={{ color: 'var(--accent)' }}>{uploadProgress}%</span>
            </div>
            <div className="w-full rounded-full h-1" style={{ background: 'var(--bg-card)' }}>
              <div className="progress-bar h-1" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        <form
          onSubmit={handleSendText}
          className="max-w-4xl mx-auto flex items-center gap-2 p-1.5 rounded-xl transition-all duration-200"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <label
            className={`p-2.5 rounded-lg cursor-pointer transition-colors flex-shrink-0 ${!isConnected || isSending ? 'opacity-30 pointer-events-none' : ''}`}
            style={{ color: 'var(--text-muted)' }}
          >
            <input type="file" className="hidden" onChange={handleFileUpload} disabled={!isConnected || isSending} />
            <IconClip size={18} />
          </label>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isConnected ? "Drop something into the void…" : "Waiting for peers…"}
            disabled={!isConnected}
            className="flex-1 bg-transparent border-none text-sm py-2.5 px-1 focus:outline-none disabled:opacity-40"
            style={{ color: 'var(--text-primary)' }}
          />

          <button
            type="submit"
            disabled={!inputText.trim() || !isConnected}
            className="p-2.5 rounded-lg transition-all duration-200 flex-shrink-0 disabled:opacity-20"
            style={{
              background: inputText.trim() && isConnected ? 'var(--accent)' : 'var(--bg-card)',
              color: inputText.trim() && isConnected ? '#fff' : 'var(--text-muted)',
            }}
          >
            {isSending ? <IconLoader size={18} /> : <IconSend size={18} />}
          </button>
        </form>

        {!isConnected && (
          <div className="max-w-4xl mx-auto text-center mt-2">
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
              Share code <strong className="code-display" style={{ color: 'var(--accent)' }}>{currentRoom}</strong> to connect, or join another room
            </span>
          </div>
        )}
      </footer>
    </div>
  );
}
