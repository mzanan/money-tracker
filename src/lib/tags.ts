function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function tagKey(tag: string): string {
  return stripAccents(tag).trim().toLowerCase().replace(/\s+/g, " ");
}

export function canonicalTag(tag: string): string {
  const base = stripAccents(tag).trim().replace(/\s+/g, " ");
  return base.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

export function dedupeTags(tags: string[] | null | undefined): string[] {
  if (!tags) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    const canonical = canonicalTag(tag);
    if (!canonical) continue;
    const key = tagKey(canonical);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(canonical);
  }
  return out;
}

export function tagHue(tag: string): number {
  const key = tagKey(tag);
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}
