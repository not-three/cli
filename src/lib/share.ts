import { FragmentData, ShareGenerator } from '@not3/sdk';
import { CryptoMode, DEFAULTS, normalizeServerUrl } from './config';

function generator(
  uiUrl: string,
  apiServer: string,
): { gen: ShareGenerator; isDefault: boolean } {
  const isDefault =
    normalizeServerUrl(apiServer) === normalizeServerUrl(DEFAULTS.server);
  const gen = new ShareGenerator({
    uiUrl,
    apiUrl: apiServer + '/',
    storeServer: !isDefault,
  });
  return { gen, isDefault };
}

export function noteShare(opts: {
  uiUrl: string;
  apiServer: string;
  id: string;
  seed: string;
  mode: CryptoMode;
}): { url: string; curl: string } {
  const { gen, isDefault } = generator(opts.uiUrl, opts.apiServer);
  const fragment = new FragmentData({
    seed: opts.seed,
    server: isDefault ? null : opts.apiServer + '/',
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
