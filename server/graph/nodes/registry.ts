import { gradeDisputeNode, safetyEscalationNode, skillMapEditNode } from "../hitl.js";
import { assessNode } from "./assess.js";
import { diagnoseNode } from "./diagnose.js";
import { planNode } from "./plan.js";
import { practiceNode } from "./practice.js";
import { reflectNode } from "./reflect.js";
import { remediateNode } from "./remediate.js";
import { stretchNode } from "./stretch.js";
import { supervisorNode } from "./supervisor.js";
import { teachNode } from "./teach.js";
import type { GraphUpdate } from "./worker.js";
import type { LearnerState } from "../state.js";

export type NodeFn = (state: { learner: LearnerState }) => Promise<GraphUpdate>;

export const NODE_IMPLS: Record<string, NodeFn> = {
  Supervisor: supervisorNode,
  Diagnose: diagnoseNode,
  Plan: planNode,
  Teach: teachNode,
  Practice: practiceNode,
  Assess: assessNode,
  Remediate: remediateNode,
  Stretch: stretchNode,
  Reflect: reflectNode,
  GradeDispute: gradeDisputeNode,
  SkillMapEdit: skillMapEditNode,
  SafetyEscalation: safetyEscalationNode,
};
