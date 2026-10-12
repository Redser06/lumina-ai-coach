import { CONDITIONS, type ConditionFn } from "./conditions.js";
import { initialLearnerState, type LearnerState } from "./state.js";
import type { GraphSpec } from "./spec/types.js";

const STATE_FIELDS = new Set([
  "learner_id",
  "session_id",
  "scenario_id",
  "goal",
  "mastery",
  "last_assessment",
  "time_on_task_s",
  "fatigue",
  "step",
  "cost_usd_session",
  "cost_budget_usd",
  "path",
  "edges_taken",
  "trace_nodes",
  "fingerprints",
  "hitl_pending",
  "hitl_log",
  "loop_detected",
  "loop_cleared",
  "disputed",
  "skill_map_edit",
  "session_complete",
  "diagnosis",
  "plan",
  "last_edge",
  "last_condition",
]);

type Token =
  | { kind: "id"; value: string }
  | { kind: "num"; value: number }
  | { kind: "str"; value: string }
  | { kind: "op"; value: string };

type Segment = { kind: "prop"; name: string } | { kind: "index"; index: number };
type ValueFn = (state: LearnerState) => unknown;
type BoolFn = (state: LearnerState) => boolean;

const canonicalConditions: Record<string, ConditionFn> = { ...CONDITIONS };

export class ConditionExprError extends Error {
  readonly code = "CONDITION_EXPR";
  constructor(message: string) {
    super(message);
    this.name = "ConditionExprError";
  }
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index]!;
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (char === "'" || char === '"') {
      const quote = char;
      index += 1;
      let value = "";
      while (index < source.length && source[index] !== quote) {
        value += source[index];
        index += 1;
      }
      if (source[index] !== quote) throw new ConditionExprError(`unterminated string in ${source}`);
      index += 1;
      tokens.push({ kind: "str", value });
      continue;
    }
    if (/[0-9]/.test(char) || (char === "-" && /[0-9]/.test(source[index + 1] ?? ""))) {
      const start = index;
      if (char === "-") index += 1;
      while (index < source.length && /[0-9.]/.test(source[index]!)) index += 1;
      tokens.push({ kind: "num", value: Number(source.slice(start, index)) });
      continue;
    }
    const pair = source.slice(index, index + 2);
    if (["==", "!=", ">=", "<=", "&&", "||"].includes(pair)) {
      tokens.push({ kind: "op", value: pair });
      index += 2;
      continue;
    }
    if ("<>!()[].".includes(char)) {
      tokens.push({ kind: "op", value: char });
      index += 1;
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      const start = index;
      index += 1;
      while (index < source.length && /[A-Za-z0-9_]/.test(source[index]!)) index += 1;
      tokens.push({ kind: "id", value: source.slice(start, index) });
      continue;
    }
    throw new ConditionExprError(`bad token ${char} in ${source}`);
  }
  return tokens;
}

function looselyEqual(left: unknown, right: unknown): boolean {
  if (left == null && right == null) return true;
  return left === right;
}

function compare(op: string, left: unknown, right: unknown): boolean {
  if (op === "==") return looselyEqual(left, right);
  if (op === "!=") return !looselyEqual(left, right);
  if (typeof left !== "number" || typeof right !== "number" || !Number.isFinite(left) || !Number.isFinite(right)) {
    return false;
  }
  if (op === ">=") return left >= right;
  if (op === "<=") return left <= right;
  if (op === ">") return left > right;
  if (op === "<") return left < right;
  throw new ConditionExprError(`unknown operator ${op}`);
}

function readPath(state: LearnerState, root: string, segments: Segment[]): unknown {
  let current: unknown = state[root as keyof LearnerState];
  for (const segment of segments) {
    if (current == null) return undefined;
    if (segment.kind === "index") {
      if (!Array.isArray(current)) return undefined;
      const at = segment.index < 0 ? current.length + segment.index : segment.index;
      current = current[at];
      continue;
    }
    if (segment.name === "length" && (Array.isArray(current) || typeof current === "string")) {
      current = current.length;
      continue;
    }
    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[segment.name];
      continue;
    }
    return undefined;
  }
  return current;
}

export function compileConditionExpr(source: string): BoolFn {
  const tokens = tokenize(source);
  let cursor = 0;
  const peek = () => tokens[cursor];
  const eat = (value?: string): Token => {
    const token = tokens[cursor];
    if (!token || (value !== undefined && token.value !== value)) {
      throw new ConditionExprError(`expected ${value ?? "token"} in ${source}`);
    }
    cursor += 1;
    return token;
  };

  const parseOr = (): BoolFn => {
    let left = parseAnd();
    while (peek()?.kind === "op" && peek()?.value === "||") {
      eat("||");
      const right = parseAnd();
      const prev = left;
      left = (state) => prev(state) || right(state);
    }
    return left;
  };
  const parseAnd = (): BoolFn => {
    let left = parseNot();
    while (peek()?.kind === "op" && peek()?.value === "&&") {
      eat("&&");
      const right = parseNot();
      const prev = left;
      left = (state) => prev(state) && right(state);
    }
    return left;
  };
  const parseNot = (): BoolFn => {
    if (peek()?.kind === "op" && peek()?.value === "!") {
      eat("!");
      const inner = parseNot();
      return (state) => !inner(state);
    }
    return parseCmp();
  };
  const parseCmp = (): BoolFn => {
    const left = parsePrimary();
    const op = peek();
    if (op?.kind === "op" && ["==", "!=", ">=", "<=", ">", "<"].includes(op.value)) {
      eat(op.value);
      const right = parsePrimary();
      return (state) => compare(op.value, left(state), right(state));
    }
    return (state) => Boolean(left(state));
  };
  const parsePrimary = (): ValueFn => {
    const token = peek();
    if (!token) throw new ConditionExprError(`unexpected end of ${source}`);
    if (token.kind === "op" && token.value === "(") {
      eat("(");
      const inner = parseOr();
      eat(")");
      return inner;
    }
    if (token.kind === "num" || token.kind === "str") {
      eat();
      return () => token.value;
    }
    if (token.kind === "id" && (token.value === "true" || token.value === "false" || token.value === "null")) {
      eat();
      const value = token.value === "true" ? true : token.value === "false" ? false : null;
      return () => value;
    }
    if (token.kind !== "id") throw new ConditionExprError(`unexpected ${token.value} in ${source}`);
    if (!STATE_FIELDS.has(token.value)) {
      throw new ConditionExprError(`unknown learner-state field ${token.value} in ${source}`);
    }
    const root = token.value;
    eat();
    const segments: Segment[] = [];
    while (peek()?.kind === "op" && (peek()?.value === "." || peek()?.value === "[")) {
      if (peek()?.value === ".") {
        eat(".");
        const name = eat();
        if (name.kind !== "id") throw new ConditionExprError(`expected field after . in ${source}`);
        segments.push({ kind: "prop", name: name.value });
      } else {
        eat("[");
        const index = eat();
        if (index.kind !== "num") throw new ConditionExprError(`expected index in ${source}`);
        eat("]");
        segments.push({ kind: "index", index: index.value });
      }
    }
    return (state) => readPath(state, root, segments);
  };

  const fn = parseOr();
  if (cursor !== tokens.length) throw new ConditionExprError(`trailing input in ${source}`);
  return fn;
}

function sample(partial: Partial<LearnerState> = {}): LearnerState {
  return initialLearnerState({
    learner_id: "learner",
    session_id: "session",
    goal: "goal",
    ...partial,
  });
}

export function conditionSamples(): LearnerState[] {
  const paths = [
    [],
    ["Diagnose"],
    ["Plan"],
    ["Teach"],
    ["Practice"],
    ["Assess"],
    ["Remediate"],
    ["Stretch"],
    ["Reflect"],
    ["GradeDispute"],
    ["SkillMapEdit"],
    ["SafetyEscalation"],
  ];
  const assessments: LearnerState["last_assessment"][] = [
    null,
    { score: 0.9, error_class: null, confidence: 0.9 },
    { score: 0.5, error_class: null, confidence: 0.5 },
    { score: 0.9, error_class: "misconception", confidence: 0.9 },
    { score: 0.2, error_class: "slip", confidence: 0.4 },
  ];
  const states: LearnerState[] = [];
  for (const path of paths) {
    for (const last_assessment of assessments) {
      states.push(sample({ path, last_assessment }));
      states.push(sample({ path, last_assessment, disputed: true, fatigue: 0.91, step: 40, session_complete: true }));
      states.push(
        sample({
          path,
          last_assessment,
          loop_detected: true,
          loop_cleared: false,
          skill_map_edit: true,
          diagnosis: { placed: true, tier: "novice" },
          plan: { skill: "prompting", rationale: "because" },
        }),
      );
    }
  }
  states.push(sample({ session_id: "x", path: ["Plan"], plan: null }));
  states.push(sample({ path: ["Plan"], plan: { skill: "", rationale: "" } }));
  states.push(sample({ path: ["Diagnose"], diagnosis: null }));
  states.push(sample({ path: ["Diagnose"], diagnosis: { placed: false, tier: "novice" } }));
  states.push(sample({ fatigue: 0.8, session_complete: false, path: ["Teach"] }));
  states.push(sample({ step: 40, session_complete: false, path: ["Teach"] }));
  states.push(sample({ loop_detected: true, loop_cleared: true, path: ["Teach"] }));
  return states;
}

export function assertConditionsMatchCode(spec: GraphSpec, conditions: Record<string, ConditionFn>): void {
  const used = new Set(spec.edges.map((edge) => edge.condition_id));
  for (const id of Object.keys(conditions)) {
    if (!used.has(id)) throw new ConditionExprError(`unused condition: ${id}`);
  }
  const exprById = new Map<string, string>();
  for (const edge of spec.edges) {
    const previous = exprById.get(edge.condition_id);
    if (previous !== undefined && previous !== edge.condition_expr) {
      throw new ConditionExprError(`condition ${edge.condition_id} has conflicting expressions`);
    }
    exprById.set(edge.condition_id, edge.condition_expr);
  }
  const samples = conditionSamples();
  for (const [id, expr] of exprById) {
    const fn = canonicalConditions[id] ?? conditions[id];
    if (!fn) throw new ConditionExprError(`missing condition implementation: ${id}`);
    const compiled = compileConditionExpr(expr);
    for (const state of samples) {
      if (compiled(state) !== fn(state)) {
        throw new ConditionExprError(`condition_expr does not match code for ${id}: ${expr}`);
      }
    }
  }
}
