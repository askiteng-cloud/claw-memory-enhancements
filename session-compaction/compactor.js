/**
 * Session Compactor
 * 
 * 核心压缩引擎，协调各个组件完成会话压缩
 */

const {
  estimateSessionTokens,
  estimateMessageTokens,
  getCompactStartIndex,
} = require('./token-counter');

const {
  classifySession,
  countByType,
  shouldPreserve,
  MessageType,
} = require('./classifier');

const {
  generateSummary,
  mergeSummaries,
} = require('./summarizer');

/**
 * 默认配置
 */
const DEFAULT_CONFIG = {
  enabled: true,
  triggerThreshold: 0.70,      // 70% 上下文窗口
  preserveRecent: 6,           // 保留最近 6 条
  preserveErrors: true,        // 保留错误
  maxSummaryLength: 4000,      // 摘要最大长度
  format: 'xml',               // 输出格式
};

/**
 * 加载配置
 */
function loadConfig() {
  const path = require('path');
  const fs = require('fs');
  
  const configPath = path.join(
    process.env.OPENCLAW_HOME || process.cwd(),
    'config',
    'compaction.json'
  );
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return { ...DEFAULT_CONFIG, ...(config.compaction || {}) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * 检查是否需要压缩
 * @param {Array} messages - 消息列表
 * @param {number} contextWindow - 上下文窗口大小
 * @param {Object} config - 配置
 * @returns {boolean} - 是否需要压缩
 */
function shouldCompact(messages, contextWindow = 128000, config = DEFAULT_CONFIG) {
  if (!config.enabled) return false;
  if (!Array.isArray(messages) || messages.length === 0) return false;
  
  const tokens = estimateSessionTokens(messages);
  const threshold = contextWindow * config.triggerThreshold;
  
  return tokens >= threshold;
}

/**
 * 检查是否需要压缩（基于已知的 token 数）
 * @param {number} currentTokens - 当前 token 数
 * @param {number} contextWindow - 上下文窗口大小
 * @param {Object} config - 配置
 * @returns {boolean} - 是否需要压缩
 */
function shouldCompactByTokens(currentTokens, contextWindow = 128000, config = DEFAULT_CONFIG) {
  if (!config.enabled) return false;
  
  const threshold = contextWindow * config.triggerThreshold;
  return currentTokens >= threshold;
}

/**
 * 压缩会话
 * @param {Array} messages - 消息列表
 * @param {Object} config - 配置
 * @returns {Object} - 压缩结果
 */
function compactSession(messages, config = DEFAULT_CONFIG) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return {
      messages,
      summary: null,
      removedCount: 0,
      preservedCount: messages.length,
      compacted: false,
    };
  }
  
  // 分类消息
  const classified = classifySession(messages);
  
  // 找出已存在的摘要
  const existingSummaryIndex = classified.findIndex(
    m => m._type === MessageType.COMPACTION_SUMMARY
  );
  
  // 确定保留范围
  const preserveFrom = Math.max(
    existingSummaryIndex + 1,
    classified.length - config.preserveRecent
  );
  
  // 分离要保留和要压缩的消息
  const toCompress = [];
  const toPreserve = [];
  
  for (let i = 0; i < classified.length; i++) {
    const msg = classified[i];
    
    // 始终保留已存在的摘要
    if (i === existingSummaryIndex) {
      continue; // 稍后处理
    }
    
    // 检查是否应该保留
    if (i >= preserveFrom || shouldPreserve(msg, config)) {
      // 移除内部标记
      const { _index, _type, ...cleanMsg } = msg;
      toPreserve.push(cleanMsg);
    } else {
      toCompress.push(msg);
    }
  }
  
  // 如果没有需要压缩的消息，返回原样
  if (toCompress.length === 0) {
    return {
      messages,
      summary: existingSummaryIndex >= 0 
        ? messages[existingSummaryIndex].content 
        : null,
      removedCount: 0,
      preservedCount: messages.length,
      compacted: false,
    };
  }
  
  // 统计信息
  const stats = countByType(toCompress);
  stats.totalCount = toCompress.length;
  
  // 生成新摘要
  let newSummary = generateSummary(toCompress, stats);
  
  // 合并已存在的摘要
  if (existingSummaryIndex >= 0) {
    const existingSummary = messages[existingSummaryIndex].content;
    newSummary = mergeSummaries(existingSummary, newSummary);
  }
  
  // 截断摘要（如果太长）
  if (newSummary.length > config.maxSummaryLength) {
    newSummary = newSummary.slice(0, config.maxSummaryLength) + '\n... [truncated]';
  }
  
  // 保存长效记忆到本地文件 (Long-term memory persistence)
  try {
    const fs = require('fs');
    const path = require('path');
    const memoryDir = path.join(process.env.OPENCLAW_HOME || process.cwd(), 'memory');
    if (!fs.existsSync(memoryDir)) {
      fs.mkdirSync(memoryDir, { recursive: true });
    }
    const memoryFile = path.join(memoryDir, 'long-term-memory.md');
    const timestamp = new Date().toISOString();
    const memoryContent = `## Compaction [${timestamp}]\n\n${newSummary}\n\n`;
    fs.appendFileSync(memoryFile, memoryContent, 'utf8');
  } catch (e) {
    // 忽略写入失败
  }
  
  // 构建新的消息列表
  const compactedMessages = [
    {
      role: 'system',
      content: newSummary,
      _isCompactionSummary: true,
    },
    ...toPreserve,
  ];
  
  return {
    messages: compactedMessages,
    summary: newSummary,
    removedCount: toCompress.length,
    preservedCount: toPreserve.length,
    compacted: true,
    stats,
  };
}

/**
 * 自动压缩检查并执行
 * @param {Array} messages - 消息列表
 * @param {number} contextWindow - 上下文窗口大小
 * @param {number} currentTokens - 当前 token 数（可选，不传则自动计算）
 * @returns {Object} - 压缩结果
 */
function autoCompact(messages, contextWindow = 128000, currentTokens = null) {
  const config = loadConfig();
  
  // 计算当前 token 数
  const tokens = currentTokens ?? estimateSessionTokens(messages);
  
  // 检查是否需要压缩
  if (!shouldCompactByTokens(tokens, contextWindow, config)) {
    return {
      messages,
      summary: null,
      removedCount: 0,
      preservedCount: messages.length,
      compacted: false,
      reason: 'Token count below threshold',
      tokens,
      threshold: contextWindow * config.triggerThreshold,
    };
  }
  
  // 执行压缩
  const result = compactSession(messages, config);
  result.tokens = tokens;
  result.threshold = contextWindow * config.triggerThreshold;
  
  return result;
}

/**
 * 格式化压缩结果供显示
 * @param {Object} result - 压缩结果
 * @returns {string} - 格式化字符串
 */
function formatCompactionResult(result) {
  if (!result.compacted) {
    return `No compaction needed. ${result.reason || ''}`;
  }
  
  const lines = [
    '✅ Session compacted',
    `   Removed: ${result.removedCount} messages`,
    `   Preserved: ${result.preservedCount} messages`,
    `   Summary length: ${result.summary?.length || 0} chars`,
  ];
  
  if (result.stats) {
    lines.push(`   Stats: user=${result.stats[MessageType.USER]}, ` +
               `assistant=${result.stats[MessageType.ASSISTANT]}, ` +
               `tool=${result.stats[MessageType.TOOL_RESULT] + result.stats[MessageType.TOOL_USE]}`);
  }
  
  return lines.join('\n');
}

module.exports = {
  DEFAULT_CONFIG,
  loadConfig,
  shouldCompact,
  shouldCompactByTokens,
  compactSession,
  autoCompact,
  formatCompactionResult,
};
