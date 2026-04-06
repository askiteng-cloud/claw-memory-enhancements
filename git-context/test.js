/**
 * Git Context Skill - Tests
 */

const gitContext = require('./index');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// 测试用的临时目录
const TEST_DIR = path.join(__dirname, 'test-repo');

function setupTestRepo() {
  // 清理旧目录
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
  
  // 创建测试仓库
  fs.mkdirSync(TEST_DIR, { recursive: true });
  execSync('git init', { cwd: TEST_DIR });
  execSync('git config user.email "test@test.com"', { cwd: TEST_DIR });
  execSync('git config user.name "Test"', { cwd: TEST_DIR });
  
  // 创建初始提交
  fs.writeFileSync(path.join(TEST_DIR, 'README.md'), '# Test');
  execSync('git add .', { cwd: TEST_DIR });
  execSync('git commit -m "initial commit"', { cwd: TEST_DIR });
  
  // 创建更多提交
  fs.writeFileSync(path.join(TEST_DIR, 'file1.js'), 'console.log(1);');
  execSync('git add .', { cwd: TEST_DIR });
  execSync('git commit -m "feat: add file1"', { cwd: TEST_DIR });
  
  fs.writeFileSync(path.join(TEST_DIR, 'file2.js'), 'console.log(2);');
  execSync('git add .', { cwd: TEST_DIR });
  execSync('git commit -m "fix: handle edge case"', { cwd: TEST_DIR });
  
  // 创建未暂存的修改
  fs.writeFileSync(path.join(TEST_DIR, 'file3.js'), 'console.log(3);');
}

function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
}

function testIsGitRepo() {
  console.log('Test: isGitRepo');
  const result = gitContext.buildGitContext(TEST_DIR, { includeDiffStat: true, includeRecentCommits: 3 });
  console.log('Result:', result ? 'PASS (is git repo)' : 'FAIL');
  return result !== null;
}

function testBuildGitContext() {
  console.log('\nTest: buildGitContext');
  const config = {
    includeDiffStat: true,
    includeRecentCommits: 2,
  };
  
  const context = gitContext.buildGitContext(TEST_DIR, config);
  console.log('Generated context:');
  console.log(context);
  console.log('---');
  
  const checks = [
    context.includes('# Git Context'),
    context.includes('Branch:'),
    context.includes('Status:'),
    context.includes('Recent commits:'),
    context.includes('feat: add file1'),
    context.includes('fix: handle edge case'),
  ];
  
  const allPass = checks.every(Boolean);
  console.log('All checks:', allPass ? 'PASS' : 'FAIL');
  return allPass;
}

function testInjectGitContext() {
  console.log('\nTest: injectGitContext');
  const systemPrompt = `# Project context
 - Working directory: /test
 - Date: 2026-04-06

# Tools
Available tools...`;

  const context = `# Git Context
- Branch: main
- Status: clean`;

  const result = gitContext.injectGitContext(systemPrompt, context);
  console.log('Injected result:');
  console.log(result);
  console.log('---');
  
  const pass = result.includes('# Git Context') && result.includes('# Tools');
  console.log('Inject position correct:', pass ? 'PASS' : 'FAIL');
  return pass;
}

function testCache() {
  console.log('\nTest: cache');
  const sessionKey = 'test-session';
  
  // 第一次调用
  const start1 = Date.now();
  const ctx1 = gitContext.getGitContext(TEST_DIR, sessionKey, 'coding-agent');
  const time1 = Date.now() - start1;
  
  // 第二次调用 (应该命中缓存)
  const start2 = Date.now();
  const ctx2 = gitContext.getGitContext(TEST_DIR, sessionKey, 'coding-agent');
  const time2 = Date.now() - start2;
  
  console.log(`First call: ${time1}ms, Second call: ${time2}ms`);
  console.log('Cache working:', time2 < time1 ? 'PASS' : 'FAIL');
  
  // 清除缓存
  gitContext.clearCache(sessionKey);
  
  return ctx1 === ctx2 && time2 < time1;
}

function testSkillFilter() {
  console.log('\nTest: skill filter');
  
  // 应该返回上下文
  const ctx1 = gitContext.getGitContext(TEST_DIR, 'test-1', 'coding-agent');
  
  // 不应该返回上下文 (skill 不在 trigger 列表)
  const ctx2 = gitContext.getGitContext(TEST_DIR, 'test-2', 'weather');
  
  console.log('coding-agent returns context:', ctx1 !== null ? 'PASS' : 'FAIL');
  console.log('weather returns null:', ctx2 === null ? 'PASS' : 'FAIL');
  
  return ctx1 !== null && ctx2 === null;
}

// 运行测试
function runTests() {
  console.log('=== Git Context Skill Tests ===\n');
  
  try {
    setupTestRepo();
    
    const results = [
      testIsGitRepo(),
      testBuildGitContext(),
      testInjectGitContext(),
      testCache(),
      testSkillFilter(),
    ];
    
    const allPass = results.every(Boolean);
    console.log('\n=== Summary ===');
    console.log(`Tests: ${results.filter(Boolean).length}/${results.length} passed`);
    console.log(allPass ? '✅ All tests passed!' : '❌ Some tests failed');
    
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    cleanup();
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runTests();
}

module.exports = { runTests, setupTestRepo, cleanup };
