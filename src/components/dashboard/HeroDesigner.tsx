"use client";

import { useState, useRef } from 'react';
import { Crown, Move, Sparkles, Monitor, Smartphone, Palette, LayoutTemplate, Check, Maximize, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const PREMIUM_STYLES = [
  { id: 'premium-style-1', name: 'Royal Gold Gradient' },
  { id: 'premium-style-2', name: 'Classic White Elegance' },
  { id: 'premium-style-3', name: 'Modern Silver Metal' },
  { id: 'premium-style-4', name: 'Rose Gold Wedding' },
  { id: 'premium-style-5', name: 'Cinematic Outline' },
  { id: 'premium-style-6', name: 'Vintage Script' },
];

const EMOJIS = ['💍', '🥂', '🕊️', '🌹', '🎀', '✨', '❤️', '🤍', '🦋', '🌸'];

export default function HeroDesigner({ initialData, coverImage, onSave }: { initialData: any, coverImage: string, onSave: (data: any) => void }) {
  const [settings, setSettings] = useState({
    premiumStyle: 'premium-style-1',
    emoji: '💍',
    showLogo: true,
    showStudioName: true,
    logoAnimation: 'none', // ✅ none, breathing, spin-360, shimmer
    brandPos: { x: 50, y: 30 },
    detailPos: { x: 50, y: 80 },
    brandSize: 50,  
    detailSize: 50, 
    ...initialData
  });

  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isDraggingBrand, setIsDraggingBrand] = useState(false);
  const [isDraggingDetail, setIsDraggingDetail] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingBrand && !isDraggingDetail) return;
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;
    
    x = Math.max(10, Math.min(90, x));
    y = Math.max(10, Math.min(90, y));

    if (isDraggingBrand) {
      setSettings({ ...settings, brandPos: { x, y } });
    } else if (isDraggingDetail) {
      setSettings({ ...settings, detailPos: { x, y } });
    }
  };

  const handleMouseUp = () => {
    setIsDraggingBrand(false);
    setIsDraggingDetail(false);
  };

  return (
    <div 
      className="flex flex-col lg:flex-row h-[90vh] bg-[#0A0A0A] text-white rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] font-sans select-none"
      onMouseMove={handleMouseMove} 
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      
      {/* ✅ LEFT SIDE: CONTROLS */}
      <div className="w-full lg:w-[380px] bg-[#111] border-r border-white/5 flex flex-col h-full shrink-0 z-20 shadow-2xl">
        
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#0A0A0A]">
          <div>
            <h2 className="font-headline font-bold text-xl text-primary flex items-center gap-2">
              <Palette className="w-5 h-5" /> Design Studio
            </h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Customize your cover</p>
          </div>
          <button 
            onClick={() => onSave(settings)}
            className="bg-primary text-black px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 hover:scale-105 transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] flex items-center gap-2"
          >
            <Check className="w-4 h-4" /> Save
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 pb-20">
          
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-start gap-3 backdrop-blur-md">
            <div className="bg-primary/20 p-2 rounded-full">
              <Move className="w-4 h-4 text-primary shrink-0" />
            </div>
            <div>
              <p className="text-sm font-bold text-white mb-1">Drag & Drop</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Preview par text ko mouse se pakar kar jagah set karein.
              </p>
            </div>
          </div>

          {/* ✅ PREMIUM STYLES SELECTOR */}
          <div className="space-y-3">
            <label className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <Wand2 className="w-4 h-4" /> Premium Text Styles
            </label>
            <div className="grid grid-cols-1 gap-2">
              {PREMIUM_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSettings({ ...settings, premiumStyle: style.id })}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${
                    settings.premiumStyle === style.id 
                      ? 'bg-primary/10 border-primary text-primary' 
                      : 'bg-black/40 border-white/5 text-white/70 hover:bg-white/5'
                  }`}
                >
                  <span className="text-sm font-medium">{style.name}</span>
                  {settings.premiumStyle === style.id && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          {/* Branding Size Slider */}
          <div className="space-y-3">
            <label className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Maximize className="w-4 h-4" /> Branding Size
              </div>
              <span className="text-white bg-white/10 px-2 py-0.5 rounded text-[10px]">{settings.brandSize || 50}</span>
            </label>
            <input 
              type="range" min="10" max="100" 
              value={settings.brandSize || 50} 
              onChange={(e) => setSettings({...settings, brandSize: Number(e.target.value)})}
              className="w-full accent-primary h-2 bg-black/50 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Details Size Slider */}
          <div className="space-y-3">
            <label className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Maximize className="w-4 h-4" /> Details Size
              </div>
              <span className="text-white bg-white/10 px-2 py-0.5 rounded text-[10px]">{settings.detailSize || 50}</span>
            </label>
            <input 
              type="range" min="10" max="100" 
              value={settings.detailSize || 50} 
              onChange={(e) => setSettings({...settings, detailSize: Number(e.target.value)})}
              className="w-full accent-primary h-2 bg-black/50 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Visibility Toggles */}
          <div className="space-y-4">
            <label className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4" /> Elements
            </label>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                <span className="text-sm font-medium">Show Logo</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={settings.showLogo} onChange={(e) => setSettings({...settings, showLogo: e.target.checked})} className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
              <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                <span className="text-sm font-medium">Show Studio Name</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={settings.showStudioName} onChange={(e) => setSettings({...settings, showStudioName: e.target.checked})} className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </div>

          {/* ✅ Logo Animation Selector */}
          <div className="space-y-3">
            <label className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Logo Animation
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'none', label: 'None' },
                { id: 'breathing', label: 'Breathing' },
                { id: 'spin-360', label: '360 Spin' },
                { id: 'shimmer', label: 'Shimmer' }
              ].map((anim) => (
                <button
                  key={anim.id}
                  onClick={() => setSettings({ ...settings, logoAnimation: anim.id })}
                  className={`flex flex-col items-center justify-center px-2 py-3 rounded-xl border transition-all ${
                    settings.logoAnimation === anim.id 
                      ? 'bg-primary/10 border-primary text-primary' 
                      : 'bg-black/40 border-white/5 text-white/70 hover:bg-white/5'
                  }`}
                >
                  <span className="text-xs font-medium">{anim.label}</span>
                  {settings.logoAnimation === anim.id && <Check className="w-3 h-3 mt-1" />}
                </button>
              ))}
            </div>
          </div>

          {/* Emoji */}
          <div className="space-y-3">
            <label className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <Crown className="w-4 h-4" /> Wedding Icons
            </label>
            <div className="flex gap-2 flex-wrap">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setSettings({...settings, emoji})}
                  className={`w-10 h-10 rounded-xl text-lg transition-all flex items-center justify-center ${
                    settings.emoji === emoji ? 'bg-primary/20 border-2 border-primary scale-110' : 'bg-black/40 border border-white/10 hover:bg-[#222]'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ✅ RIGHT SIDE: PREVIEW */}
      <div className="flex-1 bg-[#121212] p-6 lg:p-10 flex flex-col items-center justify-center overflow-y-auto custom-scrollbar relative select-none">
        
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/5 blur-[120px] rounded-full" />
        </div>

        <div className="w-full max-w-5xl relative z-10 flex flex-col gap-8">
          
          {/* Desktop Frame */}
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3">
              <Monitor className="w-4 h-4 text-primary" /> Desktop Master Preview
            </div>
            <div 
              ref={containerRef}
              className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] cursor-default group"
            >
              {coverImage ? (
                <img src={coverImage} alt="Cover" className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/60 opacity-80 pointer-events-none" />

              {/* Desktop Branding */}
              <div 
                className="absolute flex flex-col items-center justify-center cursor-grab active:cursor-grabbing p-6 transition-all duration-300 group/drag"
                style={{ left: `${settings.brandPos.x}%`, top: `${settings.brandPos.y}%`, transform: 'translate(-50%, -50%)' }}
                onMouseDown={(e) => { e.preventDefault(); setIsDraggingBrand(true); }}
              >
                <div className="absolute inset-0 border-2 border-dashed border-primary/0 group-hover/drag:border-primary/40 rounded-2xl transition-colors pointer-events-none" />
                
                {settings.showLogo && (
                  <div className={cn(
                    "bg-white/5 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center mb-3 shadow-2xl",
                    settings.logoAnimation === 'breathing' && "animate-breathing",
                    settings.logoAnimation === 'spin-360' && "animate-spin-360",
                    settings.logoAnimation === 'shimmer' && "animate-shimmer"
                  )} style={{ padding: `${settings.brandSize / 4}px` }}>
                    <Crown className="text-white drop-shadow-lg" style={{ width: `${settings.brandSize / 2}px`, height: `${settings.brandSize / 2}px` }} />
                  </div>
                )}
                {settings.showStudioName && (
                  <span 
                    className={`${settings.premiumStyle} whitespace-nowrap text-center leading-none`}
                    style={{ fontSize: `${settings.brandSize}px` }}
                  >
                    ANAS CAPTURE
                  </span>
                )}
              </div>

              {/* Desktop Details */}
              <div 
                className="absolute flex flex-col items-center justify-center cursor-grab active:cursor-grabbing p-6 transition-all duration-300 group/drag"
                style={{ left: `${settings.detailPos.x}%`, top: `${settings.detailPos.y}%`, transform: 'translate(-50%, -50%)' }}
                onMouseDown={(e) => { e.preventDefault(); setIsDraggingDetail(true); }}
              >
                <div className="absolute inset-0 border-2 border-dashed border-primary/0 group-hover/drag:border-primary/40 rounded-2xl transition-colors pointer-events-none" />
                
                <p className="text-primary font-bold tracking-[0.4em] uppercase drop-shadow-lg mb-2" style={{ fontSize: `${Math.max(10, settings.detailSize / 4)}px` }}>The Wedding Of</p>
                <h2 className="font-headline text-white font-bold drop-shadow-2xl whitespace-nowrap" style={{ fontSize: `${settings.detailSize}px` }}>
                  Ahmed <span className="text-primary italic font-light">&amp;</span> Bride
                </h2>
                <p className="text-white/90 italic mt-3 drop-shadow-md whitespace-nowrap tracking-widest" style={{ fontSize: `${Math.max(12, settings.detailSize / 3)}px` }}>
                  {settings.emoji} 10th Nov 2026 {settings.emoji}
                </p>
              </div>
            </div>
          </div>

          {/* Mobile Frame */}
          <div className="flex justify-end mt-4">
             <div className="w-[220px] lg:w-[280px]">
              <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3 justify-end">
                <Smartphone className="w-4 h-4 text-primary" /> Mobile Preview
              </div>
              <div className="relative w-full aspect-[9/16] rounded-[2rem] overflow-hidden bg-black border-[6px] border-[#222] shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-6 bg-[#222] rounded-b-xl z-20" />
                
                {coverImage ? (
                  <img src={coverImage} alt="Cover" className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/60 opacity-80 pointer-events-none" />

                {/* Mobile Branding */}
                <div 
                  className="absolute flex flex-col items-center justify-center p-2"
                  style={{ left: `${settings.brandPos.x}%`, top: `${settings.brandPos.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  {settings.showLogo && (
                    <div className={cn(
                      "bg-white/10 rounded-full flex items-center justify-center mb-2 backdrop-blur-sm",
                      settings.logoAnimation === 'breathing' && "animate-breathing",
                      settings.logoAnimation === 'spin-360' && "animate-spin-360",
                      settings.logoAnimation === 'shimmer' && "animate-shimmer"
                    )} style={{ padding: `${settings.brandSize / 8}px` }}>
                      <Crown className="text-white" style={{ width: `${settings.brandSize / 3}px`, height: `${settings.brandSize / 3}px` }} />
                    </div>
                  )}
                  {settings.showStudioName && (
                    <span 
                      className={`${settings.premiumStyle} whitespace-nowrap text-center leading-none`}
                      style={{ fontSize: `${settings.brandSize * 0.6}px` }}
                    >
                      ANAS CAPTURE
                    </span>
                  )}
                </div>

                {/* Mobile Details */}
                <div 
                  className="absolute flex flex-col items-center justify-center p-2"
                  style={{ left: `${settings.detailPos.x}%`, top: `${settings.detailPos.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <p className="text-primary font-bold tracking-widest uppercase drop-shadow-lg mb-1" style={{ fontSize: `${Math.max(6, (settings.detailSize * 0.6) / 4)}px` }}>The Wedding Of</p>
                  <h2 className="font-headline text-white font-bold drop-shadow-xl whitespace-nowrap" style={{ fontSize: `${settings.detailSize * 0.6}px` }}>
                    Ahmed <span className="text-primary italic font-light">&amp;</span> Bride
                  </h2>
                  <p className="text-white/90 italic mt-1 drop-shadow-md whitespace-nowrap" style={{ fontSize: `${Math.max(8, (settings.detailSize * 0.6) / 3)}px` }}>
                    {settings.emoji} 2026 {settings.emoji}
                  </p>
                </div>
              </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}