import { readFileSync } from "node:fs";
import { join } from "node:path";

import { cn } from "../src/lib/utils";

const CSS_PATH = join(process.cwd(), "src/app/globals.css");

const THEME_NAMESPACES: Record<string, { prefix: string; base: string }[]> = {
  color: [
    { prefix: "bg", base: "bg-red-500" },
    { prefix: "text", base: "text-red-500" },
  ],
  radius: [{ prefix: "rounded", base: "rounded-lg" }],
  spacing: [{ prefix: "p", base: "p-4" }],
  animate: [{ prefix: "animate", base: "animate-spin" }],
  font: [{ prefix: "font", base: "font-serif" }],
  "font-weight": [{ prefix: "font", base: "font-bold" }],
  text: [{ prefix: "text", base: "text-sm" }],
  "text-shadow": [{ prefix: "text-shadow", base: "text-shadow-md" }],
  shadow: [{ prefix: "shadow", base: "shadow-md" }],
};

const UTILITY_BASES: Record<string, string[]> = {
  text: ["text-sm", "text-red-500"],
  bg: ["bg-none", "bg-red-500"],
  rounded: ["rounded-lg"],
  shadow: ["shadow-md"],
  animate: ["animate-spin"],
  font: ["font-serif", "font-bold"],
  bottom: ["bottom-4"],
  top: ["top-4"],
  left: ["left-4"],
  right: ["right-4"],
  inset: ["inset-4"],
};

const PROPERTY_BASES: Record<string, string> = {
  "font-size": "text-sm",
  color: "text-red-500",
  "background-image": "bg-none",
  "background-color": "bg-red-500",
  "border-radius": "rounded-lg",
  "box-shadow": "shadow-md",
  animation: "animate-spin",
  "font-family": "font-serif",
  "font-weight": "font-bold",
  bottom: "bottom-4",
  top: "top-4",
  left: "left-4",
  right: "right-4",
  inset: "inset-4",
};

type Probe = { probe: string; base?: string; source: string };

function longestPrefix(keys: string[], value: string): string | undefined {
  return keys
    .filter((key) => value.startsWith(`${key}-`))
    .sort((a, b) => b.length - a.length)[0];
}

function themeProbes(css: string): Probe[] {
  const blocks = [...css.matchAll(/@theme[^{]*\{([\s\S]*?)\n\}/g)];
  const tokens = blocks
    .flatMap((block) =>
      [...block[1].matchAll(/--([a-z0-9-]+)\s*:/g)].map((m) => m[1]),
    )
    .filter((token) => !token.includes("--") && !token.includes("*"));

  return tokens.flatMap((token) => {
    const namespace = longestPrefix(Object.keys(THEME_NAMESPACES), token);
    const source = `--${token}`;
    if (!namespace) return [{ probe: token, source }];
    const value = token.slice(namespace.length + 1);
    return THEME_NAMESPACES[namespace].map(({ prefix, base }) => ({
      probe: `${prefix}-${value}`,
      base,
      source,
    }));
  });
}

function appliedClasses(body: string): string[] {
  return [...body.matchAll(/@apply\s+([^;]+);/g)].flatMap((m) =>
    m[1]
      .trim()
      .split(/\s+/)
      .map((cls) => cls.slice(cls.lastIndexOf(":") + 1)),
  );
}

function declaredBases(body: string): string[] {
  return [...body.matchAll(/^\s*([a-z-]+)\s*:/gm)]
    .map((m) => PROPERTY_BASES[m[1]])
    .filter((base): base is string => base !== undefined);
}

function utilityBase(name: string, body: string): string | undefined {
  const prefix = longestPrefix(Object.keys(UTILITY_BASES), name);
  if (!prefix) return undefined;
  const declared = declaredBases(body);
  const applied = appliedClasses(body).filter((cls) =>
    cls.startsWith(`${prefix}-`),
  );
  return UTILITY_BASES[prefix].find(
    (base) =>
      declared.includes(base) || applied.some((cls) => cn(base, cls) === cls),
  );
}

function utilityProbes(css: string): Probe[] {
  return [...css.matchAll(/@utility\s+([a-z0-9-]+)\s*\{([\s\S]*?)\n\}/g)].map(
    (m) => ({
      probe: m[1],
      base: utilityBase(m[1], m[2]),
      source: `@utility ${m[1]}`,
    }),
  );
}

function failure({ probe, base, source }: Probe): string | undefined {
  if (!base) return `${source}: no known utility group, map it in this script`;
  if (cn(base, probe) !== probe) return `${probe} does not override ${base}`;
  return undefined;
}

const css = readFileSync(CSS_PATH, "utf8");
const probes = [...themeProbes(css), ...utilityProbes(css)];
const failures = probes
  .map(failure)
  .filter((message): message is string => message !== undefined);

if (failures.length > 0) {
  console.error(
    `tailwind-merge token check failed:\n${failures
      .map((message) => `  ${message}`)
      .join(
        "\n",
      )}\nRegister the classes in extendTailwindMerge (src/lib/utils.ts).`,
  );
  process.exit(1);
}

console.log(`tailwind-merge token check: ${probes.length} classes ok`);
