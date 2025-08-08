import { Not3Client, Crypto, FileUpload, ShareGenerator } from '@not3/sdk';
import { Command, Option } from 'nest-commander';
import { statSync, existsSync, createReadStream } from 'fs';
import { basename } from 'path';
import { BaseCommandRunner } from 'src/base.command';

@Command({
  name: 'upload',
  aliases: ['u'],
  description: 'Upload a file and encrypt it',
  arguments: '<input>',
})
export class UploadCommand extends BaseCommandRunner {
  @Option({
    flags: '--seed <seed>',
    description: 'Seed for encryption',
  })
  parseSeed(seed: string) {
    return seed;
  }

  async run(params: string[], options: Record<string, any>) {
    const api = new Not3Client({
      baseUrl: options.server,
      password: options.password,
    });

    const sysApi = api.system();
    if (!options.noVersionCheck && !(await api.isCompatible(sysApi))) {
      console.error('Server is not compatible with this client');
      console.error('Server version:', (await sysApi.info()).version);
      console.error('Compatible version:', api.getVersionRange());
    }

    if (!existsSync(params[0])) throw new Error('File does not exist');

    const stat = statSync(params[0]);
    if (stat.isDirectory()) throw new Error('Cannot upload a directory');

    const seed = options.seed || Crypto.generateSeed();
    const fileName = basename(params[0]).replaceAll(/[^a-zA-Z0-9.-]/g, '_');

    const upload = new FileUpload(
      api.files(),
      fileName,
      stat.size,
      4,
      true,
      seed,
    );

    const total = upload.getChunkCount();
    let lastProgress = 0;

    upload.onProgress((p) => {
      const done = Object.values(p).filter((v) => v.state === 'done').length;
      if (done <= lastProgress) return;
      lastProgress = done;
      const percentage = Math.floor((done / total) * 100);
      console.log(`Uploading... ${done}/${total} (${percentage}%)`);
    });

    await upload.start((start, end) => {
      const stream = createReadStream(params[0], { start, end: end - 1 });
      return new Promise<ArrayBuffer>((resolve, reject) => {
        const data: Buffer[] = [];
        stream.on('data', (chunk: Buffer) => {
          data.push(Buffer.from(chunk));
        });
        stream.on('end', () => {
          const buffer = Buffer.concat(data);
          const arrayBuffer = new ArrayBuffer(buffer.length);
          const view = new Uint8Array(arrayBuffer);
          for (let i = 0; i < buffer.length; i++) {
            view[i] = buffer[i];
          }
          resolve(arrayBuffer);
        });
        stream.on('error', reject);
      });
    });

    if (process.stdout.isTTY) {
      console.log('\nUpload complete.\n');
      console.log('ID:', upload.getID());
      if (!options.seed) console.log('Seed:', seed);
      const gen = new ShareGenerator({
        uiUrl: 'https://not-th.re/',
        apiUrl: options.server + '/',
        storeServer: true,
      });
      console.log('\nWeb UI:', gen.fileUi(upload.getID(), seed));
      console.log('\ncURL:', gen.fileCurl(upload.getID(), seed, fileName));
    }
  }
}
