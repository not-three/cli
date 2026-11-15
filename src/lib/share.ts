import { FragmentData, ShareAlternative, ShareGenerator } from '@not3/sdk';
import { CryptoMode, DEFAULTS, normalizeServerUrl } from './config';

interface ShareResult {
  url: string;
  alternatives: ShareAlternative[];
  curl?: string;
}

function shareResult(alternatives: ShareAlternative[]): ShareResult {
  return {
    url: alternatives[0].value,
    alternatives,
    curl: alternatives.find((alternative) => alternative.id === 'curl')?.value,
  };
}

function generator(
  uiUrl: string,
  apiServer: string,
): { gen: ShareGenerator; isDefault: boolean; server: string } {
  const server = normalizeServerUrl(apiServer);
  const isDefault = server === normalizeServerUrl(DEFAULTS.server);
  const gen = new ShareGenerator({
    uiUrl,
    apiUrl: server + '/',
    storeServer: !isDefault,
  });
  return { gen, isDefault, server };
}

export function noteShare(opts: {
  uiUrl: string;
  apiServer: string;
  id: string;
  seed: string;
  mode: CryptoMode;
  fileName?: string;
}): ShareResult {
  const { gen, isDefault, server } = generator(opts.uiUrl, opts.apiServer);
  const fragment = new FragmentData({
    seed: opts.seed,
    server: isDefault ? null : server + '/',
    cryptoMode: opts.mode,
  });
  return shareResult(
    gen.alternatives({
      kind: 'note',
      id: opts.id,
      seed: opts.seed,
      cryptoMode: opts.mode,
      fileName: opts.fileName,
      fragment,
    }),
  );
}

export function fileShare(opts: {
  uiUrl: string;
  apiServer: string;
  id: string;
  seed: string;
  fileName: string;
}): ShareResult {
  const { gen } = generator(opts.uiUrl, opts.apiServer);
  return shareResult(
    gen.alternatives({
      kind: 'file',
      id: opts.id,
      seed: opts.seed,
      fileName: opts.fileName,
    }),
  );
}

export function p2pShare(opts: {
  uiUrl: string;
  apiServer: string;
  id: string;
  seed: string;
}): ShareResult {
  const { gen } = generator(opts.uiUrl, opts.apiServer);
  return shareResult(
    gen.alternatives({ kind: 'p2p', id: opts.id, seed: opts.seed }),
  );
}
