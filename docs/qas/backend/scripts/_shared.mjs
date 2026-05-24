// Shared loader for per-feature test files: reads the bootstrapped .state.json and
// re-derives any tokens. Every test file imports `state` from here.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
export const state = JSON.parse(readFileSync(join(HERE, '.state.json'), 'utf8'));

export const TODAY = new Date().toISOString().slice(0, 10);
export const isoMinutesAgo = (m) => new Date(Date.now() - m * 60000).toISOString();
