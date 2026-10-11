import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { loadSpec } from "../graph/spec/load.js";
import { executeScenarios } from "./execute.js";

export interface CoverageReport {
  node_coverage: number;
  edge_coverage: number;
  covered_nodes: string[];
  covered_edges: string[];
  uncovered: Array<{ type: "node" | "edge"; id: string }>;
}

export function coverageFromVisits(visitedNodes: Iterable<string>, visitedEdges: Iterable<string>): CoverageReport {
  const spec = loadSpec();
  const nodes = new Set(visitedNodes);
  const edges = new Set(visitedEdges);
  const uncovered: CoverageReport["uncovered"] = [];
  for (const node of spec.nodes) {
    if (!nodes.has(node.id)) uncovered.push({ type: "node", id: node.id });
  }
  for (const edge of spec.edges) {
    if (!edges.has(edge.id)) uncovered.push({ type: "edge", id: edge.id });
  }
  const nodeHits = spec.nodes.filter((node) => nodes.has(node.id)).length;
  const edgeHits = spec.edges.filter((edge) => edges.has(edge.id)).length;
  return {
    node_coverage: spec.nodes.length === 0 ? 0 : nodeHits / spec.nodes.length,
    edge_coverage: spec.edges.length === 0 ? 0 : edgeHits / spec.edges.length,
    covered_nodes: [...nodes].sort(),
    covered_edges: [...edges].sort(),
    uncovered,
  };
}

export async function collectCoverage(): Promise<CoverageReport> {
  const { runs, service } = await executeScenarios();
  service.close();
  const nodes = new Set<string>();
  const edges = new Set<string>();
  for (const run of runs) {
    for (const node of run.result.nodes) nodes.add(node);
    for (const edge of run.result.edges) edges.add(edge);
  }
  return coverageFromVisits(nodes, edges);
}

export function renderCoverageMarkdown(report: CoverageReport): string {
  const lines = [
    "# Graph coverage",
    "",
    `- node_coverage: ${report.node_coverage}`,
    `- edge_coverage: ${report.edge_coverage}`,
    "",
    "## Uncovered",
    "",
  ];
  if (report.uncovered.length === 0) lines.push("None.");
  for (const item of report.uncovered) lines.push(`- ${item.type}: ${item.id}`);
  lines.push("");
  return lines.join("\n");
}

async function main(): Promise<void> {
  const report = await collectCoverage();
  const jsonPath = "reports/graph-coverage.json";
  const mdPath = "reports/graph-coverage.md";
  mkdirSync(dirname(jsonPath), { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, renderCoverageMarkdown(report));
  console.log(`node_coverage=${report.node_coverage} edge_coverage=${report.edge_coverage}`);
  if (report.node_coverage !== 1 || report.edge_coverage !== 1 || report.uncovered.length > 0) {
    console.error(report.uncovered);
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith("coverage.ts")) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
