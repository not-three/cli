export class UsageError extends Error {}

export class IncompatibleServerError extends Error {
  constructor(
    public readonly serverVersion: string,
    public readonly expectedRange: string,
  ) {
    super(
      `Server is not compatible with this client (server version ${serverVersion}, compatible range ${expectedRange})`,
    );
  }
}
