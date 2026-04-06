/**
 * Git Context Gateway Integration
 * 
 * 与 OpenClaw Gateway 集成，在特定 skill 调用时自动注入 Git 上下文
 */

const gitContext = require('./index');
const path = require('path');

/**
 * 包装工具调用，注入 Git 上下文
 * 
 * @param {string} sessionKey - 会话标识
 * @param {string} skillName - 当前调用的 skill 名称
 * @param {string} cwd - 工作目录
 * @param {string} systemPrompt - 原始系统提示
 * @returns {string} - 注入 Git 上下文后的系统提示
 */
function enrichSystemPrompt(sessionKey, skillName, cwd, systemPrompt) {
  // 获取 Git 上下文
  const context = gitContext.getGitContext(cwd, sessionKey, skillName);
  
  // 注入到系统提示
  return gitContext.injectGitContext(systemPrompt, context);
}

/**
 * 创建带 Git 上下文注入的 skill 包装器
 * 
 * @param {Object} skill - 原始 skill 模块
 * @param {string} skillName - skill 名称
 * @returns {Object} - 包装后的 skill
 */
function wrapSkillWithGitContext(skill, skillName) {
  const config = gitContext.loadConfig();
  
  // 如果不在触发列表，直接返回原 skill
  if (!config.enabled || !config.triggerOnSkills.includes(skillName)) {
    return skill;
  }
  
  // 如果 skill 没有 execute 方法，无法包装
  if (typeof skill.execute !== 'function') {
    return skill;
  }
  
  return {
    ...skill,
    execute: async (args, context) => {
      // 注入 Git 上下文到系统提示
      if (context && context.systemPrompt) {
        context.systemPrompt = enrichSystemPrompt(
          context.sessionKey || 'default',
          skillName,
          context.cwd || process.cwd(),
          context.systemPrompt
        );
      }
      
      // 调用原始 execute
      return skill.execute(args, context);
    },
  };
}

/**
 * Express 中间件：为请求注入 Git 上下文
 * 
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - 下一个中间件
 */
function gitContextMiddleware(req, res, next) {
  const config = gitContext.loadConfig();
  
  if (!config.enabled) {
    return next();
  }
  
  // 从请求中提取信息
  const sessionKey = req.headers['x-session-key'] || req.body?.sessionKey || 'default';
  const skillName = req.body?.skill || req.params?.skill;
  const cwd = req.body?.cwd || process.cwd();
  
  // 保存原始系统提示
  if (req.body?.systemPrompt) {
    req.body._originalSystemPrompt = req.body.systemPrompt;
    req.body.systemPrompt = enrichSystemPrompt(
      sessionKey,
      skillName,
      cwd,
      req.body.systemPrompt
    );
  }
  
  next();
}

/**
 * OpenClaw 工具调用拦截器
 * 
 * 在工具调用前注入 Git 上下文
 */
class GitContextInterceptor {
  constructor() {
    this.config = gitContext.loadConfig();
  }
  
  /**
   * 在工具调用前执行
   */
  beforeToolCall(toolName, args, context) {
    if (!this.config.enabled) return { toolName, args, context };
    
    // 检查是否在触发列表
    const skillName = context?.currentSkill || toolName;
    if (!this.config.triggerOnSkills.includes(skillName)) {
      return { toolName, args, context };
    }
    
    // 注入 Git 上下文
    if (context?.systemPrompt) {
      context.systemPrompt = enrichSystemPrompt(
        context.sessionKey || 'default',
        skillName,
        context.cwd || process.cwd(),
        context.systemPrompt
      );
    }
    
    return { toolName, args, context };
  }
  
  /**
   * 刷新配置
   */
  refreshConfig() {
    this.config = gitContext.loadConfig();
  }
}

module.exports = {
  enrichSystemPrompt,
  wrapSkillWithGitContext,
  gitContextMiddleware,
  GitContextInterceptor,
};
