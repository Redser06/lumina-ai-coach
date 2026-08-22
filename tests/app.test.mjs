import test from 'node:test';
import assert from 'node:assert/strict';

// Test Curriculum Data
import { CURRICULUM_TRACKS } from '../src/data/curriculumData.ts';
import { AI_NEWS_ITEMS } from '../src/data/newsData.ts';
import { AI_TOOLS_CATALOG } from '../src/data/toolsData.ts';
import { DIAGNOSTIC_QUESTIONS } from '../src/data/diagnosticQuestions.ts';
import { generateCoachResponse } from '../src/data/coachKnowledge.ts';

test('Curriculum Tracks Integrity', () => {
  assert.ok(CURRICULUM_TRACKS.length >= 4, 'Should have at least 4 curriculum tracks');
  
  for (const track of CURRICULUM_TRACKS) {
    assert.ok(track.id, 'Track must have an ID');
    assert.ok(track.title, 'Track must have a title');
    assert.ok(track.lessons.length > 0, `Track ${track.id} must have lessons`);

    for (const lesson of track.lessons) {
      assert.ok(lesson.id, 'Lesson must have an ID');
      assert.ok(lesson.title, 'Lesson must have a title');
      assert.ok(lesson.overview, 'Lesson must have an overview');
      assert.ok(lesson.keyConcepts.length > 0, 'Lesson must have key concepts');
      assert.ok(lesson.quiz, 'Lesson must have a quiz');
      assert.ok(lesson.quiz.options.length >= 2, 'Quiz must have options');
      
      const correctOptions = lesson.quiz.options.filter(o => o.isCorrect);
      assert.strictEqual(correctOptions.length, 1, `Lesson ${lesson.id} quiz must have exactly 1 correct option`);
    }
  }
});

test('AI News Feed Integrity & Role Impacts', () => {
  assert.ok(AI_NEWS_ITEMS.length >= 5, 'Should have at least 5 news items');
  
  const requiredRoles = ['software_engineer', 'product_manager', 'data_ops', 'business_analyst', 'executive'];

  for (const news of AI_NEWS_ITEMS) {
    assert.ok(news.id, 'News item must have an ID');
    assert.ok(news.title, 'News item must have a title');
    assert.ok(news.summary, 'News item must have a summary');
    assert.ok(news.keyTakeaways.length >= 2, 'News item must have key takeaways');
    assert.ok(news.roleImpacts, 'News item must have roleImpacts map');

    for (const role of requiredRoles) {
      assert.ok(news.roleImpacts[role], `News ${news.id} missing impact for role ${role}`);
      assert.ok(news.roleImpacts[role].length > 10, `Role impact text should be meaningful for ${role}`);
    }
  }
});

test('AI Tools & Models Catalog Integrity', () => {
  assert.ok(AI_TOOLS_CATALOG.length >= 6, 'Should have at least 6 tools/models');
  
  for (const tool of AI_TOOLS_CATALOG) {
    assert.ok(tool.id, 'Tool must have an ID');
    assert.ok(tool.name, 'Tool must have a name');
    assert.ok(tool.vendor, 'Tool must have a vendor');
    assert.ok(tool.description, 'Tool must have a description');
    assert.ok(tool.keyStrengths.length > 0, 'Tool must have key strengths');
    assert.ok(tool.cheatsheetTips.length > 0, 'Tool must have cheatsheet tips');
    assert.ok(tool.docUrl.startsWith('http'), 'Tool must have a valid doc URL');
  }
});

test('Diagnostic Questions Calibration', () => {
  assert.ok(DIAGNOSTIC_QUESTIONS.length >= 3, 'Should have at least 3 diagnostic questions');

  for (const q of DIAGNOSTIC_QUESTIONS) {
    assert.ok(q.id, 'Question must have an ID');
    assert.ok(q.question, 'Question must have text');
    assert.ok(q.options.length >= 3, 'Question must have at least 3 options');
    for (const opt of q.options) {
      assert.ok(opt.text, 'Option must have text');
      assert.ok(opt.levelPoints, 'Option must have levelPoints map');
    }
  }
});

test('AI Coach Response Generation', () => {
  // Test Agent Loop query
  const loopResponse = generateCoachResponse('How do I build an agent loop that self heals?', 'software_engineer');
  assert.strictEqual(loopResponse.sender, 'coach');
  assert.ok(loopResponse.content.includes('Autonomous Agent Loops') || loopResponse.content.includes('ReAct'));
  assert.strictEqual(loopResponse.actionLink?.subView, 'agent_loop');

  // Test MCP query
  const mcpResponse = generateCoachResponse('What is an MCP server and how do I chain tools?', 'product_manager');
  assert.strictEqual(mcpResponse.sender, 'coach');
  assert.ok(mcpResponse.content.includes('Model Context Protocol'));
  assert.strictEqual(mcpResponse.actionLink?.subView, 'mcp_chaining');

  // Test StateGraph query
  const graphResponse = generateCoachResponse('Explain LangGraph multi-agent supervisor graphs', 'data_ops');
  assert.strictEqual(graphResponse.sender, 'coach');
  assert.ok(graphResponse.content.includes('State Graph'));
  assert.strictEqual(graphResponse.actionLink?.subView, 'graph_builder');

  // Test Evals query
  const evalResponse = generateCoachResponse('How do I set up LLM as a judge evals?', 'business_analyst');
  assert.strictEqual(evalResponse.sender, 'coach');
  assert.ok(evalResponse.content.includes('AI Evals') || evalResponse.content.includes('LLM-as-a-Judge'));
  assert.strictEqual(evalResponse.actionLink?.subView, 'evals_matrix');
});
