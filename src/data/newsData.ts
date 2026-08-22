import type { NewsItem } from '../types.ts';

export const AI_NEWS_ITEMS: NewsItem[] = [
  {
    id: 'news-1',
    title: 'Claude 3.7 Sonnet & Hybrid Reasoning: Bridging Instant Answers with Deep System 2 Thinking',
    category: 'models',
    date: 'February 2025',
    badgeText: 'Model Release',
    summary: 'Anthropic unveiled Claude 3.7 Sonnet featuring hybrid reasoning mode, allowing users and agents to toggle or dynamically scale thinking token budgets based on prompt complexity.',
    keyTakeaways: [
      'Allows variable thinking budget from 1,000 to 128,000 tokens for complex multi-file refactoring and mathematical proofs.',
      'Dramatic leap in code generation benchmarks (SWE-bench verified) and multi-step tool calling accuracy.',
      'Zero-latency mode for rapid conversational flows vs reasoning mode for deep agentic work.'
    ],
    roleImpacts: {
      software_engineer: 'Set thinking token budgets in your agent loops. For simple API conversions use standard mode; for large refactors use 16k+ thinking tokens.',
      product_manager: 'Understand the cost/latency trade-off: reasoning tokens cost standard output rates and take 5-15 seconds longer, so design asynchronous UX indicators.',
      data_ops: 'Benchmark your production prompts against 3.7 to determine if reasoning mode eliminates the need for expensive multi-shot prompt engineering.',
      business_analyst: 'Expect much higher reliability on complicated spreadsheet calculations, contract clause cross-referencing, and synthesis without hallucinations.',
      executive: 'Consolidates multiple specialized toolchains into single high-capability reasoning calls, reducing orchestration maintenance overhead.'
    },
    recommendedAction: 'Explore the Evals Matrix to compare reasoning models against standard models.',
    readTime: '3 min read',
    relatedLabId: 'evals_matrix',
    source: 'Anthropic Research'
  },
  {
    id: 'news-2',
    title: 'Model Context Protocol (MCP) Standard Reaches 1.2: Enterprise SDKs & Production Security',
    category: 'mcp',
    date: 'February 2025',
    badgeText: 'Standard Adoption',
    summary: 'The Model Context Protocol (MCP) has become the de-facto open standard for connecting AI clients (Claude Desktop, Cursor, Antigravity, VS Code) to enterprise data sources and custom tools.',
    keyTakeaways: [
      'Replaces bespoke API integrations with standard JSON-RPC 2.0 primitives: Resources, Tools, and Prompts.',
      'Supports Stdio for local sandboxes and Server-Sent Events (SSE) / HTTP for remote enterprise microservices.',
      'New authentication handshake and OAuth2 flow standard in v1.2 for secure enterprise RBAC.'
    ],
    roleImpacts: {
      software_engineer: 'Build MCP servers once for your internal databases and microservices; every AI IDE and autonomous agent can immediately query them safely.',
      product_manager: 'Think of MCP as the "USB-C for AI apps". You no longer need to build custom connectors for every new AI interface.',
      data_ops: 'Implement fine-grained access control and audit logging at the MCP server gateway layer rather than within individual prompt prompts.',
      business_analyst: 'Access live corporate data (Snowflake, Jira, Postgres) directly through your AI assistant without manual CSV exports.',
      executive: 'Significantly lowers vendor lock-in by decoupling enterprise tools and data sources from specific proprietary LLM platforms.'
    },
    recommendedAction: 'Launch the MCP Tool Chaining Lab to inspect live JSON-RPC request/response payloads.',
    readTime: '4 min read',
    relatedLabId: 'mcp_chaining',
    source: 'MCP Open Foundation'
  },
  {
    id: 'news-3',
    title: 'Agentic Loops & State Graphs: Why Static Chains are Being Replaced by LangGraph & Autonomy',
    category: 'agents',
    date: 'January 2025',
    badgeText: 'Architecture Trend',
    summary: 'Linear prompt chains and simple DAG pipelines fail when encountering unexpected errors. Cyclic agent graphs with self-reflection and dynamic routing are setting new production reliability records.',
    keyTakeaways: [
      'Cyclic execution allows agents to retry with error feedback (compiler errors, failed validations, test failures) up to a bounded recursion limit.',
      'State checkpointing enables durable human-in-the-loop approvals before high-stakes writes or financial transactions.',
      'Multi-agent supervisor architectures divide monolithic tasks into specialized research, drafting, and critique roles.'
    ],
    roleImpacts: {
      software_engineer: 'Migrate from rigid sequential chains to state graphs with clear recursion limits, typed state schemas, and conditional edge routers.',
      product_manager: 'Design user feedback loops into the state graph: allow the user to pause, inspect intermediate scratchpads, and steer the agent mid-execution.',
      data_ops: 'Monitor loop cycle counts and runaway recursion alerts in your tracing dashboards (LangSmith / Phoenix).',
      business_analyst: 'Understand that autonomous agent tasks may take 30-90 seconds as they iterate internally to guarantee high quality outputs.',
      executive: 'Agentic self-correction reduces human review time by 70% in high-complexity document validation and automated triage.'
    },
    recommendedAction: 'Test the Interactive Agent Loop and State Graph visualizers.',
    readTime: '5 min read',
    relatedLabId: 'agent_loop',
    source: 'Enterprise AI Engineering'
  },
  {
    id: 'news-4',
    title: 'LLM-as-a-Judge & Automated Evals: Moving from "Vibe Checks" to Rigorous CI/CD Benchmarks',
    category: 'evals',
    date: 'January 2025',
    badgeText: 'Best Practices',
    summary: 'Leading enterprise teams have banned subjective "vibe-checking" of AI features in favor of automated synthetic evaluation pipelines with golden datasets and rubric scoring.',
    keyTakeaways: [
      'Golden test datasets with 50-200 realistic enterprise test cases run on every pull request.',
      'LLM judges (e.g. Gemini 2.0 Flash or Claude 3.5 Sonnet) grade outputs against criteria: Faithfulness, Completeness, Tone, and Security.',
      'Semantic distance and regression tracking prevent subtle quality degradations during model or prompt upgrades.'
    ],
    roleImpacts: {
      software_engineer: 'Add an automated eval step to your GitHub Actions before deploying prompt template changes to production.',
      product_manager: 'Define concrete evaluation rubrics and curate edge-case golden samples instead of writing vague subjective acceptance criteria.',
      data_ops: 'Track cost-per-eval and score drift metrics over time to catch silent model deprecations or schema changes.',
      business_analyst: 'Help engineering curate real-world business edge cases to include in the automated evaluation harness.',
      executive: 'Establishes measurable risk controls and regulatory compliance for generative AI deployments.'
    },
    recommendedAction: 'Open the Evals Matrix Lab to test LLM-as-a-Judge scoring on real enterprise examples.',
    readTime: '4 min read',
    relatedLabId: 'evals_matrix',
    source: 'AI Quality Guild'
  },
  {
    id: 'news-5',
    title: 'Gemini 2.0 Flash & Real-Time Multimodality: 1M Token Context & Ultra-Low Latency',
    category: 'models',
    date: 'December 2024',
    badgeText: 'Multimodal Speed',
    summary: 'Google launched Gemini 2.0 Flash with native audio/video streaming, sub-second response times, and full 1M+ token context windows for real-time interactive enterprise workflows.',
    keyTakeaways: [
      'Native tool calling speed improved 3x, ideal for interactive coaching agents and fast loop iterations.',
      'Cost per million tokens dropped drastically, making automated eval runs and large-batch processing highly economical.',
      'Multimodal grounding allows directly feeding video recordings, PDFs, and architecture diagrams into reasoning prompts.'
    ],
    roleImpacts: {
      software_engineer: 'Ideal for the "worker" or "evaluator" node in multi-agent graphs where speed and tool throughput are paramount.',
      product_manager: 'Enables interactive voice interfaces and instant UI rendering without awkward 10-second loading pauses.',
      data_ops: 'Process entire internal documentation repositories in single context calls without complex chunking heuristics.',
      business_analyst: 'Upload 500-page financial reports or quarterly transcripts for instant cross-tabulation in seconds.',
      executive: 'Dramatic reduction in operating cost for high-volume customer service and internal knowledge bases.'
    },
    recommendedAction: 'Compare Gemini 2.0 Flash in the Model Directory.',
    readTime: '3 min read',
    relatedLabId: 'tools',
    source: 'Google DeepMind'
  }
];
