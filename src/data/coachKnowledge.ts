import type { CoachMessage, UserRole } from '../types.ts';

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  software_engineer: 'Software Engineer',
  product_manager: 'Product Manager',
  data_ops: 'Data & Operations Specialist',
  business_analyst: 'Business & Strategy Analyst',
  executive: 'Team Leader & Executive'
};

export const DEFAULT_PROMPT_SUGGESTIONS: Record<UserRole, string[]> = {
  software_engineer: [
    'How do I build an agent loop that self-heals when a compiler or linter errors?',
    'What is the standard architecture for a Model Context Protocol (MCP) server?',
    'Show me how to orchestrate a multi-agent StateGraph with LangGraph',
    'How do I implement LLM-as-a-Judge in my GitHub Actions CI/CD pipeline?'
  ],
  product_manager: [
    'How do I design an AI product flow that handles reasoning model latency gracefully?',
    'What is MCP and why is it called the "USB-C standard for AI applications"?',
    'How do we set up golden eval datasets to prevent product regressions?',
    'When should our team use Gemini 2.0 Flash vs Claude 3.7 Sonnet?'
  ],
  data_ops: [
    'How do we monitor token costs and latency across multi-step agent loops?',
    'What security boundaries and access controls should we enforce on MCP servers?',
    'How do I benchmark model accuracy on our internal corporate datasets?',
    'How do state graphs handle data persistence and checkpointing?'
  ],
  business_analyst: [
    'What are reasoning models and why do they reduce hallucination in complex calculations?',
    'How can I connect our corporate database to an AI assistant using MCP tools?',
    'What is an AI agent loop and how does it differ from a regular ChatGPT search?',
    'Give me a breakdown of the latest AI breakthroughs and what they mean for my work.'
  ],
  executive: [
    'How should our organization balance cost vs capability between frontier models?',
    'What governance and eval frameworks do we need to ensure AI reliability?',
    'Why is MCP standard adoption critical for reducing enterprise AI vendor lock-in?',
    'What skills should we train our engineering and product teams on this quarter?'
  ]
};

export function generateCoachResponse(
  userQuery: string,
  userRole: UserRole,
  _userLevel?: string
): CoachMessage {
  const queryLower = userQuery.toLowerCase();
  const id = `coach-msg-${Date.now()}`;
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // 1. Agent Loop & ReAct queries
  if (queryLower.includes('loop') || queryLower.includes('react') || queryLower.includes('self-heal') || queryLower.includes('autonomous')) {
    return {
      id,
      sender: 'coach',
      timestamp,
      content: `### 🔄 Autonomous Agent Loops: Breaking Down the Magic

Great question! In modern AI systems, an **Agent Loop** transforms a static language model into an active problem solver.

Instead of answering in one shot, the agent operates in an iterative loop:
1. **Thought (Reasoning)**: The LLM analyzes the objective and plans the next required action.
2. **Action (Tool Calling)**: The LLM issues a structured tool call (e.g. \`readFile\`, \`runCommand\`, \`sqlQuery\`).
3. **Observation (Ground Truth)**: The environment executes the tool and returns real output (data, compiler errors, API responses).
4. **Reflection (Self-Correction)**: The LLM inspects the observation. If an error occurred, it adjusts its approach instead of hallucinating a fake fix!

${userRole === 'software_engineer' ? `**Engineering Tip**: Always wrap your loop in a recursion limit (e.g. max 10 turns) and feed raw stderr/stdout back as an observation so the model can self-correct.` : `**Product Tip**: Because loops take multiple turns (10-45s), design UI progress indicators showing what tool the agent is currently running.`}`,
      suggestedPrompts: [
        'Open the Agent Loop Simulator to run a live test',
        'How do StateGraphs improve upon basic loops?',
        'What happens when a tool fails in a loop?'
      ],
      actionLink: {
        tab: 'simulators',
        subView: 'agent_loop',
        label: '🚀 Launch Agent Loop Simulator'
      }
    };
  }

  // 2. MCP (Model Context Protocol) queries
  if (queryLower.includes('mcp') || queryLower.includes('model context protocol') || queryLower.includes('tool chain') || queryLower.includes('tools')) {
    return {
      id,
      sender: 'coach',
      timestamp,
      content: `### 🔌 Model Context Protocol (MCP): The Universal Connector

**Model Context Protocol (MCP)** is an open standard (created by Anthropic and adopted across the AI ecosystem including Cursor, Claude Desktop, Antigravity, and VS Code) that standardizes how AI applications connect to external tools and data.

Think of MCP as **"USB-C for AI"**:
* **Before MCP**: You had to write bespoke connector code for every AI client to talk to your Postgres DB, Slack bot, Jira, or internal microservice.
* **With MCP**: You write **one MCP server**. Any MCP-compliant AI client can instantly discover and execute your tools and read your resources!

#### The 3 Core MCP Primitives:
* **Tools**: Executable functions (e.g. \`execute_sql\`, \`send_slack_alert\`).
* **Resources**: Read-only context streams (e.g. logs, database schemas, API docs).
* **Prompts**: Parameterized reusable prompt templates.`,
      suggestedPrompts: [
        'Show me live JSON-RPC payloads in the MCP Lab',
        'How do I chain multiple MCP tools together?',
        'What are the security implications of MCP in enterprise?'
      ],
      actionLink: {
        tab: 'simulators',
        subView: 'mcp_chaining',
        label: '⚡ Open MCP Tool Chaining Lab'
      }
    };
  }

  // 3. StateGraphs & Multi-Agent queries
  if (queryLower.includes('graph') || queryLower.includes('langgraph') || queryLower.includes('multi-agent') || queryLower.includes('supervisor')) {
    return {
      id,
      sender: 'coach',
      timestamp,
      content: `### 🕸️ State Graphs & Multi-Agent Orchestration

As enterprise workflows get complex, single-agent prompt chains break down. **State Graphs** (popularized by frameworks like LangGraph) organize autonomous AI into a structured, cyclic state machine.

#### Key Architectural Components:
1. **Shared State**: A strongly-typed state object that persists across all steps (e.g., \`{ query, code, testsPassed, reviewScore }\`).
2. **Specialized Nodes**: Each node is an expert agent (e.g., *Researcher Node*, *Coder Node*, *Deterministic Linter/Test Node*, *Human Approval Node*).
3. **Conditional Edges**: Dynamic routers that branch based on state (e.g. If \`testsPassed == false\`, route back to *Coder Node* with compiler error logs).
4. **Human-in-the-Loop**: The graph can pause execution at sensitive checkpoints and wait for human authorization.`,
      suggestedPrompts: [
        'View the interactive Multi-Agent Graph Visualizer',
        'How do we prevent infinite loops in cyclic graphs?',
        'When should I use a single agent vs a multi-agent graph?'
      ],
      actionLink: {
        tab: 'simulators',
        subView: 'graph_builder',
        label: '✨ Open Graph Visualizer'
      }
    };
  }

  // 4. Evals & LLM-as-a-Judge queries
  if (queryLower.includes('eval') || queryLower.includes('judge') || queryLower.includes('benchmark') || queryLower.includes('hallucination') || queryLower.includes('test')) {
    return {
      id,
      sender: 'coach',
      timestamp,
      content: `### 🎯 AI Evals & LLM-as-a-Judge: Eliminating "Vibe Checks"

If your team is evaluating AI features by typing 2 or 3 prompts and saying *"looks good to me"*, you are at high risk of silent regressions when models update or prompt templates change.

#### Modern Enterprise Evals Pipeline:
1. **Golden Test Suite**: 50 to 200 realistic test cases containing known edge cases, tricky constraints, and sample inputs.
2. **Structured Rubric**: Evaluate outputs across 4 distinct dimensions:
   * **Faithfulness**: Does the output cite only provided context without hallucinating?
   * **Completeness**: Were all user requirements fulfilled?
   * **Tone & Brand Safety**: Does it comply with corporate guidelines?
   * **Efficiency**: Token usage and latency.
3. **LLM-as-a-Judge**: Use a top-tier model (e.g., Claude 3.7 or Gemini 2.0) with a strict grading prompt to score responses automatically in CI/CD.`,
      suggestedPrompts: [
        'Test LLM-as-a-Judge in the Evals Matrix Lab',
        'How do I create a golden dataset for my team?',
        'What is the cost of running automated evals?'
      ],
      actionLink: {
        tab: 'simulators',
        subView: 'evals_matrix',
        label: '📊 Open Evals Matrix Lab'
      }
    };
  }

  // 5. Model Selection & Reasoning Tokens (Claude 3.7, Gemini 2.0 Flash, DeepSeek R1, GPT-4.5)
  if (queryLower.includes('model') || queryLower.includes('claude') || queryLower.includes('gemini') || queryLower.includes('deepseek') || queryLower.includes('reasoning') || queryLower.includes('which model')) {
    return {
      id,
      sender: 'coach',
      timestamp,
      content: `### 🧠 Modern AI Models & The "Reasoning Token" Paradigm

The model landscape has evolved into distinct tiers:

1. **Hybrid & Reasoning Models (Claude 3.7 Sonnet, DeepSeek R1, OpenAI o3-mini)**:
   * Generate hidden or inspectable "thinking tokens" before producing the final response.
   * **Best for**: Complex multi-file refactoring, deep algorithmic puzzles, mathematical verifications, and agent loop supervisors.
2. **High-Throughput Multimodal Speedsters (Gemini 2.0 Flash)**:
   * Ultra-fast sub-second latency, massive 1M+ token context window, ultra-low cost.
   * **Best for**: Interactive chat, high-frequency agent worker nodes, real-time voice, and processing entire documentation libraries.
3. **On-Premise / Open Weights (DeepSeek R1, Llama 3.3)**:
   * Deployable in private corporate infrastructure for air-gapped data compliance.`,
      suggestedPrompts: [
        'Compare all models in the AI Tool Catalog',
        'What is the difference between thinking tokens and standard tokens?',
        'Which model is most cost-effective for automated evals?'
      ],
      actionLink: {
        tab: 'tools',
        label: '🔍 Browse Model Directory'
      }
    };
  }

  // Default coaching reply
  return {
    id,
    sender: 'coach',
    timestamp,
    content: `### 💡 Lumina AI Coaching Guidance for ${ROLE_DISPLAY_NAMES[userRole]}

You asked: *"${userQuery}"*

Here is how you can approach this systematically:

1. **Define the Problem Seam**: Are you building a direct prompt, an autonomous agent loop with tools, or an automated evaluation pipeline?
2. **Choose the Right Tooling**: For tool connectivity, use **MCP**; for complex branching tasks, use **StateGraphs**; for fast iterations, use **Gemini 2.0 Flash**; for complex logic, use **Claude 3.7 Reasoning**.
3. **Verify Empirically**: Run your approach through our interactive simulators to validate behavior before writing production code.

What specific area would you like to explore next?`,
    suggestedPrompts: [
      'Show me how an Agent Loop works',
      'Explain MCP servers and tool chaining',
      'What are StateGraphs and how do they work?',
      'How do I test my AI system with automated evals?'
    ]
  };
}
