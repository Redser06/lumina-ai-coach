import React, { useState } from 'react';
import { 
  Cpu, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  Terminal, 
  Database, 
  MessageSquare, 
  Github, 
  Globe
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const MCPToolChainingLab: React.FC = () => {
  const [activeWorkflow, setActiveWorkflow] = useState<'security_audit' | 'customer_crm'>('security_audit');
  const [currentStep, setCurrentStep] = useState<number>(-1);

  const mcpServers = [
    {
      id: 'github_mcp',
      name: 'GitHub Enterprise MCP',
      icon: Github,
      transport: 'Stdio / Subprocess',
      status: 'Connected',
      toolsCount: 5
    },
    {
      id: 'postgres_mcp',
      name: 'PostgreSQL Warehouse MCP',
      icon: Database,
      transport: 'SSE / Remote Service',
      status: 'Connected',
      toolsCount: 3
    },
    {
      id: 'slack_mcp',
      name: 'Slack Alerts MCP',
      icon: MessageSquare,
      transport: 'Stdio / Subprocess',
      status: 'Connected',
      toolsCount: 2
    },
    {
      id: 'brave_search_mcp',
      name: 'Brave Search MCP',
      icon: Globe,
      transport: 'Stdio / Subprocess',
      status: 'Connected',
      toolsCount: 2
    }
  ];

  const workflows = {
    security_audit: {
      name: 'Automated CI/CD Vulnerability Triage & Notification',
      description: 'Chains 3 MCP servers: Scans open GitHub PRs ➔ Cross-references database CVEs ➔ Dispatches alert to Slack.',
      hops: [
        {
          step: 1,
          server: 'GitHub Enterprise MCP',
          tool: 'github_list_open_prs',
          params: { repo: 'org/billing-core', state: 'open', limit: 5 },
          output: {
            prs: [
              { id: 104, title: 'Upgrade jsonwebtoken to v9.0.2', author: 'dependabot', diff_files: ['package.json'] }
            ]
          },
          rpcRequest: {
            jsonrpc: '2.0',
            id: 'call-101',
            method: 'tools/call',
            params: { name: 'github_list_open_prs', arguments: { repo: 'org/billing-core' } }
          },
          explanation: 'Client sends JSON-RPC 2.0 call over Stdio to GitHub MCP server.'
        },
        {
          step: 2,
          server: 'PostgreSQL Warehouse MCP',
          tool: 'postgres_cve_lookup',
          params: { packageName: 'jsonwebtoken', version: '9.0.0' },
          output: {
            vulnerability: { cve: 'CVE-2022-23529', severity: 'HIGH', recommendation: 'Upgrade to >=9.0.2 immediately' }
          },
          rpcRequest: {
            jsonrpc: '2.0',
            id: 'call-102',
            method: 'tools/call',
            params: { name: 'postgres_cve_lookup', arguments: { packageName: 'jsonwebtoken' } }
          },
          explanation: 'Output from GitHub PR step piped into Postgres CVE database query.'
        },
        {
          step: 3,
          server: 'Slack Alerts MCP',
          tool: 'slack_send_notification',
          params: { channel: '#security-approvals', message: '⚠️ PR #104 resolves HIGH CVE-2022-23529. Fast-track approval recommended.' },
          output: { status: 'ok', message_id: 'slack_991823' },
          rpcRequest: {
            jsonrpc: '2.0',
            id: 'call-103',
            method: 'tools/call',
            params: { name: 'slack_send_notification', arguments: { channel: '#security-approvals' } }
          },
          explanation: 'Final action dispatches alert to team channel with structured telemetry.'
        }
      ]
    },
    customer_crm: {
      name: 'Customer Feedback Sentiment & CRM Synchronization',
      description: 'Chains 3 MCP servers: Pulls customer support tickets ➔ Runs sentiment analysis ➔ Updates Postgres account health.',
      hops: [
        {
          step: 1,
          server: 'Brave Search MCP',
          tool: 'search_knowledge_base',
          params: { query: 'Enterprise SSO setup failures' },
          output: { resultsCount: 4, topDoc: 'SSO SAML 2.0 Integration Checklist' },
          rpcRequest: {
            jsonrpc: '2.0',
            id: 'call-201',
            method: 'tools/call',
            params: { name: 'search_knowledge_base', arguments: { query: 'SSO setup' } }
          },
          explanation: 'Queries external documentation repository via MCP.'
        },
        {
          step: 2,
          server: 'PostgreSQL Warehouse MCP',
          tool: 'update_customer_status',
          params: { accountId: 'acc_88192', healthScore: 'YELLOW', notes: 'SSO configuration in progress' },
          output: { rowsAffected: 1, updatedHealth: 'YELLOW' },
          rpcRequest: {
            jsonrpc: '2.0',
            id: 'call-202',
            method: 'tools/call',
            params: { name: 'update_customer_status', arguments: { accountId: 'acc_88192', healthScore: 'YELLOW' } }
          },
          explanation: 'Updates relational database with verified account health telemetry.'
        },
        {
          step: 3,
          server: 'Slack Alerts MCP',
          tool: 'slack_send_notification',
          params: { channel: '#customer-success', message: 'Account acc_88192 updated to YELLOW. CSM notified.' },
          output: { status: 'ok', message_id: 'slack_817263' },
          rpcRequest: {
            jsonrpc: '2.0',
            id: 'call-203',
            method: 'tools/call',
            params: { name: 'slack_send_notification', arguments: { channel: '#customer-success' } }
          },
          explanation: 'Notifies customer success manager automatically.'
        }
      ]
    }
  };

  const activeHops = workflows[activeWorkflow].hops;
  const isFinished = currentStep >= activeHops.length - 1;

  const handleStepHop = () => {
    if (!isFinished) {
      setCurrentStep(prev => {
        const next = prev + 1;
        if (next >= activeHops.length - 1) {
          confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        }
        return next;
      });
    }
  };

  const handleResetWorkflow = () => {
    setCurrentStep(-1);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 sm:p-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-bold mb-2">
            <Cpu className="w-3.5 h-3.5" />
            <span>Open Protocol Standard</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            Model Context Protocol (MCP) & Tool Chaining Studio
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mt-1">
            Experience how the open MCP standard connects LLMs to enterprise databases, Slack bots, and GitHub repos without writing custom glue code for every AI client.
          </p>
        </div>

        {/* Workflow Switcher */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setActiveWorkflow('security_audit');
              handleResetWorkflow();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeWorkflow === 'security_audit'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Security Audit Chain
          </button>
          <button
            onClick={() => {
              setActiveWorkflow('customer_crm');
              handleResetWorkflow();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeWorkflow === 'customer_crm'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Customer CRM Chain
          </button>
        </div>
      </div>

      {/* Connected MCP Servers Bar */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registered MCP Servers</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {mcpServers.map((server) => {
            const Icon = server.icon;
            return (
              <div
                key={server.id}
                className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex items-center space-x-3 shadow-2xs"
              >
                <div className="w-9 h-9 rounded-xl bg-white text-teal-600 border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{server.name}</h4>
                  <p className="text-[10px] text-slate-500">{server.transport}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Multi-Tool Chain Execution Canvas */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">{workflows[activeWorkflow].name}</h3>
            <p className="text-xs text-slate-500">{workflows[activeWorkflow].description}</p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleStepHop}
              disabled={isFinished}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{currentStep === -1 ? 'Execute Tool Chain' : isFinished ? 'Completed' : 'Step Next Tool'}</span>
            </button>
            <button
              onClick={handleResetWorkflow}
              className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Visual 3-Hop Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {activeHops.map((hop, idx) => {
            const isExecuted = currentStep >= idx;
            const isCurrent = currentStep === idx;
            return (
              <div
                key={idx}
                className={`p-4 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'bg-white shadow-md border-teal-400 ring-2 ring-teal-500/20'
                    : isExecuted
                    ? 'bg-teal-50/50 border-teal-200 text-slate-800'
                    : 'bg-white/70 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 uppercase">
                    Hop {hop.step}
                  </span>
                  {isExecuted && <CheckCircle2 className="w-4 h-4 text-teal-600" />}
                </div>

                <h4 className="text-xs font-bold text-slate-900">{hop.tool}</h4>
                <p className="text-[11px] text-slate-500 mb-2">{hop.server}</p>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {hop.explanation}
                </p>

                {isExecuted && (
                  <div className="mt-3 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Output Result</span>
                    <pre className="text-[11px] font-mono text-slate-700 bg-slate-100 p-2 rounded-lg mt-1 overflow-x-auto">
                      {JSON.stringify(hop.output, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* JSON-RPC 2.0 Live Payload Inspector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Terminal className="w-3.5 h-3.5 text-teal-600" />
            <span>Raw MCP JSON-RPC 2.0 Wire Protocol</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-400">Standardized Schema</span>
        </div>

        <div className="bg-slate-900 text-slate-200 rounded-2xl p-5 font-mono text-xs overflow-x-auto shadow-inner">
          <div className="text-slate-400 mb-2">// Active JSON-RPC 2.0 request sent from AI Client (Antigravity/Claude) to MCP Server:</div>
          <pre className="text-teal-300">
            {currentStep >= 0
              ? JSON.stringify(activeHops[currentStep].rpcRequest, null, 2)
              : JSON.stringify(activeHops[0].rpcRequest, null, 2)}
          </pre>
        </div>
      </div>

    </div>
  );
};
