import type { LearningTrack } from '../types.ts';

export const CURRICULUM_TRACKS: LearningTrack[] = [
  {
    id: 'track-agents-loops',
    title: 'AI Agents & Execution Loops',
    description: 'Master how autonomous LLMs make decisions, call tools, inspect results, and self-correct across iterative loops.',
    iconName: 'RotateCw',
    color: 'from-blue-500 to-indigo-600',
    lessons: [
      {
        id: 'lesson-react-loop',
        title: 'The Anatomy of a ReAct Loop (Reason + Act)',
        trackId: 'track-agents-loops',
        level: 'prompt_practitioner',
        durationMinutes: 12,
        xpReward: 150,
        overview: 'Understand how modern agents break down complex tasks by interleaving step-by-step reasoning (Thought), tool invocation (Action), environment feedback (Observation), and evaluation (Reflection).',
        keyConcepts: [
          'Linear Prompting vs. Autonomous Execution Loops',
          'The ReAct cycle: Thought ➔ Action ➔ Tool Call ➔ Observation ➔ Reflection',
          'Stopping criteria: How agents know when a task is finished or when to ask for human assistance',
          'Preventing infinite loops with maximum iteration caps and recursion limits'
        ],
        codeSnippets: [
          {
            title: 'Basic ReAct Agent Loop (TypeScript/Python Pattern)',
            language: 'typescript',
            code: `async function runAgentLoop(goal: string, tools: Tool[], maxTurns = 6) {
  const history: Message[] = [{ role: 'user', content: goal }];
  
  for (let turn = 1; turn <= maxTurns; turn++) {
    // 1. LLM reasons on current history and decides if a tool is required
    const response = await llm.chat({ messages: history, tools });
    
    if (response.toolCalls && response.toolCalls.length > 0) {
      // 2. Action: Execute the requested tool(s)
      for (const call of response.toolCalls) {
        const observation = await executeTool(call.name, call.args);
        history.push({ role: 'tool', toolCallId: call.id, content: JSON.stringify(observation) });
      }
    } else {
      // 3. Final Answer reached!
      return response.text;
    }
  }
  throw new Error("Agent reached maximum loop threshold without resolution.");
}`,
            explanation: 'The loop continues accumulating observations in conversation history until the model concludes with a final answer.'
          }
        ],
        practicalExercise: {
          instruction: 'Open the Agent Loop Simulator and run a scenario with a simulated tool failure. Observe how the agent reflects on the error and retries with corrected parameters.',
          hints: [
            'Look at the Reflection step after the tool error.',
            'Notice how the scratchpad records the error message so the LLM adjusts its next query.'
          ]
        },
        quiz: {
          id: 'quiz-react-1',
          scenario: 'An autonomous agent is querying an internal API. On turn 2, the API returns a "401 Unauthorized" error due to a malformed header. What should the agent loop do?',
          options: [
            {
              id: 'opt-a',
              text: 'Immediately crash the entire backend process with an unhandled exception.',
              isCorrect: false,
              explanation: 'Crashing the process stops workflow recovery. Agents should handle errors gracefully.'
            },
            {
              id: 'opt-b',
              text: 'Feed the error back as an Observation in the conversation context so the agent can reflect and adjust credentials or notify the user.',
              isCorrect: true,
              explanation: 'Exactly! Returning the error as an observation enables the model to reason about the failure, self-heal, or ask for human intervention.'
            },
            {
              id: 'opt-c',
              text: 'Silently repeat the exact same request in an infinite loop.',
              isCorrect: false,
              explanation: 'Repeating without changes consumes token budget and leads to infinite loops.'
            }
          ]
        },
        relatedSimulatorTab: 'agent_loop'
      },
      {
        id: 'lesson-reflection-selfheal',
        title: 'Self-Correction & Reflection Patterns',
        trackId: 'track-agents-loops',
        level: 'agent_builder',
        durationMinutes: 15,
        xpReward: 200,
        overview: 'Learn how to implement double-pass reflection, automated test execution, and critique loops to achieve 95%+ reliability on coding and data tasks.',
        keyConcepts: [
          'Generator vs. Critic architecture (Actor-Critic pattern)',
          'Deterministic validation gates (compilers, linters, schemas, unit tests)',
          'Backtracking: When to revert a partial modification and try an alternative strategy'
        ],
        codeSnippets: [
          {
            title: 'Reflection & Verification Pattern',
            language: 'typescript',
            code: `// Dual pass: Generate code -> Run test runner -> Reflect on failure
let draftCode = await generateCode(task);
let testResults = await runLinterAndTests(draftCode);

let attempts = 0;
while (!testResults.passed && attempts < 3) {
  attempts++;
  draftCode = await reflectAndFix({
    task,
    previousCode: draftCode,
    errorLogs: testResults.errors
  });
  testResults = await runLinterAndTests(draftCode);
}`,
            explanation: 'Using real compiler/linter feedback turns probabilistic generation into deterministic, verified results.'
          }
        ],
        practicalExercise: {
          instruction: 'Run the Self-Healing test in the Agent Loop Simulator and inspect how the critique node verifies lint errors before emitting the final output.',
          hints: ['Observe the difference between 1-shot generation and 2-turn self-correction.']
        },
        quiz: {
          id: 'quiz-reflection-1',
          scenario: 'Why is empirical verification (e.g. running `npm test` or a Python interpreter) superior to having the same LLM simply re-read its own code?',
          options: [
            {
              id: 'opt-a',
              text: 'Because LLMs have blind spots for their own subtle hallucinated syntax or logic, whereas an actual compiler provides ground-truth deterministic reality.',
              isCorrect: true,
              explanation: 'Correct! LLM self-checks can repeat the same hallucination. An external deterministic execution engine provides irrefutable ground truth.'
            },
            {
              id: 'opt-b',
              text: 'Because compilers use fewer tokens.',
              isCorrect: false,
              explanation: 'While true, the primary advantage is correctness and deterministic ground truth.'
            },
            {
              id: 'opt-c',
              text: 'LLMs cannot execute code under any circumstance.',
              isCorrect: false,
              explanation: 'LLMs generate code, but require runtime environments to execute it.'
            }
          ]
        },
        relatedSimulatorTab: 'agent_loop'
      }
    ]
  },
  {
    id: 'track-graphs-orchestration',
    title: 'Building State Graphs & Multi-Agent Systems',
    description: 'Design robust cyclic multi-agent graphs, state machines, supervisor routers, and human-in-the-loop workflows using LangGraph paradigms.',
    iconName: 'Network',
    color: 'from-purple-500 to-indigo-600',
    lessons: [
      {
        id: 'lesson-stategraph-foundations',
        title: 'StateGraphs: Nodes, Edges, and Reducers',
        trackId: 'track-graphs-orchestration',
        level: 'agent_builder',
        durationMinutes: 15,
        xpReward: 200,
        overview: 'Discover why complex enterprise AI applications need graph-based state machines rather than simple linear chains.',
        keyConcepts: [
          'Global State: The shared typed memory passed between nodes',
          'Nodes as autonomous functional workers (e.g. Researcher, Drafter, Reviewer)',
          'Conditional Edges: Routing logic based on LLM decisions or test status',
          'Cyclic workflows for iterative refinement'
        ],
        codeSnippets: [
          {
            title: 'LangGraph Style StateGraph Definition',
            language: 'typescript',
            code: `import { StateGraph, END } from '@langchain/langgraph';

interface AgentState {
  userQuery: string;
  researchNotes: string[];
  draftArticle: string;
  reviewFeedback: string | null;
  approvalStatus: 'pending' | 'approved' | 'rejected';
}

const workflow = new StateGraph<AgentState>({
  channels: { /* state reducer channels */ }
});

// Add functional nodes
workflow.addNode('researcher', researchNode);
workflow.addNode('writer', writerNode);
workflow.addNode('editor_critique', editorNode);

// Define edges and routing
workflow.addEdge('researcher', 'writer');
workflow.addEdge('writer', 'editor_critique');

// Conditional routing edge
workflow.addConditionalEdges('editor_critique', (state) => {
  if (state.approvalStatus === 'approved') return END;
  return 'writer'; // Loop back to rewrite with feedback!
});`,
            explanation: 'The state graph models cyclical reviews and clear exit conditions.'
          }
        ],
        practicalExercise: {
          instruction: 'Explore the Graph Visualizer tab. Step through the Supervisor ➔ Research ➔ Coder ➔ Validator graph and trigger a conditional loop-back.',
          hints: ['Watch the token flow through the nodes as state variables update.']
        },
        quiz: {
          id: 'quiz-graph-1',
          scenario: 'In a StateGraph with a Writer and a Reviewer node, what prevents an infinite loop if the Reviewer is never satisfied?',
          options: [
            {
              id: 'opt-a',
              text: 'The LLM automatically knows when 10 minutes have elapsed.',
              isCorrect: false,
              explanation: 'LLMs have no internal clock unless monitored by the runtime graph.'
            },
            {
              id: 'opt-b',
              text: 'A recursion limit counter in state that triggers a fallback route or escalates to a Human-in-the-Loop approval node.',
              isCorrect: true,
              explanation: 'Spot on! Production state graphs enforce recursion limits and route to human fallback when maximum retries are exceeded.'
            },
            {
              id: 'opt-c',
              text: 'StateGraphs automatically delete unsatisfied review nodes.',
              isCorrect: false,
              explanation: 'Nodes are static code definitions; routing edges control execution.'
            }
          ]
        },
        relatedSimulatorTab: 'graph_builder'
      }
    ]
  },
  {
    id: 'track-mcp-tool-chaining',
    title: 'Model Context Protocol (MCP) & Tool Chaining',
    description: 'Learn the open standard protocol for AI tool calling, server creation, resource exposing, and multi-hop tool chaining.',
    iconName: 'Cpu',
    color: 'from-teal-500 to-emerald-600',
    lessons: [
      {
        id: 'lesson-mcp-architecture',
        title: 'MCP Protocol Fundamentals: Core Primitives & JSON-RPC',
        trackId: 'track-mcp-tool-chaining',
        level: 'prompt_practitioner',
        durationMinutes: 14,
        xpReward: 175,
        overview: 'Understand the three fundamental primitives of the Model Context Protocol: Tools (executable actions), Resources (read-only data streams), and Prompts (reusable templates).',
        keyConcepts: [
          'Host (Claude Desktop, Cursor, Antigravity) vs. Client vs. Server',
          'JSON-RPC 2.0 message envelope: methods, params, result, error',
          'Stdio transport (local subprocess) vs SSE transport (remote web service)',
          'Security, authorization, and permission scopes for tools'
        ],
        codeSnippets: [
          {
            title: 'Simple MCP Server Tool Definition (TypeScript SDK)',
            language: 'typescript',
            code: `import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server({ name: "corporate-db-mcp", version: "1.0.0" }, {
  capabilities: { tools: {} }
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "query_sales_db",
      description: "Safely execute read-only SQL queries on the corporate sales warehouse",
      inputSchema: {
        type: "object",
        properties: {
          sql: { type: "string", description: "SELECT query to run" }
        },
        required: ["sql"]
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "query_sales_db") {
    const results = await db.query(request.params.arguments.sql);
    return { content: [{ type: "text", text: JSON.stringify(results) }] };
  }
  throw new Error("Tool not found");
});`,
            explanation: 'The MCP standard provides typed schemas and automatic tool discovery for all compliant AI clients.'
          }
        ],
        practicalExercise: {
          instruction: 'Open the MCP Tool Chaining Lab. Select 3 tools (GitHub Search, Database Query, Slack Dispatch) and watch how the AI chains data between them.',
          hints: ['Inspect the raw JSON-RPC request and response payloads in the debug pane.']
        },
        quiz: {
          id: 'quiz-mcp-1',
          scenario: 'What is the primary architectural advantage of MCP over writing proprietary custom plugin code for every AI client?',
          options: [
            {
              id: 'opt-a',
              text: 'You write one standard MCP server, and it instantly works across Cursor, Claude, Antigravity, VS Code, and custom autonomous agents without rewriting.',
              isCorrect: true,
              explanation: 'Exactly! MCP decouples tools and enterprise data from individual LLM client applications.'
            },
            {
              id: 'opt-b',
              text: 'MCP eliminates the need for APIs entirely.',
              isCorrect: false,
              explanation: 'MCP is a protocol that standardizes how APIs are exposed to LLMs.'
            },
            {
              id: 'opt-c',
              text: 'MCP guarantees zero latency on all network requests.',
              isCorrect: false,
              explanation: 'Network latency depends on the underlying server and service.'
            }
          ]
        },
        relatedSimulatorTab: 'mcp_chaining'
      }
    ]
  },
  {
    id: 'track-evals-benchmarks',
    title: 'AI Evals, Benchmarking & LLM-as-a-Judge',
    description: 'Move beyond subjective vibe-checks. Build automated evaluation pipelines, golden test suites, and regression matrices for enterprise AI.',
    iconName: 'CheckCircle2',
    color: 'from-amber-500 to-orange-600',
    lessons: [
      {
        id: 'lesson-eval-matrices',
        title: 'Building Golden Datasets & LLM-as-a-Judge Rubrics',
        trackId: 'track-evals-benchmarks',
        level: 'agent_builder',
        durationMinutes: 16,
        xpReward: 220,
        overview: 'Learn how to create structured evaluation matrices to measure Accuracy, Faithfulness (hallucination reduction), Tone, and Cost/Latency trade-offs.',
        keyConcepts: [
          'The failure of "Vibe Checks" in production AI',
          'Curating a Golden Dataset with representative hard cases and edge cases',
          'Designing structured rubrics (1-5 scale with concrete criteria)',
          'Pairwise vs. Absolute LLM-as-a-Judge evaluation techniques'
        ],
        codeSnippets: [
          {
            title: 'LLM-as-a-Judge Evaluation Prompt Template',
            language: 'markdown',
            code: `You are an impartial expert evaluator scoring an AI assistant's response.

[CRITERIA]:
1. Faithfulness (1-5): Does the response contain any claims NOT supported by the Context?
2. Completeness (1-5): Did the response answer all parts of the User Query?
3. Actionability (1-5): Are the next steps clear and directly executable?

[CONTEXT]:
{{provided_context}}

[USER QUERY]:
{{user_query}}

[AI RESPONSE]:
{{candidate_response}}

Output a JSON object with scores (1-5) and specific evidence for any deductions.`,
            explanation: 'Structured rubrics ensure reproducible and calibrated grading across models and test cases.'
          }
        ],
        practicalExercise: {
          instruction: 'Navigate to the Evals Matrix Lab and test the LLM-as-a-Judge scorer against two prompt variations on a financial document summary task.',
          hints: ['Check how reasoning models score on Faithfulness compared to smaller models.']
        },
        quiz: {
          id: 'quiz-evals-1',
          scenario: 'When running an automated LLM-as-a-Judge eval pipeline on 500 test cases, which model should ideally serve as the judge?',
          options: [
            {
              id: 'opt-a',
              text: 'The smallest and fastest quantized model available to save time.',
              isCorrect: false,
              explanation: 'Small models lack the reasoning depth to judge nuanced semantic fidelity.'
            },
            {
              id: 'opt-b',
              text: 'A high-capability frontier model (or human-calibrated ensemble) with strong reasoning capabilities and structured output support.',
              isCorrect: true,
              explanation: 'Correct! The judge model must possess equal or superior reasoning capacity compared to the model being evaluated.'
            },
            {
              id: 'opt-c',
              text: 'A simple regex pattern matcher.',
              isCorrect: false,
              explanation: 'Regex cannot evaluate semantic truth, nuance, or tone.'
            }
          ]
        },
        relatedSimulatorTab: 'evals_matrix'
      }
    ]
  }
];
