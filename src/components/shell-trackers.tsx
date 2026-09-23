'use client';

import { useEffect, useRef } from 'react';
import { ensureDevice } from '@/features/devices/actions';
import { recordActivity } from '@/features/activity/actions';
import { checkReminders } from '@/features/notifications/reminders';
import { getLocationMode } from '@/features/activity/components/location-consent';
import { formatApprox, formatCoords } from '@/features/activity/geocode';

function coarseDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Unknown device';
  const ua = navigator.userAgent;
  return /android|iphone|ipad|mobile/i.test(ua) ? 'Mobile browser' : 'Desktop browser';
}

/**
 * Once-per-load presence reporting: registers/refreshes the trusted-device
 * row and records workspace activity. No polling, no continuous tracking.
 * Location is attached only with explicit opt-in consent (rounded ~1 km).
 */
export function ShellTrackers({ workspaceId }: { workspaceId: string | null }) {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void ensureDevice();
    // Lazy reminder materialization (no cron): once per shell load.
    void checkReminders();
    if (!workspaceId) return;
    const mode = getLocationMode();
    const deviceLabel = coarseDeviceLabel();
    const send = (
      city: string | null,
      latitude: number | null = null,
      longitude: number | null = null,
      precision: 'approximate' | 'exact' | null = null
    ) =>
      void recordActivity({
        workspaceId,
        cityLabel: city,
        deviceLabel,
        shareLocation: mode !== 'off',
        latitude,
        longitude,
        precision,
      });
    if (mode === 'off' || !('geolocation' in navigator)) {
      send(null);
      return;
    }
    if (mode === 'approximate') {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          send(
            formatApprox(pos.coords.latitude, pos.coords.longitude),
            Math.round(pos.coords.latitude * 100) / 100,
            Math.round(pos.coords.longitude * 100) / 100,
            'approximate'
          ),
        () => send(null),
        { timeout: 8000, maximumAge: 3600000 }
      );
      return;
    }
    // Exact mode: precise coordinates; denial falls back to no location.
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        send(
          formatCoords(pos.coords.latitude, pos.coords.longitude),
          pos.coords.latitude,
          pos.coords.longitude,
          'exact'
        ),
      () => send(null),
      { timeout: 10000, maximumAge: 600000, enableHighAccuracy: true }
    );
  }, [workspaceId]);

  return null;
}
