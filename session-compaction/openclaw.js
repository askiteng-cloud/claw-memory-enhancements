/**
 * OpenClaw Session Compaction Integration
 * 
 * 与 OpenClaw 集成的专用接口
 */

const compaction = require('./index');

/**
 * 默认配置
 */
const DEFAULT_CONTEXT_WINDOW = 128000; // kimi/k2p5 的上下文窗口

/**
 * 包装 OpenClaw 会话，添加自动压缩功能
 * 
 * @param {Object} session - OpenClaw 会话对象
 * @param {Object} options - 选项
 * @returns {Object} - 包装后的会话
 */
function wrapSession(session, options = {}) {
  const contextWindow = options.contextWindow || DEFAULT_CONTEXT_WINDOW;
  const config = compaction.loadConfig();
  
  if (!config.enabled) {
    return session;
  }
  
  // 获取消息列表
  const messages = session.messages || [];
  
  // 检查是否需要压缩
  const stats = compaction.getStats(messages);
  const shouldCompact = compaction.shouldCompactByTokens(
    stats.estimatedTokens,
    contextWindow,
    config
  );
  
  if (!shouldCompact) {
    return {
      ...session,
      _compaction: {
        checked: true,
        compacted: false,
        tokens: stats.estimatedTokens,
        threshold: contextWindow * config.triggerThreshold,
        percent: Math.round((stats.estimatedTokens / contextWindow) * 100),
      },
    };
  }
  
  // 执行压缩
  const result = compaction.autoCompact(messages, contextWindow, stats.estimatedTokens);
  
  return {
    ...session,
    messages: result.messages,
    _compaction: {
      checked: true,
      compacted: result.compacted,
      tokens: stats.estimatedTokens,
      threshold: contextWindow * config.triggerThreshold,
      percent: Math.round((stats.estimatedTokens / contextWindow) * 100),
      removedCount: result.removedCount,
      preservedCount: result.preservedCount,
      summary: result.summary,
    },
  };
}

/**
 * 检查会话状态并返回压缩建议
 * 
 * @param {Object} session - OpenClaw 会话对象
 * @param {Object} options - 选项
 * @returns {Object} - 状态和建议
 */
function checkSession(session, options = {}) {
  const contextWindow = options.contextWindow || DEFAULT_CONTEXT_WINDOW;
  const config = compaction.loadConfig();
  
  const messages = session.messages || [];
  const stats = compaction.getStats(messages);
  
  const threshold = contextWindow * config.triggerThreshold;
  const shouldCompact = stats.estimatedTokens >= threshold;
  
  return {
    stats,
    contextWindow,
    threshold,
    shouldCompact,
    percent: Math.round((stats.estimatedTokens / contextWindow) * 100),
    status: shouldCompact ? 'warning' : 'ok',
    message: shouldCompact 
      ? `Session at ${Math.round((stats.estimatedTokens / contextWindow) * 100)}% of context window. Compaction recommended.`
      : `Session at ${Math.round((stats.estimatedTokens / contextWindow) * 100)}% of context window.`,
  };
}

/**
 * 手动压缩会话
 * 
 * @param {Object} session - OpenClaw 会话对象
 * @param {Object} options - 选项
 * @returns {Object} - 压缩后的会话
 */
function compactSession(session, options = {}) {
  const messages = session.messages || [];
  const result = compaction.compact(messages, options);
  
  return {
    ...session,
    messages: result.messages,
    _compaction: {
      compacted: result.compacted,
      removedCount: result.removedCount,
      preservedCount: result.preservedCount,
      summary: result.summary,
    },
  };
}

/**
 * Express 中间件：自动压缩会话
 */
function compactionMiddleware(req, res, next) {
  if (req.body?.session) {
    req.body.session = wrapSession(req.body.session);
  }
  next();
}

/**
 * 获取当前压缩状态的可视化表示
 */
function getStatusVisualization(session, options = {}) {
  const check = checkSession(session, options);
  const barLength = 40;
  const filledLength = Math.min(Math.round((check.percent / 100) * barLength), barLength);
  const emptyLength = Math.max(0, barLength - filledLength);
  
  const filled = '█'.repeat(filledLength);
  const empty = '░'.repeat(emptyLength);
  
  const statusIcon = check.status === 'warning' ? '⚠️' : '✅';
  
  return [
    `${statusIcon} Session Context Usage: ${check.percent}%`,
    `[${filled}${empty}] ${check.stats.estimatedTokens}/${check.contextWindow} tokens`,
    `${check.stats.messageCount} messages | Threshold: ${Math.round(check.threshold / 1000)}k tokens`,
  ].join('\n');
}

module.exports = {
  wrapSession,
  checkSession,
  compactSession,  // openclaw.js 版本的 compactSession (处理 session 对象)
  compactionMiddleware,
  getStatusVisualization,
  DEFAULT_CONTEXT_WINDOW,
  // 导出底层 API (但不包括 compactSession，避免覆盖)
  ...Object.fromEntries(
    Object.entries(compaction).filter(([key]) => key !== 'compactSession')
  ),
};
