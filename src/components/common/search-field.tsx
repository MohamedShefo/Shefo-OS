'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Search…',
  debounceMs = 150,
}: SearchFieldProps) {
  const [local, setLocal] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  // Adopt externally reset values without an effect (render-time adjustment).
  if (prevValue !== value) {
    setPrevValue(value);
    setLocal(value);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if (local !== value) onChange(local);
    }, debounceMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, debounceMs]);

  return (
    <Input
      type="search"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      placeholder={placeholder}
      className="w-full sm:w-56 text-xs"
      aria-label={placeholder}
    />
  );
}
