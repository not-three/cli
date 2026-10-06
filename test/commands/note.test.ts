import { runCommand } from '@oclif/test';
import { expect } from 'chai';
import nock from 'nock';
import { Crypto } from '@not3/sdk';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

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

describe('not3 note', () => {
  let originalIsTTY: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalIsTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
    Object.defineProperty(process.stdin, 'isTTY', {
      value: true,
      configurable: true,
    });
  });

  afterEach(() => {
    if (originalIsTTY) {
      Object.defineProperty(process.stdin, 'isTTY', originalIsTTY);
    } else {
      delete (process.stdin as unknown as { isTTY?: boolean }).isTTY;
    }
    nock.cleanAll();
  });

  it('save --file prints save variants from the SDK catalog', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'not3-note-share-'));
    const file = join(dir, 'message.txt');
    writeFileSync(file, 'secret');
    const seed = Crypto.generateSeed();
    try {
      nock(SERVER).get('/info').times(2).reply(200, INFO);
      nock(SERVER)
        .post('/note/json')
        .reply(201, { id: 'note-file', cost: 1, deleteToken: 't' });
      const { stdout, error } = await runCommand([
        's',
        '--file',
        file,
        '--server',
        SERVER,
        '--seed',
        seed,
        '--output-mode',
        'simple',
      ]);
      expect(error).to.equal(undefined);
      expect(stdout).to.contain(
        `cli: not3 note get note-file --seed '${seed}' --server ${SERVER} --output '${file}'\n`,
      );
      expect(stdout).to.contain(
        `docker: docker run --rm -it -v "$(pwd):/data" ghcr.io/not-three/cli note get note-file --seed '${seed}' --server ${SERVER} --output '${file}'\n`,
      );
      expect(stdout).to.contain('powershell: ');
      expect(stdout).to.contain('server: ');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('save encrypts, posts, and prints a share url (stdout mode)', async () => {
    let posted = '';
    nock(SERVER).get('/info').times(2).reply(200, INFO);
    nock(SERVER)
      .post('/note/json', (body) => {
        posted = (body as { content: string }).content;
        return true;
      })
      .reply(201, { id: 'note-1', cost: 1, deleteToken: 't' });

    const { stdout, stderr } = await runCommand([
      'note',
      'save',
      'my',
      'text',
      '-s',
      SERVER,
      '--output-mode',
      'stdout',
    ]);
    expect(stdout).to.contain('note-1');
    expect(stdout).to.contain('#');
    expect(stderr).to.contain('seed:');
    expect(posted).to.not.contain('my text');
  });

  it('save in raw mode prints the bare id', async () => {
    const seed = Crypto.generateSeed();
    nock(SERVER).get('/info').times(2).reply(200, INFO);
    nock(SERVER)
      .post('/note/json')
      .reply(201, { id: 'note-2', cost: 1, deleteToken: 't' });
    const { stdout } = await runCommand([
      'note',
      'save',
      'text',
      '-s',
      SERVER,
      '--seed',
      seed,
      '--output-mode',
      'raw',
    ]);
    expect(stdout).to.equal('note-2');
  });

  it('get fetches and decrypts a note', async () => {
    const seed = Crypto.generateSeed();
    const key = await Crypto.generateKey(seed, 'cbc');
    const enc = await Crypto.encrypt('stored note', key, 'cbc');
    nock(SERVER).get('/info').reply(200, INFO);
    nock(SERVER)
      .get('/note/note-3/json')
      .reply(200, { content: enc, expiresAt: 0, deleted: false });
    const { stdout } = await runCommand([
      'note',
      'get',
      'note-3',
      '-s',
      SERVER,
      '--seed',
      seed,
      '--output-mode',
      'stdout',
    ]);
    expect(stdout).to.equal('stored note');
  });

  it('is reachable via top-level aliases s and g', async () => {
    const { error } = await runCommand(['s', '--help']);
    expect(error).to.equal(undefined);
    const { error: e2 } = await runCommand(['g', '--help']);
    expect(e2).to.equal(undefined);
  });
});
