'use client';

import { useState } from 'react';

export const LOCATION_CONSENT_KEY = 'shefo:share-location';

export function isLocationSharingEnabled(): boolean {
  try {
    return localStorage.getItem(LOCATION_CONSENT_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Explicit opt-in for approximate location sharing in workspace activity.
 * Default off. No tracking happens without this consent.
 */
export function LocationConsent() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return isLocationSharingEnabled();
  });

  const toggle = () => {
    setEnabled((v) => {
      const next = !v;
      try {
        localStorage.setItem(LOCATION_CONSENT_KEY, next ? '1' : '0');
      } catch {
        // ignore storage failures
      }
      return next;
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
      <h2 className="text-sm font-semibold tracking-tight text-foreground">Location Sharing</h2>
      <p className="text-xs text-muted-foreground">
        When enabled, workspace activity may include an approximate location (rounded to ~1 km)
        visible only to workspace owners/admins. Nothing is tracked continuously, and location is
        never used for authentication decisions.
      </p>
      <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={toggle}
          className="h-4 w-4 rounded border-border cursor-pointer"
        />
        Share approximate location in workspace activity
      </label>
    </div>
  );
}
