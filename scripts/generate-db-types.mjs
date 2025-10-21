#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SCHEMA_DIR = path.join(ROOT, 'android', 'app', 'schemas');
const ENTITY_OUTPUT_FILE = path.join(ROOT, 'types', 'generated', 'roomEntities.ts');
const DAO_SRC_DIR = path.join(
  ROOT,
  'android',
  'app',
  'src',
  'main',
  'java',
  'com',
  'alarm_project',
  'alarm',
  'data',
  'local',
  'dao',
);
const ENTITY_SRC_DIR = path.join(
  ROOT,
  'android',
  'app',
  'src',
  'main',
  'java',
  'com',
  'alarm_project',
  'alarm',
  'data',
  'local',
  'entity',
);
const DAO_OUTPUT_FILE = path.join(ROOT, 'types', 'generated', 'roomDaos.ts');

const affinityMap = new Map([
  ['INTEGER', 'number'],
  ['REAL', 'number'],
  ['TEXT', 'string'],
  ['BLOB', 'Uint8Array'],
]);

const primitiveTypeMap = new Map([
  ['String', 'string'],
  ['Int', 'number'],
  ['Long', 'number'],
  ['Double', 'number'],
  ['Float', 'number'],
  ['Boolean', 'boolean'],
  ['Unit', 'void'],
  ['Any', 'unknown'],
]);

const ensureDirForFile = async filePath => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
};

const readJsonFiles = async dir => {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const results = await Promise.all(
    entries.map(async entry => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return readJsonFiles(fullPath);
      }
      if (entry.isFile() && entry.name.endsWith('.json')) {
        const content = await fs.readFile(fullPath, 'utf8');
        try {
          return [{ path: fullPath, json: JSON.parse(content) }];
        } catch (error) {
          console.warn(`[room-types] Failed to parse ${fullPath}:`, error.message);
          return [];
        }
      }
      return [];
    }),
  );

  return results.flat();
};

const mapFieldToTs = (field, propertyTypes) => {
  let tsType;
  const kotlinType = propertyTypes?.[field.columnName];
  if (kotlinType) {
    const context = { usesEntities: false, usesFlow: false };
    tsType = mapKotlinTypeToTs(kotlinType, context);
  } else {
    tsType = affinityMap.get(field.affinity) ?? 'unknown';
    if (!field.notNull) {
      tsType = `${tsType} | null`;
    }
  }

  if (!field.notNull && !tsType.includes('| null')) {
    tsType = `${tsType} | null`;
  }

  return `${field.columnName}: ${tsType}`;
};

const buildEntityInterface = (entity, propertyTypes) => {
  const lines = entity.fields
    .map(field => `  ${mapFieldToTs(field, propertyTypes)};`)
    .join('\n');
  return `// Source: ${entity.source}\nexport interface ${entity.tableName}Entity {\n${lines}\n}`;
};

const parseEntityFile = async filePath => {
  const content = await fs.readFile(filePath, 'utf8');
  const normalized = content.replace(/\r/g, '');

  const entityBlockMatch = normalized.match(/@Entity\(([\s\S]*?)\)/);
  if (!entityBlockMatch) {
    return null;
  }

  const tableNameMatch = entityBlockMatch[1].match(/tableName\s*=\s*"([^"]+)"/);
  if (!tableNameMatch) {
    return null;
  }

  const tableName = tableNameMatch[1];
  const lines = normalized.split('\n');
  const columns = {};
  let pendingColumn = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const columnMatch = line.match(/@ColumnInfo\(name\s*=\s*"([^"]+)"/);
    if (columnMatch) {
      pendingColumn = columnMatch[1];
      continue;
    }

    if (pendingColumn) {
      const valueMatch = line.match(/^val\s+\w+:\s*([^=,]+)/);
      if (valueMatch) {
        columns[pendingColumn] = valueMatch[1].trim();
        pendingColumn = null;
      }
    }
  }

  return { tableName, columns };
};

const readEntityColumnTypes = async () => {
  let entries;
  try {
    entries = await fs.readdir(ENTITY_SRC_DIR, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return new Map();
    }
    throw error;
  }

  const columnTypes = new Map();

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.kt')) continue;
    const filePath = path.join(ENTITY_SRC_DIR, entry.name);
    const parsed = await parseEntityFile(filePath);
    if (parsed) {
      columnTypes.set(parsed.tableName, parsed.columns);
    }
  }

  return columnTypes;
};

const splitTopLevel = (input, separator) => {
  if (!input.trim()) {
    return [];
  }

  const parts = [];
  let depth = 0;
  let current = '';
  for (const char of input) {
    if (char === '<') depth += 1;
    if (char === '>') depth -= 1;
    if (char === separator && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) {
    parts.push(current.trim());
  }
  return parts;
};

const wrapArray = tsType => {
  if (tsType.includes('|') || tsType.includes('&')) {
    return `Array<${tsType}>`;
  }
  return `${tsType}[]`;
};

const mapKotlinTypeToTs = (typeString, context) => {
  let raw = typeString.trim();
  if (raw === '') {
    return 'unknown';
  }

  // Kotlin allows spaces around generics; normalise multiple spaces
  raw = raw.replace(/\s+/g, ' ');

  let isNullable = false;
  while (raw.endsWith('?')) {
    isNullable = true;
    raw = raw.slice(0, -1).trim();
  }

  let tsType;

  const flowMatch = raw.match(/^Flow\s*<(.+)>$/);
  if (flowMatch) {
    const inner = mapKotlinTypeToTs(flowMatch[1], context);
    context.usesFlow = true;
    tsType = `RoomFlow<${inner}>`;
  } else {
    const listMatch = raw.match(/^(?:Mutable)?List\s*<(.+)>$/);
    if (listMatch) {
      const inner = mapKotlinTypeToTs(listMatch[1], context);
      tsType = wrapArray(inner);
    } else {
      const segments = raw.split('.');
      const simple = segments[segments.length - 1];
      if (primitiveTypeMap.has(simple)) {
        tsType = primitiveTypeMap.get(simple);
      } else if (/^[A-Z][A-Za-z0-9_]*Entity$/.test(simple)) {
        context.usesEntities = true;
        tsType = `RoomEntities.${simple}`;
      } else {
        tsType = 'unknown';
      }
    }
  }

  if (isNullable) {
    tsType = `${tsType} | null`;
  }

  return tsType;
};

const parseDaoFile = async filePath => {
  const content = await fs.readFile(filePath, 'utf8');
  const normalized = content.replace(/\r/g, '');
  if (!/@Dao/.test(normalized)) {
    return null;
  }

  const interfaceMatch = normalized.match(/interface\s+(\w+)/);
  if (!interfaceMatch) {
    return null;
  }

  const name = interfaceMatch[1];
  const methodRegex = new RegExp(
    '((?:@[^\\n]+\\n)*)\\s*(suspend\\s+)?fun\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*(?::\\s*([^\\n{]+))?',
    'g',
  );
  const methods = [];

  let match;
  while ((match = methodRegex.exec(normalized))) {
    const annotationsBlock = match[1] ?? '';
    const suspendFlag = Boolean(match[2]);
    const methodName = match[3];
    const paramsRaw = match[4]?.trim() ?? '';
    const returnRaw = match[5]?.trim() ?? 'Unit';

    const annotations = annotationsBlock
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    const params = splitTopLevel(paramsRaw, ',').map(param => {
      const [paramName, paramType] = param.split(':').map(segment => segment.trim());
      return {
        name: paramName,
        type: paramType ?? 'Any',
      };
    });

    methods.push({
      name: methodName,
      suspend: suspendFlag,
      params,
      returnType: returnRaw,
      annotations,
    });
  }

  if (methods.length === 0) {
    return null;
  }

  return { name, methods, filePath };
};

const generateEntityTypes = async () => {
  const files = await readJsonFiles(SCHEMA_DIR);
  if (files.length === 0) {
    throw new Error('[room-types] No Room schema JSON found. Run `./gradlew :app:assembleDebug` first.');
  }

  const interfaces = [];
  const seenTables = new Set();
  const entityColumnTypes = await readEntityColumnTypes();

  for (const { path: filePath, json } of files) {
    if (!json?.database?.entities) continue;
    for (const entity of json.database.entities) {
      if (!entity?.tableName || !Array.isArray(entity.fields)) continue;
      if (seenTables.has(entity.tableName)) continue;
      seenTables.add(entity.tableName);
      const enrichedEntity = {
        ...entity,
        source: path.relative(ROOT, filePath).replace(/\\/g, '/'),
      };
      const columnTypes = entityColumnTypes.get(entity.tableName) ?? {};
      interfaces.push(buildEntityInterface(enrichedEntity, columnTypes));
    }
  }

  if (interfaces.length === 0) {
    throw new Error('[room-types] No entities discovered in schema JSON');
  }

  const header = `// Auto-generated by scripts/generate-db-types.mjs. Do not edit manually.\n\n`;
  await ensureDirForFile(ENTITY_OUTPUT_FILE);
  await fs.writeFile(ENTITY_OUTPUT_FILE, header + interfaces.join('\n\n') + '\n', 'utf8');
  return interfaces.length;
};

const generateDaoTypes = async () => {
  let entries;
  try {
    entries = await fs.readdir(DAO_SRC_DIR, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('[room-types] DAO directory not found.');
    }
    throw error;
  }

  const daoFiles = entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.kt'))
    .map(entry => path.join(DAO_SRC_DIR, entry.name));

  const daos = [];
  for (const filePath of daoFiles) {
    const parsed = await parseDaoFile(filePath);
    if (parsed) {
      daos.push(parsed);
    }
  }

  if (daos.length === 0) {
    throw new Error('[room-types] No DAO definitions discovered.');
  }

  const headerLines = [
    '// Auto-generated by scripts/generate-db-types.mjs. Do not edit manually.',
    '',
    "import type * as RoomEntities from './roomEntities';",
    '',
    '/**',
    ' * Placeholder type that documents a Kotlin Flow<T> returned from Room.',
    ' * The actual runtime object is provided by the native layer; this keeps TypeScript aware of the payload shape.',
    ' */',
    'export interface RoomFlow<T> {',
    '  readonly __roomFlowHint?: (value: T) => void;',
    '}',
    '',
  ];

  const blocks = [];

  for (const dao of daos) {
    const context = { usesEntities: false, usesFlow: false };
    const relativePath = path.relative(ROOT, dao.filePath).replace(/\\/g, '/');
    const lines = [`// Source: ${relativePath}`, `export interface ${dao.name}Contract {`];

    for (const method of dao.methods) {
      if (method.annotations.length > 0) {
        for (const annotation of method.annotations) {
          lines.push(`  // ${annotation}`);
        }
      }

      const paramStrings = method.params.map(param => {
        const tsType = mapKotlinTypeToTs(param.type, context);
        return `${param.name}: ${tsType}`;
      });
      const paramsText = paramStrings.join(', ');

      const returnTs = mapKotlinTypeToTs(method.returnType, context);
      const finalReturn = method.suspend ? `Promise<${returnTs}>` : returnTs;
      lines.push(`  ${method.name}(${paramsText}): ${finalReturn};`);
    }

    lines.push('}');
    blocks.push(lines.join('\n'));
  }

  const fileContents = headerLines.concat(blocks.join('\n\n')).join('\n') + '\n';
  await ensureDirForFile(DAO_OUTPUT_FILE);
  await fs.writeFile(DAO_OUTPUT_FILE, fileContents, 'utf8');
  return daos.length;
};

const run = async () => {
  try {
    const entityCount = await generateEntityTypes();
    const daoCount = await generateDaoTypes();
    console.log(
      `[room-types] Generated ${entityCount} entity interfaces and ${daoCount} DAO contracts.`,
    );
  } catch (error) {
    console.error('[room-types] Unhandled error:', error.message ?? error);
    process.exit(1);
  }
};

run();
