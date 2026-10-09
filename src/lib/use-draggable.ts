'use client';

import { useCallback, useRef, useState } from 'react';

export interface DragPosition {
  x: number;
  y: number;
}

interface DragGesture {
  pointerId: number;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  moved: boolean;
}

const DRAG_THRESHOLD_PX = 5;

/**
 * Minimal pointer-based drag (mouse + touch + pen) for floating widgets.
 * `position === null` means "use the component's default corner classes".
 * When storageKey is given, the position persists in localStorage and a
 * gesture that turned into a drag suppresses the trailing click.
 */
export function useDraggable(storageKey?: string) {
  const [position, setPosition] = useState<DragPosition | null>(() => {
    if (storageKey === undefined || typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<DragPosition>;
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        return { x: parsed.x, y: parsed.y };
      }
    } catch {
      // ignore storage failures
    }
    return null;
  });

  const gesture = useRef<DragGesture | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, a, [data-no-drag]')) return;
      const rect = e.currentTarget.getBoundingClientRect();
      gesture.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origX: position?.x ?? rect.left,
        origY: position?.y ?? rect.top,
        moved: false,
      };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [position]
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (!g.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    g.moved = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(window.innerWidth - rect.width, g.origX + dx));
    const y = Math.max(0, Math.min(window.innerHeight - rect.height, g.origY + dy));
    setPosition({ x, y });
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const g = gesture.current;
      if (!g || g.pointerId !== e.pointerId) return;
      gesture.current = null;
      if (g.moved && storageKey) {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(position));
        } catch {
          // ignore storage failures
        }
      }
    },
    [position, storageKey]
  );

  // A drag gesture must not also trigger a click on the handle.
  const onClickCapture = useCallback((e: React.PointerEvent<HTMLElement> | React.MouseEvent<HTMLElement>) => {
    if (gesture.current?.moved) {
      e.preventDefault();
      e.stopPropagation();
      gesture.current = null;
    }
  }, []);

  return {
    position,
    dragProps: { onPointerDown, onPointerMove, onPointerUp, onClickCapture },
  };
}
