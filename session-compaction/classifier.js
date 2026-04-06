/**
 * Message Classifier
 * 
 * 分类消息类型，决定哪些消息需要特殊处理
 */

const MessageType = {
  SYSTEM: 'system',
  USER: 'user',
  ASSISTANT: 'assistant',
  TOOL_USE: 'tool_use',
  TOOL_RESULT: 'tool_result',
  TOOL_RESULT_ERROR: 'tool_result_error',
  COMPACTION_SUMMARY: 'compaction_summary',
};

/**
 * 分类单条消息
 * @param {Object} message - 消息对象
 * @returns {string} - 消息类型
 */
function classifyMessage(message) {
  if (!message) return null;
  
  // 检查是否是压缩摘要
  if (message.role === 'system' && message.content?.includes('<summary>')) {
    return MessageType.COMPACTION_SUMMARY;
  }
  
  // 根据 role 分类
  const role = message.role?.toLowerCase();
  
  if (role === 'system') {
    return MessageType.SYSTEM;
  }
  
  if (role === 'user') {
    return MessageType.USER;
  }
  
  if (role === 'assistant') {
    // 检查是否包含工具调用
    if (message.tool_calls?.length > 0) {
      return MessageType.TOOL_USE;
    }
    return MessageType.ASSISTANT;
  }
  
  if (role === 'tool') {
    // 检查是否是错误
    if (message.is_error || message.content?.includes('error') || message.isError) {
      return MessageType.TOOL_RESULT_ERROR;
    }
    return MessageType.TOOL_RESULT;
  }
  
  // 兜底
  return MessageType.ASSISTANT;
}

/**
 * 分类整个会话
 * @param {Array} messages - 消息列表
 * @returns {Array} - 带类型标记的消息列表
 */
function classifySession(messages) {
  return messages.map((msg, index) => ({
    ...msg,
    _index: index,
    _type: classifyMessage(msg),
  }));
}

/**
 * 统计各类型消息数量
 * @param {Array} classifiedMessages - 已分类的消息列表
 * @returns {Object} - 类型统计
 */
function countByType(classifiedMessages) {
  const counts = {};
  for (const type of Object.values(MessageType)) {
    counts[type] = 0;
  }
  
  for (const msg of classifiedMessages) {
    counts[msg._type] = (counts[msg._type] || 0) + 1;
  }
  
  return counts;
}

/**
 * 判断消息是否应该保留（不压缩）
 * @param {Object} message - 已分类的消息
 * @param {Object} config - 配置
 * @returns {boolean} - 是否应该保留
 */
function shouldPreserve(message, config) {
  const { preserveErrors = true } = config;
  
  // 始终保留压缩摘要
  if (message._type === MessageType.COMPACTION_SUMMARY) {
    return true;
  }
  
  // 保留系统消息
  if (message._type === MessageType.SYSTEM) {
    return true;
  }
  
  // 保留错误
  if (preserveErrors && message._type === MessageType.TOOL_RESULT_ERROR) {
    return true;
  }
  
  return false;
}

module.exports = {
  MessageType,
  classifyMessage,
  classifySession,
  countByType,
  shouldPreserve,
};
