import React, { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

const VARIANT_STYLES = {
  success: 'bg-moss text-white',
  error: 'bg-clay text-white',
  info: 'bg-brand text-white',
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, variant = 'info', durationMs = 4000) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={`min-w-[220px] max-w-sm rounded-lg px-4 py-3 text-sm shadow-card ${VARIANT_STYLES[t.variant] || VARIANT_STYLES.info}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
