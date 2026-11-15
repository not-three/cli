import { expect } from 'chai';
import { Reporter, resolveOutputMode, ShareInfo } from '../../src/lib/reporter';
import { ShareAlternative } from '@not3/sdk';
import { fileShare, noteShare, p2pShare } from '../../src/lib/share';

class Sink {
  data = '';
  write(chunk: string): boolean {
    this.data += chunk;
    return true;
  }
}

function make(mode: 'pretty' | 'simple' | 'stdout' | 'raw') {
  const out = new Sink();
  const err = new Sink();
  return { out, err, r: new Reporter(mode, out as never, err as never) };
}

const share: ShareInfo = {
  kind: 'note',
  id: 'abc123',
  seed: 'seedX',
  seedGenerated: true,
  url: 'https://not-th.re/abc123#seedX',
  curl: 'curl ...',
  alternatives: [
    {
      id: 'ui',
      label: 'Link',
      description: 'Open in browser.',
      value: 'https://not-th.re/abc123#seedX',
    },
    {
      id: 'cli',
      label: 'CLI',
      description: 'Needs CLI.',
      value: "not3 note get abc123 --seed 'seedX'",
    },
    {
      id: 'docker',
      label: 'Docker',
      description: 'Needs Docker.',
      value: 'docker run ...',
    },
    {
      id: 'curl',
      label: 'cURL',
      description: 'Needs curl.',
      value: 'curl ...',
    },
    {
      id: 'powershell',
      label: 'PowerShell',
      description: 'Needs PowerShell.',
      value: 'powershell ...',
    },
    {
      id: 'server-decrypt',
      label: 'Server-side decrypt',
      description: 'Server sees key.',
      value: 'https://api.not-th.re/decrypt',
    },
  ] as ShareAlternative[],
};

describe('resolveOutputMode', () => {
  it('auto → pretty on TTY, stdout otherwise', () => {
    expect(resolveOutputMode('auto', true)).to.equal('pretty');
    expect(resolveOutputMode('auto', false)).to.equal('stdout');
  });
  it('explicit modes pass through', () => {
    expect(resolveOutputMode('raw', true)).to.equal('raw');
  });
});

describe('Reporter.share', () => {
  const p2p = {
    kind: 'p2p' as const,
    id: 'session-1',
    seed: 'restart-seed',
    seedGenerated: true,
    url: 'https://not-th.re/f/session-1#seed',
    alternatives: [
      {
        id: 'ui',
        label: 'Link',
        description: '',
        value: 'https://not-th.re/f/session-1#seed',
      },
      {
        id: 'cli',
        label: 'CLI',
        description: '',
        value: 'not3 p2p receive link',
      },
      {
        id: 'docker',
        label: 'Docker',
        description: '',
        value: 'docker run receive',
      },
    ] as ShareAlternative[],
  };

  it('pretty mode renders a P2P QR and its available commands', () => {
    const { out, r } = make('pretty');
    r.share(p2p);
    expect(out.data).to.contain(p2p.url);
    expect(out.data.length).to.be.greaterThan(500);
    expect(out.data).to.not.contain('cURL');
    expect(out.data).to.contain('not3 p2p receive link');
    expect(out.data).to.contain('docker run receive');
  });

  it('simple mode prints the P2P URL and seed without curl', () => {
    const { out, r } = make('simple');
    r.share(p2p);
    expect(out.data).to.contain(`url: ${p2p.url}`);
    expect(out.data).to.contain('seed: restart-seed');
    expect(out.data).to.not.contain('curl:');
  });

  it('stdout and raw modes keep the P2P URL and ID machine readable', () => {
    const stdout = make('stdout');
    stdout.r.share(p2p);
    expect(stdout.out.data).to.equal(p2p.url);
    expect(stdout.err.data).to.equal('seed: restart-seed\n');
    const raw = make('raw');
    raw.r.share(p2p);
    expect(raw.out.data).to.equal(p2p.id);
    expect(raw.err.data).to.equal(p2p.seed);
  });
  it('stdout mode: url only on stdout, generated seed on stderr', () => {
    const { out, err, r } = make('stdout');
    r.share(share);
    expect(out.data).to.equal(share.url);
    expect(err.data).to.contain('seedX');
  });
  it('stdout mode: no seed on stderr when user supplied it', () => {
    const { err, r } = make('stdout');
    r.share({ ...share, seedGenerated: false });
    expect(err.data).to.equal('');
  });
  it('raw mode: bare id on stdout, bare seed on stderr', () => {
    const { out, err, r } = make('raw');
    r.share(share);
    expect(out.data).to.equal('abc123');
    expect(err.data).to.equal('seedX');
  });
  it('pretty mode: labels, url and a QR block on stdout', () => {
    const { out, r } = make('pretty');
    r.share(share);
    expect(out.data).to.contain('abc123');
    expect(out.data).to.contain(share.url);
    expect(out.data.length).to.be.greaterThan(500); // QR block present
  });
  it('simple mode: plain key: value lines, no ANSI', () => {
    const { out, r } = make('simple');
    r.share(share);
    expect(out.data).to.contain('id: abc123');
    expect(out.data).to.not.contain('\x1b[');
    expect(out.data).to.equal(
      "id: abc123\nseed: seedX\nurl: https://not-th.re/abc123#seedX\ncli: not3 note get abc123 --seed 'seedX'\ndocker: docker run ...\ncurl: curl ...\npowershell: powershell ...\nserver: https://api.not-th.re/decrypt\n",
    );
  });

  it('pretty mode displays ordered padded labels and exact catalog values', () => {
    const { out, r } = make('pretty');
    r.share(share);
    const lines = out.data
      .split('\n')
      .filter((line) => line.includes('\x1b[2m'));
    expect(lines).to.deep.equal([
      '  \x1b[2mID    \x1b[0m \x1b[36mabc123\x1b[0m',
      '  \x1b[2mSeed  \x1b[0m \x1b[36mseedX\x1b[0m',
      '  \x1b[2mURL   \x1b[0m \x1b[36mhttps://not-th.re/abc123#seedX\x1b[0m',
      "  \x1b[2mCLI   \x1b[0m \x1b[36mnot3 note get abc123 --seed 'seedX'\x1b[0m",
      '  \x1b[2mDocker\x1b[0m \x1b[36mdocker run ...\x1b[0m',
      '  \x1b[2mcURL  \x1b[0m \x1b[36mcurl ...\x1b[0m',
      '  \x1b[2mPS    \x1b[0m \x1b[36mpowershell ...\x1b[0m',
      '  \x1b[2mServer\x1b[0m \x1b[36mhttps://api.not-th.re/decrypt\x1b[0m',
    ]);
  });

  for (const [kind, result] of [
    [
      'note',
      noteShare({
        uiUrl: 'https://not-th.re/',
        apiServer: 'https://api.not-th.re',
        id: 'n1',
        seed: 'seedX',
        mode: 'cbc',
      }),
    ],
    [
      'file',
      fileShare({
        uiUrl: 'https://not-th.re/',
        apiServer: 'https://api.not-th.re',
        id: 'f1',
        seed: 'seedX',
        fileName: 'a.txt',
      }),
    ],
    [
      'p2p',
      p2pShare({
        uiUrl: 'https://not-th.re/',
        apiServer: 'https://api.not-th.re',
        id: 's1',
        seed: 'seedX',
      }),
    ],
  ] as const) {
    for (const mode of ['pretty', 'simple'] as const) {
      it(`${kind} ${mode} prints every SDK alternative in catalog order`, () => {
        const { out, r } = make(mode);
        r.share({
          kind,
          id: 'id',
          seed: 'seedX',
          seedGenerated: false,
          ...result,
        });
        const values = result.alternatives.map((row) => row.value);
        let last = -1;
        for (const value of values) {
          const next = out.data.indexOf(value, last + 1);
          expect(
            next,
            `missing or unordered value: ${value}`,
          ).to.be.greaterThan(last);
          last = next;
        }
        expect(out.data).to.not.contain('undefined:');
      });
    }
    for (const mode of ['stdout', 'raw'] as const) {
      for (const seedGenerated of [true, false]) {
        it(`${kind} ${mode} keeps exact machine bytes with ${seedGenerated ? 'generated' : 'supplied'} seed`, () => {
          const { out, err, r } = make(mode);
          r.share({ kind, id: 'id', seed: 'seedX', seedGenerated, ...result });
          expect(out.data).to.equal(mode === 'stdout' ? result.url : 'id');
          expect(err.data).to.equal(
            seedGenerated
              ? mode === 'stdout'
                ? 'seed: seedX\n'
                : 'seedX'
              : '',
          );
        });
      }
    }
  }

  it('GCM notes print only CLI and Docker commands after the URL', () => {
    const result = noteShare({
      uiUrl: 'https://not-th.re/',
      apiServer: 'https://api.not-th.re',
      id: 'n1',
      seed: 'seedX',
      mode: 'gcm',
    });
    const { out, r } = make('simple');
    r.share({
      kind: 'note',
      id: 'n1',
      seed: 'seedX',
      seedGenerated: false,
      ...result,
    });
    expect(
      out.data
        .split('\n')
        .filter(Boolean)
        .map((line) => line.split(':')[0]),
    ).to.deep.equal(['id', 'seed', 'url', 'cli', 'docker']);
    expect(out.data).to.contain('--mode gcm\n');
  });
});

describe('Reporter.result/info/progress', () => {
  it('result adds newline in simple, verbatim in stdout', () => {
    const a = make('simple');
    a.r.result('x');
    expect(a.out.data).to.equal('x\n');
    const b = make('stdout');
    b.r.result('x');
    expect(b.out.data).to.equal('x');
  });
  it('info goes to stderr, silent in raw', () => {
    const a = make('simple');
    a.r.info('hello');
    expect(a.err.data).to.equal('hello\n');
    const b = make('raw');
    b.r.info('hello');
    expect(b.err.data).to.equal('');
  });
  it('pretty progress rewrites one line on stderr', () => {
    const { err, r } = make('pretty');
    const p = r.progress('Uploading', 4);
    p.update(1);
    p.update(4);
    p.finish();
    expect(err.data).to.contain('\r');
    expect(err.data).to.contain('4/4');
    expect(err.data.endsWith('\n')).to.equal(true);
  });
  it('simple progress prints only ~10% steps', () => {
    const { err, r } = make('simple');
    const p = r.progress('Uploading', 100);
    for (let i = 1; i <= 100; i++) p.update(i);
    p.finish();
    const lines = err.data.trim().split('\n');
    expect(lines.length).to.be.lessThan(15);
  });
  it('raw progress is silent', () => {
    const { err, r } = make('raw');
    const p = r.progress('x', 10);
    p.update(5);
    p.finish();
    expect(err.data).to.equal('');
  });
  it('progress handles total=0 without NaN output', () => {
    const a = make('simple');
    a.r.progress('x', 0).update(0);
    expect(a.err.data).to.not.contain('NaN');
    expect(a.err.data).to.contain('0/0');
    const b = make('pretty');
    b.r.progress('x', 0).update(0);
    expect(b.err.data).to.not.contain('NaN');
  });
});

describe('Reporter.json', () => {
  it('json pretty-prints to stdout in every mode', () => {
    for (const mode of ['pretty', 'simple', 'stdout', 'raw'] as const) {
      const { out, r } = make(mode);
      r.json({ a: 1 });
      expect(out.data).to.equal('{\n  "a": 1\n}\n');
    }
  });
});
