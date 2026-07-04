import { Not3Client } from '@not3/sdk';
import { IncompatibleServerError } from './errors';

export async function createApi(opts: {
  server: string;
  password?: string;
  versionCheck: boolean;
}): Promise<Not3Client> {
  const client = new Not3Client({
    baseUrl: opts.server + '/',
    password: opts.password,
  });
  if (opts.versionCheck) {
    const sys = client.system();
    if (!(await client.isCompatible(sys))) {
      throw new IncompatibleServerError(
        (await sys.info()).version,
        client.getVersionRange(),
      );
    }
  }
  return client;
}
