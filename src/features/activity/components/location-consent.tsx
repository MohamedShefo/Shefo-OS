'use client';

import { useState } from 'react';

export const LOCATION_MODE_KEY = 'shefo:location-mode';
export const LOCATION_CONSENT_KEY = 'shefo:share-location';

export type LocationMode = 'off' | 'approximate' | 'exact';

export function getLocationMode(): LocationMode {
  try {
    // Back-compat: the old boolean flag maps to approximate sharing.
    if (localStorage.getItem(LOCATION_CONSENT_KEY) === '1') return 'approximate';
    const mode = localStorage.getItem(LOCATION_MODE_KEY);
    if (mode === 'exact' || mode === 'approximate') return mode;
    return 'off';
  } catch {
    return 'off';
  }
}

export function isLocationSharingEnabled(): boolean {
  return getLocationMode() !== 'off';
}

const MODES: Array<{ id: LocationMode; label: string; detail: string }> = [
  {
    id: 'off',
    label: 'Off',
    detail: 'No location is stored. Existing shared location is cleared.',
  },
  {
    id: 'approximate',
    label: 'Approximate',
    detail: 'Rounded to ~1 km. Visible to workspace owners/admins only.',
  },
  {
    id: 'exact',
    label: 'Exact',
    detail: 'Precise coordinates. Visible to workspace owners/admins only. Revoke anytime.',
  },
];

/**
 * Explicit, revocable opt-in for location sharing in workspace activity.
 * Default off. Exact mode additionally requires browser geolocation permission
 * at report time — denying it falls back to no location.
 */
export function LocationConsent() {
  const [mode, setMode] = useState<LocationMode>(() => {
    if (typeof window === 'undefined') return 'off';
    return getLocationMode();
  });

  const choose = (next: LocationMode) => {
    setMode(next);
    try {
      localStorage.setItem(LOCATION_MODE_KEY, next);
      localStorage.removeItem(LOCATION_CONSENT_KEY);
    } catch {
      // ignore storage failures
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
      <h2 className="text-sm font-semibold tracking-tight text-foreground">Location Sharing</h2>
      <p className="text-xs text-muted-foreground">
        Workspace activity may include your location so workspace owners/admins can see where
        members were last active. This is presence only — never used for login or security
        decisions, never tracked continuously, and other members cannot see it.
      </p>
      <div className="space-y-2" role="radiogroup" aria-label="Location sharing mode">
        {MODES.map((m) => (
          <label
            key={m.id}
            className={`flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer transition-colors ${
              mode === m.id ? 'border-primary bg-primary/5' : 'border-border/60 hover:bg-muted/40'
            }`}
          >
            <input
              type="radio"
              name="location-mode"
              checked={mode === m.id}
              onChange={() => choose(m.id)}
              className="mt-0.5 h-4 w-4 cursor-pointer"
            />
            <span>
              <span className="block text-xs font-semibold text-foreground">
                {m.label}
                {mode === m.id && (
                  <span className="ms-2 text-[10px] font-medium text-primary">● sharing</span>
                )}
              </span>
              <span className="block text-[11px] text-muted-foreground">{m.detail}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
