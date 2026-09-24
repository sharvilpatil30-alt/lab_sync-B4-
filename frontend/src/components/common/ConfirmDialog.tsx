import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Info } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  isLoading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center space-y-4">
        <div
          className={`p-3 rounded-full ${
            isDestructive ? 'bg-rose-500/10 text-rose-400' : 'bg-indigo-500/10 text-indigo-400'
          }`}
        >
          {isDestructive ? <AlertTriangle className="w-8 h-8" /> : <Info className="w-8 h-8" />}
        </div>
        <div>
          <h4 className="text-base font-bold text-slate-100">{title}</h4>
          <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{message}</p>
        </div>
        <div className="flex items-center gap-3 w-full pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? 'danger' : 'primary'}
            className="flex-1"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
