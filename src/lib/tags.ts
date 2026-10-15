export const MAX_TAGS_PER_TRANSACTION = 10;

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

export function parseTagsInput(raw: string): string[] {
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function tagsToInput(tags: ReadonlyArray<string>): string {
  return tags.join(", ");
}

export function sameTags(
  a: ReadonlyArray<string>,
  b: ReadonlyArray<string> | null,
): boolean {
  if (b === null || a.length !== b.length) return false;
  const keys = new Set(b.map(tagKey));
  return a.every((tag) => keys.has(tagKey(tag)));
}

export function mergeTagInput(
  current: ReadonlyArray<string>,
  raw: string,
  max = MAX_TAGS_PER_TRANSACTION,
): { tags: string[]; overflow: boolean } {
  const merged = dedupeTags([...current, ...parseTagsInput(raw)]);
  return { tags: merged.slice(0, max), overflow: merged.length > max };
}
