import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  position?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  position = 'right',
  size = 'md',
  footer,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  const slideClasses = {
    right: 'right-0 animate-in slide-in-from-right duration-200',
    left: 'left-0 animate-in slide-in-from-left duration-200',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0B1F3A]/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className={`fixed inset-y-0 ${position === 'right' ? 'right-0' : 'left-0'} flex max-w-full`}>
        <div
          className={`w-screen ${sizeClasses[size]} ${slideClasses[position]} bg-white border-${
            position === 'right' ? 'l' : 'r'
          } border-[#D9E2EC] shadow-2xl flex flex-col text-[#102A43]`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[#D9E2EC]">
            <div>
              {title && <h2 className="text-base font-bold text-[#0B1F3A] tracking-tight">{title}</h2>}
              {description && <p className="text-xs text-[#627D98] mt-0.5">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#627D98] hover:text-[#0B1F3A] hover:bg-[#F0F4F8] transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">{children}</div>

          {/* Optional Footer */}
          {footer && (
            <div className="p-4 border-t border-[#D9E2EC] bg-[#F8FAFC] flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
