
import React from 'react';
import { StyleOption } from '../types';

interface StyleCardProps {
  style: StyleOption;
  isSelected: boolean;
  onSelect: (style: StyleOption) => void;
}

export const StyleCard: React.FC<StyleCardProps> = ({ style, isSelected, onSelect }) => {
  return (
    <button
      onClick={() => onSelect(style)}
      className={`flex flex-col items-center p-4 rounded-xl transition-all duration-500 transform hover:scale-105 group relative ${
        isSelected 
          ? 'bg-blue-600/30 border-2 border-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.6)] z-10' 
          : 'bg-slate-800/40 border-2 border-transparent hover:border-blue-500/40 hover:bg-slate-800/60 hover:shadow-[0_0_20px_rgba(59,130,246,0.25)]'
      }`}
    >
      {/* Decorative inner glow for active state */}
      {isSelected && (
        <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-xl -z-10"></div>
      )}
      
      <span className="text-3xl mb-2 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all">
        {style.icon}
      </span>
      <span className={`text-sm font-bold mb-1 transition-colors ${isSelected ? 'text-blue-200' : 'text-slate-100 group-hover:text-blue-300'}`}>
        {style.label}
      </span>
      <span className="text-[10px] text-slate-400 text-center leading-tight opacity-80 group-hover:opacity-100 transition-opacity">
        {style.description}
      </span>
    </button>
  );
};
