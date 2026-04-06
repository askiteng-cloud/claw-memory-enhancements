/**
 * Summarizer
 * 
 * 生成结构化的对话摘要
 */

const { estimateTextTokens } = require('./token-counter');
const { MessageType } = require('./classifier');

/**
 * 截断文本到指定长度
 * @param {string} text - 原文本
 * @param {number} maxChars - 最大字符数
 * @returns {string} - 截断后的文本
 */
function truncateText(text, maxChars = 200) {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars).trim() + '…';
}

/**
 * 提取消息的关键内容
 * @param {Object} message - 消息对象
 * @returns {string} - 关键内容摘要
 */
function extractMessageSummary(message) {
  const type = message._type;
  
  switch (type) {
    case MessageType.USER:
      return `user: ${truncateText(message.content || message.text, 160)}`;
    
    case MessageType.ASSISTANT:
      return `assistant: ${truncateText(message.content || message.text, 160)}`;
    
    case MessageType.TOOL_USE:
      if (message.tool_calls?.length > 0) {
        const tools = message.tool_calls.map(t => t.function?.name || 'unknown').join(', ');
        return `tool_use: ${tools}`;
      }
      return `tool_use: [unknown]`;
    
    case MessageType.TOOL_RESULT:
    case MessageType.TOOL_RESULT_ERROR:
      const toolName = message.name || message.tool_name || 'unknown';
      const prefix = type === MessageType.TOOL_RESULT_ERROR ? 'error: ' : '';
      return `${prefix}tool_result: ${toolName}`;
    
    case MessageType.SYSTEM:
      return `system: ${truncateText(message.content, 100)}`;
    
    case MessageType.COMPACTION_SUMMARY:
      return 'summary: [previous compaction]';
    
    default:
      return `${type}: ${truncateText(message.content || message.text, 100)}`;
  }
}

/**
 * 提取最近的用户请求
 * @param {Array} messages - 消息列表
 * @param {number} limit - 数量限制
 * @returns {Array} - 用户请求列表
 */
function extractRecentUserRequests(messages, limit = 3) {
  return messages
    .filter(m => m._type === MessageType.USER)
    .slice(-limit)
    .map(m => truncateText(m.content || m.text, 160));
}

/**
 * 提取待办工作
 * @param {Array} messages - 消息列表
 * @param {number} limit - 数量限制
 * @returns {Array} - 待办列表
 */
function extractPendingWork(messages, limit = 3) {
  const keywords = ['todo', 'pending', 'next', 'fixme', 'hack', '等待', '需要', '待办'];
  
  return messages
    .filter(m => {
      const text = (m.content || m.text || '').toLowerCase();
      return keywords.some(kw => text.includes(kw.toLowerCase()));
    })
    .slice(-limit)
    .map(m => truncateText(m.content || m.text, 160));
}

/**
 * 提取工具使用列表
 * @param {Array} messages - 消息列表
 * @returns {Array} - 工具名称列表
 */
function extractToolNames(messages) {
  const tools = new Set();
  
  for (const msg of messages) {
    if (msg._type === MessageType.TOOL_USE && msg.tool_calls) {
      for (const tool of msg.tool_calls) {
        if (tool.function?.name) {
          tools.add(tool.function.name);
        }
      }
    }
    if (msg._type === MessageType.TOOL_RESULT || msg._type === MessageType.TOOL_RESULT_ERROR) {
      if (msg.name || msg.tool_name) {
        tools.add(msg.name || msg.tool_name);
      }
    }
  }
  
  return Array.from(tools).sort();
}

/**
 * 提取引用的文件路径
 * @param {Array} messages - 消息列表
 * @param {number} limit - 数量限制
 * @returns {Array} - 文件路径列表
 */
function extractFileReferences(messages, limit = 8) {
  const files = new Set();
  const filePattern = /[\w\-./]+\.(js|ts|tsx|json|md|py|rs|go|java|cpp|c|h|yaml|yml|toml)/gi;
  
  for (const msg of messages) {
    const text = msg.content || msg.text || '';
    const matches = text.match(filePattern);
    if (matches) {
      matches.forEach(f => files.add(f));
    }
  }
  
  return Array.from(files).slice(0, limit);
}

/**
 * 提取当前工作
 * @param {Array} messages - 消息列表
 * @returns {string|null} - 当前工作描述
 */
function extractCurrentWork(messages) {
  // 从最近的消息中提取
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg._type === MessageType.USER || msg._type === MessageType.ASSISTANT) {
      const text = msg.content || msg.text;
      if (text?.trim()) {
        return truncateText(text, 200);
      }
    }
  }
  return null;
}

/**
 * 生成消息时间线
 * @param {Array} messages - 消息列表
 * @returns {Array} - 时间线列表
 */
function generateTimeline(messages) {
  return messages.map(m => {
    const role = m._type.replace('_', ' ');
    const summary = extractMessageSummary(m);
    return `  - ${summary}`;
  });
}

/**
 * 生成结构化摘要
 * @param {Array} messages - 要压缩的消息列表
 * @param {Object} stats - 统计信息
 * @returns {string} - XML 格式的摘要
 */
function generateSummary(messages, stats) {
  const {
    userCount = 0,
    assistantCount = 0,
    toolCount = 0,
    totalCount = 0,
  } = stats;
  
  const lines = [
    '<summary>',
    'Conversation summary:',
    `- Scope: ${totalCount} messages compacted (user=${userCount}, assistant=${assistantCount}, tool=${toolCount}).`,
  ];
  
  // 工具使用
  const tools = extractToolNames(messages);
  if (tools.length > 0) {
    lines.push(`- Tools mentioned: ${tools.join(', ')}.`);
  }
  
  // 最近用户请求
  const recentRequests = extractRecentUserRequests(messages, 3);
  if (recentRequests.length > 0) {
    lines.push('- Recent user requests:');
    recentRequests.forEach(req => lines.push(`  - ${req}`));
  }
  
  // 待办工作
  const pending = extractPendingWork(messages, 3);
  if (pending.length > 0) {
    lines.push('- Pending work:');
    pending.forEach(item => lines.push(`  - ${item}`));
  }
  
  // 引用的文件
  const files = extractFileReferences(messages, 8);
  if (files.length > 0) {
    lines.push(`- Key files referenced: ${files.join(', ')}.`);
  }
  
  // 当前工作
  const currentWork = extractCurrentWork(messages);
  if (currentWork) {
    lines.push(`- Current work: ${currentWork}`);
  }
  
  // 时间线
  lines.push('- Key timeline:');
  lines.push(...generateTimeline(messages));
  
  lines.push('</summary>');
  
  return lines.join('\n');
}

/**
 * 合并多个摘要
 * @param {string} existingSummary - 已存在的摘要
 * @param {string} newSummary - 新摘要
 * @returns {string} - 合并后的摘要
 */
function mergeSummaries(existingSummary, newSummary) {
  if (!existingSummary) return newSummary;
  
  const lines = [
    '<summary>',
    'Conversation summary:',
    '- Previously compacted context:',
  ];
  
  // 提取旧摘要的关键信息
  const prevContent = existingSummary
    .replace(/<summary>/g, '')
    .replace(/<\/summary>/g, '')
    .trim()
    .split('\n')
    .slice(1) // 跳过标题
    .map(l => `  ${l.trim()}`);
  
  lines.push(...prevContent);
  lines.push('');
  lines.push('- Newly compacted context:');
  
  // 提取新摘要的关键信息
  const newContent = newSummary
    .replace(/<summary>/g, '')
    .replace(/<\/summary>/g, '')
    .trim()
    .split('\n')
    .slice(1)
    .map(l => `  ${l.trim()}`);
  
  lines.push(...newContent);
  lines.push('</summary>');
  
  return lines.join('\n');
}

module.exports = {
  truncateText,
  extractMessageSummary,
  extractRecentUserRequests,
  extractPendingWork,
  extractToolNames,
  extractFileReferences,
  extractCurrentWork,
  generateTimeline,
  generateSummary,
  mergeSummaries,
};
