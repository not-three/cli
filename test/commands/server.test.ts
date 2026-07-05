import { runCommand } from '@oclif/test';
import { expect } from 'chai';
import nock from 'nock';

const SERVER = 'http://localhost:9999';
const INFO = {
  version: 'IN-DEV',
  availableTokens: 100,
  maxStorageTimeDays: 30,
  fileTransferEnabled: true,
  fileTransferMaxSize: 0,
  privateMode: false,
  time: 0,
  totalNotes: 5,
  requestsInLastMinute: 0,
  notExpiredFailedRequests: 0,
  currentFiles: 0,
  currentUploadingFiles: 0,
  bannedIps: 0,
};

describe('not3 server', () => {
  afterEach(() => nock.cleanAll());

  it('info prints server info as JSON', async () => {
    nock(SERVER).get('/info').times(2).reply(200, INFO);
    const { stdout } = await runCommand([
      'server',
      'info',
      '-s',
      SERVER,
      '--output-mode',
      'simple',
    ]);
    expect(JSON.parse(stdout).totalNotes).to.equal(5);
  });

  it('stats prints stats as JSON', async () => {
    nock(SERVER).get('/info').reply(200, INFO);
    nock(SERVER).get('/stats').query(true).reply(200, { anything: true });
    const { stdout } = await runCommand([
      'server',
      'stats',
      '-s',
      SERVER,
      '--output-mode',
      'simple',
    ]);
    expect(JSON.parse(stdout).anything).to.equal(true);
  });

  it('stats sends the dedicated stats password', async () => {
    nock(SERVER).get('/info').reply(200, INFO);
    nock(SERVER)
      .get('/stats')
      .query({ password: 'statspw' })
      .reply(200, { ok: true });
    const { stdout } = await runCommand([
      'server',
      'stats',
      '-s',
      SERVER,
      '--stats-password',
      'statspw',
      '--output-mode',
      'simple',
    ]);
    expect(JSON.parse(stdout).ok).to.equal(true);
  });

  it('stats falls back to the server password when no stats password is given', async () => {
    nock(SERVER).get('/info').reply(200, INFO);
    nock(SERVER)
      .get('/stats')
      .query({ password: 'serverpw' })
      .reply(200, { ok: true });
    const { stdout } = await runCommand([
      'server',
      'stats',
      '-s',
      SERVER,
      '-p',
      'serverpw',
      '--output-mode',
      'simple',
    ]);
    expect(JSON.parse(stdout).ok).to.equal(true);
  });
});
