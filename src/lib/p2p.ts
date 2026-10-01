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

export function transferMiBProgress(
  bytesTransferred: number,
  totalBytes: number,
): { done: number; total: number } {
  const total = Math.ceil(totalBytes / (1024 * 1024));
  const done =
    bytesTransferred >= totalBytes
      ? total
      : Math.min(total, Math.floor(bytesTransferred / (1024 * 1024)));
  return { done, total };
}

export function validateResumeOffset(offset: number, size: number): void {
  if (offset > size)
    throw new UsageError('Partial output is larger than the shared file');
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
    let protocol: string;
    try {
      protocol = new URL(fragment.server).protocol;
    } catch {
      throw new UsageError('Not a valid share link');
    }
    if (protocol !== 'http:' && protocol !== 'https:')
      throw new UsageError('Not a valid share link');
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
  const preExisting = existsSync(path);
  let handle: fs.FileHandle | undefined;
  const sink = async (buf: ArrayBuffer, index: number): Promise<void> => {
    if (!Number.isSafeInteger(index) || index < 0)
      throw new UsageError('Invalid chunk index');
    handle ??= await fs.open(path, preExisting ? 'r+' : 'wx');
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
