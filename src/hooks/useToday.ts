import { useEffect, useState } from 'react';
import { toIsoDate } from '../lib/dates';

/** Today's date, updated if the app is left open past midnight. */
export function useToday(): string {
  const [today, setToday] = useState(() => toIsoDate(new Date()));
  useEffect(() => {
    const id = window.setInterval(() => setToday(toIsoDate(new Date())), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return today;
}
