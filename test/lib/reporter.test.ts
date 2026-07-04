import { expect } from 'chai';
import { Reporter, resolveOutputMode, ShareInfo } from '../../src/lib/reporter';

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
    expect(out.data).to.not.match(/\x1b\[/);
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
