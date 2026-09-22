'use client';

import { useEffect, useRef } from 'react';
import { ensureDevice } from '@/features/devices/actions';
import { recordActivity } from '@/features/activity/actions';
import { isLocationSharingEnabled } from '@/features/activity/components/location-consent';

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
    if (!workspaceId) return;
    const share = isLocationSharingEnabled();
    const deviceLabel = coarseDeviceLabel();
    const send = (city: string | null) =>
      void recordActivity({ workspaceId, cityLabel: city, deviceLabel, shareLocation: share });
    if (share && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          send(`≈ ${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`),
        () => send(null),
        { timeout: 8000, maximumAge: 3600000 }
      );
    } else {
      send(null);
    }
  }, [workspaceId]);

  return null;
}
