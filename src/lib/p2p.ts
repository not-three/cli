import { FragmentData, type SetBytesFn } from '@not3/sdk';
import { existsSync, promises as fs } from 'fs';
import { basename } from 'path';
import { normalizeServerUrl } from './config';
import { UsageError } from './errors';

export interface ParsedP2PLink {
  sessionId: string;
  seed: string;
  server: string | null;
}

export function safeP2PFileName(name: string): string {
  const clean = basename(name.replaceAll('\\', '/')).replaceAll(
    /[^a-zA-Z0-9.-]/g,
    '_',
  );
  return clean && clean !== '.' && clean !== '..' ? clean : 'download.bin';
}

export function parseP2PLink(link: string): ParsedP2PLink {
  let url: URL;
  let fragment: FragmentData;
  try {
    url = new URL(link);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hash)
      throw new Error();
    fragment = FragmentData.fromURL(link);
    if (!fragment.seed) throw new Error();
  } catch {
    throw new UsageError('Not a valid share link');
  }
  const match = /^\/f\/([^/]+)$/.exec(url.pathname);
  if (!match) throw new UsageError('Not a file share link');
  if (!fragment.p2p)
    throw new UsageError('Not a P2P share link (missing p flag)');
  let server: string | null = null;
  if (fragment.server) {
    server = normalizeServerUrl(fragment.server) + '/';
  }
  return { sessionId: match[1], seed: fragment.seed, server };
}

export function makePositionalSink(
  path: string,
  chunkPayloadSize: number,
): SetBytesFn & { close(): Promise<void> } {
  if (!Number.isSafeInteger(chunkPayloadSize) || chunkPayloadSize <= 0)
    throw new UsageError('Invalid chunk size');
  let handle: fs.FileHandle | undefined;
  const sink = async (buf: ArrayBuffer, index: number): Promise<void> => {
    if (!Number.isSafeInteger(index) || index < 0)
      throw new UsageError('Invalid chunk index');
    handle ??= await fs.open(path, existsSync(path) ? 'r+' : 'w');
    const bytes = Buffer.from(buf);
    let written = 0;
    while (written < bytes.length) {
      const result = await handle.write(
        bytes,
        written,
        bytes.length - written,
        index * chunkPayloadSize + written,
      );
      if (result.bytesWritten === 0)
        throw new Error('File write made no progress');
      written += result.bytesWritten;
    }
  };
  sink.close = async () => {
    await handle?.close();
    handle = undefined;
  };
  return sink;
}
