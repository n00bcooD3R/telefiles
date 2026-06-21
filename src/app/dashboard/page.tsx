'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  Music,
  Star,
  Search,
  Upload,
  Download,
  Trash2,
  File,
  X,
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Grid,
  Settings,
  Plus,
  ArrowRight,
  Sparkles,
  Copy,
  Check,
  Heart,
  ChevronRight,
  Info,
  Lock,
} from 'lucide-react';
import { UserButton, useUser } from '@clerk/nextjs';

interface FileRecord {
  id: number;
  telegram_file_id: string;
  telegram_message_id: number;
  file_name: string;
  file_size: number;
  mime_type: string;
  category: string;
  is_favorite: number;
  created_at: string;
}

interface AlbumRecord {
  id: number;
  name: string;
  file_count: number;
  created_at: string;
}

interface UploadStatus {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  errorMsg?: string;
}

export default function Dashboard() {
  const { isLoaded, isSignedIn, user } = useUser();

  // App Configurations & Wizard
  const [isConfigured, setIsConfigured] = useState<boolean>(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);
  const [rawToken, setRawToken] = useState('');
  const [rawChatId, setRawChatId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [detectedChats, setDetectedChats] = useState<Array<{ id: number; title: string; type: string }>>([]);
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [showWizardModal, setShowWizardModal] = useState<boolean>(false);

  // Layout & Navigation Tab
  // tabs: 'library' (photos/videos), 'albums' (folders), 'files' (doc folders/archives), 'design' (ui-ux pro max)
  const [activeTab, setActiveTab] = useState<string>('library');
  const [activeAlbumId, setActiveAlbumId] = useState<number | null>(null);
  const [activeAlbumName, setActiveAlbumName] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [albums, setAlbums] = useState<AlbumRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // File Upload State
  const [uploadList, setUploadList] = useState<UploadStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox & Album Picker Modals
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [albumPickerFile, setAlbumPickerFile] = useState<FileRecord | null>(null);
  const [showCreateAlbumModal, setShowCreateAlbumModal] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');

  // Design Assistant State
  const [designQuery, setDesignQuery] = useState('');
  const [designType, setDesignType] = useState('system');
  const [designResult, setDesignResult] = useState<any>(null);
  const [isLoadingDesign, setIsLoadingDesign] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Statistics
  const [stats, setStats] = useState({
    totalCount: 0,
    totalSize: 0,
    mediaSize: 0,
    docSize: 0,
  });

  // Fetch Settings
  const fetchSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (res.ok && data.success) {
        setIsConfigured(data.settings.isConfigured);
        if (data.settings.isConfigured) {
          // If already configured, close wizard
          setShowWizardModal(false);
        } else {
          // If not configured, force wizard view
          setActiveTab('files');
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  // Fetch Files
  const fetchFiles = async () => {
    if (!isConfigured) return;
    setIsLoadingData(true);
    try {
      let url = '/api/files';
      
      // If we are looking at a specific album, query album files instead!
      if (activeAlbumId !== null) {
        url = `/api/albums?id=${activeAlbumId}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (res.ok && data.success) {
        const fileList = data.files || [];
        setFiles(fileList);

        // Fetch statistics only if showing all files
        if (activeAlbumId === null) {
          const statsCalc = fileList.reduce(
            (acc: any, f: FileRecord) => {
              acc.totalCount += 1;
              acc.totalSize += f.file_size;
              if (f.category === 'image' || f.category === 'video') {
                acc.mediaSize += f.file_size;
              } else {
                acc.docSize += f.file_size;
              }
              return acc;
            },
            { totalCount: 0, totalSize: 0, mediaSize: 0, docSize: 0 }
          );
          setStats(statsCalc);
        }
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Fetch Albums
  const fetchAlbums = async () => {
    if (!isConfigured) return;
    try {
      const res = await fetch('/api/albums');
      const data = await res.json();
      if (res.ok && data.success) {
        setAlbums(data.albums);
      }
    } catch (error) {
      console.error('Error fetching albums:', error);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (isConfigured) {
      fetchFiles();
      fetchAlbums();
    }
  }, [isConfigured, activeTab, activeAlbumId]);

  // Scan updates for group Chat ID
  const handleDetectChat = async () => {
    if (!rawToken.trim()) {
      alert('Please enter a valid Telegram Bot Token first.');
      return;
    }
    setIsScanning(true);
    setDetectedChats([]);
    try {
      const res = await fetch('/api/telegram/detect-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_token: rawToken }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.chats.length === 0) {
          alert('No recent group messages detected. Make sure the bot is added to your group, and send a message like "/start" in the group, then scan again.');
        } else {
          setDetectedChats(data.chats);
          setWizardStep(4); // Move to Chat ID selection step
        }
      } else {
        alert(data.error || 'Failed to detect Telegram chats. Verify your Bot Token.');
      }
    } catch (error) {
      console.error('Detect chat error:', error);
      alert('Network error scanning Telegram chat groups.');
    } finally {
      setIsScanning(false);
    }
  };

  // Save Settings configuration
  const handleSaveSettings = async (tokenVal: string, chatIdVal: string) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_bot_token: tokenVal,
          telegram_chat_id: chatIdVal,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsConfigured(true);
        setShowWizardModal(false);
        alert('Telegram Connection configuration saved successfully!');
      } else {
        alert(data.error || 'Failed to save configuration settings.');
      }
    } catch (error) {
      console.error('Save settings error:', error);
      alert('Network error saving configuration settings.');
    }
  };

  // Toggle Favorite
  const toggleFavorite = async (file: FileRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updatedStatus = file.is_favorite === 1 ? 0 : 1;

    setFiles((prev) =>
      prev.map((f) => (f.id === file.id ? { ...f, is_favorite: updatedStatus } : f))
    );
    if (previewFile && previewFile.id === file.id) {
      setPreviewFile((prev) => prev ? { ...prev, is_favorite: updatedStatus } : null);
    }

    try {
      const res = await fetch('/api/files', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: file.id, is_favorite: updatedStatus === 1 }),
      });
      if (!res.ok) throw new Error();
      fetchAlbums(); // Refresh favorites count
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, is_favorite: file.is_favorite } : f))
      );
      if (previewFile && previewFile.id === file.id) {
        setPreviewFile(file);
      }
      alert('Failed to toggle favorite status.');
    }
  };

  // Delete File
  const deleteFile = async (fileId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this file? This will delete it from Telegram too.')) return;

    if (previewFile && previewFile.id === fileId) setPreviewFile(null);
    setFiles((prev) => prev.filter((f) => f.id !== fileId));

    try {
      const res = await fetch(`/api/files?id=${fileId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchFiles();
        fetchAlbums();
      } else {
        throw new Error();
      }
    } catch (error) {
      alert('Failed to delete file from Telegram storage.');
      fetchFiles();
    }
  };

  // Create Album
  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumName.trim()) return;

    try {
      const res = await fetch('/api/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAlbumName }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAlbums((prev) => [data.album, ...prev]);
        setNewAlbumName('');
        setShowCreateAlbumModal(false);
      } else {
        alert(data.error || 'Failed to create album.');
      }
    } catch (error) {
      console.error(error);
      alert('Error creating album.');
    }
  };

  // Add File to Album
  const handleAddFileToAlbum = async (albumId: number) => {
    if (!albumPickerFile) return;

    try {
      const res = await fetch('/api/albums', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          album_id: albumId,
          file_ids: [albumPickerFile.id],
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Successfully added "${albumPickerFile.file_name}" to the album.`);
        setAlbumPickerFile(null);
        fetchAlbums();
      } else {
        alert(data.error || 'Failed to add file to album.');
      }
    } catch (error) {
      console.error(error);
      alert('Error adding file to album.');
    }
  };

  // Remove File from Current Album
  const handleRemoveFileFromAlbum = async (fileId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeAlbumId === null) return;
    if (!confirm('Remove this file from the album? (It remains stored in your storage)')) return;

    try {
      const res = await fetch('/api/albums', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          album_id: activeAlbumId,
          file_ids: [fileId],
        }),
      });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        fetchAlbums();
      }
    } catch (error) {
      console.error(error);
    }
  };

  // File Upload Logic
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const processFiles = (fileList: FileList) => {
    Array.from(fileList).forEach((file) => {
      const uploadId = Math.random().toString(36).substring(2, 9);
      const newUpload: UploadStatus = {
        id: uploadId,
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'pending',
      };

      setUploadList((prev) => [newUpload, ...prev]);

      if (file.size > 50 * 1024 * 1024) {
        setUploadList((prev) =>
          prev.map((u) =>
            u.id === uploadId
              ? { ...u, status: 'error', errorMsg: 'File exceeds Telegram bot API limit of 50MB' }
              : u
          )
        );
        return;
      }

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/files/upload', true);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadList((prev) =>
            prev.map((u) => (u.id === uploadId ? { ...u, progress, status: 'uploading' } : u))
          );
        }
      });

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadList((prev) =>
            prev.map((u) => (u.id === uploadId ? { ...u, progress: 100, status: 'completed' } : u))
          );
          fetchFiles();
          setTimeout(() => {
            setUploadList((prev) => prev.filter((u) => u.id !== uploadId));
          }, 3000);
        } else {
          try {
            const errRes = JSON.parse(xhr.responseText);
            setUploadList((prev) =>
              prev.map((u) =>
                u.id === uploadId ? { ...u, status: 'error', errorMsg: errRes.error || 'Server error' } : u
              )
            );
          } catch {
            setUploadList((prev) =>
              prev.map((u) => (u.id === uploadId ? { ...u, status: 'error', errorMsg: 'Network error' } : u))
            );
          }
        }
      };

      const formData = new FormData();
      formData.append('file', file);
      xhr.send(formData);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  // Design Assistant Action
  const handleGenerateDesign = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!designQuery.trim()) return;

    setIsLoadingDesign(true);
    setDesignResult(null);

    try {
      const res = await fetch(
        `/api/design-assistant?query=${encodeURIComponent(designQuery)}&type=${designType}`
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setDesignResult(data);
      } else {
        alert(data.error || 'Failed to query design specifications.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to Design Assistant.');
    } finally {
      setIsLoadingDesign(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Helpers
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const getCategoryIcon = (category: string, sizeClass = 'w-5 h-5') => {
    switch (category) {
      case 'image':
        return <ImageIcon className={`${sizeClass} text-emerald-400`} />;
      case 'video':
        return <VideoIcon className={`${sizeClass} text-violet-400`} />;
      case 'audio':
        return <Music className={`${sizeClass} text-amber-400`} />;
      default:
        return <FileText className={`${sizeClass} text-blue-400`} />;
    }
  };

  // Filters for dynamic search and iOS tabs
  // "Library" shows images and videos only.
  // "Favorites" is handled by custom navigation or SQLite.
  // "Files" shows other items.
  const filteredFiles = files.filter((f) => {
    const matchesSearch = f.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'library') {
      return f.category === 'image' || f.category === 'video';
    }
    if (activeTab === 'favorites') {
      return f.is_favorite === 1;
    }
    if (activeTab === 'files') {
      // All files (all categories)
      return true;
    }
    return true;
  });

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        <p className="text-sm font-semibold">Loading Clerk authorization profile...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen relative text-gray-200">
      <div className="mesh-bg" />

      {/* iOS styled Sidebar panel */}
      <aside className="w-64 glass-panel border-r border-white/5 hidden md:flex flex-col relative z-20">
        {/* Brand header */}
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-lg">
            <Lock className="w-3.5 h-3.5 text-zinc-950" />
          </div>
          <div>
            <h1 className="font-heading font-semibold text-lg text-white tracking-tight leading-none">privfiles</h1>
            <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-widest mt-1 block">Telegram Vault</span>
          </div>
        </div>

        {/* Tab Selection */}
        <nav className="flex-1 py-6 px-4 space-y-1">
          {[
            { id: 'library', label: 'Library', icon: ImageIcon, color: 'text-slate-300' },
            { id: 'albums', label: 'Albums', icon: Folder, color: 'text-slate-300' },
            { id: 'favorites', label: 'Favorites', icon: Star, color: 'text-slate-300' },
            { id: 'files', label: 'All Files', icon: FileText, color: 'text-slate-300' },
            { id: 'design', label: 'Design Assistant', icon: Sparkles, color: 'text-slate-300' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id && activeAlbumId === null;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setActiveAlbumId(null);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'bg-white/10 text-white border-l-2 border-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${tab.color}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Configurations Settings Button */}
        <div className="p-4 border-t border-white/5 space-y-3">
          <button
            onClick={() => {
              setWizardStep(1);
              setShowWizardModal(true);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/5 text-xs font-semibold text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all duration-300 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span>Configure Telegram</span>
          </button>
          
          <div className="glass-card rounded-xl p-3 space-y-1 text-[11px] text-slate-500">
            <div className="flex justify-between">
              <span>Vault files:</span>
              <span className="font-bold text-slate-300">{stats.totalCount} items</span>
            </div>
            <div className="flex justify-between">
              <span>Total size:</span>
              <span className="font-bold text-slate-300">{formatBytes(stats.totalSize)}</span>
            </div>
          </div>
        </div>

        {/* User Account Controls */}
        <div className="p-4 border-t border-white/5 flex items-center gap-3">
          <UserButton />
          <div className="truncate flex-1">
            <p className="text-xs font-semibold text-white leading-none">
              {user?.username || user?.firstName || 'User Account'}
            </p>
            <p className="text-[10px] text-slate-500 mt-1 font-light">Clerk Authenticated</p>
          </div>
        </div>
      </aside>

      {/* Main Panel View */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        
        {/* Dynamic header (search + upload triggers) */}
        <header className="h-20 glass-panel border-b border-white/5 flex items-center justify-between px-6 md:px-8">
          <div className="relative w-full max-w-sm">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search library, folders, specs..."
              className="glass-input w-full pl-9 pr-4 py-2 rounded-xl text-xs placeholder-slate-650"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Show dynamic Upload button if setting is set */}
            {isConfigured && activeTab !== 'design' && (
              <button
                onClick={handleUploadClick}
                className="px-5 py-2.5 rounded-full bg-white hover:bg-slate-200 text-zinc-950 text-xs font-semibold shadow-lg transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Upload</span>
              </button>
            )}
            
            {/* UserButton for mobile layout */}
            <div className="md:hidden">
              <UserButton />
            </div>
          </div>
        </header>

        {/* Core view content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          
          {/* Mobile Horiz Navigation links */}
          <div className="md:hidden flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
            {[
              { id: 'library', label: 'Library', icon: ImageIcon },
              { id: 'albums', label: 'Albums', icon: Folder },
              { id: 'favorites', label: 'Favorites', icon: Star },
              { id: 'files', label: 'All Files', icon: FileText },
              { id: 'design', label: 'Design', icon: Sparkles },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id && activeAlbumId === null;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setActiveAlbumId(null);
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${
                    isActive ? 'bg-violet-600 text-white' : 'glass-card text-gray-400'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Setup wizard view - displayed if Telegram configurations are missing */}
          {!isConfigured ? (
            <div className="max-w-2xl mx-auto glass-panel p-6 md:p-8 rounded-3xl border border-gray-800/80 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mx-auto shadow-md">
                  <Settings className="w-7 h-7 animate-spin-slow" />
                </div>
                <h2 className="text-xl font-extrabold text-white text-glow">Connect Telegram Storage</h2>
                <p className="text-xs text-gray-500 leading-relaxed max-w-md mx-auto">
                  privfiles uses a private Telegram Group and Bot API as a secure storage repository. Follow the wizard steps to link your configuration.
                </p>
              </div>

              {/* Wizard Steps Layout */}
              <div className="border-t border-gray-850 pt-6 space-y-6">
                
                {/* Step indicator bubbles */}
                <div className="flex items-center justify-center gap-3">
                  {[1, 2, 3, 4].map((step) => (
                    <div key={step} className="flex items-center">
                      <button
                        onClick={() => {
                          if (step < 4 || rawToken) setWizardStep(step);
                        }}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                          wizardStep === step
                            ? 'bg-violet-600 border-violet-500 text-white shadow-md shadow-violet-500/20'
                            : wizardStep > step
                            ? 'bg-violet-950/40 border-violet-500/30 text-violet-300'
                            : 'bg-gray-900 border-gray-800 text-gray-600'
                        }`}
                      >
                        {step}
                      </button>
                      {step < 4 && <div className="h-0.5 w-8 bg-gray-800" />}
                    </div>
                  ))}
                </div>

                {/* Dynamic Step description pages */}
                <div className="bg-black/20 p-5 rounded-2xl border border-gray-850 space-y-4 text-xs leading-relaxed text-gray-400">
                  {wizardStep === 1 && (
                    <div className="space-y-3">
                      <h3 className="font-bold text-sm text-white">Step 1: Create Telegram Group</h3>
                      <p>Open Telegram and create a new **Private Group**.</p>
                      <p>Name the group <code className="bg-gray-900 px-1 py-0.5 rounded text-gray-200">privfiles</code> (or any name you prefer). This group will act as your file storage vault.</p>
                      <button
                        onClick={() => setWizardStep(2)}
                        className="mt-2 bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>Next Step</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {wizardStep === 2 && (
                    <div className="space-y-3">
                      <h3 className="font-bold text-sm text-white">Step 2: Create a Telegram Bot</h3>
                      <p>Search for [@BotFather](https://t.me/BotFather) inside Telegram.</p>
                      <p>Send the command <code className="bg-gray-900 px-1 py-0.5 rounded text-gray-200">/newbot</code>, follow the prompts to choose a name/username, and **copy the API Bot Token** provided.</p>
                      <div className="pt-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Paste Bot Token</label>
                        <input
                          type="text"
                          value={rawToken}
                          onChange={(e) => setRawToken(e.target.value)}
                          placeholder="e.g. 1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                          className="glass-input w-full px-3 py-2.5 rounded-xl placeholder-gray-750 font-mono text-xs"
                        />
                      </div>
                      <div className="flex gap-2.5 pt-2">
                        <button
                          onClick={() => setWizardStep(3)}
                          disabled={!rawToken.trim()}
                          className="bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <span>Next Step</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setWizardStep(1)}
                          className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-2 px-4 rounded-xl cursor-pointer"
                        >
                          Back
                        </button>
                      </div>
                    </div>
                  )}

                  {wizardStep === 3 && (
                    <div className="space-y-3">
                      <h3 className="font-bold text-sm text-white">Step 3: Add Bot to Group & Make Admin</h3>
                      <p>Open the group you created in Step 1.</p>
                      <p>Add your newly created bot to the group as a member.</p>
                      <p>Go to group settings, open the Administrators list, and **promote the Bot to Administrator** so it can post/manage documents.</p>
                      <p className="text-amber-400/90 font-medium">⚠️ Important: Send a quick message (e.g. "/start") inside the group. This registers the event on Telegram's updates log so our bot can fetch the group ID.</p>
                      <div className="flex gap-2.5 pt-2">
                        <button
                          onClick={handleDetectChat}
                          disabled={isScanning}
                          className="bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          {isScanning ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Scanning updates...</span>
                            </>
                          ) : (
                            <>
                              <Search className="w-4 h-4" />
                              <span>Detect Group Chat ID</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setWizardStep(2)}
                          className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-2 px-4 rounded-xl cursor-pointer"
                        >
                          Back
                        </button>
                      </div>
                    </div>
                  )}

                  {wizardStep === 4 && (
                    <div className="space-y-3">
                      <h3 className="font-bold text-sm text-white">Step 4: Select Your Storage Group</h3>
                      <p>We scanned Telegram's API update logs and identified the following compatible groups/chats. Select the one you want to link:</p>
                      
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {detectedChats.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => setRawChatId(c.id.toString())}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              rawChatId === c.id.toString()
                                ? 'bg-violet-600/20 border-violet-500 text-white'
                                : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white hover:border-gray-750'
                            }`}
                          >
                            <div>
                              <p className="font-bold text-xs">{c.title}</p>
                              <p className="text-[10px] text-gray-500 font-mono mt-0.5">Chat ID: {c.id}</p>
                            </div>
                            <span className="text-[9px] bg-slate-800 px-2 py-0.5 rounded font-bold uppercase">{c.type}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Confirm Chat ID</label>
                        <input
                          type="text"
                          value={rawChatId}
                          onChange={(e) => setRawChatId(e.target.value)}
                          placeholder="e.g. -100123456789"
                          className="glass-input w-full px-3 py-2 rounded-xl placeholder-gray-750 font-mono text-xs"
                        />
                      </div>

                      <div className="flex gap-2.5 pt-2">
                        <button
                          onClick={() => handleSaveSettings(rawToken, rawChatId)}
                          disabled={!rawToken || !rawChatId}
                          className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold py-2.5 px-5 rounded-xl cursor-pointer shadow shadow-violet-500/10 hover:shadow-violet-500/20 transition-all glow-hover flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Save & Connect Storage</span>
                        </button>
                        <button
                          onClick={() => setWizardStep(3)}
                          className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-2 px-4 rounded-xl cursor-pointer"
                        >
                          Back
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            
            // Standard connected UI layouts
            <>
              {/* Tabs view switcher: Library / Photos / Videos */}
              {activeTab === 'library' && (
                <div className="space-y-6">
                  {/* Gallery Subtitle Header */}
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-extrabold text-white tracking-tight">iOS Library</h2>
                      <p className="text-xs text-gray-500">Only showing photos and video content</p>
                    </div>
                  </div>

                  {/* Grid view */}
                  {isLoadingData ? (
                    <div className="h-60 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                      <p className="text-xs text-gray-500">Loading library assets...</p>
                    </div>
                  ) : filteredFiles.length === 0 ? (
                    <div className="glass-panel border-gray-800/80 rounded-2xl h-64 flex flex-col items-center justify-center gap-3 text-center p-6">
                      <div className="w-12 h-12 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-600">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">No media found</h4>
                        <p className="text-xs text-gray-500 mt-1 max-w-xs">Upload photos or video clips using the Upload button above.</p>
                      </div>
                    </div>
                  ) : (
                    // Photos grid aspect-square matching iOS
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2.5">
                      {filteredFiles.map((file) => (
                        <div
                          key={file.id}
                          onClick={() => setPreviewFile(file)}
                          className="aspect-square bg-slate-950 rounded-lg overflow-hidden relative group cursor-pointer border border-white/5"
                        >
                          {file.category === 'image' ? (
                            <img
                              src={`/api/files/download/${file.id}`}
                              alt={file.file_name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-950 flex items-center justify-center text-violet-400 group-hover:bg-slate-900 transition-colors">
                              <VideoIcon className="w-8 h-8" />
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="w-6 h-6 fill-current text-white" />
                              </div>
                            </div>
                          )}

                          {/* Quick indicators */}
                          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
                            {file.is_favorite === 1 && (
                              <div className="p-1 rounded bg-amber-500 text-slate-950 shadow">
                                <Star className="w-3 h-3 fill-current" />
                              </div>
                            )}
                          </div>

                          {/* iOS card hover overlay details */}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end text-[10px]">
                            <p className="font-bold text-white truncate">{file.file_name}</p>
                            <p className="text-gray-400 font-semibold">{formatBytes(file.file_size)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Albums */}
              {activeTab === 'albums' && activeAlbumId === null && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-gray-850 pb-3">
                    <div>
                      <h2 className="text-xl font-extrabold text-white tracking-tight">iOS Albums</h2>
                      <p className="text-xs text-gray-500">Organized folders and smart collections</p>
                    </div>
                    <button
                      onClick={() => setShowCreateAlbumModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 text-xs font-bold text-violet-400 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Album</span>
                    </button>
                  </div>

                  {/* Album Grid list */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                    {/* Hardcoded Favorites Album */}
                    <div
                      onClick={() => {
                        setActiveTab('favorites');
                        setActiveAlbumId(null);
                      }}
                      className="space-y-3 cursor-pointer group"
                    >
                      <div className="aspect-square rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex flex-col items-center justify-center shadow-lg relative overflow-hidden group-hover:scale-102 transition-transform duration-200">
                        <Star className="w-12 h-12 text-slate-950 fill-current" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Favorites</h4>
                        <p className="text-[10px] text-gray-500 font-semibold">Smart Album</p>
                      </div>
                    </div>

                    {/* Dynamic SQLite Albums */}
                    {albums.map((album) => (
                      <div
                        key={album.id}
                        onClick={() => {
                          setActiveAlbumId(album.id);
                          setActiveAlbumName(album.name);
                        }}
                        className="space-y-3 cursor-pointer group"
                      >
                        <div className="aspect-square rounded-2xl bg-slate-900 border border-gray-800 hover:border-gray-700/80 flex flex-col items-center justify-center shadow relative overflow-hidden group-hover:scale-102 transition-transform duration-200">
                          {/* Folder details mock overlay */}
                          <Folder className="w-12 h-12 text-violet-400" />
                          
                          {/* Action deletion overlay inside album card */}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm(`Delete the album "${album.name}"? (Files will not be deleted)`)) {
                                await fetch(`/api/albums?id=${album.id}`, { method: 'DELETE' });
                                fetchAlbums();
                              }
                            }}
                            className="absolute top-2.5 right-2.5 p-1 rounded-md bg-black/60 border border-white/5 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-black/90 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white truncate">{album.name}</h4>
                          <p className="text-[10px] text-gray-500 font-semibold">{album.file_count} items</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Specific Album Files Grid View */}
              {activeAlbumId !== null && (
                <div className="space-y-6">
                  {/* Album Breadcrumbs */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                    <button
                      onClick={() => {
                        setActiveAlbumId(null);
                        setActiveTab('albums');
                      }}
                      className="hover:text-white"
                    >
                      Albums
                    </button>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-gray-300">{activeAlbumName}</span>
                  </div>

                  <div className="flex justify-between items-center border-b border-gray-850 pb-3">
                    <div>
                      <h2 className="text-xl font-extrabold text-white tracking-tight">{activeAlbumName}</h2>
                      <p className="text-xs text-gray-500">Custom folder collection</p>
                    </div>
                  </div>

                  {/* Grid list of album items */}
                  {isLoadingData ? (
                    <div className="h-60 flex flex-col items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                    </div>
                  ) : files.length === 0 ? (
                    <div className="glass-panel border-gray-800/80 rounded-2xl h-60 flex flex-col items-center justify-center text-center p-6">
                      <p className="text-xs text-gray-500">This album is empty. Go to All Files or Library, hover/click on files and choose "Add to Album".</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {files.map((file) => (
                        <div
                          key={file.id}
                          onClick={() => setPreviewFile(file)}
                          className="glass-card rounded-2xl overflow-hidden group aspect-square flex flex-col relative cursor-pointer"
                        >
                          <div className="flex-1 bg-slate-950/65 flex items-center justify-center relative border-b border-gray-850">
                            {file.category === 'image' ? (
                              <img
                                src={`/api/files/download/${file.id}`}
                                alt={file.file_name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                loading="lazy"
                              />
                            ) : file.category === 'video' ? (
                              <div className="w-full h-full bg-slate-950 flex items-center justify-center text-violet-400">
                                <VideoIcon className="w-8 h-8" />
                                <Play className="w-5 h-5 fill-current absolute text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            ) : (
                              getCategoryIcon(file.category, 'w-10 h-10')
                            )}
                            
                            {/* Remove from Album Action */}
                            <button
                              onClick={(e) => handleRemoveFileFromAlbum(file.id, e)}
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 border border-white/5 text-gray-400 hover:text-red-400 hover:bg-black/90 opacity-0 group-hover:opacity-100 transition-all z-10 cursor-pointer"
                              title="Remove from Album"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="p-2.5 bg-slate-900/30 text-left">
                            <p className="text-xs font-bold text-white truncate">{file.file_name}</p>
                            <p className="text-[9px] text-gray-500">{formatBytes(file.file_size)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Favorites */}
              {activeTab === 'favorites' && activeAlbumId === null && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-extrabold text-white tracking-tight">Favorites</h2>
                    <p className="text-xs text-gray-500">Smart album collecting starred resources</p>
                  </div>

                  {/* Grid list of starred items */}
                  {isLoadingData ? (
                    <div className="h-60 flex flex-col items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                    </div>
                  ) : filteredFiles.length === 0 ? (
                    <div className="glass-panel border-gray-800/80 rounded-2xl h-64 flex flex-col items-center justify-center gap-3 text-center p-6">
                      <Star className="w-10 h-10 text-gray-600" />
                      <p className="text-xs text-gray-500 max-w-xs leading-relaxed">No favorites added yet. Star files or gallery clips to bookmarks them.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {filteredFiles.map((file) => (
                        <div
                          key={file.id}
                          onClick={() => setPreviewFile(file)}
                          className="glass-card rounded-2xl overflow-hidden group aspect-square flex flex-col relative cursor-pointer"
                        >
                          <div className="flex-1 bg-slate-950/65 flex items-center justify-center relative border-b border-gray-850">
                            {file.category === 'image' ? (
                              <img
                                src={`/api/files/download/${file.id}`}
                                alt={file.file_name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                loading="lazy"
                              />
                            ) : file.category === 'video' ? (
                              <div className="w-full h-full bg-slate-950 flex items-center justify-center text-violet-400">
                                <VideoIcon className="w-8 h-8" />
                                <Play className="w-5 h-5 fill-current absolute text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            ) : (
                              getCategoryIcon(file.category, 'w-10 h-10')
                            )}

                            {/* Unfavorite quickly */}
                            <button
                              onClick={(e) => toggleFavorite(file, e)}
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 opacity-0 group-hover:opacity-100 transition-all z-10 cursor-pointer"
                            >
                              <Star className="w-3.5 h-3.5 fill-current" />
                            </button>
                          </div>
                          <div className="p-2.5 bg-slate-900/30 text-left">
                            <p className="text-xs font-bold text-white truncate">{file.file_name}</p>
                            <p className="text-[9px] text-gray-500">{formatBytes(file.file_size)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: All Files (classic file manager view) */}
              {activeTab === 'files' && activeAlbumId === null && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-extrabold text-white tracking-tight">All Files</h2>
                    <p className="text-xs text-gray-500 font-medium">Browse documents, archives, and media collections</p>
                  </div>

                  {/* Drag drop zone */}
                  <div className="space-y-4">
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files); }}
                      onClick={handleUploadClick}
                      className={`glass-panel border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 relative group ${
                        isDragging ? 'border-violet-500 bg-violet-950/20 shadow' : 'border-gray-800 hover:border-gray-700/80'
                      }`}
                    >
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
                      <div className="flex flex-col items-center gap-3 relative z-10">
                        <Upload className="w-8 h-8 text-violet-400 group-hover:scale-115 transition-all" />
                        <div>
                          <h3 className="text-sm font-bold text-white">Drag & drop files to upload</h3>
                          <p className="text-[10px] text-gray-500 mt-0.5">Supports images, videos, audio & documents up to 50 MB</p>
                        </div>
                      </div>
                    </div>

                    {/* Upload progress queue */}
                    {uploadList.length > 0 && (
                      <div className="glass-panel rounded-2xl p-4 border border-gray-805 space-y-3">
                        <h4 className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
                          <span>Uploading files...</span>
                        </h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {uploadList.map((item) => (
                            <div key={item.id} className="glass-card rounded-xl p-2.5 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <File className="w-4 h-4 text-violet-400 shrink-0" />
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex justify-between text-[10px] font-bold">
                                    <p className="text-white truncate">{item.name}</p>
                                    <span className="text-gray-550">{formatBytes(item.size)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-950 rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${item.status === 'completed' ? 'bg-emerald-500' : item.status === 'error' ? 'bg-red-500' : 'bg-violet-500'}`}
                                        style={{ width: `${item.progress}%` }}
                                      />
                                    </div>
                                    <span className="text-[8px] font-mono text-gray-500 min-w-6 text-right">{item.progress}%</span>
                                  </div>
                                </div>
                              </div>
                              <button onClick={() => setUploadList(prev => prev.filter(u => u.id !== item.id))} className="text-gray-500 hover:text-white">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Grid view of all items */}
                  {isLoadingData ? (
                    <div className="h-40 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                    </div>
                  ) : filteredFiles.length === 0 ? (
                    <div className="glass-panel border-gray-800/80 rounded-2xl h-40 flex flex-col items-center justify-center">
                      <p className="text-xs text-gray-500">No files found.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {filteredFiles.map((file) => (
                        <div
                          key={file.id}
                          onClick={() => setPreviewFile(file)}
                          className="glass-card rounded-2xl overflow-hidden group aspect-square flex flex-col relative cursor-pointer border border-white/5"
                        >
                          <div className="flex-1 bg-slate-950/65 flex items-center justify-center relative border-b border-gray-850">
                            {file.category === 'image' ? (
                              <img
                                src={`/api/files/download/${file.id}`}
                                alt={file.file_name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                loading="lazy"
                              />
                            ) : file.category === 'video' ? (
                              <div className="w-full h-full bg-slate-950 flex items-center justify-center text-violet-400">
                                <VideoIcon className="w-8 h-8" />
                                <Play className="w-5 h-5 fill-current absolute text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            ) : (
                              getCategoryIcon(file.category, 'w-10 h-10')
                            )}

                            {/* Hover overlay triggers */}
                            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-10">
                              <button
                                onClick={(e) => { e.stopPropagation(); setAlbumPickerFile(file); }}
                                className="p-1.5 rounded-lg bg-black/60 border border-white/5 text-gray-400 hover:text-white hover:bg-black/90 transition-all cursor-pointer"
                                title="Add to Album"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => toggleFavorite(file, e)}
                                className={`p-1.5 rounded-lg border backdrop-blur-md transition-colors cursor-pointer ${
                                  file.is_favorite === 1
                                    ? 'bg-amber-500/20 border-amber-500/30 text-amber-400 hover:bg-amber-500/30'
                                    : 'bg-black/60 border-white/5 text-gray-400 hover:text-white hover:bg-black/80'
                                }`}
                              >
                                <Star className={`w-3.5 h-3.5 ${file.is_favorite === 1 ? 'fill-current' : ''}`} />
                              </button>
                              <button
                                onClick={(e) => deleteFile(file.id, e)}
                                className="p-1.5 rounded-lg bg-black/60 border border-white/5 text-gray-400 hover:text-red-400 hover:bg-red-950/50 hover:border-red-500/20 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="p-2.5 bg-slate-900/30 text-left">
                            <p className="text-xs font-bold text-white truncate">{file.file_name}</p>
                            <p className="text-[9px] text-gray-500">{formatBytes(file.file_size)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Design Assistant */}
              {activeTab === 'design' && activeAlbumId === null && (
                <div className="space-y-6 md:space-y-8 animate-fade-in pb-12">
                  <div className="glass-panel p-6 md:p-8 rounded-3xl border border-gray-800/80 space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                        <Sparkles className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <h2 className="text-xl font-extrabold text-white text-glow">AI Design Assistant</h2>
                        <p className="text-xs text-gray-500 font-medium">Search design recommendations powered by the UI/UX Pro Max intelligence engine.</p>
                      </div>
                    </div>

                    <form onSubmit={handleGenerateDesign} className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                          Search Prompt / Product Type
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-500">
                            <Search className="w-5 h-5" />
                          </span>
                          <input
                            type="text"
                            value={designQuery}
                            onChange={(e) => setDesignQuery(e.target.value)}
                            placeholder="e.g. SaaS Dashboard, crypto wallet dark, e-commerce elegant..."
                            className="glass-input w-full pl-11 pr-4 py-3.5 rounded-xl text-sm placeholder-gray-650"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                          Recommendation Type
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                          {[
                            { id: 'system', label: 'Full System' },
                            { id: 'color', label: 'Color Palettes' },
                            { id: 'typography', label: 'Typography' },
                            { id: 'style', label: 'UI Styles' },
                            { id: 'ux', label: 'UX Guidelines' },
                          ].map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setDesignType(t.id)}
                              className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                                designType === t.id
                                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 border-violet-500 text-white shadow-lg shadow-violet-500/20'
                                  : 'bg-gray-900/50 border-gray-800/80 text-gray-400 hover:text-white hover:border-gray-700'
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1 items-center">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Suggestions:</span>
                        {[
                          'Fintech Banking',
                          'E-Commerce Elegant',
                          'SaaS Dashboard',
                          'Crypto Wallet Dark',
                          'Healthcare Portal',
                        ].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setDesignQuery(s)}
                            className="text-[10px] bg-slate-900/40 border border-gray-850 hover:border-violet-500/40 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            {s}
                          </button>
                        ))}
                      </div>

                      <button
                        type="submit"
                        className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-violet-500/10 hover:shadow-violet-500/20 transition-all flex items-center gap-2 cursor-pointer glow-hover"
                        disabled={isLoadingDesign || !designQuery.trim()}
                      >
                        {isLoadingDesign ? (
                          <>
                            <Loader2 className="w-4.5 h-4.5 animate-spin" />
                            <span>Querying UI/UX Pro Max...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Generate Design Specs</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Design results rendering */}
                  {designResult && (
                    <div className="space-y-6 animate-slide-up">
                      {/* Visual swatches extracted from markdown color codes */}
                      {designResult.format === 'markdown' && (
                        (() => {
                          const colors = designResult.data.match(/#([0-9a-fA-F]{6})/g) || [];
                          const uniqueColors = Array.from(new Set(colors));
                          if (uniqueColors.length > 0) {
                            return (
                              <div className="glass-panel p-6 rounded-3xl border border-gray-800/80 space-y-3">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Extracted Color Scheme</h3>
                                <div className="flex flex-wrap gap-4">
                                  {uniqueColors.map((colorHex: any) => (
                                    <div
                                      key={colorHex}
                                      onClick={() => copyToClipboard(colorHex, colorHex)}
                                      className="glass-card p-2.5 rounded-2xl flex items-center gap-3 hover:scale-102 transition-all cursor-pointer border border-gray-850"
                                    >
                                      <div
                                        className="w-10 h-10 rounded-xl shadow-inner border border-white/5"
                                        style={{ backgroundColor: colorHex }}
                                      />
                                      <div className="pr-1 text-left">
                                        <p className="text-[10px] text-gray-500 font-bold leading-none">Hex Code</p>
                                        <p className="text-xs font-bold text-white font-mono uppercase tracking-wider mt-0.5">{colorHex}</p>
                                      </div>
                                      <div className="text-gray-550 hover:text-white transition-colors pl-1">
                                        {copiedText === colorHex ? (
                                          <Check className="w-4 h-4 text-emerald-400" />
                                        ) : (
                                          <Copy className="w-3.5 h-3.5" />
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()
                      )}

                      {/* Render Markdown Design System */}
                      {designResult.format === 'markdown' && (
                        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-gray-800/80 space-y-4">
                          <div className="flex justify-between items-center border-b border-gray-850 pb-3">
                            <h3 className="font-bold text-sm text-gray-300 uppercase tracking-wider flex items-center gap-2">
                              <FileText className="w-4 h-4 text-violet-400" />
                              <span>Design System Specification</span>
                            </h3>
                            <button
                              onClick={() => copyToClipboard(designResult.data, 'system')}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 text-xs font-bold text-gray-400 hover:text-white cursor-pointer transition-all"
                            >
                              {copiedText === 'system' ? (
                                <>
                                  <Check className="w-4 h-4 text-emerald-400" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  <span>Copy Specs</span>
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-gray-300 bg-black/30 p-4 rounded-2xl border border-gray-850/50">
                            {designResult.data}
                          </pre>
                        </div>
                      )}

                      {/* Render JSON Search Results (Colors, Style, Typography, UX) */}
                      {designResult.format === 'json' && (
                        <div className="space-y-6">
                          {designType === 'color' && designResult.data.results ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {designResult.data.results.map((item: any, idx: number) => {
                                const foundColors = JSON.stringify(item).match(/#([0-9a-fA-F]{6})/g) || [];
                                const paletteColors = Array.from(new Set(foundColors));
                                return (
                                  <div key={idx} className="glass-panel p-6 rounded-2xl border border-gray-800/80 space-y-4">
                                    <div className="space-y-1">
                                      <h4 className="text-base font-bold text-white leading-snug">{item["Product Type"] || "Color Palette"}</h4>
                                      <p className="text-xs text-gray-500 font-medium">Focus: {item["Color Palette Focus"] || "Matching colors"}</p>
                                    </div>
                                    {paletteColors.length > 0 && (
                                      <div className="flex flex-wrap gap-2.5">
                                        {paletteColors.map((colHex: any) => (
                                          <div
                                            key={colHex}
                                            onClick={() => copyToClipboard(colHex, colHex + idx)}
                                            className="glass-card p-1.5 rounded-xl flex items-center gap-2 hover:scale-102 transition-all cursor-pointer border border-gray-850"
                                          >
                                            <div className="w-7 h-7 rounded-lg border border-white/5" style={{ backgroundColor: colHex }} />
                                            <span className="text-[10px] font-bold font-mono text-white tracking-wider pr-1 uppercase">{colHex}</span>
                                            {copiedText === colHex + idx ? (
                                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                                            ) : (
                                              <Copy className="w-3 h-3 text-gray-500" />
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    <div className="bg-black/25 p-4 rounded-xl border border-gray-850 text-xs text-gray-400 space-y-1.5">
                                      {Object.entries(item).map(([key, val]) => {
                                        if (["Product Type", "Color Palette Focus", "Keywords"].includes(key)) return null;
                                        return (
                                          <p key={key} className="break-words">
                                            <strong className="text-gray-300">{key}:</strong> {val as string}
                                          </p>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : designType === 'typography' && designResult.data.results ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {designResult.data.results.map((item: any, idx: number) => (
                                <div key={idx} className="glass-panel p-6 rounded-2xl border border-gray-800/80 space-y-4">
                                  <div className="space-y-1">
                                    <h4 className="text-base font-bold text-white leading-snug">{item["Font Pairing"] || "IBM Plex Sans"}</h4>
                                    <p className="text-xs text-gray-500 font-medium">Mood: {item["Mood/Vibe"] || "professional"}</p>
                                  </div>
                                  <div className="bg-black/25 p-4 rounded-xl border border-gray-850 text-xs text-gray-400 space-y-2">
                                    <p><strong className="text-gray-300 font-semibold">Heading Font:</strong> {item["Heading Font"]}</p>
                                    <p><strong className="text-gray-300 font-semibold">Body Font:</strong> {item["Body Font"]}</p>
                                    <p className="break-all"><strong className="text-gray-300 font-semibold">Google Fonts:</strong> <a href={item["Google Fonts Link"]} target="_blank" rel="noreferrer" className="text-violet-400 hover:text-violet-300 underline">{item["Google Fonts Link"]}</a></p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-4">
                              {designResult.data.results ? (
                                designResult.data.results.map((item: any, idx: number) => (
                                  <div key={idx} className="glass-panel p-6 rounded-2xl border border-gray-850 space-y-4">
                                    <h4 className="text-sm font-bold text-white border-b border-gray-850 pb-2 flex items-center gap-2">
                                      <FileText className="w-4 h-4 text-violet-400" />
                                      <span>{item["UI Style"] || item["Product Type"] || item["Category"] || `Recommendation #${idx + 1}`}</span>
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      {Object.entries(item).map(([k, v]) => (
                                        <div key={k} className="space-y-1">
                                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{k}</span>
                                          <p className="text-xs text-gray-355 leading-relaxed font-medium">{v as string}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-gray-300 bg-black/30 p-4 rounded-2xl border border-gray-850/50">
                                  {JSON.stringify(designResult.data, null, 2)}
                                </pre>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* MODAL 1: Create Album Modal */}
      {showCreateAlbumModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="glass-panel rounded-2xl p-6 w-full max-w-sm border border-gray-800 shadow-2xl relative">
            <button onClick={() => setShowCreateAlbumModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-sm text-white mb-4">Create New Album</h3>
            <form onSubmit={handleCreateAlbum} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Album Title</label>
                <input
                  type="text"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  placeholder="e.g. Summer Vacation, Receipts"
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Create
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add File to Album Picker */}
      {albumPickerFile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="glass-panel rounded-2xl p-6 w-full max-w-sm border border-gray-800 shadow-2xl relative flex flex-col max-h-[70vh]">
            <button onClick={() => setAlbumPickerFile(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-sm text-white mb-2 truncate pr-6">Add to Album</h3>
            <p className="text-[10px] text-gray-500 font-semibold mb-4 truncate">File: {albumPickerFile.file_name}</p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {albums.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-6">No custom albums created yet. Close this and click "New Album" in the Albums tab first.</p>
              ) : (
                albums.map((album) => (
                  <div
                    key={album.id}
                    onClick={() => handleAddFileToAlbum(album.id)}
                    className="p-3 bg-gray-900 border border-gray-850 rounded-xl hover:border-violet-500 text-gray-300 hover:text-white font-bold text-xs flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span>{album.name}</span>
                    <Plus className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: iOS Setup Wizard Modal */}
      {showWizardModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="glass-panel rounded-3xl p-6 md:p-8 w-full max-w-2xl border border-gray-800 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowWizardModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <div className="text-center space-y-2 mb-6">
              <h3 className="text-base font-extrabold text-white">Configure Telegram Integration</h3>
              <p className="text-xs text-gray-500 font-medium">Link your custom bot credentials to sync and backup project files.</p>
            </div>

            {/* Render Connection Wizard */}
            <div className="space-y-4 bg-black/25 p-5 rounded-2xl border border-gray-850 text-xs text-gray-400">
              <div className="flex items-center justify-center gap-3 mb-4">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center">
                    <button
                      onClick={() => {
                        if (step < 4 || rawToken) setWizardStep(step);
                      }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                        wizardStep === step
                          ? 'bg-violet-600 border-violet-500 text-white shadow-md'
                          : wizardStep > step
                          ? 'bg-violet-950/40 border-violet-500/30 text-violet-300'
                          : 'bg-gray-900 border-gray-800 text-gray-600'
                      }`}
                    >
                      {step}
                    </button>
                    {step < 4 && <div className="h-0.5 w-8 bg-gray-850" />}
                  </div>
                ))}
              </div>

              {wizardStep === 1 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-white">Step 1: Create Telegram Group</h4>
                  <p>Open Telegram and create a new **Private Group**.</p>
                  <p>Name the group <code className="bg-gray-900 px-1 py-0.5 rounded text-gray-200">privfiles</code> (or any name you prefer). This group will act as your file storage vault.</p>
                  <button
                    onClick={() => setWizardStep(2)}
                    className="mt-2 bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>Next Step</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-white">Step 2: Create a Telegram Bot</h4>
                  <p>Search for [@BotFather](https://t.me/BotFather) inside Telegram.</p>
                  <p>Send the command <code className="bg-gray-900 px-1 py-0.5 rounded text-gray-200">/newbot</code>, choose a name and username, and **copy the API Bot Token** provided.</p>
                  <div className="pt-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Paste Bot Token</label>
                    <input
                      type="text"
                      value={rawToken}
                      onChange={(e) => setRawToken(e.target.value)}
                      placeholder="e.g. 1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                      className="glass-input w-full px-3 py-2.5 rounded-xl placeholder-gray-750 font-mono text-xs"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setWizardStep(3)}
                      disabled={!rawToken.trim()}
                      className="bg-violet-600 hover:bg-violet-500 disabled:bg-violet-850 text-white font-bold py-2 px-4 rounded-xl cursor-pointer"
                    >
                      Next Step
                    </button>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-white">Step 3: Add Bot to Group & Make Admin</h4>
                  <p>Open the group you created in Step 1.</p>
                  <p>Add your newly created bot to the group as a member.</p>
                  <p>Promote the Bot to **Administrator** so it can post/manage documents.</p>
                  <p className="text-amber-400/90 font-medium">⚠️ Remember: Send a quick message (e.g. "/start") inside the group to register an event on Telegram.</p>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleDetectChat}
                      disabled={isScanning}
                      className="bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer"
                    >
                      {isScanning ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Scanning...</span>
                        </>
                      ) : (
                        <span>Detect Group Chat ID</span>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-white">Step 4: Select Your Storage Group</h4>
                  <p>Select the group you want to link:</p>
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {detectedChats.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => setRawChatId(c.id.toString())}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer ${
                          rawChatId === c.id.toString() ? 'bg-violet-600/20 border-violet-500' : 'bg-gray-900 border-gray-800'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-xs">{c.title}</p>
                          <p className="text-[9px] text-gray-500 font-mono mt-0.5">Chat ID: {c.id}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Confirm Chat ID</label>
                    <input
                      type="text"
                      value={rawChatId}
                      onChange={(e) => setRawChatId(e.target.value)}
                      className="glass-input w-full px-3 py-2 rounded-xl font-mono text-xs"
                    />
                  </div>
                  <button
                    onClick={() => handleSaveSettings(rawToken, rawChatId)}
                    disabled={!rawToken || !rawChatId}
                    className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold py-2.5 rounded-xl cursor-pointer"
                  >
                    Save configuration
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: iOS Photo Lightbox / Media Viewer */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-lg flex items-center justify-center z-50 p-4 md:p-8 animate-fade-in">
          <div className="w-full max-w-4xl bg-slate-950/60 rounded-3xl border border-gray-800/80 overflow-hidden shadow-2xl flex flex-col h-full max-h-[85vh] relative">
            
            {/* Topbar */}
            <div className="h-16 border-b border-gray-800/60 flex items-center justify-between px-6 bg-slate-950 shrink-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {getCategoryIcon(previewFile.category)}
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-white truncate leading-none mb-1">{previewFile.file_name}</h4>
                  <p className="text-[9px] text-gray-500 font-semibold">
                    {formatBytes(previewFile.file_size)} • {new Date(previewFile.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Toolbar actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleFavorite(previewFile)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    previewFile.is_favorite === 1
                      ? 'bg-amber-500/20 border-amber-500/30 text-amber-400 animate-pulse'
                      : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-white'
                  }`}
                >
                  <Star className={`w-4 h-4 ${previewFile.is_favorite === 1 ? 'fill-current' : ''}`} />
                </button>
                <a
                  href={`/api/files/download/${previewFile.id}?download=true`}
                  className="p-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-505 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => deleteFile(previewFile.id)}
                  className="p-2 rounded-xl bg-gray-900 border border-gray-850 text-gray-550 hover:text-red-400 hover:bg-red-950/20 hover:border-red-500/30 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-2 rounded-xl bg-violet-600 text-white ml-2 hover:bg-violet-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Media Body Viewer */}
            <div className="flex-1 bg-black/40 flex items-center justify-center p-4 overflow-hidden">
              {previewFile.category === 'image' ? (
                <div className="max-w-full max-h-full flex items-center justify-center">
                  <img
                    src={`/api/files/download/${previewFile.id}`}
                    alt={previewFile.file_name}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg shadow select-none"
                  />
                </div>
              ) : previewFile.category === 'video' ? (
                <div className="w-full max-w-2xl aspect-video rounded-xl overflow-hidden shadow border border-gray-800 bg-slate-950">
                  <video
                    src={`/api/files/download/${previewFile.id}`}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full"
                  />
                </div>
              ) : previewFile.mime_type === 'application/pdf' ? (
                <div className="w-full h-full max-h-[60vh] rounded-xl overflow-hidden border border-gray-850 bg-slate-900 flex flex-col">
                  <iframe
                    src={`/api/files/download/${previewFile.id}`}
                    className="w-full h-full border-none"
                  />
                </div>
              ) : (
                <div className="text-center p-8 space-y-4 max-w-sm glass-card rounded-2xl border border-gray-850">
                  <div className="w-14 h-14 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center mx-auto text-gray-500">
                    {getCategoryIcon(previewFile.category, 'w-6 h-6')}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white truncate mb-1">{previewFile.file_name}</h4>
                    <p className="text-[10px] text-gray-500 leading-normal">
                      Files of format <strong className="text-gray-300">{previewFile.mime_type}</strong> cannot be viewed directly inside the browser.
                    </p>
                  </div>
                  <a
                    href={`/api/files/download/${previewFile.id}?download=true`}
                    className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow shadow-violet-500/10"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download to View</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
