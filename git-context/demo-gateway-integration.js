#!/usr/bin/env node
/**
 * OpenClaw Gateway Git Context 集成演示
 * 
 * 此脚本演示如何在 OpenClaw Gateway 中集成 Git 上下文注入
 * 
 * 使用方法:
 *   node demo-gateway-integration.js [skill-name]
 * 
 * 示例:
 *   node demo-gateway-integration.js coding-agent
 *   node demo-gateway-integration.js weather
 */

const gitContext = require('./openclaw');
const path = require('path');

// 模拟一个 OpenClaw 会话
function createMockSession(skillName, cwd) {
  return {
    key: `demo-session-${Date.now()}`,
    cwd: cwd || process.cwd(),
    skill: skillName,
    systemPrompt: `# Session Context
 - Session: demo-session
 - Skill: ${skillName}
 - Date: ${new Date().toISOString().split('T')[0]}
 - Working Directory: ${cwd || process.cwd()}

# Project Context
 - Assistant: 小会
 - Memory: ENABLED

# Available Tools
 - read, edit, write, exec, web_search, sessions_spawn

# Instructions
You are a helpful AI assistant running inside OpenClaw.
`,
    messages: [],
  };
}

/**
 * 模拟 Gateway 处理请求
 */
function processRequest(session) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🦞 OpenClaw Gateway - Git Context Integration Demo');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`📨 Processing request for skill: ${session.skill}`);
  console.log(`📁 Working directory: ${session.cwd}`);
  console.log(`🔑 Session key: ${session.key}\n`);
  
  // 检查是否应该注入 Git 上下文
  const shouldInject = gitContext.shouldInjectForSkill(session.skill);
  console.log(`🤔 Should inject Git context? ${shouldInject ? 'YES ✅' : 'NO ❌'}`);
  
  if (shouldInject) {
    console.log('\n📊 Git Context Preview:');
    const preview = gitContext.getContextPreview(session.cwd, session.skill);
    if (preview) {
      console.log(preview);
    } else {
      console.log('  (Not a git repository or no Git context available)');
    }
  }
  
  // 注入 Git 上下文
  console.log('\n📝 Injecting Git context into system prompt...\n');
  const enrichedSession = gitContext.enrichSession(session, session.skill);
  
  // 显示结果
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📤 Output System Prompt');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(enrichedSession.systemPrompt);
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ Request processed successfully');
  console.log(`🔄 Git context injected: ${enrichedSession._gitContextInjected || false}`);
  console.log('═══════════════════════════════════════════════════════════');
  
  return enrichedSession;
}

/**
 * 对比测试：带 Git 上下文 vs 不带 Git 上下文
 */
function runComparisonTest() {
  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║              Comparison Test: Coding vs Weather               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  // Test 1: coding-agent (should inject)
  console.log('Test 1: coding-agent (should inject Git context)');
  console.log('─'.repeat(60));
  const codingSession = createMockSession('coding-agent');
  const enriched1 = processRequest(codingSession);
  const hasGit1 = enriched1.systemPrompt.includes('# Git Context');
  console.log(`Result: ${hasGit1 ? '✅ Git context injected' : '❌ No Git context'}`);
  
  console.log('\n\n');
  
  // Test 2: weather (should NOT inject)
  console.log('Test 2: weather (should NOT inject Git context)');
  console.log('─'.repeat(60));
  const weatherSession = createMockSession('weather');
  const enriched2 = processRequest(weatherSession);
  const hasGit2 = enriched2.systemPrompt.includes('# Git Context');
  console.log(`Result: ${hasGit2 ? '❌ Git context injected (unexpected!)' : '✅ No Git context (expected)'}`);
}

/**
 * 性能测试
 */
function runPerformanceTest() {
  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    Performance Test                           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  const session = createMockSession('coding-agent');
  const iterations = 100;
  
  // 清除缓存
  gitContext.clearCache();
  
  // 测试无缓存情况
  const start1 = Date.now();
  for (let i = 0; i < iterations; i++) {
    gitContext.enrichSession({ ...session, key: `perf-${i}` }, 'coding-agent');
  }
  const time1 = Date.now() - start1;
  
  // 测试有缓存情况 (同一个 session)
  const start2 = Date.now();
  for (let i = 0; i < iterations; i++) {
    gitContext.enrichSession(session, 'coding-agent');
  }
  const time2 = Date.now() - start2;
  
  console.log(`Iterations: ${iterations}`);
  console.log(`No cache (cold): ${time1}ms (${(time1/iterations).toFixed(2)}ms/request)`);
  console.log(`With cache (hot): ${time2}ms (${(time2/iterations).toFixed(2)}ms/request)`);
  console.log(`Speedup: ${(time1/time2).toFixed(1)}x faster with cache`);
}

/**
 * 主函数
 */
function main() {
  const skillName = process.argv[2];
  
  if (skillName === '--compare') {
    runComparisonTest();
  } else if (skillName === '--perf') {
    runPerformanceTest();
  } else if (skillName) {
    const session = createMockSession(skillName);
    processRequest(session);
  } else {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║          OpenClaw Git Context Integration Demo                 ║
╚════════════════════════════════════════════════════════════════╝

Usage:
  node demo-gateway-integration.js [skill-name]
  node demo-gateway-integration.js --compare
  node demo-gateway-integration.js --perf

Examples:
  node demo-gateway-integration.js coding-agent    # With Git context
  node demo-gateway-integration.js weather         # Without Git context
  node demo-gateway-integration.js --compare       # Compare both modes
  node demo-gateway-integration.js --perf          # Performance test
`);
  }
}

main();
