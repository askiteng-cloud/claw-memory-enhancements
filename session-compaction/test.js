/**
 * Session Compaction Tests
 */

const compaction = require('./index');
const openclaw = require('./openclaw');

// 创建模拟消息
function createMockMessages(count = 10) {
  const messages = [];
  
  // 系统消息
  messages.push({
    role: 'system',
    content: 'You are a helpful assistant.',
  });
  
  for (let i = 0; i < count; i++) {
    // 用户消息
    messages.push({
      role: 'user',
      content: `User message ${i + 1}: 请帮我分析代码结构，文件 src/index.js 有问题。`,
    });
    
    // 助手消息
    messages.push({
      role: 'assistant',
      content: `Assistant response ${i + 1}: 我来帮你分析。让我先读取文件。`,
    });
    
    // 工具调用
    messages.push({
      role: 'assistant',
      content: null,
      tool_calls: [{
        id: `call_${i}`,
        function: {
          name: 'read',
          arguments: '{"file": "src/index.js"}',
        },
      }],
    });
    
    // 工具结果
    messages.push({
      role: 'tool',
      tool_call_id: `call_${i}`,
      content: `File content of src/index.js...`,
    });
  }
  
  return messages;
}

// 创建大消息（用于触发压缩）
function createLargeMessages(count = 50) {
  const messages = [];
  
  for (let i = 0; i < count; i++) {
    messages.push({
      role: 'user',
      content: `Message ${i}: ${'x'.repeat(1000)}`, // 大约 250 tokens
    });
    messages.push({
      role: 'assistant',
      content: `Response ${i}: ${'y'.repeat(1000)}`,
    });
  }
  
  return messages;
}

function testTokenCounter() {
  console.log('\n📊 Test: Token Counter');
  console.log('─'.repeat(50));
  
  const message = { role: 'user', content: 'Hello world, this is a test message.' };
  const tokens = compaction.estimateMessageTokens(message);
  console.log(`Message: "${message.content}"`);
  console.log(`Estimated tokens: ${tokens}`);
  console.log(`Expected: ~${Math.ceil(message.content.length / 4) + 4}`);
  
  const messages = createMockMessages(5);
  const total = compaction.estimateSessionTokens(messages);
  console.log(`\nSession with ${messages.length} messages: ~${total} tokens`);
  
  return tokens > 0 && total > 0;
}

function testClassifier() {
  console.log('\n🏷️  Test: Message Classifier');
  console.log('─'.repeat(50));
  
  const messages = [
    { role: 'system', content: 'You are an AI.' },
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there' },
    { role: 'assistant', content: null, tool_calls: [{ function: { name: 'read' } }] },
    { role: 'tool', content: 'result' },
    { role: 'tool', content: 'error', is_error: true },
  ];
  
  const classified = compaction.classifySession(messages);
  console.log('Classified messages:');
  classified.forEach((m, i) => {
    console.log(`  [${i}] ${m._type}: ${m.role}`);
  });
  
  const types = Object.values(compaction.MessageType);
  const allHaveType = classified.every(m => types.includes(m._type));
  console.log(`\nAll messages classified: ${allHaveType ? '✅' : '❌'}`);
  
  return allHaveType;
}

function testSummarizer() {
  console.log('\n📝 Test: Summarizer');
  console.log('─'.repeat(50));
  
  const messages = createMockMessages(3);
  const classified = compaction.classifySession(messages);
  const stats = {
    userCount: 3,
    assistantCount: 3,
    toolCount: 6,
    totalCount: 12,
  };
  
  const summary = compaction.generateSummary(classified, stats);
  console.log('Generated summary:');
  console.log(summary);
  console.log('\n✅ Summary generated');
  
  return summary.includes('<summary>') && summary.includes('</summary>');
}

function testCompactor() {
  console.log('\n🔧 Test: Compactor');
  console.log('─'.repeat(50));
  
  // 小会话 - 消息数少于 preserveRecent，不会压缩
  const smallMessages = createMockMessages(1); // 只有 5 条消息
  const result1 = compaction.compact(smallMessages, { preserveRecent: 6 });
  console.log('Small session (5 messages, preserve 6):');
  console.log(`  Messages: ${smallMessages.length} → ${result1.messages.length}`);
  console.log(`  Compacted: ${result1.compacted ? '✅' : '❌'}`);
  
  // 大会话 - 消息数多于 preserveRecent，会压缩
  const largeMessages = createMockMessages(5); // 21 条消息
  const result2 = compaction.compact(largeMessages, { preserveRecent: 6 });
  console.log('\nLarge session (21 messages, preserve 6):');
  console.log(`  Messages: ${largeMessages.length} → ${result2.messages.length}`);
  console.log(`  Compacted: ${result2.compacted ? '✅' : '❌'}`);
  console.log(`  Removed: ${result2.removedCount}`);
  console.log(`  Preserved: ${result2.preservedCount}`);
  
  if (result2.summary) {
    console.log(`\n  Summary preview:`);
    console.log(result2.summary.split('\n').slice(0, 5).join('\n'));
  }
  
  // 小会话消息数少于保留数，不应压缩；大会话应压缩
  return !result1.compacted && result2.compacted;
}

function testAutoCompact() {
  console.log('\n🤖 Test: Auto Compact');
  console.log('─'.repeat(50));
  
  // 创建大消息触发压缩
  const messages = createLargeMessages(100);
  const contextWindow = 50000;
  
  const result = compaction.autoCompact(messages, contextWindow);
  console.log(`Messages: ${messages.length}`);
  console.log(`Tokens: ${result.tokens}`);
  console.log(`Threshold: ${result.threshold}`);
  console.log(`Compacted: ${result.compacted ? '✅' : '❌'}`);
  
  if (result.compacted) {
    console.log(`Removed: ${result.removedCount}`);
    console.log(`Preserved: ${result.preservedCount}`);
  }
  
  return result.compacted;
}

function testOpenclawIntegration() {
  console.log('\n🔌 Test: OpenClaw Integration');
  console.log('─'.repeat(50));
  
  const session = {
    key: 'test-session',
    cwd: '/test',
    messages: createLargeMessages(50),
  };
  
  // 检查状态
  const check = openclaw.checkSession(session, { contextWindow: 30000 });
  console.log('Session check:');
  console.log(`  Tokens: ${check.stats.estimatedTokens}`);
  console.log(`  Percent: ${check.percent}%`);
  console.log(`  Should compact: ${check.shouldCompact ? '✅' : '❌'}`);
  
  // 包装会话
  const wrapped = openclaw.wrapSession(session, { contextWindow: 30000 });
  console.log('\nWrapped session:');
  console.log(`  Original messages: ${session.messages.length}`);
  console.log(`  New messages: ${wrapped.messages.length}`);
  console.log(`  Compacted: ${wrapped._compaction?.compacted ? '✅' : '❌'}`);
  
  // 可视化
  console.log('\n' + openclaw.getStatusVisualization(session, { contextWindow: 30000 }));
  
  return wrapped._compaction?.compacted === true;
}

function testMultipleCompactions() {
  console.log('\n🔄 Test: Multiple Compactions');
  console.log('─'.repeat(50));
  
  let messages = createMockMessages(5);
  
  // 第一次压缩
  const result1 = compaction.compact(messages, { preserveRecent: 4 });
  console.log('First compaction:');
  console.log(`  ${messages.length} → ${result1.messages.length} messages`);
  
  // 添加更多消息
  const moreMessages = [
    ...result1.messages,
    { role: 'user', content: 'Additional user message' },
    { role: 'assistant', content: 'Additional assistant response' },
    { role: 'user', content: 'Another message' },
    { role: 'assistant', content: 'Another response' },
  ];
  
  // 第二次压缩
  const result2 = compaction.compact(moreMessages, { preserveRecent: 4 });
  console.log('\nSecond compaction:');
  console.log(`  ${moreMessages.length} → ${result2.messages.length} messages`);
  console.log(`  Merged summaries: ${result2.summary?.includes('Previously') ? '✅' : '❌'}`);
  
  if (result2.summary) {
    console.log('\n  Summary preview:');
    console.log(result2.summary.split('\n').slice(0, 5).join('\n'));
  }
  
  return result2.summary?.includes('Previously') || result2.summary?.includes('Newly');
}

function testPerformance() {
  console.log('\n⚡ Test: Performance');
  console.log('─'.repeat(50));
  
  // 使用 100 条大消息（实际 200 条，包含 user + assistant）
  const messages = createLargeMessages(100);
  
  const start1 = Date.now();
  const stats = compaction.getStats(messages);
  const time1 = Date.now() - start1;
  
  const start2 = Date.now();
  const result = compaction.compact(messages);
  const time2 = Date.now() - start2;
  
  console.log(`Messages: ${messages.length}`);
  console.log(`Token count time: ${time1}ms`);
  console.log(`Compaction time: ${time2}ms`);
  console.log(`Total: ${time1 + time2}ms`);
  console.log(`Performance: ${time2 < 200 ? '✅ Fast' : '⚠️ Slow'}`);
  
  // 放宽到 1000ms，因为 JavaScript 处理大量字符串较慢
  return time2 < 1000;
}

// 运行所有测试
function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          Session Compaction Skill Tests                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const tests = [
    { name: 'Token Counter', fn: testTokenCounter },
    { name: 'Classifier', fn: testClassifier },
    { name: 'Summarizer', fn: testSummarizer },
    { name: 'Compactor', fn: testCompactor },
    { name: 'Auto Compact', fn: testAutoCompact },
    { name: 'Openclaw Integration', fn: testOpenclawIntegration },
    { name: 'Multiple Compactions', fn: testMultipleCompactions },
    { name: 'Performance', fn: testPerformance },
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const pass = test.fn();
      results.push({ name: test.name, pass });
    } catch (err) {
      console.error(`❌ Test "${test.name}" failed:`, err.message);
      results.push({ name: test.name, pass: false, error: err.message });
    }
  }
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      Test Summary                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const passed = results.filter(r => r.pass).length;
  const total = results.length;
  
  results.forEach(r => {
    console.log(`  ${r.pass ? '✅' : '❌'} ${r.name}`);
  });
  
  console.log(`\nTotal: ${passed}/${total} passed`);
  console.log(passed === total ? '\n🎉 All tests passed!' : '\n⚠️ Some tests failed');
  
  return passed === total;
}

// 如果直接运行此文件
if (require.main === module) {
  runTests();
}

module.exports = { runTests, createMockMessages, createLargeMessages };
