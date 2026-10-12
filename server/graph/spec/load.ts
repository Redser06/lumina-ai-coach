import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv, type ErrorObject } from "ajv";
import { parse } from "yaml";
import type { GraphEdgeSpec, GraphSpec } from "./types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
export const SPEC_PATH = join(HERE, "coach-graph.v1.yaml");
export const SCHEMA_PATH = join(HERE, "coach-graph.v1.schema.json");

let cached: { spec: GraphSpec; sha256: string } | undefined;

export function readSpecFile(path = SPEC_PATH): { raw: string; spec: GraphSpec; sha256: string } {
  const raw = readFileSync(path, "utf8");
  const sha256 = createHash("sha256").update(raw).digest("hex");
  const spec = parse(raw) as GraphSpec;
  return { raw, spec, sha256 };
}

export function validateSpec(spec: unknown): { ok: true; spec: GraphSpec } | { ok: false; errors: string[] } {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8")) as object;
  const validate = ajv.compile(schema);
  if (!validate(spec)) {
    return {
      ok: false,
      errors: (validate.errors ?? []).map((error: ErrorObject) => `${error.instancePath} ${error.message}`),
    };
  }
  return { ok: true, spec: spec as GraphSpec };
}

export function loadSpec(): GraphSpec {
  return loadSpecWithHash().spec;
}

export function loadSpecWithHash(): { spec: GraphSpec; sha256: string } {
  if (cached) return cached;
  const { spec, sha256 } = readSpecFile();
  const validated = validateSpec(spec);
  if (!validated.ok) {
    throw new Error(`coach graph spec is invalid: ${validated.errors.join("; ")}`);
  }
  cached = { spec: validated.spec, sha256 };
  return cached;
}

export function canonicalEdges(edges: GraphEdgeSpec[]): string {
  return JSON.stringify(
    [...edges]
      .map((edge) => ({
        id: edge.id,
        from: edge.from,
        to: edge.to,
        condition_id: edge.condition_id,
        condition_expr: edge.condition_expr,
        priority: edge.priority,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  );
}

export function parseSemver(version: string): [number, number, number] {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`invalid semver ${version}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/**
 * Edge add/remove requires a higher version (minor or major).
 * condition_expr changes require a major bump.
 * Identical graphs may keep the same version.
 */
export function versionBumpOk(previous: GraphSpec, next: GraphSpec): boolean {
  const previousById = new Map(previous.edges.map((edge) => [edge.id, edge]));
  const nextById = new Map(next.edges.map((edge) => [edge.id, edge]));
  const idsChanged =
    [...previousById.keys()].sort().join("\n") !== [...nextById.keys()].sort().join("\n");
  let semanticsChanged = false;
  for (const [id, edge] of previousById) {
    const match = nextById.get(id);
    if (match && match.condition_expr !== edge.condition_expr) semanticsChanged = true;
  }
  const edgesChanged = canonicalEdges(previous.edges) !== canonicalEdges(next.edges);
  if (!edgesChanged && !semanticsChanged && !idsChanged) return true;
  if (previous.version === next.version) return false;
  const [prevMajor, prevMinor] = parseSemver(previous.version);
  const [nextMajor, nextMinor] = parseSemver(next.version);
  if (semanticsChanged) return nextMajor > prevMajor;
  return nextMajor > prevMajor || (nextMajor === prevMajor && nextMinor > prevMinor);
}
