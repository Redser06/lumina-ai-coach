export const NODE_KINDS = ["worker", "supervisor", "hitl", "terminal"] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export const TASK_TYPES = [
  "tutor-chat",
  "deep-reasoning",
  "grading",
  "self-critique",
  "cheap-classify",
  "embedding",
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export interface GraphNodeSpec {
  id: string;
  kind: NodeKind;
  task_type: TaskType;
  max_steps: number;
  type?: "interrupt";
  subgraph?: boolean;
}

export interface GraphEdgeSpec {
  id: string;
  from: string;
  to: string;
  condition_id: string;
  condition_expr: string;
  priority: number;
}

export interface GraphSpec {
  spec_id: string;
  version: string;
  description?: string;
  nodes: GraphNodeSpec[];
  edges: GraphEdgeSpec[];
}

export const COACHING_NODES = [
  "Diagnose",
  "Plan",
  "Teach",
  "Practice",
  "Assess",
  "Remediate",
  "Stretch",
  "Reflect",
] as const;

export const HITL_NODES = ["GradeDispute", "SkillMapEdit", "SafetyEscalation"] as const;

export const FRAMEWORK_NODES = ["__start__", "End"] as const;
