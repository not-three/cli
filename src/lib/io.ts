import { createReadStream } from 'fs';

export function readFileChunk(
  path: string,
  start: number,
  endExclusive: number,
): Promise<ArrayBuffer> {
  if (endExclusive <= start) return Promise.resolve(new ArrayBuffer(0));
  return new Promise((resolve, reject) => {
    const stream = createReadStream(path, { start, end: endExclusive - 1 });
    const parts: Buffer[] = [];
    stream.on('data', (chunk) => parts.push(Buffer.from(chunk as Buffer)));
    stream.on('end', () => {
      const buf = Buffer.concat(parts);
      resolve(
        buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      );
    });
    stream.on('error', reject);
  });
}

export function makeFileSink(
  stream: NodeJS.WritableStream,
): (buf: ArrayBuffer, index: number) => Promise<void> {
  return (buf) =>
    new Promise((resolve, reject) => {
      stream.write(Buffer.from(buf), (err) => (err ? reject(err) : resolve()));
    });
}
