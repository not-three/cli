import { expect } from 'chai';
import { FragmentData } from '@not3/sdk';
import { fileShare, noteShare } from '../../src/lib/share';

describe('noteShare', () => {
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

describe('fileShare', () => {
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
