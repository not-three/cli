#!/usr/bin/env node
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
async function main() {
  const { execute } = require('@oclif/core');
  await execute({ development: true, dir: __dirname });
}
main();
