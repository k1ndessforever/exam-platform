'use client';

import { useState, useEffect, useCallback } from 'react';

export function useTimer(
  durationMinutes: number,
  startedAt: Date,
  onExpire: () => void
) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  useEffect(() => {
    const calculateRemaining = () => {
      const elapsed = Date.now() - new Date(startedAt).getTime();
      const total = durationMinutes * 60 * 1000;
      const remaining = Math.max(0, Math.floor((total - elapsed) / 1000));
      return remaining;
    };
    
    setTimeRemaining(calculateRemaining());
    
    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [durationMinutes, startedAt, onExpire]);
  
  const formatTime = useCallback((seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);
  
  return {
    timeRemaining,
    formattedTime: formatTime(timeRemaining),
    isExpired: timeRemaining === 0,
  };
}