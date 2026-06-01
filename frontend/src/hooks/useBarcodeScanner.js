import { useEffect, useRef, useCallback } from 'react';

function useBarcodeScanner(onScan, options = {}) {
  const { debounceTime = 100, minLength = 4 } = options;
  const buffer = useRef('');
  const timeout = useRef(null);
  const lastKeyTime = useRef(0);

  const handleKeyDown = useCallback((e) => {
    const now = Date.now();
    const timeDiff = now - lastKeyTime.current;

    if (timeDiff > 100) {
      buffer.current = '';
    }

    lastKeyTime.current = now;

    if (e.key === 'Enter' && buffer.current.length >= minLength) {
      e.preventDefault();
      onScan(buffer.current);
      buffer.current = '';
      return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      buffer.current += e.key;

      if (timeout.current) {
        clearTimeout(timeout.current);
      }

      timeout.current = setTimeout(() => {
        if (buffer.current.length >= minLength) {
          onScan(buffer.current);
          buffer.current = '';
        }
      }, debounceTime);
    }
  }, [onScan, debounceTime, minLength]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
    };
  }, [handleKeyDown]);

  return { buffer: buffer.current };
}

export default useBarcodeScanner;
