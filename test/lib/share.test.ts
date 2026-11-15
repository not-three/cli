import { expect } from 'chai';
import { FragmentData, ShareGenerator } from '@not3/sdk';
import { fileShare, noteShare, p2pShare } from '../../src/lib/share';

describe('noteShare', () => {
  it('returns the released catalog in order for a CBC note', () => {
    const result = noteShare({
      uiUrl: 'https://not-th.re/',
      apiServer: 'https://api.not-th.re',
      id: 'n1',
      seed: 'seedX',
      mode: 'cbc',
    });
    const expected = new ShareGenerator({
      uiUrl: 'https://not-th.re/',
      apiUrl: 'https://api.not-th.re/',
      storeServer: false,
    }).alternatives({
      kind: 'note',
      id: 'n1',
      seed: 'seedX',
      cryptoMode: 'cbc',
      fragment: new FragmentData({
        seed: 'seedX',
        server: null,
        cryptoMode: 'cbc',
      }),
    });
    expect(result.alternatives).to.deep.equal(expected);
    expect(result.alternatives.map((row) => row.id)).to.deep.equal([
      'ui',
      'cli',
      'docker',
      'curl',
      'powershell',
      'server-decrypt',
    ]);
    expect(result.url).to.equal(result.alternatives[0].value);
    expect(result.curl).to.equal(result.alternatives[3].value);
  });

  it('passes GCM mode and omits shell decryption alternatives', () => {
    const result = noteShare({
      uiUrl: 'https://not-th.re/',
      apiServer: 'https://api.not-th.re',
      id: 'n1',
      seed: 'seedX',
      mode: 'gcm',
    });
    expect(result.alternatives.map((row) => row.id)).to.deep.equal([
      'ui',
      'cli',
      'docker',
    ]);
    expect(result.alternatives[1].value).to.equal(
      "not3 note get n1 --seed 'seedX' --mode gcm",
    );
  });

  it('uses save commands for notes read from a file', () => {
    const result = noteShare({
      uiUrl: 'https://not-th.re/',
      apiServer: 'https://api.not-th.re',
      id: 'n1',
      seed: 'seedX',
      mode: 'cbc',
      fileName: 'note.txt',
    });
    expect(result.alternatives[1].value).to.equal(
      "not3 note get n1 --seed 'seedX' --output 'note.txt'",
    );
    expect(result.alternatives[3].value).to.contain(' > note.txt');
    expect(result.alternatives[4].value).to.contain(" > 'note.txt'");
  });
  it('builds a ui url containing the note id and seed fragment', () => {
    const { url, curl } = noteShare({
      uiUrl: 'https://not-th.re/',
      apiServer: 'https://api.not-th.re',
      id: 'n1',
      seed: 'seedX',
      mode: 'cbc',
    });
    expect(url).to.contain('n1');
    expect(url).to.contain('#');
    expect(curl).to.contain('curl');
  });
  it('stores the server in the fragment only for non-default servers', () => {
    const custom = noteShare({
      uiUrl: 'https://not-th.re/',
      apiServer: 'https://other.example',
      id: 'n1',
      seed: 'seedX',
      mode: 'cbc',
    });
    const def = noteShare({
      uiUrl: 'https://not-th.re/',
      apiServer: 'https://api.not-th.re',
      id: 'n1',
      seed: 'seedX',
      mode: 'cbc',
    });
    expect(FragmentData.fromURL(custom.url).server).to.equal(
      'https://other.example/',
    );
    expect(FragmentData.fromURL(def.url).server).to.equal(null);
    expect(custom.alternatives[1].value).to.contain(
      '--server https://other.example',
    );
    expect(custom.alternatives[2].value).to.contain(
      '--server https://other.example',
    );
    expect(custom.alternatives[0].value).to.equal(custom.url);
  });
  it('normalizes a trailing-slash apiServer to avoid double slashes', () => {
    const { url } = noteShare({
      uiUrl: 'https://not-th.re/',
      apiServer: 'https://other.example/',
      id: 'n1',
      seed: 'seedX',
      mode: 'cbc',
    });
    expect(FragmentData.fromURL(url).server).to.equal('https://other.example/');
    expect(url).to.not.match(/example\/\//);
  });
});

describe('p2pShare', () => {
  it('returns only link, CLI, and Docker alternatives', () => {
    const result = p2pShare({
      uiUrl: 'https://not-th.re/',
      apiServer: 'https://api.not-th.re',
      id: 's1',
      seed: 'seedX',
    });
    expect(result.alternatives.map((row) => row.id)).to.deep.equal([
      'ui',
      'cli',
      'docker',
    ]);
    expect(result.alternatives[1].value).to.equal(
      `not3 p2p receive '${result.url}'`,
    );
  });
  it('puts the seed and custom server in the fragment', () => {
    const url = p2pShare({
      uiUrl: 'https://not-th.re/',
      apiServer: 'https://other.example',
      id: 's1',
      seed: 'k1',
    }).url;
    expect(new URL(url).pathname).to.equal('/f/s1');
    const fragment = FragmentData.fromURL(url);
    expect(fragment.seed).to.equal('k1');
    expect(fragment.server).to.equal('https://other.example/');
    expect(fragment.p2p).to.equal(true);
  });
});

describe('fileShare', () => {
  it('uses the released file catalog and preserves the filename', () => {
    const result = fileShare({
      uiUrl: 'https://not-th.re/',
      apiServer: 'https://api.not-th.re',
      id: 'f1',
      seed: 'seedX',
      fileName: 'a.txt',
    });
    expect(result.alternatives.map((row) => row.id)).to.deep.equal([
      'ui',
      'cli',
      'docker',
      'curl',
      'powershell',
    ]);
    expect(result.alternatives[1].value).to.equal(
      "not3 file download f1 'a.txt' --seed 'seedX'",
    );
    expect(result.curl).to.equal(result.alternatives[3].value);
  });
  it('builds file ui and curl links', () => {
    const { url, curl } = fileShare({
      uiUrl: 'https://not-th.re/',
      apiServer: 'https://api.not-th.re',
      id: 'f1',
      seed: 'seedX',
      fileName: 'a.txt',
    });
    expect(url).to.contain('f1');
    expect(curl).to.contain('a.txt');
  });
});
