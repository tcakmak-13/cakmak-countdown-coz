import { useState, useEffect } from 'react';

interface CountdownValues {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

// YKS 2026: June 20, 2026 at 10:15 AM Turkey time (UTC+3)
const YKS_DATE = new Date('2026-06-20T07:15:00.000Z').getTime();

export function useCountdown(): CountdownValues {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const total = Math.max(0, YKS_DATE - now);
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / 1000 / 60 / 60) % 24);
  const days = Math.floor(total / 1000 / 60 / 60 / 24);

  return { days, hours, minutes, seconds, total };
}
