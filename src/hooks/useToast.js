import { useState, useRef, useCallback } from "react";
import { notifySuccess } from "../utils/haptics";

/**
 * useToast — Global toast notification state.
 *
 * Returns { toast, toastExiting, toastDuration, showToast }
 */
export function useToast() {
  const [toast, setToast] = useState(null);
  const [toastExiting, setToastExiting] = useState(false);
  const [toastDuration, setToastDuration] = useState(2200);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg, duration = 2200) => {
    clearTimeout(toastTimer.current);
    setToastExiting(false);
    setToast(msg);
    setToastDuration(duration);
    notifySuccess();
    toastTimer.current = setTimeout(() => {
      setToastExiting(true);
      setTimeout(() => { setToast(null); setToastExiting(false); }, 300);
    }, duration);
  }, []);

  return { toast, toastExiting, toastDuration, showToast };
}
