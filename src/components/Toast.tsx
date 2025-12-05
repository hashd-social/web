import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

// Global toast function for use outside React components
type ShowToastFn = (message: string, type?: ToastType, duration?: number) => void;
let globalShowToast: ShowToastFn | null = null;

export const toast = {
  success: (message: string, duration?: number) => { if (globalShowToast) globalShowToast(message, 'success', duration); },
  error: (message: string, duration?: number) => { if (globalShowToast) globalShowToast(message, 'error', duration); },
  warning: (message: string, duration?: number) => { if (globalShowToast) globalShowToast(message, 'warning', duration); },
  info: (message: string, duration?: number) => { if (globalShowToast) globalShowToast(message, 'info', duration); },
};

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastIcon = ({ type }: { type: ToastType }) => {
  const iconClass = "w-5 h-5";
  switch (type) {
    case 'success':
      return <CheckCircle className={`${iconClass} text-green-400`} />;
    case 'error':
      return <AlertCircle className={`${iconClass} text-red-400`} />;
    case 'warning':
      return <AlertTriangle className={`${iconClass} text-yellow-400`} />;
    case 'info':
    default:
      return <Info className={`${iconClass} text-cyan-400`} />;
  }
};

const getToastStyles = (type: ToastType) => {
  const base = "flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm";
  switch (type) {
    case 'success':
      return `${base} bg-green-900/80 border-green-500/50 text-green-100`;
    case 'error':
      return `${base} bg-red-900/80 border-red-500/50 text-red-100`;
    case 'warning':
      return `${base} bg-yellow-900/80 border-yellow-500/50 text-yellow-100`;
    case 'info':
    default:
      return `${base} bg-gray-900/90 border-cyan-500/50 text-gray-100`;
  }
};

const ToastItem = ({ toast, onClose }: { toast: Toast; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.duration, onClose]);

  return (
    <div 
      className={`${getToastStyles(toast.type)} animate-slide-in-top min-w-[300px] max-w-md`}
      role="alert"
    >
      <ToastIcon type={toast.type} />
      <span className="flex-1 text-sm font-medium">{toast.message}</span>
      <button
        onClick={onClose}
        className="p-1 hover:bg-white/10 rounded transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 5000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toastItem => toastItem.id !== id));
  }, []);

  // Register global toast function
  useEffect(() => {
    globalShowToast = showToast;
    return () => {
      globalShowToast = null;
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {/* Toast Container - Fixed at top of screen, above everything */}
      <div 
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem 
              toast={toast} 
              onClose={() => hideToast(toast.id)} 
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// Helper hook for common toast patterns
export const useNotify = () => {
  const { showToast } = useToast();
  
  return {
    success: (message: string, duration?: number) => showToast(message, 'success', duration),
    error: (message: string, duration?: number) => showToast(message, 'error', duration),
    warning: (message: string, duration?: number) => showToast(message, 'warning', duration),
    info: (message: string, duration?: number) => showToast(message, 'info', duration),
  };
};
