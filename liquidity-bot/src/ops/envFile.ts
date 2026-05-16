import fs from 'node:fs';

/** Read .env into key → value (no quoting/escaping expansion). */
export function parseEnvFile(content: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    map.set(key, value);
  }
  return map;
}

export function serializeEnvFile(map: Map<string, string>): string {
  const lines: string[] = [];
  for (const [key, value] of map) {
    lines.push(`${key}=${value}`);
  }
  return lines.join('\n') + (lines.length ? '\n' : '');
}

/** Insert or replace one key in a .env file. */
export function upsertEnvVar(
  filePath: string,
  key: string,
  value: string
): void {
  let map = new Map<string, string>();
  if (fs.existsSync(filePath)) {
    map = parseEnvFile(fs.readFileSync(filePath, 'utf8'));
  }
  map.set(key, value);
  fs.writeFileSync(filePath, serializeEnvFile(map), 'utf8');
}
