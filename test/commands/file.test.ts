import { runCommand } from '@oclif/test';
import { expect } from 'chai';
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import nock from 'nock';
import not3Sdk from '@not3/sdk';

const { Crypto } = not3Sdk;

const SERVER = 'http://localhost:9999';
const INFO = {
  version: 'IN-DEV',
  availableTokens: 100,
  maxStorageTimeDays: 30,
  fileTransferEnabled: true,
  fileTransferMaxSize: 0,
  privateMode: false,
  time: 0,
  totalNotes: 0,
  requestsInLastMinute: 0,
  notExpiredFailedRequests: 0,
  currentFiles: 0,
  currentUploadingFiles: 0,
  bannedIps: 0,
};

describe('not3 file upload --dir', () => {
  afterEach(() => nock.cleanAll());

  it('rejects --dir when the input is not a directory', async () => {
    const base = mkdtempSync(join(tmpdir(), 'not3-test-'));
    const file = join(base, 'plain.txt');
    writeFileSync(file, 'hi');
    const { error } = await runCommand([
      'file',
      'upload',
      file,
      '--dir',
      '-s',
      SERVER,
    ]);
    expect(error?.message).to.contain('Not a directory');
  });

  it('hints at --dir when a directory is uploaded without it', async () => {
    const base = mkdtempSync(join(tmpdir(), 'not3-test-'));
    const { error } = await runCommand(['file', 'upload', base, '-s', SERVER]);
    expect(error?.message).to.contain('--dir');
  });

  it('zips the directory and uploads it as <dirname>.zip', async () => {
    const base = mkdtempSync(join(tmpdir(), 'not3-test-'));
    const dir = join(base, 'demo+data');
    mkdirSync(join(dir, 'sub'), { recursive: true });
    writeFileSync(join(dir, 'a.txt'), 'alpha');
    writeFileSync(join(dir, 'sub', 'b.txt'), 'beta');

    let postedName = '';
    nock(SERVER).persist().get('/info').reply(200, INFO);
    nock(SERVER)
      .post('/file/upload', (body) => {
        postedName = (body as { name: string }).name;
        return true;
      })
      .reply(201, { id: 'file-1' });
    nock(SERVER)
      .get('/file/upload/file-1')
      .query(true)
      .reply(200, { url: `${SERVER}/chunk/1` });
    nock(SERVER).put('/chunk/1').reply(200, '', { ETag: '"etag-1"' });
    nock(SERVER).put('/file/upload/file-1').reply(200);

    const { stdout, error } = await runCommand([
      'file',
      'upload',
      dir,
      '--dir',
      '-s',
      SERVER,
      '--seed',
      Crypto.generateSeed(),
      '--output-mode',
      'raw',
    ]);

    expect(error).to.equal(undefined);
    expect(stdout).to.equal('file-1');
    expect(postedName).to.equal('demo_data.zip');
    // the temporary zip must be cleaned up afterwards
    const leftovers = readdirSync(tmpdir()).filter((e) =>
      e.startsWith('not3-zip-'),
    );
    expect(leftovers).to.have.length(0);
  });
});
