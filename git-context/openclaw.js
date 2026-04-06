/**
 * OpenClaw Git Context 集成入口
 * 
 * 此文件需要在 OpenClaw Gateway 启动时加载
 */

const path = require('path');
const gitContext = require('./index');

// 保存原始的系统提示构建函数
let originalBuildSystemPrompt = null;

/**
 * 初始化 Git 上下文注入
 * 
 * 此函数应该在 OpenClaw Gateway 启动时调用
 */
function initializeGitContextInjection() {
  const config = gitContext.loadConfig();
  
  if (!config.enabled) {
    console.log('[GitContext] Disabled in config, skipping initialization');
    return;
  }
  
  console.log('[GitContext] Initialized');
  console.log(`[GitContext] Trigger on skills: ${config.triggerOnSkills.join(', ')}`);
  console.log(`[GitContext] Cache duration: ${config.cacheDuration}s`);
}

/**
 * 为会话注入 Git 上下文
 * 
 * 此函数应该在每个请求处理前调用
 * 
 * @param {Object} session - OpenClaw 会话对象
 * @param {string} skillName - 当前调用的 skill 名称
 * @returns {Object} - 修改后的会话对象
 */
function enrichSession(session, skillName) {
  const config = gitContext.loadConfig();
  
  if (!config.enabled) return session;
  if (!config.triggerOnSkills.includes(skillName)) return session;
  
  const cwd = session.cwd || process.cwd();
  const sessionKey = session.key || 'default';
  
  // 获取 Git 上下文
  const context = gitContext.getGitContext(cwd, sessionKey, skillName);
  
  if (context && session.systemPrompt) {
    // 注入到系统提示
    session.systemPrompt = gitContext.injectGitContext(session.systemPrompt, context);
    
    // 记录已注入
    session._gitContextInjected = true;
    session._gitContextTimestamp = Date.now();
  }
  
  return session;
}

/**
 * 快速检查是否应该为此 skill 注入 Git 上下文
 */
function shouldInjectForSkill(skillName) {
  const config = gitContext.loadConfig();
  return config.enabled && config.triggerOnSkills.includes(skillName);
}

/**
 * 获取当前 Git 上下文的字符串表示 (用于日志或调试)
 */
function getContextPreview(cwd, skillName) {
  const context = gitContext.getGitContext(cwd, 'preview', skillName);
  if (!context) return null;
  
  // 只返回前 3 行作为预览
  return context.split('\n').slice(0, 3).join('\n') + '\n...';
}

module.exports = {
  initializeGitContextInjection,
  enrichSession,
  shouldInjectForSkill,
  getContextPreview,
  // 导出底层函数供高级使用
  getGitContext: gitContext.getGitContext,
  injectGitContext: gitContext.injectGitContext,
  clearCache: gitContext.clearCache,
};
