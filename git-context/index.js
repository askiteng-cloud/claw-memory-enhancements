/**
 * Git Context Injector
 * 
 * 为 OpenClaw 会话自动注入 Git 上下文信息
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 缓存结构: { [sessionKey]: { data, timestamp } }
const cache = new Map();

/**
 * 默认配置
 */
const DEFAULT_CONFIG = {
  enabled: true,
  triggerOnSkills: ['coding-agent', 'skill-creator'],
  cacheDuration: 30, // 秒
  includeDiffStat: true,
  includeRecentCommits: 3,
};

/**
 * 加载配置
 */
function loadConfig() {
  const configPath = path.join(process.env.CLAWD_HOME || process.cwd(), 'config', 'compaction.json');
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return { ...DEFAULT_CONFIG, ...(config.gitIntegration || {}) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * 检查是否在 Git 仓库中
 */
function isGitRepo(cwd) {
  try {
    execSync('git rev-parse --git-dir', { cwd, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取 Git 分支信息
 */
function getBranchInfo(cwd) {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd, encoding: 'utf8' }).trim();
    const upstream = execSync('git rev-parse --abbrev-ref @{upstream} 2>/dev/null || echo ""', { 
      cwd, 
      encoding: 'utf8',
      shell: '/bin/bash'
    }).trim();
    
    let aheadBehind = '';
    if (upstream) {
      try {
        const counts = execSync(`git rev-list --left-right --count ${branch}...${upstream} 2>/dev/null || echo "0\t0"`, {
          cwd,
          encoding: 'utf8',
          shell: '/bin/bash'
        }).trim().split('\t');
        const ahead = parseInt(counts[0], 10) || 0;
        const behind = parseInt(counts[1], 10) || 0;
        if (ahead > 0 || behind > 0) {
          aheadBehind = ` (ahead ${ahead}, behind ${behind})`;
        }
      } catch {
        // 忽略错误
      }
    }
    
    return { branch, aheadBehind };
  } catch {
    return { branch: 'unknown', aheadBehind: '' };
  }
}

/**
 * 获取 Git 状态摘要
 */
function getStatusSummary(cwd) {
  try {
    const status = execSync('git status --short --branch', { cwd, encoding: 'utf8' });
    const lines = status.trim().split('\n').filter(l => l.trim());
    
    // 第一行是分支信息
    const branchLine = lines[0] || '';
    const fileLines = lines.slice(1);
    
    const counts = {
      modified: 0,
      staged: 0,
      untracked: 0,
      deleted: 0,
      renamed: 0,
    };
    
    for (const line of fileLines) {
      const index = line[0] || ' ';
      const worktree = line[1] || ' ';
      
      if (index !== ' ' && index !== '?') counts.staged++;
      if (worktree === 'M') counts.modified++;
      if (worktree === 'D') counts.deleted++;
      if (worktree === '?') counts.untracked++;
      if (index === 'R' || worktree === 'R') counts.renamed++;
    }
    
    const parts = [];
    if (counts.staged > 0) parts.push(`${counts.staged} staged`);
    if (counts.modified > 0) parts.push(`${counts.modified} modified`);
    if (counts.deleted > 0) parts.push(`${counts.deleted} deleted`);
    if (counts.untracked > 0) parts.push(`${counts.untracked} untracked`);
    if (counts.renamed > 0) parts.push(`${counts.renamed} renamed`);
    
    return {
      summary: parts.join(', ') || 'clean',
      hasChanges: fileLines.length > 0,
      counts,
    };
  } catch {
    return { summary: 'unknown', hasChanges: false, counts: {} };
  }
}

/**
 * 获取 diff 统计
 */
function getDiffStat(cwd) {
  try {
    const diff = execSync('git diff --stat', { cwd, encoding: 'utf8' });
    if (!diff.trim()) return null;
    
    const lines = diff.trim().split('\n');
    const summary = lines[lines.length - 1] || '';
    
    // 提取文件列表 (前5个)
    const files = lines
      .slice(0, -1)
      .filter(l => l.includes('|'))
      .slice(0, 5)
      .map(l => {
        const match = l.match(/^\s*(.+?)\s+\|/);
        return match ? match[1].trim() : null;
      })
      .filter(Boolean);
    
    return { summary: summary.trim(), files };
  } catch {
    return null;
  }
}

/**
 * 获取最近提交历史
 */
function getRecentCommits(cwd, count = 3) {
  try {
    const output = execSync(
      `git log --oneline -${count} --pretty=format:"%s"`,
      { cwd, encoding: 'utf8' }
    );
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * 构建 Git 上下文字符串
 */
function buildGitContext(cwd, config) {
  if (!isGitRepo(cwd)) {
    return null;
  }
  
  const { branch, aheadBehind } = getBranchInfo(cwd);
  const { summary, hasChanges } = getStatusSummary(cwd);
  const diffStat = config.includeDiffStat ? getDiffStat(cwd) : null;
  const commits = config.includeRecentCommits > 0 
    ? getRecentCommits(cwd, config.includeRecentCommits)
    : [];
  
  const lines = ['# Git Context'];
  lines.push(`- Branch: ${branch}${aheadBehind}`);
  lines.push(`- Status: ${summary}`);
  
  if (diffStat && hasChanges) {
    lines.push(`- Changes: ${diffStat.summary}`);
    if (diffStat.files.length > 0) {
      lines.push(`- Modified files: ${diffStat.files.join(', ')}`);
    }
  }
  
  if (commits.length > 0) {
    lines.push('- Recent commits:');
    commits.forEach(msg => lines.push(`  - ${msg}`));
  }
  
  return lines.join('\n');
}

/**
 * 获取 Git 上下文 (带缓存)
 */
function getGitContext(cwd, sessionKey, skillName) {
  const config = loadConfig();
  
  // 检查是否启用
  if (!config.enabled) return null;
  
  // 检查是否应该为此 skill 触发
  if (skillName && !config.triggerOnSkills.includes(skillName)) return null;
  
  // 检查缓存
  const cacheKey = `${sessionKey}:${cwd}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < config.cacheDuration * 1000) {
    return cached.data;
  }
  
  // 生成新的上下文
  const context = buildGitContext(cwd, config);
  
  // 存入缓存
  if (context) {
    cache.set(cacheKey, { data: context, timestamp: Date.now() });
  }
  
  return context;
}

/**
 * 清除缓存
 */
function clearCache(sessionKey) {
  if (sessionKey) {
    for (const key of cache.keys()) {
      if (key.startsWith(`${sessionKey}:`)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

/**
 * 注入 Git 上下文到系统提示
 */
function injectGitContext(systemPrompt, gitContext) {
  if (!gitContext) return systemPrompt;
  
  // 找到合适的位置插入 (在 Project Context 之后，或最后)
  const insertMarker = '# Project context';
  const idx = systemPrompt.indexOf(insertMarker);
  
  if (idx !== -1) {
    // 在 Project Context 后插入
    const endIdx = systemPrompt.indexOf('\n# ', idx + 1);
    const insertPos = endIdx !== -1 ? endIdx : systemPrompt.length;
    return systemPrompt.slice(0, insertPos) + '\n\n' + gitContext + systemPrompt.slice(insertPos);
  }
  
  // 没有找到 Project Context，追加到最后
  return systemPrompt + '\n\n' + gitContext;
}

module.exports = {
  getGitContext,
  injectGitContext,
  clearCache,
  buildGitContext,
  loadConfig,
  DEFAULT_CONFIG,
};
