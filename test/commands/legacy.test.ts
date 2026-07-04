import { runCommand } from '@oclif/test';
import { expect } from 'chai';

describe('legacy command stubs', () => {
  const cases: Array<[string, string]> = [
    ['save', 'note save'],
    ['query', 'note get'],
    ['upload', 'file upload'],
    ['download', 'file download'],
    ['encrypt', 'crypto encrypt'],
    ['decrypt', 'crypto decrypt'],
    ['edit', 'crypto edit'],
    ['seed', 'crypto seed'],
    ['info', 'server info'],
    ['stats', 'server stats'],
  ];
  for (const [oldName, newName] of cases) {
    it(`${oldName} points to ${newName}`, async () => {
      const { error } = await runCommand([oldName]);
      expect(error?.message ?? '').to.contain(newName);
    });
  }
});
