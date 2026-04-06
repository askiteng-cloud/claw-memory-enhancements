/**
 * Token Counter
 * 
 * 估算消息的 token 使用量
 * 使用简单的字符数/4 估算（类似 Claw Code）
 */

/**
 * 估算单条消息的 token 数
 * @param {Object} message - 消息对象
 * @returns {number} - 估算的 token 数
 */
function estimateMessageTokens(message) {
  if (!message) return 0;
  
  let tokens = 0;
  
  // 角色本身占用 token
  tokens += 4;
  
  // 根据消息内容估算
  if (message.content) {
    tokens += estimateTextTokens(message.content);
  }
  
  if (message.text) {
    tokens += estimateTextTokens(message.text);
  }
  
  // 工具调用
  if (message.tool_calls) {
    for (const tool of message.tool_calls) {
      if (tool.function?.name) {
        tokens += estimateTextTokens(tool.function.name);
      }
      if (tool.function?.arguments) {
        tokens += estimateTextTokens(typeof tool.function.arguments === 'string' 
          ? tool.function.arguments 
          : JSON.stringify(tool.function.arguments));
      }
    }
  }
  
  // 工具结果
  if (message.tool_results) {
    for (const result of message.tool_results) {
      if (result.content) {
        tokens += estimateTextTokens(result.content);
      }
      if (result.output) {
        tokens += estimateTextTokens(result.output);
      }
    }
  }
  
  return tokens;
}

/**
 * 估算文本的 token 数
 * @param {string} text - 文本内容
 * @returns {number} - 估算的 token 数
 */
function estimateTextTokens(text) {
  if (!text) return 0;
  // 简单估算：1 token ≈ 4 个字符
  return Math.ceil(text.length / 4) + 1;
}

/**
 * 估算整个会话的 token 数
 * @param {Array} messages - 消息列表
 * @returns {number} - 总 token 数
 */
function estimateSessionTokens(messages) {
  if (!Array.isArray(messages)) return 0;
  return messages.reduce((sum, msg) => sum + estimateMessageTokens(msg), 0);
}

/**
 * 计算应该从哪里开始压缩
 * @param {Array} messages - 消息列表
 * @param {Object} config - 配置
 * @returns {number} - 开始压缩的索引
 */
function getCompactStartIndex(messages, config) {
  const { preserveRecent = 6 } = config;
  
  // 保留最近 N 条
  return Math.max(0, messages.length - preserveRecent);
}

module.exports = {
  estimateMessageTokens,
  estimateTextTokens,
  estimateSessionTokens,
  getCompactStartIndex,
};
