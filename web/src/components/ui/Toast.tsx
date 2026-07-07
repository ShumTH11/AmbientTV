import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Heart, Info } from 'lucide-react';

interface ToastItem {
  id: number;
  message: string;
  icon?: 'check' | 'heart' | 'info';
}

interface ToastValue {
  toast: (message: string, icon?: ToastItem['icon']) => void;
}

const ToastContext = createContext<ToastValue>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, icon: ToastItem['icon'] = 'check') => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, icon }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2600);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-6 left-1/2 z-[400] flex -translate-x-1/2 flex-col items-center gap-2"
      >
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="glass-strong pointer-events-auto flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-white shadow-glow"
            >
              {t.icon === 'heart' ? (
                <Heart className="h-4 w-4 fill-rose-400 text-rose-400" />
              ) : t.icon === 'info' ? (
                <Info className="h-4 w-4 text-[rgb(var(--accent))]" />
              ) : (
                <Check className="h-4 w-4 text-emerald-400" />
              )}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
