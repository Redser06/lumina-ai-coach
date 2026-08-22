import type { ToolEntry } from '../types.ts';

export const AI_TOOLS_CATALOG: ToolEntry[] = [
  {
    id: 'tool-claude-37',
    name: 'Claude 3.7 Sonnet',
    category: 'model',
    vendor: 'Anthropic',
    description: 'State-of-the-art hybrid reasoning model with adjustable thinking token budget, industry-leading coding accuracy, and superior tool orchestration.',
    keyStrengths: [
      'Configurable thinking token budget (0 to 128k tokens)',
      'Top-tier SWE-bench coding and multi-file refactoring',
      'Reliable JSON/tool calling compliance without schema deviation'
    ],
    bestUsedFor: 'Complex multi-file agentic loops, deep code refactors, tricky logical debugging, and high-accuracy tool chaining.',
    license: 'Proprietary API',
    contextWindow: '200k tokens',
    pricingTier: 'Pay-per-token',
    status: 'Production',
    cheatsheetTips: [
      'Use standard mode for fast conversational replies; set thinking tokens (e.g. 4k-16k) for multi-file code generation.',
      'Pass structured XML tags (`<context>`, `<instructions>`, `<constraints>`) for maximum clarity.'
    ],
    docUrl: 'https://docs.anthropic.com'
  },
  {
    id: 'tool-gemini-2-flash',
    name: 'Gemini 2.0 Flash',
    category: 'model',
    vendor: 'Google DeepMind',
    description: 'Ultra-fast, cost-effective multimodal model with 1M+ token context window, native audio/video streaming, and rapid tool calling.',
    keyStrengths: [
      'Sub-second first-token latency and high throughput',
      'Massive 1M token context window for full repo or doc digestion',
      'Ultra-competitive pricing for high-volume automated evals'
    ],
    bestUsedFor: 'High-frequency agent worker nodes, real-time voice/video apps, large-scale repo indexing, and high-volume LLM-as-a-Judge evals.',
    license: 'Proprietary API',
    contextWindow: '1,000,000+ tokens',
    pricingTier: 'Pay-per-token',
    status: 'Production',
    cheatsheetTips: [
      'Directly feed entire multi-megabyte PDFs or video recordings into the prompt without manual OCR or transcript preprocessing.',
      'Use system instructions for persistent persona and output formatting constraints.'
    ],
    docUrl: 'https://ai.google.dev'
  },
  {
    id: 'tool-deepseek-r1',
    name: 'DeepSeek R1',
    category: 'model',
    vendor: 'DeepSeek / Open Weights',
    description: 'Open-weights reasoning model trained via large-scale reinforcement learning, demonstrating competitive math and coding reasoning.',
    keyStrengths: [
      'Open weights available for self-hosted enterprise private clouds',
      'Visible `<think>` chain-of-thought tokens for inspectable reasoning',
      'Zero licensing risk for sensitive on-premise deployments'
    ],
    bestUsedFor: 'On-premise private enterprise deployments, privacy-sensitive codebases, and mathematical verification tasks.',
    license: 'MIT / Open Weights',
    contextWindow: '64k tokens',
    pricingTier: 'Free (Self-hosted) / Pay-per-token',
    status: 'Production',
    cheatsheetTips: [
      'Do not inject few-shot examples into R1 thinking prompts — it performs best with pure zero-shot instructions and clear goal statements.',
      'Inspect the `<think>` block for debugging logic before the final answer.'
    ],
    docUrl: 'https://github.com/deepseek-ai/DeepSeek-R1'
  },
  {
    id: 'tool-antigravity',
    name: 'Google Antigravity (AGY)',
    category: 'ide_extension',
    vendor: 'Google DeepMind',
    description: 'Agentic pair programming and orchestration platform with autonomous subagent delegation, background multitasking, and native tool execution.',
    keyStrengths: [
      'Autonomous subagent spawning with isolated or shared workspaces',
      'Native proactive terminal execution and verification loops',
      'Integrated MCP server support and skill customization engine'
    ],
    bestUsedFor: 'End-to-end software feature development, multi-agent parallel bakeoffs, automated refactoring, and prototype creation.',
    license: 'Enterprise Platform',
    pricingTier: 'Enterprise',
    status: 'Production',
    cheatsheetTips: [
      'Use slash commands like `/goal` for long-running tasks and define specialized subagents for distinct roles.',
      'Ensure strict verification loops (tests, typecheck, lint) before finalizing changes.'
    ],
    docUrl: 'https://antigravity.google.com'
  },
  {
    id: 'tool-langgraph',
    name: 'LangGraph',
    category: 'orchestration',
    vendor: 'LangChain',
    description: 'Stateful, cyclic multi-agent orchestration framework built on graph data structures, offering built-in persistence, branching, and human-in-the-loop.',
    keyStrengths: [
      'First-class support for cyclic loops and stateful memory',
      'Built-in time-travel debugging and state checkpointing',
      'Durable Human-in-the-Loop interruption hooks'
    ],
    bestUsedFor: 'Complex enterprise multi-agent workflows, code generation with compiler feedback loops, and customer service escalation graphs.',
    license: 'MIT Open Source',
    pricingTier: 'Free (Open Source) / Cloud Hosting',
    status: 'Production',
    cheatsheetTips: [
      'Define clear TypeScript interfaces for your `AgentState` before creating nodes.',
      'Always set recursion limits (`recursion_limit: 25`) to prevent runaway loops.'
    ],
    docUrl: 'https://langchain-ai.github.io/langgraph/'
  },
  {
    id: 'tool-mcp-protocol',
    name: 'Model Context Protocol (MCP)',
    category: 'protocol',
    vendor: 'Anthropic & Open Source',
    description: 'The open standard communication protocol connecting LLM applications and agent frameworks to external tools, databases, and enterprise data sources.',
    keyStrengths: [
      'Universal compatibility across Claude Desktop, Cursor, Antigravity, VS Code, etc.',
      'Standardized JSON-RPC 2.0 protocol for Tools, Resources, and Prompts',
      'Native Stdio (local process) and SSE (remote web service) transports'
    ],
    bestUsedFor: 'Exposing internal company APIs, databases, Slack bots, and developer tools to all AI assistants securely.',
    license: 'MIT Open Source',
    pricingTier: 'Free (Open Standard)',
    status: 'Production',
    cheatsheetTips: [
      'Use the MCP Inspector CLI (`npx @modelcontextprotocol/inspector`) to test server responses and schemas before connecting to clients.',
      'Keep tool schemas minimal and provide descriptive parameter docstrings.'
    ],
    docUrl: 'https://modelcontextprotocol.io'
  },
  {
    id: 'tool-arize-phoenix',
    name: 'Arize Phoenix & Evals',
    category: 'eval_observability',
    vendor: 'Arize AI',
    description: 'Open-source AI observability and evaluation platform for tracing LLM execution, monitoring latency/cost, and running automated LLM-as-a-Judge evaluations.',
    keyStrengths: [
      'OpenTelemetry-based tracing for multi-step agent loops',
      'Automated evals for Hallucination, QA Correctness, and Toxicity',
      'Zero-dependency local embedding & vector clustering visualization'
    ],
    bestUsedFor: 'Production monitoring of agent loops, tracing MCP tool call latency, and running automated golden dataset eval suites in CI/CD.',
    license: 'Apache 2.0',
    pricingTier: 'Freemium / Cloud',
    status: 'Production',
    cheatsheetTips: [
      'Instrument your agent loop with OpenInference spans to visualize where token latency accumulates.',
      'Set automated regression alerts when LLM-as-a-Judge correctness dips below 90%.'
    ],
    docUrl: 'https://phoenix.arize.com'
  }
];
