# 🌟 Lumina AI Coach — Internal AI Enablement Platform

> **Empowering every employee into their highest-performing AI-augmented self through interactive coaching, empirical sandboxes, live AI news impact analysis, and practical tool chaining.**

[![Firebase Hosting](https://img.shields.io/badge/Firebase-Hosting%20Preview-FFCA28?logo=firebase&logoColor=black)](https://rapid-prototyping-4134c.web.app)
[![React 18](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

---

## 🎯 Problem Statement
In today's fast-moving AI landscape, many team members struggle to keep pace with rapid developments, new model architectures (reasoning tokens, thinking budgets), emerging paradigms (autonomous agent loops, state graphs), open protocols (Model Context Protocol / MCP), and reliability standards (LLM-as-a-judge evals). Most employees encounter AI as a confusing passive feed of text or disconnected chat boxes.

## 💡 Potential Solution: Lumina
**Lumina AI Coach** transforms passive learning into an **interactive, conversational, and empirical journey**. Employees don't just read about AI—they engage with a personalized coach that diagnoses their current capability, tailors lessons to their specific job role, lets them run live agent loop simulators, design multi-agent state graphs, chain MCP tools, and benchmark models with automated evals.

---

## ⚡ Core Platform Capabilities

### 1. 🤖 Conversational AI Coach & Role Diagnostic
* **Personalized Onboarding**: Assesses baseline skills across 4 tiers (*AI Explorer*, *Prompt Practitioner*, *Agent Builder*, *Systems Architect*) and 5 roles (*Software Engineer*, *Product Manager*, *Data/Ops*, *Business Analyst*, *Executive*).
* **"Tell Lumina What You Need" Prompt Engine**: Natural language coaching query bar that dynamically recommends tailored micro-labs and step-by-step strategies.
* **Gamified Mission Progress**: Hands-on milestone checklist with XP rewards, badges, and session persistence in `localStorage`.

### 2. 📰 Live AI News Feed & Role Impact Radar
* **Top AI Radar Ticker**: Real-time breaking developments (Claude 3.7 Hybrid Reasoning, Gemini 2.0 Flash 1M context, MCP standard v1.2, DeepSeek R1).
* **Role-Specific Impact Summaries**: Plain-English breakdowns of what each breakthrough means specifically for Engineers, PMs, Data Specialists, and Business Leaders.
* **One-Click Simulator Jump**: Direct links to test new concepts in live interactive labs.

### 3. 🧪 4 Hands-On Interactive Simulators
1. **Agent Loop & Self-Healing Simulator**: Step-by-step visual execution of the ReAct cycle (`Thought ➔ Action ➔ Tool Call ➔ Observation ➔ Reflection ➔ Final Answer`) with compiler error recovery and recursion bounds.
2. **Multi-Agent StateGraph Studio**: Interactive DAG state machine demonstrating Supervisor Routers, Worker Agents, Linter nodes, and Human-in-the-Loop approval checkpoints.
3. **Model Context Protocol (MCP) & Tool Chaining Studio**: Live JSON-RPC 2.0 wire protocol inspector demonstrating how AI clients talk to GitHub, PostgreSQL, and Slack MCP servers over Stdio and SSE.
4. **LLM-as-a-Judge & Evals Matrix Playground**: Comparative side-by-side benchmarking scoring models and prompts across Faithfulness, Completeness, Latency, and Cost against golden test suites.

### 4. 📚 Curated Training Sets & Quizzes
* Modular lessons on ReAct Loops, Self-Correction, StateGraphs, MCP Protocol Schemas, and Automated Evals.
* Interactive knowledge checks with instant feedback and celebratory confetti on mastery.

### 5. 🛠️ AI Models & Tool Directory
* Enterprise directory comparing Claude 3.7, Gemini 2.0 Flash, DeepSeek R1, Google Antigravity, Cursor, LangGraph, and Arize Phoenix with cheat sheets and practical usage guidelines.

---

## 🎨 Design System & Aesthetic
* **Modern Bright UI**: Clean slate-50 canvas, crisp white frosted glass panels (`backdrop-blur-md`), luminous indigo/violet/teal gradients, high-contrast typography (`Plus Jakarta Sans` & `JetBrains Mono`), and clean micro-interactions.

---

## 🚀 Quickstart & Verification

```bash
# Install dependencies
npm install

# Run automated tests
npm test

# Build production bundle
npm run build

# Start local dev server
npm run dev
```

---

## 📦 Deployment & Git Workflow

```bash
# Firebase Preview Channel Deploy
npx firebase-tools hosting:channel:deploy lumina-ai-coach-preview --project rapid-prototyping-4134c

# GitHub Remote Provisioning
gh repo create Redser06/lumina-ai-coach --public --source=. --push
```

---

*Engineered with precision for the Rapid Prototypes Suite.*
