#!/usr/bin/env node
import { promises as fs, readFileSync } from 'fs';
import path from 'path';

const applyEnvFromFile = filePath => {
  try {
    const content = readFileSync(filePath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }
      const equalsIndex = trimmed.indexOf('=');
      if (equalsIndex === -1) {
        return;
      }
      const key = trimmed.slice(0, equalsIndex).trim();
      let value = trimmed.slice(equalsIndex + 1).trim();

      if (!key || process.env[key] !== undefined) {
        return;
      }

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};

const deriveProjectRef = url => {
  if (!url) {
    return null;
  }
  try {
    const { hostname } = new URL(url);
    if (!hostname) {
      return null;
    }
    const [subdomain] = hostname.split('.');
    return subdomain || null;
  } catch {
    return null;
  }
};

const extractTypeDefinitions = (payload, contentType = '') => {
  const trimmed = payload.trim();
  const lowerContentType = contentType.toLowerCase();
  const looksLikeJson =
    lowerContentType.includes('application/json') || trimmed.startsWith('{');

  if (!looksLikeJson) {
    return payload;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === 'string') {
      return parsed;
    }
    if (parsed && typeof parsed.types === 'string') {
      return parsed.types;
    }
    throw new Error('JSON response did not contain a `types` string.');
  } catch (error) {
    throw new Error(`Failed to parse JSON response from Supabase: ${error.message}`);
  }
};

if (typeof fetch !== 'function') {
  console.error('[supabase-types] Global fetch is not available. Please use Node.js 18 or newer.');
  process.exit(1);
}

const ROOT = process.cwd();
applyEnvFromFile(path.join(ROOT, '.env'));

const OUTPUT_FILE = path.join(ROOT, 'types', 'generated', 'supabase.ts');
const PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF ?? deriveProjectRef(process.env.SUPABASE_URL ?? '');
const SCHEMAS = (process.env.SUPABASE_SCHEMAS ?? 'public')
  .split(',')
  .map(schema => schema.trim())
  .filter(Boolean);
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const requireEnv = (value, message) => {
  if (!value) {
    console.error(`[supabase-types] ${message}`);
    process.exit(1);
  }
};

requireEnv(
  PROJECT_REF,
  'SUPABASE_PROJECT_REF is not set. Provide it directly or set SUPABASE_URL in .env.',
);
requireEnv(
  ACCESS_TOKEN,
  'SUPABASE_ACCESS_TOKEN is not set. Create a personal access token in the Supabase dashboard and export it or place it in .env.',
);
if (SCHEMAS.length === 0) {
  console.error('[supabase-types] SUPABASE_SCHEMAS resolved to an empty list.');
  process.exit(1);
}

if (!process.env.SUPABASE_PROJECT_REF) {
  console.log(`[supabase-types] Derived project ref from SUPABASE_URL: ${PROJECT_REF}`);
}

const fetchWithRetry = async (url, options, retries = 2) => {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `Supabase API responded with ${response.status} ${response.statusText}: ${body}`,
        );
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        const delay = 500 * (attempt + 1);
        console.warn(`[supabase-types] Request failed, retrying in ${delay}ms...`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
};

const run = async () => {
  console.log(
    `[supabase-types] Generating TypeScript types for schema(s): ${SCHEMAS.join(
      ', ',
    )} (project: ${PROJECT_REF})`,
  );

  const apiUrl = new URL(`https://api.supabase.com/v1/projects/${PROJECT_REF}/types/typescript`);
  apiUrl.searchParams.set('schema', SCHEMAS.join(','));

  const response = await fetchWithRetry(apiUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      Accept: 'application/json, text/plain',
      'X-Client-Info': 'alarm-project-typegen',
    },
  });

  const rawPayload = await response.text();
  const typeDefinitions = extractTypeDefinitions(
    rawPayload,
    response.headers.get('content-type') ?? '',
  );

  if (!typeDefinitions.trim()) {
    throw new Error('Received empty type definition payload from Supabase API.');
  }

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  const banner =
    '// This file is auto-generated via scripts/generate-supabase-types.mjs\n' +
    '// Run `npm run refresh-supabase-types` to update it.\n';
  await fs.writeFile(
    OUTPUT_FILE,
    `${banner}\n${typeDefinitions.trim()}\n`,
  );

  console.log(`[supabase-types] Wrote types to ${path.relative(ROOT, OUTPUT_FILE)}`);
};

run().catch(error => {
  console.error('[supabase-types] Failed to generate Supabase types:', error.message);
  process.exit(1);
});
