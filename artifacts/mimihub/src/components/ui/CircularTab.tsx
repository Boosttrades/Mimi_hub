import React from 'react';

type CircularTabProps = {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
  size?: number; // base size in px before scale
};

export default function CircularTab({ active, onClick, children, ariaLabel, size = 48 }: CircularTabProps) {
  // visual scale to reduce size by 20%
  const scale = 0.8;
  const scaledSize = size;

  return (
    <button
      aria-pressed={active}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`rounded-full flex items-center justify-center shadow-lg transition-transform focus:outline-none` +
        ` ${active ? 'bg-amber-400' : 'bg-white'}`}
      style={{ width: scaledSize, height: scaledSize, transform: `scale(${scale})` }}
    >
      {/* Icon color handled by consumer via className on the icon, but provide defaults */}
      <span className={`flex items-center justify-center ${active ? 'text-[#f5ecd8]' : 'text-white'}`}>{children}</span>
    </button>
  );
}
