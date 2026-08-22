import type { DiagnosticQuestion } from '../types.ts';

export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: 'diag-1',
    question: 'How do you currently interact with AI models in your daily work?',
    context: 'This helps us baseline your practical day-to-day familiarity with AI interfaces.',
    options: [
      {
        text: 'I occasionally copy-paste text or questions into a chat window (ChatGPT, Claude web UI) for basic summaries or copy edits.',
        levelPoints: { novice: 3, prompt_practitioner: 1, agent_builder: 0, systems_architect: 0 }
      },
      {
        text: 'I write structured prompts with system instructions, few-shot examples, and markdown tags to generate code or formatted deliverables.',
        levelPoints: { novice: 0, prompt_practitioner: 3, agent_builder: 1, systems_architect: 0 }
      },
      {
        text: 'I use AI coding assistants with tool calling (Cursor, Antigravity, Claude Code) and write scripts that invoke LLM APIs programmatically.',
        levelPoints: { novice: 0, prompt_practitioner: 1, agent_builder: 3, systems_architect: 1 }
      },
      {
        text: 'I architect multi-agent systems, design state graphs, build custom MCP servers, and run automated LLM-as-a-judge eval pipelines.',
        levelPoints: { novice: 0, prompt_practitioner: 0, agent_builder: 1, systems_architect: 4 }
      }
    ]
  },
  {
    id: 'diag-2',
    question: 'What is your primary goal for AI empowerment this quarter?',
    context: 'Lumina will tailor your recommended missions and interactive simulators around this objective.',
    options: [
      {
        text: 'Understand the landscape: Learn what models to use when, demystify reasoning tokens, and feel confident speaking about AI.',
        levelPoints: { novice: 3, prompt_practitioner: 2, agent_builder: 0, systems_architect: 0 },
        roleBonus: 'business_analyst'
      },
      {
        text: 'Master tool calling & MCP: Connect my company data and tools to AI agents safely to automate repetitive workflows.',
        levelPoints: { novice: 0, prompt_practitioner: 2, agent_builder: 3, systems_architect: 1 },
        roleBonus: 'product_manager'
      },
      {
        text: 'Build autonomous agent loops: Create self-correcting agents with state graphs, reflection, and human-in-the-loop approvals.',
        levelPoints: { novice: 0, prompt_practitioner: 1, agent_builder: 3, systems_architect: 2 },
        roleBonus: 'software_engineer'
      },
      {
        text: 'Enterprise Evals & Governance: Implement golden datasets, reliability metrics, and cost/latency benchmarking in CI/CD.',
        levelPoints: { novice: 0, prompt_practitioner: 0, agent_builder: 1, systems_architect: 4 },
        roleBonus: 'data_ops'
      }
    ]
  },
  {
    id: 'diag-3',
    question: 'How comfortable are you with concepts like "ReAct loops", "MCP servers", and "StateGraphs"?',
    context: 'Identifies immediate knowledge gaps to bypass basics and jump straight to hands-on value.',
    options: [
      {
        text: 'I have heard the terms in tech news, but could not explain how they work under the hood.',
        levelPoints: { novice: 3, prompt_practitioner: 1, agent_builder: 0, systems_architect: 0 }
      },
      {
        text: 'I understand what they are conceptually, but have not built or configured them in a working application.',
        levelPoints: { novice: 0, prompt_practitioner: 3, agent_builder: 1, systems_architect: 0 }
      },
      {
        text: 'I have built simple tool-calling scripts and understand JSON schemas for tools.',
        levelPoints: { novice: 0, prompt_practitioner: 1, agent_builder: 3, systems_architect: 1 }
      },
      {
        text: 'I regularly design or debug production state graphs, handle recursion limits, and build MCP endpoints.',
        levelPoints: { novice: 0, prompt_practitioner: 0, agent_builder: 1, systems_architect: 4 }
      }
    ]
  }
];
