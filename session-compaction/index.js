/**
 * Session Compaction Skill - Main Entry
 * 
 * 会话压缩引擎入口文件
 */

const {
  loadConfig,
  shouldCompact,
  shouldCompactByTokens,
  compactSession,
  autoCompact,
  formatCompactionResult,
  DEFAULT_CONFIG,
} = require('./compactor');

const {
  estimateSessionTokens,
  estimateMessageTokens,
} = require('./token-counter');

const {
  classifySession,
  classifyMessage,
  MessageType,
} = require('./classifier');

const {
  generateSummary,
  mergeSummaries,
} = require('./summarizer');

/**
 * 压缩会话的主接口
 * @param {Array} messages - 消息列表
 * @param {Object} options - 选项
 * @returns {Object} - 压缩结果
 */
function compact(messages, options = {}) {
  const config = { ...loadConfig(), ...options };
  return compactSession(messages, config);
}

/**
 * 检查并自动压缩
 * @param {Array} messages - 消息列表
 * @param {Object} options - 选项
 * @returns {Object} - 压缩结果
 */
function maybeCompact(messages, options = {}) {
  const config = { ...loadConfig(), ...options };
  const contextWindow = options.contextWindow || 128000;
  const currentTokens = options.currentTokens || estimateSessionTokens(messages);
  
  return autoCompact(messages, contextWindow, currentTokens);
}

/**
 * 获取会话统计信息
 * @param {Array} messages - 消息列表
 * @returns {Object} - 统计信息
 */
function getStats(messages) {
  const tokens = estimateSessionTokens(messages);
  const classified = classifySession(messages);
  
  const typeCount = {};
  for (const type of Object.values(MessageType)) {
    typeCount[type] = classified.filter(m => m._type === type).length;
  }
  
  return {
    messageCount: messages.length,
    estimatedTokens: tokens,
    typeCount,
  };
}

/**
 * 格式化统计信息
 * @param {Object} stats - 统计信息
 * @returns {string} - 格式化字符串
 */
function formatStats(stats) {
  return [
    `Messages: ${stats.messageCount}`,
    `Estimated tokens: ${stats.estimatedTokens}`,
    `Types: user=${stats.typeCount[MessageType.USER]}, ` +
           `assistant=${stats.typeCount[MessageType.ASSISTANT]}, ` +
           `tool_use=${stats.typeCount[MessageType.TOOL_USE]}, ` +
           `tool_result=${stats.typeCount[MessageType.TOOL_RESULT] + stats.typeCount[MessageType.TOOL_RESULT_ERROR]}`,
  ].join('\n');
}

module.exports = {
  // 主接口
  compact,
  maybeCompact,
  getStats,
  formatStats,
  
  // 底层功能
  loadConfig,
  shouldCompact,
  shouldCompactByTokens,
  compactSession,
  autoCompact,
  formatCompactionResult,
  
  // Token 计数
  estimateSessionTokens,
  estimateMessageTokens,
  
  // 分类
  classifySession,
  classifyMessage,
  MessageType,
  
  // 摘要
  generateSummary,
  mergeSummaries,
  
  // 常量
  DEFAULT_CONFIG,
};
