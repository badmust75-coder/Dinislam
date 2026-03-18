import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Listens for NAVIGATE messages from the Service Worker (notificationclick)
 * and uses React Router to navigate to the target URL.
 */
export function useSwNavigate() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NAVIGATE' && event.data?.url) {
        const url: string = event.data.url;
        navigate(url);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, [navigate]);
}
