import { expect } from 'chai';
import { mkdirSync, mkdtempSync, statSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  DEFAULTS,
  loadConfig,
  normalizeServerUrl,
  resolveSettings,
  saveConfig,
} from '../../src/lib/config';

describe('normalizeServerUrl', () => {
  it('lowercases scheme and host, keeps port and path, strips trailing slashes', () => {
    expect(normalizeServerUrl('HTTPS://API.Example.COM/')).to.equal(
      'https://api.example.com',
    );
    expect(normalizeServerUrl('https://x.com:8443/base/')).to.equal(
      'https://x.com:8443/base',
    );
  });
  it('drops explicit default ports', () => {
    expect(normalizeServerUrl('https://x.com:443')).to.equal('https://x.com');
    expect(normalizeServerUrl('http://x.com:80/a')).to.equal('http://x.com/a');
  });
  it('throws UsageError on garbage', () => {
    expect(() => normalizeServerUrl('not a url')).to.throw(
      /Invalid server URL/,
    );
  });
});

describe('load/saveConfig', () => {
  it('returns {} when no file exists', () => {
    expect(loadConfig(mkdtempSync(join(tmpdir(), 'not3-')))).to.deep.equal({});
  });
  it('round-trips and sets 0600/0700 permissions', () => {
    const dir = join(mkdtempSync(join(tmpdir(), 'not3-')), 'cfg');
    saveConfig(dir, { server: 'https://a.example' });
    expect(loadConfig(dir)).to.deep.equal({ server: 'https://a.example' });
    expect(statSync(join(dir, 'config.json')).mode & 0o777).to.equal(0o600);
    expect(statSync(dir).mode & 0o777).to.equal(0o700);
  });
  it('throws a friendly error on invalid JSON', () => {
    const dir = mkdtempSync(join(tmpdir(), 'not3-'));
    writeFileSync(join(dir, 'config.json'), '{nope');
    expect(() => loadConfig(dir)).to.throw(/config file .* is not valid JSON/i);
  });
  it('tightens permissions on a pre-existing config directory', () => {
    const dir = join(mkdtempSync(join(tmpdir(), 'not3-')), 'cfg');
    mkdirSync(dir, { recursive: true, mode: 0o755 });
    saveConfig(dir, { server: 'https://a.example' });
    expect(statSync(dir).mode & 0o777).to.equal(0o700);
  });
});

describe('resolveSettings', () => {
  const cfg = {
    server: 'https://self.example',
    servers: { 'https://self.example': { password: 'pw1' } },
    mode: 'gcm' as const,
  };
  it('uses defaults on empty config and flags', () => {
    const s = resolveSettings({}, {});
    expect(s.server).to.equal(DEFAULTS.server);
    expect(s.mode).to.equal('cbc');
    expect(s.versionCheck).to.equal(true);
    expect(s.password).to.equal(undefined);
  });
  it('applies the stored password for the configured default server', () => {
    expect(resolveSettings(cfg, {}).password).to.equal('pw1');
  });
  it('does NOT leak the stored password to a different server', () => {
    expect(
      resolveSettings(cfg, { server: 'https://other.example' }).password,
    ).to.equal(undefined);
  });
  it('finds a stored password for an explicitly selected known server', () => {
    expect(
      resolveSettings(cfg, { server: 'HTTPS://SELF.example/' }).password,
    ).to.equal('pw1');
  });
  it('flag password beats stored password', () => {
    expect(resolveSettings(cfg, { password: 'flag' }).password).to.equal(
      'flag',
    );
  });
  it('noVersionCheck flag wins over config', () => {
    expect(
      resolveSettings({ versionCheck: true }, { noVersionCheck: true })
        .versionCheck,
    ).to.equal(false);
  });
});
