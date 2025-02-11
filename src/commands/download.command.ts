import { FileDownload } from '@not3/sdk';
import { createWriteStream } from 'fs';
import { Command } from 'nest-commander';
import { BaseCommandRunner } from 'src/base.command';

@Command({
  name: 'download',
  aliases: ['d'],
  description: 'Download a file and decrypt it',
  arguments: '<id> <seed> <output>',
})
export class DownloadCommand extends BaseCommandRunner {
  async run(params: string[], options: Record<string, any>) {
    const api = await this.getApi(options);
    const download = new FileDownload(api.files(), params[0], params[1]);
    await download.prepare();

    const file = createWriteStream(params[2]);
    const total = download.getTotalChunks();

    await download.start(async (buf, index) => {
      const stepOf20 = Math.floor((index / total) * 20);
      console.log(
        [
          `[${new Array(stepOf20).fill('=').join('')}`,
          `${new Array(20 - stepOf20).fill(' ').join('')}] `,
          `${index}/${total}`,
        ].join(''),
      );
      file.write(buf);
    });

    file.end();
    console.log('Download complete, file saved to', params[2]);
  }
}
