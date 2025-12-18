
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ArtStyle, StyleOption, TextReplacement, EntityModification, PosterText, TextStyle, AspectRatio, HistoryItem } from './types';
import { STYLE_OPTIONS } from './constants';
import { StyleCard } from './components/StyleCard';
import { transformImage, detectTextInImage, detectEntitiesInImage } from './services/geminiService';
import { processImage, ImageAdjustments } from './services/imageUtils';

const TEXT_STYLE_OPTIONS: { id: TextStyle; label: string; icon: string }[] = [
  { id: 'neon', label: '赛博霓虹', icon: '🔮' },
  { id: 'elegant', label: '雅致衬线', icon: '📜' },
  { id: 'bold', label: '硬核标题', icon: '📢' },
  { id: 'traditional', label: '古典纵排', icon: '🖋️' },
  { id: 'brush', label: '艺术泼墨', icon: '🎨' },
];

const ASPECT_RATIO_OPTIONS: { id: AspectRatio; label: string }[] = [
  { id: 'original', label: '原图比例' },
  { id: '1:1', label: '1:1 方形' },
  { id: '16:9', label: '16:9 横屏' },
  { id: '9:16', label: '9:16 竖屏' },
  { id: '4:3', label: '4:3 标准' },
  { id: '3:4', label: '3:4 竖向' },
];

const App: React.FC = () => {
  const [selectedStyle, setSelectedStyle] = useState<StyleOption>(STYLE_OPTIONS[0]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [transformedImage, setTransformedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
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
    texts: [],
    aspectRatio: 'original'
  });

  const [textReplacements, setTextReplacements] = useState<TextReplacement[]>([]);
  const [entityModifications, setEntityModifications] = useState<EntityModification[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-open tutorial on first visit
  useEffect(() => {
    const hasVisited = localStorage.getItem('has_visited_v1');
    if (!hasVisited) {
      setShowTutorial(true);
      localStorage.setItem('has_visited_v1', 'true');
    }
  }, []);

  const saveToHistory = (imageUrl: string, styleLabel: string) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      imageUrl,
      style: styleLabel,
      date: Date.now()
    };
    const newHistory = [newItem, ...history].slice(0, 5); // Limit to 5
    setHistory(newHistory);
    try {
      localStorage.setItem('art_history', JSON.stringify(newHistory));
    } catch (e) {
      console.warn("History storage failed (likely quota exceeded)");
    }
  };

  const restoreFromHistory = (item: HistoryItem) => {
    setTransformedImage(item.imageUrl);
    setShowHistory(false);
    // Note: We don't restore original image/edits as we only save the final result to save space
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
        setAdjustments({ brightness: 100, contrast: 100, rotation: 0, texts: [], aspectRatio: 'original' });
        setError(null);
        triggerAnalysis(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerAnalysis = async (image: string) => {
    setIsAnalyzing(true);
    try {
      const [texts, entities] = await Promise.all([
        detectTextInImage(image),
        detectEntitiesInImage(image)
      ]);
      setTextReplacements(texts.map(t => ({ original: t, replacement: t })));
      setEntityModifications(entities.map(e => ({ entity: e, instruction: "" })));
    } catch (err) {
      console.error("Analysis Error:", err);
      setEntityModifications([{ entity: "人物", instruction: "" }, { entity: "背景", instruction: "" }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addText = () => {
    const newText: PosterText = {
      id: Math.random().toString(36).substr(2, 9),
      content: "点击编辑文本",
      style: 'elegant',
      x: 50,
      y: 50,
      fontSize: 1
    };
    setAdjustments(prev => ({ ...prev, texts: [...(prev.texts || []), newText] }));
  };

  const updateText = (id: string, updates: Partial<PosterText>) => {
    setAdjustments(prev => ({
      ...prev,
      texts: prev.texts?.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
  };

  const removeText = (id: string) => {
    setAdjustments(prev => ({
      ...prev,
      texts: prev.texts?.filter(t => t.id !== id)
    }));
  };

  const handleApplyEdits = async () => {
    if (!originalImage) return;
    setIsEditing(false);
    setIsLoading(true);
    try {
      const processed = await processImage(originalImage, adjustments);
      setProcessedImage(processed);
      setTransformedImage(null);
      // Re-analyze only if needed, but for now simple re-processing
      // triggerAnalysis(processed); // Optional: re-analyze modified image
    } catch (err) {
      setError("处理图片失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransform = async () => {
    const targetImage = processedImage || originalImage;
    if (!targetImage) {
      setError("请先上传一张图片");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await transformImage(
        targetImage, 
        selectedStyle, 
        customPrompt, 
        textReplacements,
        entityModifications
      );
      setTransformedImage(result);
      saveToHistory(result, selectedStyle.label);
    } catch (err: any) {
      setError(err.message || "转换失败，请重试");
    } finally {
      setIsLoading(false);
    }
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
    setOriginalImage(null);
    setProcessedImage(null);
    setTransformedImage(null);
    setTextReplacements([]);
    setEntityModifications([]);
    setCustomPrompt("");
    setAdjustments({ brightness: 100, contrast: 100, rotation: 0, texts: [], aspectRatio: 'original' });
    setError(null);
  };

  const previewStyle = useMemo(() => ({
    filter: `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%)`,
    transform: `rotate(${adjustments.rotation}deg)`,
    transition: 'filter 0.2s, transform 0.3s ease-out'
  }), [adjustments]);

  return (
    <div className="futuristic-container flex flex-col">
      <div className="bottom-glow"></div>
      <div className="grid-perspective"></div>
      <div className="scanline"></div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] transition-shadow">
            <span className="text-2xl">🍄</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white"><span className="text-blue-500 font-black">AI</span> 设计风格迁移神器</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-blue-400/60 font-semibold leading-none">AI Style Transfer Masterpiece</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowTutorial(true)} className="btn-secondary-shine text-sm px-4 py-2 rounded-full text-slate-300 hover:text-white">📚 教程</button>
          <button onClick={() => setShowHistory(true)} className="btn-secondary-shine text-sm px-4 py-2 rounded-full text-slate-300 hover:text-white">📜 历史</button>
          <button onClick={reset} className="text-sm px-5 py-2 rounded-full border border-white/10 hover:bg-red-500/20 hover:border-red-500/30 transition-all text-slate-300 hover:text-red-200">重置</button>
        </div>
      </header>

      {/* Tutorial Modal */}
      {showTutorial && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-blue-500/30 rounded-3xl p-8 max-w-2xl w-full relative shadow-2xl">
            <button onClick={() => setShowTutorial(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl">✕</button>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">✨ 快速入门指南</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shrink-0">1</div>
                <div>
                  <h3 className="font-bold text-white mb-1">上传图片</h3>
                  <p className="text-sm text-slate-400">点击左侧的大图标上传您想要转换的海报或照片。</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shrink-0">2</div>
                <div>
                  <h3 className="font-bold text-white mb-1">修饰与设计</h3>
                  <p className="text-sm text-slate-400">点击图片下方的“修饰与设计”按钮。在此您可以<b>调整尺寸比例</b>、旋转图片、调整亮度，并<b>添加艺术标题</b>。</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shrink-0">3</div>
                <div>
                  <h3 className="font-bold text-white mb-1">AI 风格化与修改</h3>
                  <p className="text-sm text-slate-400">在右侧选择一种艺术风格（包含国潮、韩漫、手绘等）。如果AI检测到文字或物体，您可以直接输入新内容进行替换。</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shrink-0">4</div>
                <div>
                  <h3 className="font-bold text-white mb-1">生成与保存</h3>
                  <p className="text-sm text-slate-400">点击“生成 AI 视觉设计”，稍等片刻，即可下载您的专属艺术海报。</p>
                </div>
              </div>
            </div>
            <button onClick={() => setShowTutorial(false)} className="w-full mt-8 py-3 btn-shine rounded-xl font-bold text-white text-lg">开始创作</button>
          </div>
        </div>
      )}

      {/* History Drawer */}
      {showHistory && (
        <div className="fixed inset-y-0 right-0 z-[90] w-80 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 p-6 shadow-2xl animate-in slide-in-from-right duration-300">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">📜 历史记录</h2>
            <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <div className="space-y-4 overflow-y-auto h-[calc(100vh-100px)] custom-scrollbar">
            {history.length === 0 ? (
              <p className="text-slate-500 text-center py-10">暂无生成记录</p>
            ) : (
              history.map(item => (
                <div key={item.id} className="bg-white/5 rounded-xl overflow-hidden border border-white/5 hover:border-blue-500/50 transition-all group">
                  <div className="aspect-square relative">
                    <img src={item.imageUrl} alt="History" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button onClick={() => restoreFromHistory(item)} className="bg-blue-600 px-4 py-2 rounded-full text-xs font-bold text-white hover:bg-blue-500">查看/恢复</button>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-xs font-bold text-blue-300 mb-1">{item.style}</div>
                    <div className="text-[10px] text-slate-500">{new Date(item.date).toLocaleString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        {/* Editor Area */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="flex-1 min-h-[500px] rounded-[2.5rem] bg-slate-900/40 backdrop-blur-md border-2 border-dashed border-slate-800/50 flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl">
            {!originalImage ? (
              <div className="flex flex-col items-center text-center p-8">
                <div className="w-24 h-24 rounded-3xl bg-slate-800/80 flex items-center justify-center mb-8 text-4xl shadow-inner group-hover:scale-110 transition-transform duration-500 text-blue-500">📸</div>
                <h2 className="text-3xl font-bold mb-3 text-white tracking-tight">上传您的海报/照片</h2>
                <p className="text-slate-400 mb-10 max-w-sm leading-relaxed">AI 智能重绘，一键生成艺术大片。<br/>支持尺寸修改、文本添加与风格迁移。</p>
                <button onClick={() => fileInputRef.current?.click()} className="btn-shine text-white font-bold px-12 py-5 rounded-2xl text-lg transition-all shadow-xl">立即上传</button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              </div>
            ) : (
              <div className="w-full h-full flex flex-col gap-4 p-6">
                <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
                  {/* Canvas View */}
                  <div className="flex-1 relative rounded-3xl overflow-hidden border border-white/5 bg-black/40 flex items-center justify-center group/canvas">
                    <img src={originalImage} alt="Original" className="max-w-full max-h-full object-contain transition-all duration-300" style={isEditing ? previewStyle : {}} />
                    
                    {/* Text Overlay Previews (Only simplified view when editing) */}
                    {isEditing && adjustments.texts?.map(t => (
                      <div key={t.id} className="absolute border-2 border-dashed border-blue-400/50 bg-blue-500/20 px-2 py-1 rounded text-[10px] text-white pointer-events-none whitespace-nowrap"
                        style={{ left: `${t.x}%`, top: `${t.y}%`, transform: 'translate(-50%, -50%)' }}>
                        {t.content}
                      </div>
                    ))}

                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-[10px] text-slate-300 border border-white/10 font-bold uppercase tracking-wider">
                      {isEditing ? '编辑预览模式' : '原始图像'}
                    </div>

                    {!isEditing && !transformedImage && (
                      <button onClick={() => setIsEditing(true)} className="absolute bottom-6 right-6 btn-secondary-shine backdrop-blur-md px-6 py-3 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 transform hover:scale-105 text-white">
                        <span className="text-lg">🛠️</span> 修饰与设计
                      </button>
                    )}
                  </div>

                  {/* Transformed Result */}
                  {(transformedImage || isLoading) && (
                    <div className="flex-1 relative rounded-3xl overflow-hidden border border-blue-500/40 bg-blue-900/10 flex items-center justify-center shadow-2xl">
                      {isLoading ? (
                        <div className="flex flex-col items-center gap-5 p-8 text-center">
                          <div className="relative">
                            <div className="w-16 h-16 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 bg-blue-500/20 blur-2xl animate-pulse"></div>
                          </div>
                          <div>
                            <p className="text-sm font-bold tracking-widest text-blue-400 uppercase mb-2">AI 正在绘图中...</p>
                            <p className="text-[10px] text-slate-500">正在应用 {selectedStyle.label} 风格</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <img src={transformedImage!} alt="Transformed" className="w-full h-full object-contain" />
                          <div className="absolute top-4 left-4 bg-blue-600 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/20 shadow-lg">最终成品</div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Advanced Editor Panel */}
                {isEditing && (
                  <div className="p-6 bg-slate-800/95 backdrop-blur-3xl border border-white/10 rounded-3xl animate-in slide-in-from-bottom-6 shadow-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left: Basic Adjustments */}
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-4">画面比例与修饰</h4>
                          <div className="grid grid-cols-3 gap-2 mb-4">
                            {ASPECT_RATIO_OPTIONS.map(ratio => (
                              <button
                                key={ratio.id}
                                onClick={() => setAdjustments(prev => ({ ...prev, aspectRatio: ratio.id }))}
                                className={`text-[10px] py-2 rounded-lg border transition-all ${adjustments.aspectRatio === ratio.id ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700/50 border-transparent text-slate-400 hover:bg-slate-700'}`}
                              >
                                {ratio.label}
                              </button>
                            ))}
                          </div>
                          
                          <div className="space-y-3 p-4 bg-white/5 rounded-2xl">
                            <div className="flex justify-between text-[10px] text-slate-400"><span>亮度</span><span>{adjustments.brightness}%</span></div>
                            <input type="range" min="0" max="200" value={adjustments.brightness} onChange={(e) => setAdjustments(p => ({ ...p, brightness: +e.target.value }))} className="w-full accent-blue-500 h-1 bg-slate-700 rounded-lg appearance-none" />
                            
                            <div className="flex justify-between text-[10px] text-slate-400 mt-2"><span>对比度</span><span>{adjustments.contrast}%</span></div>
                            <input type="range" min="0" max="200" value={adjustments.contrast} onChange={(e) => setAdjustments(p => ({ ...p, contrast: +e.target.value }))} className="w-full accent-blue-500 h-1 bg-slate-700 rounded-lg appearance-none" />
                          </div>
                          
                          <button onClick={() => setAdjustments(p => ({ ...p, rotation: (p.rotation + 90) % 360 }))} className="w-full mt-3 py-2 bg-slate-700/50 hover:bg-slate-700 border border-white/5 rounded-xl text-[10px] font-bold text-slate-300 transition-all flex items-center justify-center gap-2">
                            <span>🔄</span> 顺时针旋转 90°
                          </button>
                        </div>
                      </div>

                      {/* Right: Text Controls */}
                      <div className="flex flex-col h-full">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-400">添加海报标题</h4>
                          <button onClick={addText} className="text-[10px] bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-full font-bold text-white transition-all shadow-lg hover:shadow-blue-500/25">+ 新建文本</button>
                        </div>
                        
                        <div className="space-y-3 overflow-y-auto max-h-[220px] pr-2 custom-scrollbar flex-1">
                          {adjustments.texts?.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 text-[10px] border-2 border-dashed border-white/5 rounded-xl min-h-[100px]">
                              <span>暂无文本，点击上方按钮添加</span>
                            </div>
                          )}
                          {adjustments.texts?.map(t => (
                            <div key={t.id} className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-3 hover:border-white/10 transition-colors">
                              <div className="flex gap-2">
                                <input type="text" value={t.content} onChange={(e) => updateText(t.id, { content: e.target.value })} className="flex-1 bg-transparent text-xs font-bold text-white border-b border-white/20 outline-none focus:border-blue-500 placeholder:text-slate-600 py-1" placeholder="输入文本内容" />
                                <button onClick={() => removeText(t.id)} className="text-slate-500 hover:text-red-400 transition-colors px-1">✕</button>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {TEXT_STYLE_OPTIONS.map(s => (
                                  <button key={s.id} onClick={() => updateText(t.id, { style: s.id })} className={`text-[8px] px-2 py-1 rounded-md border transition-all ${t.style === s.id ? 'bg-blue-600 border-blue-500 text-white' : 'bg-transparent border-white/10 text-slate-400 hover:border-white/30'}`}>{s.label}</button>
                                ))}
                              </div>
                              <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="space-y-1">
                                  <label className="text-[8px] text-slate-500">水平位置 X</label>
                                  <input type="range" min="0" max="100" value={t.x} onChange={(e) => updateText(t.id, { x: +e.target.value })} className="w-full accent-indigo-500 h-1 bg-slate-700 rounded-lg appearance-none" />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] text-slate-500">垂直位置 Y</label>
                                  <input type="range" min="0" max="100" value={t.y} onChange={(e) => updateText(t.id, { y: +e.target.value })} className="w-full accent-indigo-500 h-1 bg-slate-700 rounded-lg appearance-none" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-white/5">
                      <button onClick={() => setIsEditing(false)} className="px-6 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-colors">取消修改</button>
                      <button onClick={handleApplyEdits} className="px-8 py-2.5 btn-shine rounded-xl text-xs font-bold text-white transition-all transform hover:scale-105">保存并应用</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Styles & AI Logic */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/5 h-full flex flex-col shadow-2xl relative max-h-[90vh]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl rounded-full pointer-events-none"></div>
            
            <div className="overflow-y-auto custom-scrollbar flex-1 pr-1 space-y-8">
              {/* Style Selection */}
              <section>
                <h3 className="text-sm font-bold mb-4 flex items-center gap-3 text-white uppercase tracking-widest opacity-80">
                  <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px]">01</span> 风格实验室
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[...STYLE_OPTIONS, { id: ArtStyle.CUSTOM, label: '完全定制', icon: '✍️', description: '自定义提示词', prompt: '' }].map((style) => (
                    <StyleCard key={style.id} style={style} isSelected={selectedStyle.id === style.id} onSelect={(s) => setSelectedStyle(s as any)} />
                  ))}
                </div>
                {selectedStyle.id === ArtStyle.CUSTOM && (
                  <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                    <textarea 
                      value={customPrompt} 
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="请描述您想要的画面风格..."
                      className="w-full h-24 bg-slate-800/50 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600 resize-none"
                    />
                  </div>
                )}
              </section>

              {originalImage && (
                <>
                  {/* Text Replacement */}
                  <section>
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-3 text-white uppercase tracking-widest opacity-80">
                      <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px]">02</span> AI 语义替换
                    </h3>
                    {isAnalyzing ? (
                      <div className="p-4 bg-white/5 rounded-2xl flex items-center gap-3 text-[10px] text-slate-400 border border-white/5">
                        <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                        <span>正在分析画面内容...</span>
                      </div>
                    ) : textReplacements.length > 0 ? (
                      <div className="space-y-2">
                        {textReplacements.map((tr, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                            <label className="block text-[9px] uppercase tracking-widest text-slate-500 mb-1">原文: "{tr.original}"</label>
                            <input type="text" value={tr.replacement} onChange={(e) => { const n = [...textReplacements]; n[idx].replacement = e.target.value; setTextReplacements(n); }} className="w-full bg-transparent text-xs text-blue-300 font-medium outline-none placeholder:text-slate-600" placeholder="输入替换文字..." />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-600 text-center py-2">未检测到显著文字</p>
                    )}
                  </section>

                  {/* Entity Modification */}
                  <section>
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-3 text-white uppercase tracking-widest opacity-80">
                      <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px]">03</span> 主体智能改造
                    </h3>
                    <div className="space-y-2">
                      {entityModifications.map((em, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                          <label className="block text-[9px] uppercase tracking-widest text-slate-500 mb-1">识别对象: {em.entity}</label>
                          <input type="text" value={em.instruction} placeholder="例如: 变成赛博机械风格..." onChange={(e) => { const n = [...entityModifications]; n[idx].instruction = e.target.value; setEntityModifications(n); }} className="w-full bg-transparent text-xs text-indigo-300 font-medium outline-none placeholder:text-slate-600" />
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-white/5 space-y-3 z-10 bg-slate-900/50 backdrop-blur-sm -mx-2 px-2 pb-2">
              {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] flex gap-2 items-center"><span>⚠️</span> {error}</div>}
              
              <button 
                onClick={handleTransform} 
                disabled={isLoading || !originalImage || isEditing}
                className={`w-full py-4 rounded-2xl font-black text-lg shadow-2xl transition-all flex items-center justify-center gap-2 ${
                  isLoading || !originalImage || isEditing 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'btn-shine text-white hover:scale-[1.02]'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span>艺术计算中...</span>
                  </>
                ) : (
                  <span>生成 AI 视觉设计 🚀</span>
                )}
              </button>

              {transformedImage && !isLoading && (
                <button onClick={handleDownload} className="w-full py-3.5 rounded-2xl font-bold text-sm btn-secondary-shine text-white flex items-center justify-center gap-2">
                  <span>📥</span> 导出高清成品
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center relative z-10">
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] opacity-60">
          @2025 AI 视觉海报设计 V 1.0 WINDY(china) EDITION
        </p>
      </footer>
    </div>
  );
};

export default App;
