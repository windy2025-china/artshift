
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ArtStyle, StyleOption, TextReplacement, EntityModification, PosterText, TextStyle } from './types';
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
  
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({
    brightness: 100,
    contrast: 100,
    rotation: 0,
    texts: []
  });

  const [textReplacements, setTextReplacements] = useState<TextReplacement[]>([]);
  const [entityModifications, setEntityModifications] = useState<EntityModification[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setAdjustments({ brightness: 100, contrast: 100, rotation: 0, texts: [] });
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
      content: "新文本",
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
      triggerAnalysis(processed);
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
    setAdjustments({ brightness: 100, contrast: 100, rotation: 0, texts: [] });
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
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            <span className="text-2xl">🍄</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">设计风格迁移 <span className="text-blue-500 font-black">AI</span></h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-blue-400/60 font-semibold leading-none">Visionary Poster Transformer</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={reset} className="text-sm px-5 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-all">重置</button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        {/* Editor Area */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="flex-1 min-h-[500px] rounded-[2.5rem] bg-slate-900/40 backdrop-blur-md border-2 border-dashed border-slate-800/50 flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl">
            {!originalImage ? (
              <div className="flex flex-col items-center text-center p-8">
                <div className="w-24 h-24 rounded-3xl bg-slate-800/80 flex items-center justify-center mb-8 text-4xl shadow-inner">📸</div>
                <h2 className="text-3xl font-bold mb-3 text-white tracking-tight">创作您的视觉大片</h2>
                <p className="text-slate-400 mb-10 max-w-sm leading-relaxed">上传后可添加艺术文本及 AI 风格迁移。</p>
                <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-10 py-4 rounded-2xl transition-all shadow-xl">上传海报/图片</button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              </div>
            ) : (
              <div className="w-full h-full flex flex-col gap-4 p-6">
                <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
                  {/* Canvas View */}
                  <div className="flex-1 relative rounded-3xl overflow-hidden border border-white/5 bg-black/40 flex items-center justify-center">
                    <img src={originalImage} alt="Original" className="max-w-full max-h-full object-contain" style={isEditing ? previewStyle : {}} />
                    
                    {/* Text Overlay Previews */}
                    {isEditing && adjustments.texts?.map(t => (
                      <div key={t.id} className="absolute border border-dashed border-white/20 p-1 pointer-events-none"
                        style={{ left: `${t.x}%`, top: `${t.y}%`, transform: 'translate(-50%, -50%)', color: 'white', fontWeight: 'bold' }}>
                        {t.content}
                      </div>
                    ))}

                    {!isEditing && !transformedImage && (
                      <button onClick={() => setIsEditing(true)} className="absolute bottom-4 right-4 bg-blue-600/90 hover:bg-blue-500 backdrop-blur-md px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg">🛠️ 文本与修饰设计</button>
                    )}
                  </div>

                  {/* Transformed Result */}
                  {(transformedImage || isLoading) && (
                    <div className="flex-1 relative rounded-3xl overflow-hidden border border-blue-500/40 bg-blue-900/10 flex items-center justify-center shadow-2xl">
                      {isLoading ? (
                        <div className="flex flex-col items-center gap-5">
                          <div className="w-16 h-16 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
                          <p className="text-sm font-bold tracking-widest text-blue-400">AI 正在深度重塑中...</p>
                        </div>
                      ) : (
                        <>
                          <img src={transformedImage!} alt="Transformed" className="w-full h-full object-contain" />
                          <div className="absolute top-4 left-4 bg-blue-600 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/20">Final Rendering</div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Advanced Editor Panel */}
                {isEditing && (
                  <div className="p-6 bg-slate-800/95 backdrop-blur-3xl border border-white/10 rounded-3xl animate-in slide-in-from-bottom-6 shadow-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Lights & Rotate */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-400">基础修饰</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between text-[10px] text-slate-400"><span>亮度</span><span>{adjustments.brightness}%</span></div>
                          <input type="range" min="0" max="200" value={adjustments.brightness} onChange={(e) => setAdjustments(p => ({ ...p, brightness: +e.target.value }))} className="w-full accent-blue-500" />
                          <div className="flex justify-between text-[10px] text-slate-400"><span>对比度</span><span>{adjustments.contrast}%</span></div>
                          <input type="range" min="0" max="200" value={adjustments.contrast} onChange={(e) => setAdjustments(p => ({ ...p, contrast: +e.target.value }))} className="w-full accent-blue-500" />
                          <button onClick={() => setAdjustments(p => ({ ...p, rotation: (p.rotation + 90) % 360 }))} className="w-full py-2 bg-slate-700 rounded-xl text-[10px] font-bold">🔄 旋转画面</button>
                        </div>
                      </div>

                      {/* Text Box Controls */}
                      <div className="space-y-4 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                        <div className="flex justify-between items-center">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-400">海报文本框</h4>
                          <button onClick={addText} className="text-[10px] bg-blue-600 px-3 py-1 rounded-full font-bold">+ 添加文本</button>
                        </div>
                        <div className="space-y-3">
                          {adjustments.texts?.map(t => (
                            <div key={t.id} className="p-3 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                              <div className="flex gap-2">
                                <input type="text" value={t.content} onChange={(e) => updateText(t.id, { content: e.target.value })} className="flex-1 bg-transparent text-xs border-b border-white/20 outline-none" placeholder="输入文本内容" />
                                <button onClick={() => removeText(t.id)} className="text-red-400 text-xs">✕</button>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {TEXT_STYLE_OPTIONS.map(s => (
                                  <button key={s.id} onClick={() => updateText(t.id, { style: s.id })} className={`text-[8px] px-2 py-1 rounded-full border ${t.style === s.id ? 'bg-blue-600 border-blue-600' : 'border-white/20'}`}>{s.label}</button>
                                ))}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <input type="range" min="0" max="100" value={t.x} onChange={(e) => updateText(t.id, { x: +e.target.value })} className="accent-indigo-500 h-1" title="位置 X" />
                                <input type="range" min="0" max="100" value={t.y} onChange={(e) => updateText(t.id, { y: +e.target.value })} className="accent-indigo-500 h-1" title="位置 Y" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-white/5">
                      <button onClick={() => setIsEditing(false)} className="px-6 py-2 text-xs font-bold text-slate-400 uppercase">取消</button>
                      <button onClick={handleApplyEdits} className="px-10 py-3 bg-blue-600 hover:bg-blue-500 rounded-2xl text-xs font-black shadow-xl uppercase">保存并应用到 AI</button>
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
            <div className="overflow-y-auto custom-scrollbar flex-1 pr-1">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-3 text-white uppercase tracking-widest opacity-80">
                <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px]">01</span> 风格实验室
              </h3>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[...STYLE_OPTIONS, { id: ArtStyle.CUSTOM, label: '完全定制', icon: '✍️', description: '灵感由您书写', prompt: '' }].map((style) => (
                  <StyleCard key={style.id} style={style} isSelected={selectedStyle.id === style.id} onSelect={(s) => setSelectedStyle(s as any)} />
                ))}
              </div>

              {originalImage && (
                <>
                  <div className="mb-6">
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-3 text-white uppercase tracking-widest opacity-80">
                      <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px]">02</span> AI 语义替换</h3>
                    {isAnalyzing ? (
                      <div className="p-4 bg-white/5 rounded-2xl flex items-center gap-3 text-[10px] text-slate-400"><div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>识别文字/元素中...</div>
                    ) : (
                      <div className="space-y-2">
                        {textReplacements.map((tr, idx) => (
                          <div key={idx} className="p-3 rounded-2xl bg-white/5 border border-white/5">
                            <label className="text-[9px] uppercase tracking-widest text-slate-500">原文: "{tr.original}"</label>
                            <input type="text" value={tr.replacement} onChange={(e) => { const n = [...textReplacements]; n[idx].replacement = e.target.value; setTextReplacements(n); }} className="w-full bg-transparent text-xs text-blue-300 outline-none" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mb-6">
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-3 text-white uppercase tracking-widest opacity-80">
                      <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px]">03</span> 主体改造</h3>
                    {entityModifications.map((em, idx) => (
                      <div key={idx} className="mb-2 p-3 rounded-2xl bg-white/5 border border-white/5">
                        <label className="text-[9px] uppercase tracking-widest text-slate-500">元素: {em.entity}</label>
                        <input type="text" value={em.instruction} placeholder="例如: 变身为机械战警..." onChange={(e) => { const n = [...entityModifications]; n[idx].instruction = e.target.value; setEntityModifications(n); }} className="w-full bg-transparent text-xs text-indigo-300 outline-none" />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="pt-4 space-y-4 border-t border-white/5 mt-4">
              {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px]">{error}</div>}
              <button onClick={handleTransform} disabled={isLoading || !originalImage || isEditing} className={`w-full py-4 rounded-2xl font-black text-lg shadow-2xl transition-all ${isLoading || !originalImage || isEditing ? 'bg-slate-800 text-slate-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-[1.02]'}`}>
                {isLoading ? '艺术计算中...' : '生成 AI 视觉设计'}
              </button>
              {transformedImage && !isLoading && (
                <button onClick={handleDownload} className="w-full py-4 rounded-2xl font-bold text-base bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-all text-white">导出最终成品 📥</button>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-slate-500 text-[9px] font-bold uppercase tracking-[0.4em] opacity-60">© 2024 AI Poster Designer · Multimedia Engine v7.0</footer>
    </div>
  );
};

export default App;
