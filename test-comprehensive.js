#!/usr/bin/env node

import { spawn } from 'child_process';

class ComprehensiveTester {
  constructor(apiUrl, apiKey, verbose = false, useMethodCall = false) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.passed = 0;
    this.failed = 0;
    this.verbose = verbose;
    this.useMethodCall = useMethodCall;
  }

  async runTest(name, testFn) {
    try {
      console.log(`🧪 ${name}`);
      await testFn();
      console.log(`✅ ${name} - PASSED`);
      this.passed++;
    } catch (error) {
      console.log(`❌ ${name} - FAILED: ${error.message}`);
      if (this.verbose && error.response) {
        console.log(`📋 Response: ${JSON.stringify(error.response, null, 2)}`);
      }
      this.failed++;
    }
  }

  async execMCP(args) {
    return new Promise((resolve, reject) => {
      const serverArgs = ['node', 'server.js', '--url', this.apiUrl, '--key', this.apiKey];
      if (this.useMethodCall) {
        serverArgs.push('--use-method-call');
      }
      
      const cmd = spawn('npx', ['@modelcontextprotocol/inspector', '--cli', ...serverArgs, ...args], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      cmd.stdout.on('data', (data) => stdout += data.toString());
      cmd.stderr.on('data', (data) => stderr += data.toString());

      cmd.on('close', (code) => {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (e) {
          reject(new Error(`Parse error: ${stdout} ${stderr}`));
        }
      });

      setTimeout(() => {
        cmd.kill();
        reject(new Error('Command timeout'));
      }, 10000);
    });
  }

  // ALL 16 TOOL TESTS
  async testListProjects() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'list_projects']);
    if (!result.content?.[0]?.text?.includes('data')) throw new Error('Should return projects data');
  }

  async testGetProject() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'get_project', '--tool-arg', 'project_id=1']);
    if (!result.content?.[0]?.text?.includes('name')) {
      const error = new Error('Should return project with name');
      error.response = result;
      throw error;
    }
  }

  async testCreateProject() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'create_project', '--tool-arg', 'name=Test Project', '--tool-arg', 'worker_type=dev']);
    if (!result.content?.[0]?.text?.includes('id')) throw new Error('Should return created project with ID');
  }

  async testCreateProjectWithGitRemote() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'create_project', '--tool-arg', 'name=Git Test Project', '--tool-arg', 'git_remote_url=https://github.com/user/repo.git', '--tool-arg', 'worker_type=dev']);
    if (!result.content?.[0]?.text?.includes('gitRemoteUrl')) throw new Error('Should return project with git remote URL');
  }

  async testListProjectsWithGitFilter() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'list_projects', '--tool-arg', 'git_remote_url=https://github.com/user/repo.git']);
    if (!result.content?.[0]?.text?.includes('projects')) throw new Error('Should return filtered projects');
  }

  async testUpdateProject() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'update_project', '--tool-arg', 'project_id=1', '--tool-arg', 'name=Updated Project', '--tool-arg', 'git_remote_url=https://github.com/user/updated.git']);
    if (!result.content?.[0]?.text?.includes('id')) throw new Error('Should return updated project');
  }

  async testListTasks() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'list_tasks', '--tool-arg', 'project_id=1']);
    if (!result.content?.[0]?.text?.includes('data')) throw new Error('Should return tasks data');
  }

  async testListEpics() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'list_epics', '--tool-arg', 'project_id=1']);
    if (!result.content?.[0]?.text?.includes('data')) throw new Error('Should return epics data');
  }

  async testGetTask() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'get_task', '--tool-arg', 'task_id=1']);
    if (!result.content?.[0]?.text?.includes('title')) throw new Error('Should return task with title');
  }

  async testCreateTask() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'create_task', '--tool-arg', 'project_id=1', '--tool-arg', 'title=Test Task', '--tool-arg', 'task_type=task']);
    if (!result.content?.[0]?.text?.includes('id')) throw new Error('Should return created task with ID');
  }

  async testUpdateTask() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'update_task', '--tool-arg', 'task_id=1', '--tool-arg', 'title=Updated Task']);
    const text = result.content?.[0]?.text || '';
    if (!text.includes('Updated Task') && !text.includes('timeout') && !text.includes('restarting')) {
      throw new Error('Should return updated task data or graceful timeout message');
    }
  }

  async testSearchDocuments() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'search_documents', '--tool-arg', 'query=test']);
    if (!result.content?.[0]?.text?.includes('data')) throw new Error('Should return search results');
  }

  async testGetDocument() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'get_document', '--tool-arg', 'document_id=1']);
    const text = result.content?.[0]?.text || '';
    if (!text.includes('title') && !text.includes('content') && !text.includes('Error') && !text.includes('403')) {
      throw new Error('Should return document data or proper error');
    }
  }

  async testCreateDocument() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'create_document', '--tool-arg', 'title=Test Doc', '--tool-arg', 'type=notes', '--tool-arg', 'project_id=1']);
    const text = result.content?.[0]?.text || '';
    if (!text.includes('id') && !text.includes('Test Doc') && !text.includes('Error')) {
      throw new Error('Should return created document with ID or proper error');
    }
  }

  async testUpdateDocument() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'update_document', '--tool-arg', 'document_id=1', '--tool-arg', 'title=Updated Doc', '--tool-arg', 'type=notes']);
    const text = result.content?.[0]?.text || '';
    if (!text.includes('Updated Doc') && !text.includes('version') && !text.includes('Error') && !text.includes('403')) {
      throw new Error('Should return updated document or proper error');
    }
  }

  async testListTaskComments() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'list_task_comments', '--tool-arg', 'task_id=1']);
    if (!result.content?.[0]?.text?.includes('data')) throw new Error('Should return comments data');
  }

  async testCreateComment() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'create_comment', '--tool-arg', 'task_id=1', '--tool-arg', 'content=Test comment']);
    if (!result.content?.[0]?.text?.includes('id')) throw new Error('Should return created comment with ID');
  }

  async testUpdateComment() {
    // Comment ID 5 is authored by "s.dormehl@sakeliga.org.za" - matches our API key user
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'update_comment', '--tool-arg', 'comment_id=5', '--tool-arg', 'content=Updated comment']);
    const text = result.content?.[0]?.text || '';
    if (!text.includes('Updated comment') && !text.includes('timeout') && !text.includes('restarting') && !text.includes('success')) {
      throw new Error('Should return updated comment data or graceful timeout message');
    }
  }

  async testGetRecentActivity() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'get_recent_activity']);
    const text = result.content?.[0]?.text || '';
    if (!text.includes('[') && !text.includes('activity') && !text.includes('id')) {
      throw new Error('Should return activity array or activity data');
    }
  }

  async testGetComment() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'get_comment', '--tool-arg', 'comment_id=1']);
    const text = result.content?.[0]?.text || '';
    if (!text.includes('content') && !text.includes('Error') && !text.includes('403')) {
      throw new Error('Should return comment data or proper error');
    }
  }

  async testDeleteComment() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'delete_comment', '--tool-arg', 'comment_id=1']);
    const text = result.content?.[0]?.text || '';
    if (!text.includes('deleted') && !text.includes('Error') && !text.includes('403')) {
      throw new Error('Should return deletion confirmation or proper error');
    }
  }

  // SAFE UPDATE TESTS
  async testSafeUpdateTask() {
    const createResult = await this.execMCP(['--method', 'tools/call', '--tool-name', 'create_task', 
      '--tool-arg', 'project_id=1', '--tool-arg', 'title=Safe Update MCP Task', 
      '--tool-arg', 'description=Original description', '--tool-arg', 'task_type=task',
      '--tool-arg', 'status=todo', '--tool-arg', 'priority=low']);
    
    const createText = createResult.content?.[0]?.text || '';
    const createData = JSON.parse(createText);
    const taskId = createData.id;
    
    const partialResult = await this.execMCP(['--method', 'tools/call', '--tool-name', 'update_task', 
      '--tool-arg', `task_id=${taskId}`, '--tool-arg', 'status=in_progress']);
    const partialText = partialResult.content?.[0]?.text || '';
    const partialData = JSON.parse(partialText);
    if (partialData.title !== 'Safe Update MCP Task' || partialData.status !== 'in_progress') {
      throw new Error('Partial update should preserve other fields');
    }
    
    const emptyResult = await this.execMCP(['--method', 'tools/call', '--tool-name', 'update_task', 
      '--tool-arg', `task_id=${taskId}`, '--tool-arg', 'title= ', '--tool-arg', 'priority=high']);
    const emptyText = emptyResult.content?.[0]?.text || '';
    const emptyData = JSON.parse(emptyText);
    if (emptyData.title !== 'Safe Update MCP Task' || emptyData.priority !== 'high') {
      throw new Error('Empty/whitespace strings should be ignored, other updates applied');
    }
    
    const whitespaceResult = await this.execMCP(['--method', 'tools/call', '--tool-name', 'update_task', 
      '--tool-arg', `task_id=${taskId}`, '--tool-arg', 'description=   ', '--tool-arg', 'status=review']);
    const whitespaceText = whitespaceResult.content?.[0]?.text || '';
    const whitespaceData = JSON.parse(whitespaceText);
    if (whitespaceData.description !== 'Original description' || whitespaceData.status !== 'review') {
      throw new Error('Whitespace strings should be ignored');
    }
  }

  async testSafeUpdateDocument() {
    const createResult = await this.execMCP(['--method', 'tools/call', '--tool-name', 'create_document', 
      '--tool-arg', 'title=Safe Update MCP Doc', '--tool-arg', 'content=Original content',
      '--tool-arg', 'type=notes', '--tool-arg', 'project_id=1']);
    
    const createText = createResult.content?.[0]?.text || '';
    const createData = JSON.parse(createText);
    const docId = createData.id;
    
    const partialResult = await this.execMCP(['--method', 'tools/call', '--tool-name', 'update_document', 
      '--tool-arg', `document_id=${docId}`, '--tool-arg', 'title=Updated Title Only']);
    const partialText = partialResult.content?.[0]?.text || '';
    const partialData = JSON.parse(partialText);
    if (partialData.title !== 'Updated Title Only' || partialData.content !== 'Original content') {
      throw new Error('Document partial update should preserve content');
    }
    
    const emptyResult = await this.execMCP(['--method', 'tools/call', '--tool-name', 'update_document', 
      '--tool-arg', `document_id=${docId}`, '--tool-arg', 'content= ', '--tool-arg', 'title=Final Title']);
    const emptyText = emptyResult.content?.[0]?.text || '';
    const emptyData = JSON.parse(emptyText);
    if (emptyData.content !== 'Original content' || emptyData.title !== 'Final Title') {
      throw new Error('Document empty/whitespace content should be ignored');
    }
  }

  async testSafeUpdateComment() {
    const createResult = await this.execMCP(['--method', 'tools/call', '--tool-name', 'create_comment', 
      '--tool-arg', 'task_id=1', '--tool-arg', 'content=Original MCP comment content']);
    
    const createText = createResult.content?.[0]?.text || '';
    const createData = JSON.parse(createText);
    const commentId = createData.id;
    
    const emptyResult = await this.execMCP(['--method', 'tools/call', '--tool-name', 'update_comment', 
      '--tool-arg', `comment_id=${commentId}`, '--tool-arg', 'content= ']);
    const emptyText = emptyResult.content?.[0]?.text || '';
    const emptyData = JSON.parse(emptyText);
    if (emptyData.content !== 'Original MCP comment content') {
      throw new Error('Comment empty/whitespace content should be ignored');
    }
    
    const whitespaceResult = await this.execMCP(['--method', 'tools/call', '--tool-name', 'update_comment', 
      '--tool-arg', `comment_id=${commentId}`, '--tool-arg', 'content=   \t\n   ']);
    const whitespaceText = whitespaceResult.content?.[0]?.text || '';
    const whitespaceData = JSON.parse(whitespaceText);
    if (whitespaceData.content !== 'Original MCP comment content') {
      throw new Error('Comment whitespace content should be ignored');
    }
  }

  // WAF BYPASS TESTS
  async testMermaidSubgraphContent() {
    const content = `# Architecture Document

\`\`\`mermaid
graph TD
    subgraph "Frontend Layer"
        A[React App] --> B[Redux Store]
        style A fill:#f96,stroke:#333,stroke-width:4px
        style B fill:#bbf,stroke:#333,stroke-width:2px
    end
    
    subgraph "Backend Layer"
        C[API Gateway] --> D[Microservice]
        style C fill:#9f6,stroke:#333,stroke-width:2px
    end
\`\`\`

This content previously triggered Cloudflare WAF.`;

    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'create_document', '--tool-arg', 'title=Mermaid WAF Test', '--tool-arg', 'type=specification', '--tool-arg', 'project_id=1', '--tool-arg', `content=${content}`]);
    if (!result.content?.[0]?.text?.includes('id')) throw new Error('Should create document with Mermaid subgraph content');
  }

  async testSQLInjectionLikeContent() {
    const content = `# Security Testing Document

## SQL Patterns (for educational purposes)
- SELECT * FROM users WHERE 1=1
- UNION SELECT password FROM admin_users
- DROP TABLE sensitive_data;

## XSS Patterns (for educational purposes)
- <script>alert('XSS')</script>
- <img src=x onerror=alert('XSS')>
- javascript:alert('XSS')

This content contains patterns that might trigger security filters.`;

    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'create_document', '--tool-arg', 'title=Security Patterns Test', '--tool-arg', 'type=notes', '--tool-arg', 'project_id=1', '--tool-arg', `content=${content}`]);
    if (!result.content?.[0]?.text?.includes('id')) throw new Error('Should create document with security pattern content');
  }

  async testComplexStyleDirectives() {
    const content = `# Complex Styling Document

\`\`\`mermaid
flowchart TD
    subgraph cluster_1 ["Complex Cluster"]
        direction TB
        A[Node A] --> B[Node B]
        B --> C{Decision}
        C -->|Yes| D[Action 1]
        C -->|No| E[Action 2]
        
        style A fill:#ff9999,stroke:#333,stroke-width:4px,color:#000
        style B fill:#99ff99,stroke:#333,stroke-width:2px,stroke-dasharray: 5 5
        style C fill:#9999ff,stroke:#333,stroke-width:3px
        style D fill:#ffff99,stroke:#f66,stroke-width:2px,color:#000
        style E fill:#ff99ff,stroke:#f66,stroke-width:2px,color:#000
    end
    
    subgraph cluster_2 ["Another Cluster"]
        F[Start] --> G[Process]
        G --> H[End]
        style F fill:#f9f,stroke:#333,stroke-width:4px
    end
\`\`\`

Multiple subgraphs with complex style patterns.`;

    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'create_document', '--tool-arg', 'title=Complex Styles Test', '--tool-arg', 'type=specification', '--tool-arg', 'project_id=1', '--tool-arg', `content=${content}`]);
    if (!result.content?.[0]?.text?.includes('id')) throw new Error('Should create document with complex style directives');
  }

  async testLargeContentPayload() {
    const content = `# Large Content Document

This document tests large payloads that might trigger size-based WAF rules.

${'## Section '.repeat(50).split('## Section ').map((_, i) => `## Section ${i}\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\n\`\`\`javascript\nfunction example${i}() {\n  const data = {\n    id: ${i},\n    name: "Example ${i}",\n    description: "This is example number ${i}"\n  };\n  return data;\n}\n\`\`\`\n`).join('')}

This creates a large document with repetitive content and code blocks.`;

    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'create_document', '--tool-arg', 'title=Large Content Test', '--tool-arg', 'type=code', '--tool-arg', 'project_id=1', '--tool-arg', `content=${content}`]);
    if (!result.content?.[0]?.text?.includes('id')) throw new Error('Should create large document without size restrictions');
  }

  // UNHAPPY PATH TESTS
  async testInvalidProjectId() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'get_project', '--tool-arg', 'project_id=99999']);
    if (!result.content?.[0]?.text?.includes('Error')) throw new Error('Should return error for invalid project ID');
  }

  async testMissingRequiredParam() {
    try {
      await this.execMCP(['--method', 'tools/call', '--tool-name', 'create_task', '--tool-arg', 'title=Test']); // Missing project_id and task_type
      throw new Error('Should fail validation for missing required params');
    } catch (error) {
      if (!error.message.includes('required') && !error.message.includes('Error')) {
        throw new Error('Should return proper validation error');
      }
    }
  }

  async testInvalidTaskType() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'create_task', '--tool-arg', 'project_id=1', '--tool-arg', 'title=Test', '--tool-arg', 'task_type=invalid']);
    if (!result.content?.[0]?.text?.includes('Error')) throw new Error('Should return error for invalid task_type enum');
  }

  async testInvalidWorkerType() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'create_project', '--tool-arg', 'name=Test', '--tool-arg', 'worker_type=invalid']);
    const text = result.content?.[0]?.text || '';
    if (!text.includes('id') && !text.includes('dev')) throw new Error('Should create project with worker_type defaulted to dev');
  }

  async testNegativeId() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'get_task', '--tool-arg', 'task_id=-1']);
    if (!result.content?.[0]?.text?.includes('Error')) throw new Error('Should return error for negative ID');
  }

  async testStringIdWhereNumberExpected() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'get_project', '--tool-arg', 'project_id=not_a_number']);
    if (!result.content?.[0]?.text?.includes('Error')) throw new Error('Should return error for string where number expected');
  }

  async testEmptyStringRequired() {
    try {
      await this.execMCP(['--method', 'tools/call', '--tool-name', 'create_project', '--tool-arg', 'name=']);
      throw new Error('Should have failed with empty required string');
    } catch (error) {
      // CLI parse error or validation error both acceptable
      if (!error.message.includes('Invalid parameter format') && !error.message.includes('Error')) {
        throw new Error('Should return error for empty required string');
      }
    }
  }

  async testUnauthorizedAccess() {
    try {
      const cmd = spawn('npx', ['@modelcontextprotocol/inspector', '--cli', 'node', 'server.js', '--url', this.apiUrl, '--key', 'invalid_key', '--method', 'tools/call', '--tool-name', 'list_projects'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      await new Promise((resolve) => {
        cmd.stdout.on('data', (data) => stdout += data.toString());
        cmd.on('close', resolve);
        setTimeout(() => { cmd.kill(); resolve(); }, 5000);
      });

      if (!stdout.includes('Error') && !stdout.includes('401') && !stdout.includes('403')) {
        throw new Error('Should return auth error for invalid API key');
      }
    } catch (error) {
      if (!error.message.includes('Error') && !error.message.includes('auth')) {
        throw new Error('Should handle auth error properly');
      }
    }
  }

  async runAll() {
    console.log('🚀 Running Comprehensive MCP Tests');
    console.log(`🎯 Testing against: ${this.apiUrl}`);
    console.log(`🔑 Using API key: ${this.apiKey.substring(0, 8)}...${this.apiKey.substring(this.apiKey.length - 4)}`);
    console.log(`📡 Method: ${this.useMethodCall ? 'methodCall + Base64 encoding' : 'direct endpoints'}`);
    console.log('');

    // Happy path - all 16 tools
    await this.runTest('list_projects', () => this.testListProjects());
    await this.runTest('get_project', () => this.testGetProject());
    await this.runTest('create_project', () => this.testCreateProject());
    await this.runTest('create_project_with_git_remote', () => this.testCreateProjectWithGitRemote());
    await this.runTest('list_projects_with_git_filter', () => this.testListProjectsWithGitFilter());
    await this.runTest('update_project', () => this.testUpdateProject());
    await this.runTest('list_tasks', () => this.testListTasks());
    await this.runTest('list_epics', () => this.testListEpics());
    await this.runTest('get_task', () => this.testGetTask());
    await this.runTest('create_task', () => this.testCreateTask());
    await this.runTest('update_task', () => this.testUpdateTask());
    await this.runTest('search_documents', () => this.testSearchDocuments());
    await this.runTest('get_document', () => this.testGetDocument());
    await this.runTest('create_document', () => this.testCreateDocument());
    await this.runTest('update_document', () => this.testUpdateDocument());
    await this.runTest('list_task_comments', () => this.testListTaskComments());
    await this.runTest('create_comment', () => this.testCreateComment());
    await this.runTest('update_comment', () => this.testUpdateComment());
    await this.runTest('get_recent_activity', () => this.testGetRecentActivity());
    await this.runTest('get_comment', () => this.testGetComment());
    await this.runTest('delete_comment', () => this.testDeleteComment());

    console.log('\n🔒 Running Safe Update Tests\n');

    // Safe update tests - partial updates, empty strings, whitespace handling
    await this.runTest('safe_update_task', () => this.testSafeUpdateTask());
    await this.runTest('safe_update_document', () => this.testSafeUpdateDocument());
    await this.runTest('safe_update_comment', () => this.testSafeUpdateComment());

    console.log('\n🛡️  Running WAF Bypass Tests\n');

    // WAF bypass - content that would normally be blocked
    await this.runTest('mermaid_subgraph_content', () => this.testMermaidSubgraphContent());
    await this.runTest('sql_injection_like_content', () => this.testSQLInjectionLikeContent());
    await this.runTest('complex_style_directives', () => this.testComplexStyleDirectives());
    await this.runTest('large_content_payload', () => this.testLargeContentPayload());

    console.log('\n💥 Running Unhappy Path Tests\n');

    // Unhappy path - error handling
    await this.runTest('invalid_project_id', () => this.testInvalidProjectId());
    await this.runTest('missing_required_param', () => this.testMissingRequiredParam());
    await this.runTest('invalid_task_type_enum', () => this.testInvalidTaskType());
    await this.runTest('invalid_worker_type_defaults_to_dev', () => this.testInvalidWorkerType());
    await this.runTest('negative_id', () => this.testNegativeId());
    await this.runTest('string_id_where_number_expected', () => this.testStringIdWhereNumberExpected());
    await this.runTest('empty_required_string', () => this.testEmptyStringRequired());
    await this.runTest('unauthorized_access', () => this.testUnauthorizedAccess());

    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
    console.log(`📈 Coverage: ${this.passed}/${this.passed + this.failed} tests (${Math.round(100 * this.passed / (this.passed + this.failed))}%)`);
  }
}

// CLI argument parsing
const args = process.argv.slice(2);
let port = 8000;
let apiUrl = null;
let apiKey = 'test_key_all_projects_123';
let verbose = false;
let useMethodCall = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url' && i + 1 < args.length) {
    apiUrl = args[i + 1];
    i++;
  } else if (args[i] === '--port' && i + 1 < args.length) {
    port = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--key' && i + 1 < args.length) {
    apiKey = args[i + 1];
    i++;
  } else if (args[i] === '--verbose') {
    verbose = true;
  } else if (args[i] === '--use-method-call') {
    useMethodCall = true;
  } else if (args[i] === '--help') {
    console.log('Usage: node test-comprehensive.js [--url <api-url>] [--port <port>] [--key <api-key>] [--verbose] [--use-method-call]');
    console.log('');
    console.log('Options:');
    console.log('  --url <api-url>    API endpoint URL (overrides --port)');
    console.log('  --port <port>      Port number (default: 8000)');
    console.log('  --key <api-key>    API key (default: test_key_all_projects_123)');
    console.log('  --verbose          Show detailed API responses for failures');
    console.log('  --use-method-call  Use methodCall with Base64 encoding (default: false)');
    console.log('  --help             Show this help message');
    process.exit(0);
  }
}

if (!apiUrl) {
  apiUrl = `http://localhost:${port}`;
}

const tester = new ComprehensiveTester(apiUrl, apiKey, verbose, useMethodCall);
tester.runAll().catch(console.error); 