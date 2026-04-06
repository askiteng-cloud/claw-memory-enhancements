#!/usr/bin/env node
/**
 * Session Compaction Demo
 * 
 * 演示会话压缩引擎的工作流程
 */

const compaction = require('./index');
const openclaw = require('./openclaw');

// 创建模拟会话
function createDemoSession(messageCount = 50) {
  const messages = [];
  
  // 系统消息
  messages.push({
    role: 'system',
    content: 'You are a helpful AI assistant.',
  });
  
  for (let i = 0; i < messageCount; i++) {
    // 用户询问
    messages.push({
      role: 'user',
      content: `User ${i + 1}: 请帮我实现功能 ${i + 1}，文件在 src/feature${i + 1}.js`,
    });
    
    // AI 响应
    messages.push({
      role: 'assistant',
      content: `好的，我来帮你实现功能 ${i + 1}。让我先查看文件。`,
    });
    
    // 工具调用
    messages.push({
      role: 'assistant',
      content: null,
      tool_calls: [{
        id: `call_${i}`,
        function: {
          name: 'read',
          arguments: `{"file": "src/feature${i + 1}.js"}`,
        },
      }],
    });
    
    // 工具结果
    messages.push({
      role: 'tool',
      tool_call_id: `call_${i}`,
      content: `// Feature ${i + 1} code\nfunction feature${i + 1}() {\n  return ${i + 1};\n}`,
    });
    
    // AI 完成
    messages.push({
      role: 'assistant',
      content: `已经完成了功能 ${i + 1} 的实现。代码已保存。`,
    });
  }
  
  return messages;
}

function runDemo() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║              Session Compaction Engine Demo                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  // 1. 创建会话
  console.log('📊 Step 1: Creating demo session');
  console.log('─'.repeat(60));
  const messages = createDemoSession(10);
  console.log(`Created session with ${messages.length} messages`);
  
  // 2. 统计信息
  console.log('\n📈 Step 2: Session Statistics');
  console.log('─'.repeat(60));
  const stats = compaction.getStats(messages);
  console.log(compaction.formatStats(stats));
  
  // 3. 检查是否需要压缩
  console.log('\n🔍 Step 3: Check Compaction Need');
  console.log('─'.repeat(60));
  const contextWindow = 50000; // 模拟 50k 上下文窗口
  const shouldCompact = compaction.shouldCompact(messages, contextWindow);
  const percent = Math.round((stats.estimatedTokens / contextWindow) * 100);
  console.log(`Context window: ${contextWindow} tokens`);
  console.log(`Current usage: ${stats.estimatedTokens} tokens (${percent}%)`);
  console.log(`Threshold: ${contextWindow * 0.7} tokens (70%)`);
  console.log(`Need compaction: ${shouldCompact ? 'YES ✅' : 'NO ❌'}`);
  
  // 4. 可视化
  console.log('\n' + openclaw.getStatusVisualization(
    { messages },
    { contextWindow }
  ));
  
  // 5. 执行压缩
  if (shouldCompact) {
    console.log('\n🗜️  Step 4: Executing Compaction');
    console.log('─'.repeat(60));
    
    const result = compaction.compact(messages, { preserveRecent: 6 });
    
    console.log(`Original messages: ${messages.length}`);
    console.log(`Compacted messages: ${result.messages.length}`);
    console.log(`Removed: ${result.removedCount}`);
    console.log(`Preserved: ${result.preservedCount}`);
    console.log(`Compression ratio: ${Math.round((1 - result.messages.length / messages.length) * 100)}%`);
    
    // 6. 显示摘要
    console.log('\n📝 Step 5: Generated Summary');
    console.log('─'.repeat(60));
    console.log(result.summary);
    
    // 7. 新会话统计
    console.log('\n📊 Step 6: New Session Statistics');
    console.log('─'.repeat(60));
    const newStats = compaction.getStats(result.messages);
    console.log(compaction.formatStats(newStats));
    console.log(`\nToken reduction: ${stats.estimatedTokens} → ${newStats.estimatedTokens} ` +
                `(${Math.round((1 - newStats.estimatedTokens / stats.estimatedTokens) * 100)}% saved)`);
  }
  
  // 8. 多次压缩演示
  console.log('\n🔄 Step 7: Multiple Compactions Demo');
  console.log('─'.repeat(60));
  
  let currentMessages = messages.slice();
  
  for (let round = 1; round <= 3; round++) {
    // 添加新消息
    currentMessages.push({
      role: 'user',
      content: `New user message ${round}: 继续工作`,
    });
    currentMessages.push({
      role: 'assistant',
      content: `New assistant response ${round}: 好的，继续`,
    });
    
    // 压缩
    const result = compaction.compact(currentMessages, { preserveRecent: 6 });
    
    console.log(`\nRound ${round}:`);
    console.log(`  Messages: ${currentMessages.length} → ${result.messages.length}`);
    console.log(`  Compacted: ${result.compacted ? 'YES' : 'NO'}`);
    
    if (result.compacted) {
      console.log(`  Has merged summary: ${result.summary?.includes('Previously') ? 'YES' : 'NO'}`);
    }
    
    currentMessages = result.messages;
  }
  
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                      Demo Complete!                            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
}

// 运行演示
runDemo();
