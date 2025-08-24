import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  zIndex?: number;
}

export default function Modal({ 
  isOpen, 
  onClose, 
  children, 
  maxWidth = '2xl',
  zIndex = 100000 
}: ModalProps) {
  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  };

  const handleScrimClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleModalContentClick = (e: React.MouseEvent) => {
    // Stop propagation to prevent scrim click
    e.stopPropagation();
  };

  return (
    <>
      {/* Scrim - rendered as separate element */}
      <div
        className="fixed inset-0 transition-opacity duration-300 cursor-default"
        onClick={handleScrimClick}
        style={{ 
          background: 'rgba(0,0,0,0.6)', 
          pointerEvents: 'auto',
          zIndex: 999999
        }}
      />
      {/* Modal Container */}
      <div 
        className="fixed inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 1000000 }}
      >
        <div
          className={`bg-[#141414] border border-white/10 rounded-xl w-full ${maxWidthClasses[maxWidth]} h-[672px] shadow-xl flex flex-col transition-transform duration-300 scale-100 pointer-events-auto scrollbar-hide`}
          onClick={handleModalContentClick}
        >
          {children}
        </div>
      </div>
    </>
  );
} 