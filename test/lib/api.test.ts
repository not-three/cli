import { expect } from 'chai';
import nock from 'nock';
import { createApi } from '../../src/lib/api';
import { IncompatibleServerError } from '../../src/lib/errors';

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

describe('createApi', () => {
  afterEach(() => nock.cleanAll());

  it('passes the version check for IN-DEV servers', async () => {
    nock('http://localhost:9999').get('/info').reply(200, INFO);
    const api = await createApi({
      server: 'http://localhost:9999',
      password: undefined,
      versionCheck: true,
    });
    expect(api.getOptions().baseUrl).to.equal('http://localhost:9999/');
  });

  it('throws IncompatibleServerError for an out-of-range server version', async () => {
    nock('http://localhost:9999')
      .get('/info')
      .twice()
      .reply(200, { ...INFO, version: '0.0.1' });
    try {
      await createApi({
        server: 'http://localhost:9999',
        password: undefined,
        versionCheck: true,
      });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(IncompatibleServerError);
      expect((err as IncompatibleServerError).serverVersion).to.equal('0.0.1');
    }
  });

  it('skips the check when versionCheck is false', async () => {
    const api = await createApi({
      server: 'http://localhost:9999',
      password: 'pw',
      versionCheck: false,
    });
    expect(api.getOptions().password).to.equal('pw');
  });
});
