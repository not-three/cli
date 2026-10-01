import type { RTCFactory } from '@not3/sdk';

let initialized = false;
let cleaned = false;

export function rtcFactory(): RTCFactory {
  // Load the native binding only when a P2P command starts.
  const { RTCPeerConnection } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('node-datachannel/polyfill') as typeof import('node-datachannel/polyfill');
  initialized = true;
  cleaned = false;
  return (config) => new RTCPeerConnection(config);
}

export function rtcCleanup(): void {
  if (!initialized || cleaned) return;
  cleaned = true;
  const { cleanup } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('node-datachannel') as typeof import('node-datachannel');
  cleanup();
}
