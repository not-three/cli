import qrcode from 'qrcode-terminal';
import { OutputModeSetting } from './config';

export type OutputMode = 'pretty' | 'simple' | 'stdout' | 'raw';

export function resolveOutputMode(
  setting: OutputModeSetting,
  isTTY: boolean,
): OutputMode {
  if (setting === 'auto') return isTTY ? 'pretty' : 'stdout';
  return setting;
}

export interface ShareInfo {
  kind: 'note' | 'file';
  id: string;
  seed: string;
  seedGenerated: boolean;
  url: string;
  curl: string;
}

export interface Progress {
  update(done: number): void;
  finish(): void;
}

const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

export class Reporter {
  constructor(
    public readonly mode: OutputMode,
    private readonly out: NodeJS.WritableStream = process.stdout,
    private readonly err: NodeJS.WritableStream = process.stderr,
  ) {}

  result(text: string): void {
    if (this.mode === 'pretty' || this.mode === 'simple') {
      this.out.write(text.endsWith('\n') ? text : text + '\n');
    } else {
      this.out.write(text);
    }
  }

  info(msg: string): void {
    if (this.mode === 'raw') return;
    this.err.write(msg + '\n');
  }

  json(data: unknown): void {
    this.out.write(JSON.stringify(data, null, 2) + '\n');
  }

  share(info: ShareInfo): void {
    switch (this.mode) {
      case 'pretty': {
        const kv = (label: string, value: string) =>
          this.out.write(
            `  ${DIM}${label.padEnd(5)}${RESET} ${CYAN}${value}${RESET}\n`,
          );
        this.out.write('\n');
        kv('ID', info.id);
        kv('Seed', info.seed);
        kv('URL', info.url);
        kv('cURL', info.curl);
        this.out.write('\n' + renderQr(info.url) + '\n');
        break;
      }
      case 'simple':
        this.out.write(
          `id: ${info.id}\nseed: ${info.seed}\nurl: ${info.url}\ncurl: ${info.curl}\n`,
        );
        break;
      case 'stdout':
        if (info.seedGenerated) this.err.write(`seed: ${info.seed}\n`);
        this.out.write(info.url);
        break;
      case 'raw':
        if (info.seedGenerated) this.err.write(info.seed);
        this.out.write(info.id);
        break;
    }
  }

  progress(label: string, total: number): Progress {
    if (this.mode === 'raw') return { update: () => {}, finish: () => {} };
    if (this.mode === 'pretty') {
      const width = 20;
      return {
        update: (done) => {
          const filled = Math.min(width, Math.round((done / total) * width));
          this.err.write(
            `\r${label} [${'='.repeat(filled)}${' '.repeat(width - filled)}] ${done}/${total}`,
          );
        },
        finish: () => this.err.write('\n'),
      };
    }
    let lastStep = -1;
    return {
      update: (done) => {
        const step = Math.floor(((done / total) * 100) / 10);
        if (step <= lastStep && done !== total) return;
        if (done === total && lastStep === 10) return;
        lastStep = done === total ? 10 : step;
        this.err.write(
          `${label}: ${done}/${total} (${Math.floor((done / total) * 100)}%)\n`,
        );
      },
      finish: () => {},
    };
  }
}

function renderQr(url: string): string {
  let rendered = '';
  qrcode.generate(url, { small: true }, (q: string) => {
    rendered = q;
  });
  return rendered;
}
