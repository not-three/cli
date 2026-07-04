import { runCommand } from '@oclif/test';
import { expect } from 'chai';
import { mkdtempSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('not3 config', () => {
  let home: string;
  const env = process.env;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'not3-cfg-'));
    process.env = { ...env, XDG_CONFIG_HOME: join(home, '.config') };
  });
  afterEach(() => {
    process.env = env;
  });

  function readCfg(): Record<string, unknown> {
    return JSON.parse(
      readFileSync(join(home, '.config', 'not3', 'config.json'), 'utf8'),
    );
  }

  it('sets and gets a plain key', async () => {
    await runCommand(['config', 'set', 'mode', 'gcm']);
    expect(readCfg().mode).to.equal('gcm');
    const { stdout } = await runCommand(['config', 'get', 'mode']);
    expect(stdout).to.contain('gcm');
  });

  it('rejects unknown keys with the valid key list', async () => {
    const { error } = await runCommand(['config', 'set', 'bogus', 'x']);
    expect(error?.message).to.contain('server');
  });

  it('binds the password to the effective server', async () => {
    await runCommand(['config', 'set', 'server', 'https://self.example']);
    await runCommand(['config', 'set', 'password', 'pw1']);
    await runCommand([
      'config',
      'set',
      'password',
      'pw2',
      '-s',
      'https://other.example',
    ]);
    const cfg = readCfg() as { servers: Record<string, { password: string }> };
    expect(cfg.servers['https://self.example'].password).to.equal('pw1');
    expect(cfg.servers['https://other.example'].password).to.equal('pw2');
  });

  it('masks passwords in get and list, reveals with --show-secrets', async () => {
    await runCommand(['config', 'set', 'password', 'topsecret']);
    const get = await runCommand(['config', 'get', 'password']);
    expect(get.stdout).to.not.contain('topsecret');
    const list = await runCommand(['config', 'list']);
    expect(list.stdout).to.not.contain('topsecret');
    const secrets = await runCommand(['config', 'list', '--show-secrets']);
    expect(secrets.stdout).to.contain('topsecret');
  });

  it('unsets password and cleans up empty server entries', async () => {
    await runCommand(['config', 'set', 'password', 'pw1']);
    await runCommand(['config', 'unset', 'password']);
    const cfg = readCfg() as { servers?: Record<string, unknown> };
    expect(cfg.servers ?? {}).to.deep.equal({});
  });

  it('get falls back to defaults for unset keys', async () => {
    const { stdout } = await runCommand(['config', 'get', 'server']);
    expect(stdout).to.contain('https://api.not-th.re');
  });

  it('get is server-scoped like set/unset (regression: -s rejected as unknown flag)', async () => {
    await runCommand(['config', 'set', 'server', 'https://self.example']);
    await runCommand(['config', 'set', 'password', 'pw1']);
    await runCommand([
      'config',
      'set',
      'password',
      'pw2',
      '-s',
      'https://other.example',
    ]);
    const get = await runCommand([
      'config',
      'get',
      'password',
      '-s',
      'https://other.example',
    ]);
    expect(get.error).to.equal(undefined);
    expect(get.stdout).to.contain('••••');

    const server = await runCommand([
      'config',
      'get',
      'server',
      '-s',
      'https://other.example',
    ]);
    expect(server.error).to.equal(undefined);
    expect(server.stdout).to.contain('https://other.example');
  });
});
