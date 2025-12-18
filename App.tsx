
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ArtStyle, StyleOption, TextReplacement, EntityModification, PosterText, TextStyle, AspectRatio, HistoryItem, Theme, Sticker } from './types';
import { STYLE_OPTIONS } from './constants';
import { StyleCard } from './components/StyleCard';
import { transformImage, detectTextInImage, detectEntitiesInImage } from './services/geminiService';
import { processImage, ImageAdjustments } from './services/imageUtils';

const TEXT_STYLE_OPTIONS: { id: TextStyle; label: string; icon: string }[] = [
  { id: 'custom', label: '自定义', icon: '⚙️' },
  { id: 'neon', label: '赛博霓虹', icon: '🔮' },
  { id: 'elegant', label: '雅致衬线', icon: '📜' },
  { id: 'bold', label: '硬核标题', icon: '📢' },
  { id: 'traditional', label: '古典纵排', icon: '🖋️' },
  { id: 'brush', label: '艺术泼墨', icon: '🎨' },
];

const FONT_OPTIONS = [
  { label: '系统默认', value: 'Inter' },
  { label: '无衬线黑体', value: 'Noto Sans SC' },
  { label: '快乐酷黑', value: 'ZCOOL KuaiLe' },
  { label: '马山正毛笔', value: 'Ma Shan Zheng' },
  { label: '像素风格', value: 'Press Start 2P' },
];

const STICKER_PACKS = [
  { category: '装饰', items: ['✨', '⭐', '🌟', '💫', '🔥', '💧', '🌸', '🍀', '💎', '🌈'] },
  { category: '心情', items: ['😎', '😍', '🤔', '🥳', '🤯', '👻', '👽', '🤖', '💩', '🤡'] },
  { category: '标签', items: ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🔺', '⬛'] },
  { category: '节日', items: ['🧧', '🏮', '🧨', '🐉', '🎄', '🎃', '🎀', '🎈', '🎂', '🎁'] },
];

const ASPECT_RATIO_OPTIONS: { id: AspectRatio; label: string }[] = [
  { id: 'original', label: '原图比例' },
  { id: '1:1', label: '1:1 方形' },
  { id: '16:9', label: '16:9 横屏' },
  { id: '9:16', label: '9:16 竖屏' },
  { id: '4:3', label: '4:3 标准' },
  { id: '3:4', label: '3:4 竖向' },
];

const THEME_OPTIONS: { id: Theme; label: string; icon: string }[] = [
  { id: 'original', label: '经典星际', icon: '🌌' },
  { id: 'tech', label: '赛博黑客', icon: '📟' },
  { id: 'cute', label: '软萌甜心', icon: '🍭' },
  { id: 'cny', label: '龙年新春', icon: '🧧' },
];

// --- MODAL COMPONENTS ---

const TutorialModal = ({ onClose }: { onClose: () => void }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content bg-glass p-8 rounded-3xl max-w-2xl w-full mx-4 border border-[var(--accent-color)]/30 shadow-2xl relative" onClick={e => e.stopPropagation()}>
      <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">✕</button>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-primary mb-2">🚀 新手指南</h2>
        <p className="text-secondary text-sm">只需四步，打造您的 AI 艺术大片</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { icon: '📸', title: '1. 上传图片', desc: '选择一张清晰的照片作为底图。' },
          { icon: '🎨', title: '2. 智能设计', desc: '选择 "风格实验室" 中的艺术风格，或输入自定义提示词。' },
          { icon: '🛠️', title: '3. 细节修饰', desc: '点击 "修饰与设计" 添加文字、贴纸，或调整光影。' },
          { icon: '✨', title: '4. 生成作品', desc: '点击 "生成 AI 视觉设计"，等待奇迹发生。' }
        ].map((step, idx) => (
          <div key={idx} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-[var(--accent-color)] transition-colors">
            <div className="text-3xl bg-black/20 w-12 h-12 rounded-full flex items-center justify-center shrink-0">{step.icon}</div>
            <div>
              <h3 className="font-bold text-primary mb-1">{step.title}</h3>
              <p className="text-xs text-secondary leading-relaxed">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <button onClick={onClose} className="w-full mt-8 btn-theme-primary py-3 rounded-xl font-bold">开始创作</button>
    </div>
  </div>
);

const HistoryModal = ({ history, onRestore, onClose }: { history: HistoryItem[], onRestore: (item: HistoryItem) => void, onClose: () => void }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content bg-glass p-6 rounded-3xl max-w-4xl w-full mx-4 border border-[var(--accent-color)]/30 shadow-2xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-primary flex items-center gap-2"><span>📜</span> 创作历史 <span className="text-sm font-normal text-secondary opacity-60">(本地存储最近5条)</span></h2>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">✕</button>
      </div>
      
      {history.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-secondary opacity-50 gap-4">
          <div className="text-6xl">🕸️</div>
          <p>暂无历史记录，快去创作吧！</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar p-2">
          {history.map(item => (
            <div key={item.id} className="group relative aspect-square rounded-xl overflow-hidden border border-white/10 cursor-pointer" onClick={() => onRestore(item)}>
              <img src={item.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="History" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                <span className="text-[var(--accent-color)] font-bold">{item.style}</span>
                <span className="text-xs text-gray-300">{new Date(item.date).toLocaleDateString()}</span>
                <button className="px-4 py-1 bg-[var(--accent-color)] rounded-full text-xs font-bold text-black mt-2">恢复查看</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

// --- MAIN APP COMPONENT ---

const LoadingScreen = ({ onFinish }: { onFinish: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onFinish, 2500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="nebula-loader">
      <div className="warp-stars"></div>
      <div className="warp-stars"></div>
      <div className="warp-stars"></div>
      <div className="loader-content">
        <div className="ai-core">
          <div className="ai-ring ring-1"></div>
          <div className="ai-ring ring-2"></div>
          <div className="text-4xl animate-bounce">🍄</div>
        </div>
        <div className="loading-text text-xl font-bold tracking-widest text-white">VISIONARY AI</div>
        <div className="loading-subtext text-blue-400 text-xs mt-2 uppercase tracking-[0.3em]">Initializing Core...</div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [loadingApp, setLoadingApp] = useState(true);
  const [currentTheme, setCurrentTheme] = useState<Theme>('original');
  const [selectedStyle, setSelectedStyle] = useState<StyleOption>(STYLE_OPTIONS[0]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [transformedImage, setTransformedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'adjust' | 'text' | 'stickers'>('adjust');
  const [error, setError] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Drag and Drop State
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'text' | 'sticker' | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Undo History
  const [historyStack, setHistoryStack] = useState<ImageAdjustments[]>([]);
  
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('art_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [adjustments, setAdjustments] = useState<ImageAdjustments>({
    brightness: 100,
    contrast: 100,
    rotation: 0,
    blurIntensity: 0,
    texts: [],
    stickers: [],
    aspectRatio: 'original'
  });

  const [textReplacements, setTextReplacements] = useState<TextReplacement[]>([]);
  const [entityModifications, setEntityModifications] = useState<EntityModification[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const hasVisited = localStorage.getItem('has_visited_v1');
    if (!hasVisited) {
      setTimeout(() => setShowTutorial(true), 3500); 
      localStorage.setItem('has_visited_v1', 'true');
    }
  }, []);

  // Keyboard Shortcuts (Ctrl+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyStack]);

  // Global Drag Events
  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      if (!draggingId || !canvasContainerRef.current) return;
      const clientX = (e as MouseEvent).clientX || (e as TouchEvent).touches[0].clientX;
      const clientY = (e as MouseEvent).clientY || (e as TouchEvent).touches[0].clientY;
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const rawX = ((clientX - rect.left) / rect.width) * 100;
      const rawY = ((clientY - rect.top) / rect.height) * 100;
      const x = Math.max(-10, Math.min(110, rawX));
      const y = Math.max(-10, Math.min(110, rawY));
      
      if (dragType === 'text') updateText(draggingId, { x, y });
      else if (dragType === 'sticker') updateSticker(draggingId, { x, y });
    };

    const handleGlobalUp = () => {
      if (draggingId) {
        setDraggingId(null);
        setDragType(null);
      }
    };

    if (draggingId) {
      window.addEventListener('mousemove', handleGlobalMove);
      window.addEventListener('mouseup', handleGlobalUp);
      window.addEventListener('touchmove', handleGlobalMove);
      window.addEventListener('touchend', handleGlobalUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, [draggingId, dragType]);

  const saveToHistory = (imageUrl: string, styleLabel: string) => {
    const newItem: HistoryItem = { id: Date.now().toString(), imageUrl, style: styleLabel, date: Date.now() };
    const newHistory = [newItem, ...history].slice(0, 5);
    setHistory(newHistory);
    try { localStorage.setItem('art_history', JSON.stringify(newHistory)); } catch (e) { console.warn("History storage failed"); }
  };

  const saveHistory = () => {
    setHistoryStack(prev => [...prev, JSON.parse(JSON.stringify(adjustments))]);
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const previousState = historyStack[historyStack.length - 1];
    const newStack = historyStack.slice(0, -1);
    setAdjustments(previousState);
    setHistoryStack(newStack);
  };

  const restoreFromHistory = (item: HistoryItem) => {
    setTransformedImage(item.imageUrl);
    setShowHistory(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setOriginalImage(base64);
        setProcessedImage(base64);
        setTransformedImage(null);
        setTextReplacements([]);
        setEntityModifications([]);
        setAdjustments({ brightness: 100, contrast: 100, rotation: 0, blurIntensity: 0, texts: [], stickers: [], aspectRatio: 'original' });
        setHistoryStack([]);
        setError(null);
        triggerAnalysis(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerAnalysis = async (image: string) => {
    setIsAnalyzing(true);
    try {
      const [texts, entities] = await Promise.all([detectTextInImage(image), detectEntitiesInImage(image)]);
      setTextReplacements(texts.map(t => ({ original: t, replacement: t })));
      setEntityModifications(entities.map(e => ({ entity: e, instruction: "" })));
    } catch (err) {
      console.error("Analysis Error:", err);
      setEntityModifications([{ entity: "人物", instruction: "" }, { entity: "背景", instruction: "" }]);
    } finally { setIsAnalyzing(false); }
  };

  // Logic functions for Text/Sticker omitted for brevity, identical to previous logic just calling saveHistory()
  const addText = () => {
    saveHistory();
    const newText: PosterText = { id: Math.random().toString(36).substr(2, 9), content: "点击编辑文本", style: 'elegant', x: 50, y: 50, fontSize: 1, fontFamily: 'Noto Sans SC', color: '#ffffff', shadowBlur: 4, glowSize: 0 };
    setAdjustments(prev => ({ ...prev, texts: [...(prev.texts || []), newText] }));
  };
  const updateText = (id: string, updates: Partial<PosterText>) => setAdjustments(prev => ({ ...prev, texts: prev.texts?.map(t => t.id === id ? { ...t, ...updates } : t) }));
  const removeText = (id: string) => { saveHistory(); setAdjustments(prev => ({ ...prev, texts: prev.texts?.filter(t => t.id !== id) })); };
  
  const addSticker = (content: string) => {
    saveHistory();
    const newSticker: Sticker = { id: Math.random().toString(36).substr(2, 9), content, x: 50, y: 50, scale: 1, rotation: 0 };
    setAdjustments(prev => ({ ...prev, stickers: [...(prev.stickers || []), newSticker] }));
  };
  const updateSticker = (id: string, updates: Partial<Sticker>) => setAdjustments(prev => ({ ...prev, stickers: prev.stickers?.map(s => s.id === id ? { ...s, ...updates } : s) }));
  const removeSticker = (id: string) => { saveHistory(); setAdjustments(prev => ({ ...prev, stickers: prev.stickers?.filter(s => s.id !== id) })); };
  
  const moveStickerToFront = (id: string) => {
    saveHistory();
    setAdjustments(prev => {
      const stickers = [...(prev.stickers || [])];
      const index = stickers.findIndex(s => s.id === id);
      if (index === -1 || index === stickers.length - 1) return prev;
      const [item] = stickers.splice(index, 1);
      stickers.push(item);
      return { ...prev, stickers };
    });
  };
  const moveStickerToBack = (id: string) => {
    saveHistory();
    setAdjustments(prev => {
      const stickers = [...(prev.stickers || [])];
      const index = stickers.findIndex(s => s.id === id);
      if (index === -1 || index === 0) return prev;
      const [item] = stickers.splice(index, 1);
      stickers.unshift(item);
      return { ...prev, stickers };
    });
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, id: string, type: 'text' | 'sticker') => {
    e.stopPropagation();
    saveHistory();
    setDraggingId(id);
    setDragType(type);
  };

  const handleApplyEdits = async () => {
    if (!originalImage) return;
    setIsEditing(false);
    setIsLoading(true);
    try {
      const processed = await processImage(originalImage, adjustments);
      setProcessedImage(processed);
      setTransformedImage(null);
    } catch (err) { setError("处理图片失败"); } finally { setIsLoading(false); }
  };

  const handleTransform = async () => {
    const targetImage = processedImage || originalImage;
    if (!targetImage) { setError("请先上传一张图片"); return; }
    setIsLoading(true); setError(null);
    try {
      const result = await transformImage(targetImage, selectedStyle, customPrompt, textReplacements, entityModifications);
      setTransformedImage(result);
      saveToHistory(result, selectedStyle.label);
    } catch (err: any) { setError(err.message || "转换失败，请重试"); } finally { setIsLoading(false); }
  };

  const handleDownload = () => {
    if (!transformedImage) return;
    const link = document.createElement('a');
    link.href = transformedImage;
    link.download = `ai-poster-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reset = () => {
    if (window.confirm("确定要重置所有内容吗？当前操作不可撤销。")) {
        setOriginalImage(null); setProcessedImage(null); setTransformedImage(null);
        setTextReplacements([]); setEntityModifications([]); setCustomPrompt("");
        setAdjustments({ brightness: 100, contrast: 100, rotation: 0, blurIntensity: 0, texts: [], stickers: [], aspectRatio: 'original' });
        setHistoryStack([]); setError(null);
    }
  };

  const previewStyle = useMemo(() => ({
    filter: `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%)`,
    transform: `rotate(${adjustments.rotation}deg)`,
    transition: 'filter 0.2s, transform 0.3s ease-out'
  }), [adjustments]);

  useEffect(() => { document.body.className = `theme-${currentTheme}`; }, [currentTheme]);

  if (loadingApp) return <LoadingScreen onFinish={() => setLoadingApp(false)} />;

  return (
    <div className={`futuristic-container theme-${currentTheme} flex flex-col transition-colors duration-500`}>
      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
      {showHistory && <HistoryModal history={history} onRestore={restoreFromHistory} onClose={() => setShowHistory(false)} />}

      <header className="sticky top-0 z-50 glass px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[var(--accent-color)] to-[var(--text-secondary)] rounded-xl flex items-center justify-center shadow-[0_0_20px_var(--accent-glow)]">
            <span className="text-2xl">🍄</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-primary"><span className="text-accent font-black">AI</span> 设计风格迁移神器</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-secondary font-semibold leading-none">AI Style Transfer Masterpiece</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden md:flex bg-card rounded-full p-1 border border-theme mr-4">
            {THEME_OPTIONS.map(theme => (
              <button key={theme.id} onClick={() => setCurrentTheme(theme.id)} className={`p-2 rounded-full text-xs transition-all ${currentTheme === theme.id ? 'bg-[var(--accent-color)] text-[var(--bg-color)] shadow-lg scale-105' : 'text-secondary hover:text-primary'}`} title={theme.label}>{theme.icon}</button>
            ))}
          </div>
          {historyStack.length > 0 && (
             <button onClick={handleUndo} className="btn-theme-secondary text-sm px-4 py-2 rounded-full transition-all flex items-center gap-1" title="撤销 (Ctrl+Z)"><span>↩️</span> 撤销</button>
          )}
          <button onClick={() => setShowTutorial(true)} className="btn-theme-secondary text-sm px-4 py-2 rounded-full transition-all hover:bg-[var(--accent-color)]/20">📚 教程</button>
          <button onClick={() => setShowHistory(true)} className="btn-theme-secondary text-sm px-4 py-2 rounded-full transition-all hover:bg-[var(--accent-color)]/20">📜 历史</button>
          <button onClick={reset} className="text-sm px-5 py-2 rounded-full border border-red-500/30 bg-red-500/10 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-all font-bold">🗑️ 重置</button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="flex-1 min-h-[500px] rounded-[2.5rem] bg-glass border-2 border-dashed border-theme flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl">
            {!originalImage ? (
              <div className="flex flex-col items-center text-center p-8 animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 rounded-3xl bg-card flex items-center justify-center mb-8 text-4xl shadow-inner group-hover:scale-110 transition-transform duration-500 text-accent ring-1 ring-white/10">📸</div>
                <h2 className="text-3xl font-bold mb-3 text-primary tracking-tight">上传您的海报/照片</h2>
                <p className="text-secondary mb-10 max-w-sm leading-relaxed">AI 智能重绘，一键生成艺术大片。</p>
                <button onClick={() => fileInputRef.current?.click()} className="btn-theme-primary font-bold px-12 py-5 rounded-2xl text-lg transition-all shadow-xl hover:shadow-[0_0_30px_var(--accent-glow)]">立即上传</button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              </div>
            ) : (
              <div className="w-full h-full flex flex-col gap-4 p-6">
                <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
                  <div ref={canvasContainerRef} className="flex-1 relative rounded-3xl overflow-hidden border border-theme bg-black/40 flex items-center justify-center group/canvas select-none shadow-inner">
                    <img src={originalImage} alt="Original" className="max-w-full max-h-full object-contain transition-all duration-300 pointer-events-none" style={isEditing ? previewStyle : {}} />
                    {isEditing && (
                      <>
                        {adjustments.blurIntensity > 0 && <div className="absolute inset-0 pointer-events-none" style={{ backdropFilter: `blur(${adjustments.blurIntensity}px)`, maskImage: 'radial-gradient(circle at center, transparent 30%, black 80%)', WebkitMaskImage: 'radial-gradient(circle at center, transparent 30%, black 80%)' }}></div>}
                        {adjustments.texts?.map(t => (
                          <div key={t.id} className={`absolute border-2 border-dashed px-2 py-1 rounded text-[10px] text-white whitespace-nowrap cursor-move transition-transform active:scale-105 active:border-white ${draggingId === t.id ? 'z-50 border-white scale-105' : 'border-[var(--accent-color)] bg-[var(--accent-color)]/20 hover:bg-[var(--accent-color)]/40'}`} style={{ left: `${t.x}%`, top: `${t.y}%`, transform: 'translate(-50%, -50%)', fontFamily: t.fontFamily }} onMouseDown={(e) => handleDragStart(e, t.id, 'text')} onTouchStart={(e) => handleDragStart(e, t.id, 'text')}>{t.content}</div>
                        ))}
                        {adjustments.stickers?.map(s => (
                          <div key={s.id} className={`absolute cursor-move transition-transform active:scale-110 ${draggingId === s.id ? 'z-50 scale-110 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]'}`} style={{ left: `${s.x}%`, top: `${s.y}%`, transform: `translate(-50%, -50%) rotate(${s.rotation}deg) scale(${s.scale})` }} onMouseDown={(e) => handleDragStart(e, s.id, 'sticker')} onTouchStart={(e) => handleDragStart(e, s.id, 'sticker')}><span className="text-4xl filter drop-shadow-md select-none">{s.content}</span></div>
                        ))}
                      </>
                    )}
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-[10px] text-slate-300 border border-white/10 font-bold uppercase tracking-wider pointer-events-none">{isEditing ? '编辑模式' : '预览模式'}</div>
                    {!isEditing && !transformedImage && (
                      <button onClick={() => setIsEditing(true)} className="absolute bottom-6 right-6 btn-theme-secondary backdrop-blur-md px-6 py-3 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 transform hover:scale-105"><span className="text-lg">🛠️</span> 修饰与设计</button>
                    )}
                  </div>
                  {(transformedImage || isLoading) && (
                    <div className="flex-1 relative rounded-3xl overflow-hidden border border-[var(--accent-color)] bg-[var(--accent-color)]/10 flex items-center justify-center shadow-2xl">
                      {isLoading ? (
                        <div className="flex flex-col items-center gap-5 p-8 text-center">
                          <div className="relative"><div className="w-16 h-16 border-4 border-[var(--accent-color)]/30 border-t-[var(--accent-color)] rounded-full animate-spin"></div><div className="absolute inset-0 bg-[var(--accent-color)]/20 blur-2xl animate-pulse"></div></div>
                          <div><p className="text-sm font-bold tracking-widest text-accent uppercase mb-2">AI 正在绘图中...</p><p className="text-[10px] text-secondary">正在应用 {selectedStyle.label} 风格</p></div>
                        </div>
                      ) : (
                        <>
                          <img src={transformedImage!} alt="Transformed" className="w-full h-full object-contain" />
                          <div className="absolute top-4 left-4 bg-[var(--accent-color)] text-[var(--bg-color)] px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/20 shadow-lg">最终成品</div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div className="p-6 bg-glass border border-theme rounded-3xl animate-in slide-in-from-bottom-6 shadow-2xl flex flex-col h-[400px]">
                    <div className="flex gap-6 mb-4 border-b border-theme pb-2">
                       {['adjust', 'text', 'stickers'].map(tab => (
                         <button key={tab} onClick={() => setActiveTab(tab as any)} className={`text-xs font-bold pb-2 transition-all uppercase tracking-wide ${activeTab === tab ? 'text-[var(--accent-color)] border-b-2 border-[var(--accent-color)]' : 'text-secondary hover:text-primary'}`}>
                           {tab === 'adjust' && '🖼️ 基础调整'}
                           {tab === 'text' && '📝 标题美化'}
                           {tab === 'stickers' && '🧸 贴纸素材'}
                         </button>
                       ))}
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                      {activeTab === 'adjust' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="bg-card p-4 rounded-xl border border-theme space-y-4">
                                    <h4 className="text-[10px] font-bold uppercase text-accent">图像质感</h4>
                                    <div><div className="flex justify-between text-[10px] text-secondary mb-1">Blur</div><input type="range" min="0" max="20" onPointerDown={saveHistory} value={adjustments.blurIntensity} onChange={(e) => setAdjustments(p => ({ ...p, blurIntensity: +e.target.value }))} className="w-full accent-[var(--accent-color)] h-1 bg-slate-700 rounded-lg" /></div>
                                    <div><div className="flex justify-between text-[10px] text-secondary mb-1">Brightness</div><input type="range" min="0" max="200" onPointerDown={saveHistory} value={adjustments.brightness} onChange={(e) => setAdjustments(p => ({ ...p, brightness: +e.target.value }))} className="w-full accent-[var(--accent-color)] h-1 bg-slate-700 rounded-lg" /></div>
                                    <div><div className="flex justify-between text-[10px] text-secondary mb-1">Contrast</div><input type="range" min="0" max="200" onPointerDown={saveHistory} value={adjustments.contrast} onChange={(e) => setAdjustments(p => ({ ...p, contrast: +e.target.value }))} className="w-full accent-[var(--accent-color)] h-1 bg-slate-700 rounded-lg" /></div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-card p-4 rounded-xl border border-theme">
                                    <h4 className="text-[10px] font-bold uppercase text-accent mb-3">构图调整</h4>
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        {ASPECT_RATIO_OPTIONS.map(ratio => (
                                        <button key={ratio.id} onClick={() => { saveHistory(); setAdjustments(prev => ({ ...prev, aspectRatio: ratio.id })); }} className={`text-[10px] py-2 rounded-lg border transition-all ${adjustments.aspectRatio === ratio.id ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-[var(--bg-color)]' : 'bg-transparent border-white/10 text-secondary hover:bg-white/5'}`}>{ratio.label}</button>
                                        ))}
                                    </div>
                                    <button onClick={() => { saveHistory(); setAdjustments(p => ({ ...p, rotation: (p.rotation + 90) % 360 })); }} className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold text-secondary transition-all flex items-center justify-center gap-2"><span>🔄</span> 顺时针旋转 90°</button>
                                </div>
                            </div>
                        </div>
                      )}
                      {activeTab === 'text' && (
                        <div className="flex flex-col h-full">
                           <button onClick={addText} className="text-[10px] btn-theme-primary px-3 py-2 rounded-xl font-bold transition-all mb-4 self-start w-full md:w-auto">+ 添加文字图层</button>
                           <div className="space-y-3">
                              {adjustments.texts?.map(t => (
                                <div key={t.id} className={`p-4 bg-card rounded-xl border space-y-3 hover:border-[var(--accent-color)] transition-colors ${draggingId === t.id ? 'border-[var(--accent-color)]' : 'border-theme'}`}>
                                  <div className="flex gap-2">
                                    <input type="text" onFocus={saveHistory} value={t.content} onChange={(e) => updateText(t.id, { content: e.target.value })} className="flex-1 bg-transparent text-sm font-bold text-primary border-b border-theme outline-none focus:border-[var(--accent-color)] py-1" />
                                    <button onClick={() => removeText(t.id)} className="text-secondary hover:text-red-400">✕</button>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {TEXT_STYLE_OPTIONS.map(s => (
                                      <button key={s.id} onClick={() => { saveHistory(); updateText(t.id, { style: s.id }); }} className={`text-[9px] px-2 py-1 rounded-lg border transition-all ${t.style === s.id ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-[var(--bg-color)]' : 'bg-transparent border-white/10 text-secondary'}`}>{s.label}</button>
                                    ))}
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                     <div className="flex items-center gap-2"><span className="text-[8px] text-secondary">大小</span><input type="range" min="0.5" max="3" step="0.1" onPointerDown={saveHistory} value={t.fontSize} onChange={(e) => updateText(t.id, { fontSize: +e.target.value })} className="flex-1 accent-[var(--accent-color)] h-1 bg-slate-700 rounded-lg" /></div>
                                     <div className="flex items-center gap-2"><span className="text-[8px] text-secondary">颜色</span><input type="color" onFocus={saveHistory} value={t.color || '#ffffff'} onChange={(e) => updateText(t.id, { color: e.target.value, style: 'custom' })} className="w-full h-4 rounded cursor-pointer border-none bg-transparent" /></div>
                                  </div>
                                </div>
                              ))}
                           </div>
                        </div>
                      )}
                      {activeTab === 'stickers' && (
                        <div>
                             <div className="mb-8">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent mb-4">贴纸库</h4>
                                <div className="space-y-6">
                                    {STICKER_PACKS.map(pack => (
                                        <div key={pack.category}>
                                            <h5 className="text-[10px] text-secondary mb-3 flex items-center gap-2"><span className="w-1 h-1 bg-[var(--accent-color)] rounded-full"></span> {pack.category}</h5>
                                            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-3">
                                                {pack.items.map(item => (
                                                    <button key={item} onClick={() => addSticker(item)} className="aspect-square flex items-center justify-center bg-white/5 border border-white/5 rounded-xl text-2xl hover:bg-[var(--accent-color)]/20 hover:border-[var(--accent-color)] hover:scale-125 transition-all duration-300 shadow-lg group">
                                                      <span className="group-hover:animate-bounce">{item}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                             </div>
                             <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent mb-3">已添加图层</h4>
                             <div className="space-y-2">
                                {adjustments.stickers?.map(s => (
                                    <div key={s.id} className={`p-3 bg-card rounded-xl border flex flex-col gap-2 ${draggingId === s.id ? 'border-[var(--accent-color)]' : 'border-theme'}`}>
                                        <div className="flex items-center gap-3 w-full">
                                            <span className="text-2xl shrink-0 drop-shadow-md">{s.content}</span>
                                            <div className="flex-1 grid grid-cols-2 gap-3">
                                                <input type="range" min="0.5" max="3" step="0.1" onPointerDown={saveHistory} value={s.scale} onChange={(e) => updateSticker(s.id, { scale: +e.target.value })} className="w-full accent-[var(--accent-color)] h-1 bg-slate-700" title="缩放" />
                                                <input type="range" min="0" max="360" onPointerDown={saveHistory} value={s.rotation} onChange={(e) => updateSticker(s.id, { rotation: +e.target.value })} className="w-full accent-[var(--accent-color)] h-1 bg-slate-700" title="旋转" />
                                            </div>
                                            <button onClick={() => removeSticker(s.id)} className="w-6 h-6 rounded-full bg-white/5 hover:bg-red-500/20 text-secondary hover:text-red-400 flex items-center justify-center transition-colors">✕</button>
                                        </div>
                                        <div className="flex gap-2 justify-end w-full border-t border-white/5 pt-2">
                                           <button onClick={() => moveStickerToBack(s.id)} className="text-[9px] px-3 py-1 rounded-md bg-black/30 hover:bg-[var(--accent-color)] hover:text-black transition-colors">⬇️ 置底</button>
                                           <button onClick={() => moveStickerToFront(s.id)} className="text-[9px] px-3 py-1 rounded-md bg-black/30 hover:bg-[var(--accent-color)] hover:text-black transition-colors">⬆️ 置顶</button>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-theme">
                      <button onClick={() => setIsEditing(false)} className="px-6 py-2.5 text-xs font-bold text-secondary hover:text-primary transition-colors">取消</button>
                      <button onClick={handleApplyEdits} className="px-8 py-2.5 btn-theme-primary rounded-xl text-xs font-bold transition-all transform hover:scale-105">应用修改</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-glass rounded-[2.5rem] p-6 border border-theme h-full flex flex-col shadow-2xl relative max-h-[90vh]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-color)] opacity-5 blur-3xl rounded-full pointer-events-none"></div>
            <div className="overflow-y-auto custom-scrollbar flex-1 pr-1 space-y-8">
              <section>
                <h3 className="text-sm font-bold mb-4 flex items-center gap-3 text-primary uppercase tracking-widest opacity-80"><span className="w-6 h-6 rounded-full bg-[var(--accent-color)] flex items-center justify-center text-[var(--bg-color)] text-[10px]">01</span> 风格实验室</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[...STYLE_OPTIONS, { id: ArtStyle.CUSTOM, label: '完全定制', icon: '✍️', description: '自定义提示词', prompt: '' }].map((style) => (
                    <StyleCard key={style.id} style={style} isSelected={selectedStyle.id === style.id} onSelect={(s) => setSelectedStyle(s as any)} />
                  ))}
                </div>
                {selectedStyle.id === ArtStyle.CUSTOM && (
                  <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                    <textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder="请描述您想要的画面风格..." className="w-full h-24 bg-card border border-theme rounded-xl p-3 text-xs text-primary focus:outline-none focus:border-[var(--accent-color)] transition-all placeholder:text-secondary resize-none" />
                  </div>
                )}
              </section>
              {originalImage && (
                <>
                  <section>
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-3 text-primary uppercase tracking-widest opacity-80"><span className="w-6 h-6 rounded-full bg-[var(--accent-color)] flex items-center justify-center text-[var(--bg-color)] text-[10px]">02</span> AI 语义替换</h3>
                    {isAnalyzing ? <div className="p-4 bg-card rounded-2xl flex items-center gap-3 text-[10px] text-secondary border border-theme"><div className="w-4 h-4 border-2 border-[var(--accent-color)]/30 border-t-[var(--accent-color)] rounded-full animate-spin"></div><span>正在分析画面内容...</span></div> : textReplacements.length > 0 ? <div className="space-y-2">{textReplacements.map((tr, idx) => <div key={idx} className="p-3 rounded-xl bg-card border border-theme hover:border-[var(--accent-color)] transition-colors"><label className="block text-[9px] uppercase tracking-widest text-secondary mb-1">原文: "{tr.original}"</label><input type="text" value={tr.replacement} onChange={(e) => { const n = [...textReplacements]; n[idx].replacement = e.target.value; setTextReplacements(n); }} className="w-full bg-transparent text-xs text-accent font-medium outline-none placeholder:text-secondary" placeholder="输入替换文字..." /></div>)}</div> : <p className="text-[10px] text-secondary text-center py-2">未检测到显著文字</p>}
                  </section>
                  <section>
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-3 text-primary uppercase tracking-widest opacity-80"><span className="w-6 h-6 rounded-full bg-[var(--accent-color)] flex items-center justify-center text-[var(--bg-color)] text-[10px]">03</span> 主体智能改造</h3>
                    <div className="space-y-2">{entityModifications.map((em, idx) => <div key={idx} className="p-3 rounded-xl bg-card border border-theme hover:border-[var(--accent-color)] transition-colors"><label className="block text-[9px] uppercase tracking-widest text-secondary mb-1">识别对象: {em.entity}</label><input type="text" value={em.instruction} placeholder="例如: 变成赛博机械风格..." onChange={(e) => { const n = [...entityModifications]; n[idx].instruction = e.target.value; setEntityModifications(n); }} className="w-full bg-transparent text-xs text-accent font-medium outline-none placeholder:text-secondary" /></div>)}</div>
                  </section>
                </>
              )}
            </div>
            <div className="pt-4 mt-4 border-t border-theme space-y-3 z-10 bg-glass -mx-2 px-2 pb-2">
              {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] flex gap-2 items-center"><span>⚠️</span> {error}</div>}
              <button onClick={handleTransform} disabled={isLoading || !originalImage || isEditing} className={`w-full py-4 rounded-2xl font-black text-lg shadow-2xl transition-all flex items-center justify-center gap-2 ${isLoading || !originalImage || isEditing ? 'bg-card text-secondary cursor-not-allowed' : 'btn-theme-primary hover:scale-[1.02]'}`}>{isLoading ? <><div className="w-5 h-5 border-2 border-[var(--bg-color)]/20 border-t-[var(--bg-color)] rounded-full animate-spin"></div><span>艺术计算中...</span></> : <span>生成 AI 视觉设计 🚀</span>}</button>
              {transformedImage && !isLoading && <button onClick={handleDownload} className="w-full py-3.5 rounded-2xl font-bold text-sm btn-theme-secondary flex items-center justify-center gap-2"><span>📥</span> 导出高清成品</button>}
            </div>
          </div>
        </div>
      </main>
      <footer className="py-6 text-center relative z-10"><p className="text-secondary text-[10px] font-bold uppercase tracking-[0.3em] opacity-60">@2025 AI 视觉海报设计 V 1.0 WINDY(china) EDITION</p></footer>
    </div>
  );
};

export default App;
