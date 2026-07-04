import { FragmentData, ShareGenerator } from '@not3/sdk';
import { CryptoMode, DEFAULTS, normalizeServerUrl } from './config';

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
}): { url: string; curl: string } {
  const { gen, isDefault, server } = generator(opts.uiUrl, opts.apiServer);
  const fragment = new FragmentData({
    seed: opts.seed,
    server: isDefault ? null : server + '/',
    cryptoMode: opts.mode,
  });
  return {
    url: gen.noteUi(opts.id, fragment),
    curl: gen.noteCurl(opts.id, opts.seed),
  };
}

export function fileShare(opts: {
  uiUrl: string;
  apiServer: string;
  id: string;
  seed: string;
  fileName: string;
}): { url: string; curl: string } {
  const { gen } = generator(opts.uiUrl, opts.apiServer);
  return {
    url: gen.fileUi(opts.id, opts.seed),
    curl: gen.fileCurl(opts.id, opts.seed, opts.fileName),
  };
}
