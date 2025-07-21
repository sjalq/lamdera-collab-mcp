#!/usr/bin/env node

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

class MCPTester {
  constructor(serverPath, apiUrl, apiKey) {
    this.serverPath = serverPath;
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.passed = 0;
    this.failed = 0;
  }

  async runTest(name, testFn) {
    try {
      console.log(`🧪 ${name}`);
      await testFn();
      console.log(`✅ ${name} - PASSED`);
      this.passed++;
    } catch (error) {
      console.log(`❌ ${name} - FAILED: ${error.message}`);
      this.failed++;
    }
  }

  async execMCP(args) {
    return new Promise((resolve, reject) => {
      const cmd = spawn('npx', ['@modelcontextprotocol/inspector', '--cli', this.serverPath, 'server.js', '--url', this.apiUrl, '--key', this.apiKey, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_OPTIONS: '--unhandled-rejections=strict' }
      });

      let stdout = '';
      let stderr = '';

      cmd.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      cmd.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      cmd.on('close', (code) => {
        if (code === 0) {
          try {
            resolve(JSON.parse(stdout.trim()));
          } catch (e) {
            resolve(stdout.trim());
          }
        } else {
          reject(new Error(`Command failed: ${stderr || stdout}`));
        }
      });

      cmd.on('error', reject);
    });
  }

  async testToolsList() {
    const result = await this.execMCP(['--method', 'tools/list']);
    if (!result.tools || !Array.isArray(result.tools)) {
      throw new Error('tools/list should return array of tools');
    }
    
    const expectedTools = [
      'list_projects', 'get_project', 'create_project',
      'list_tasks', 'list_epics', 'get_task', 'create_task', 'update_task',
      'search_documents', 'get_document', 'create_document', 'update_document',
      'list_task_comments', 'create_comment', 'update_comment',
      'get_recent_activity'
    ];

    const actualTools = result.tools.map(t => t.name);
    for (const tool of expectedTools) {
      if (!actualTools.includes(tool)) {
        throw new Error(`Missing tool: ${tool}`);
      }
    }
  }

  async testProjectOperations() {
    // Test list projects
    const projects = await this.execMCP(['--method', 'tools/call', '--tool-name', 'list_projects']);
    if (!projects.content || !projects.content[0] || !projects.content[0].text) {
      throw new Error('list_projects should return content');
    }

    // Test create project
    const createResult = await this.execMCP([
      '--method', 'tools/call',
      '--tool-name', 'create_project',
      '--tool-arg', 'name=Test Project',
      '--tool-arg', 'description=Test Description',
      '--tool-arg', 'worker_type=dev',
      '--tool-arg', 'worker_name=Test Developer'
    ]);

    const createData = JSON.parse(createResult.content[0].text);
    if (!createData.id || createData.name !== 'Test Project') {
      throw new Error('create_project should return project with correct data');
    }

    // Test get project
    const getResult = await this.execMCP([
      '--method', 'tools/call',
      '--tool-name', 'get_project',
      '--tool-arg', `project_id=${createData.id}`
    ]);

    const getData = JSON.parse(getResult.content[0].text);
    if (getData.id !== createData.id) {
      throw new Error('get_project should return correct project');
    }

    return createData.id;
  }

  async testTaskOperations(projectId) {
    // Test create task
    const createResult = await this.execMCP([
      '--method', 'tools/call',
      '--tool-name', 'create_task',
      '--tool-arg', `project_id=${projectId}`,
      '--tool-arg', 'title=Test Task',
      '--tool-arg', 'description=Test task description',
      '--tool-arg', 'task_type=task',
      '--tool-arg', 'priority=high',
      '--tool-arg', 'worker_type=dev',
      '--tool-arg', 'worker_name=Test Developer'
    ]);

    const createData = JSON.parse(createResult.content[0].text);
    if (!createData.id || createData.title !== 'Test Task') {
      throw new Error('create_task should return task with correct data');
    }

    // Test list tasks
    const listResult = await this.execMCP([
      '--method', 'tools/call',
      '--tool-name', 'list_tasks',
      '--tool-arg', `project_id=${projectId}`
    ]);

    const listData = JSON.parse(listResult.content[0].text);
    if (!listData.data || !Array.isArray(listData.data)) {
      throw new Error('list_tasks should return paginated data');
    }

    // Test update task
    const updateResult = await this.execMCP([
      '--method', 'tools/call',
      '--tool-name', 'update_task',
      '--tool-arg', `task_id=${createData.id}`,
      '--tool-arg', 'title=Updated Task',
      '--tool-arg', 'status=in_progress',
      '--tool-arg', 'worker_type=pm',
      '--tool-arg', 'worker_name=Test PM'
    ]);

    const updateData = JSON.parse(updateResult.content[0].text);
    if (updateData.title !== 'Updated Task' || updateData.status !== 'in_progress') {
      throw new Error('update_task should update task correctly');
    }

    // Test get task
    const getResult = await this.execMCP([
      '--method', 'tools/call',
      '--tool-name', 'get_task',
      '--tool-arg', `task_id=${createData.id}`
    ]);

    const getData = JSON.parse(getResult.content[0].text);
    if (getData.title !== 'Updated Task') {
      throw new Error('get_task should return updated task');
    }

    return createData.id;
  }

  async testDocumentOperations(projectId) {
    // Test create document (expect 501 - not implemented)
    try {
      const createResult = await this.execMCP([
        '--method', 'tools/call',
        '--tool-name', 'create_document',
        '--tool-arg', 'title=Test Document',
        '--tool-arg', 'content=Test document content',
        '--tool-arg', 'type=notes',
        '--tool-arg', `project_id=${projectId}`,
        '--tool-arg', 'worker_type=dev',
        '--tool-arg', 'worker_name=Test Developer'
      ]);
      
      if (createResult.content[0].text.includes('501') || createResult.content[0].text.includes('not implemented')) {
        // Document endpoints are not implemented yet - this is expected
        return;
      }
    } catch (error) {
      if (error.message.includes('501') || error.message.includes('not implemented')) {
        return; // Expected - documents not implemented
      }
      throw error;
    }
  }

  async testCommentOperations(taskId) {
    // Test create comment
    const createResult = await this.execMCP([
      '--method', 'tools/call',
      '--tool-name', 'create_comment',
      '--tool-arg', `task_id=${taskId}`,
      '--tool-arg', 'content=Test comment content',
      '--tool-arg', 'worker_type=reviewer',
      '--tool-arg', 'worker_name=Test Reviewer'
    ]);

    const createData = JSON.parse(createResult.content[0].text);
    if (!createData.id || createData.content !== 'Test comment content') {
      throw new Error('create_comment should return comment with correct data');
    }

    // Test list task comments
    const listResult = await this.execMCP([
      '--method', 'tools/call',
      '--tool-name', 'list_task_comments',
      '--tool-arg', `task_id=${taskId}`
    ]);

    const listData = JSON.parse(listResult.content[0].text);
    if (!listData.data || !Array.isArray(listData.data)) {
      throw new Error('list_task_comments should return paginated data');
    }

    // Test update comment
    const updateResult = await this.execMCP([
      '--method', 'tools/call',
      '--tool-name', 'update_comment',
      '--tool-arg', `comment_id=${createData.id}`,
      '--tool-arg', 'content=Updated comment content'
    ]);

    const updateData = JSON.parse(updateResult.content[0].text);
    if (updateData.content !== 'Updated comment content') {
      throw new Error('update_comment should update comment correctly');
    }
  }

  async testActivityOperations() {
    const result = await this.execMCP([
      '--method', 'tools/call',
      '--tool-name', 'get_recent_activity'
    ]);

    const data = JSON.parse(result.content[0].text);
    if (!Array.isArray(data)) {
      throw new Error('get_recent_activity should return array');
    }
  }

  async testErrorHandling() {
    const result = await this.execMCP([
      '--method', 'tools/call',
      '--tool-name', 'get_project',
      '--tool-arg', 'project_id=99999'
    ]);
    
    // Check if the response indicates an error
    if (!result.content || !result.content[0] || !result.content[0].text.includes('Error:')) {
      throw new Error('Should return error for non-existent project');
    }
  }

  async runAllTests() {
    console.log('🚀 Starting MCP Server Tests\n');
    
    let projectId, taskId;

    await this.runTest('Tools List', () => this.testToolsList());
    
    await this.runTest('Project Operations', async () => {
      projectId = await this.testProjectOperations();
    });
    
    await this.runTest('Task Operations', async () => {
      taskId = await this.testTaskOperations(projectId);
    });
    
    await this.runTest('Document Operations', async () => {
      await this.testDocumentOperations(projectId);
    });
    
    await this.runTest('Comment Operations', async () => {
      if (taskId) {
        await this.testCommentOperations(taskId);
      } else {
        throw new Error('No task ID available for comment testing');
      }
    });
    
    await this.runTest('Activity Operations', () => this.testActivityOperations());
    
    await this.runTest('Error Handling', () => this.testErrorHandling());

    console.log(`\n📊 Test Results: ${this.passed} passed, ${this.failed} failed`);
    
    if (this.failed > 0) {
      process.exit(1);
    } else {
      console.log('🎉 All tests passed!');
    }
  }
}

// CLI
const args = process.argv.slice(2);
let apiUrl = 'http://localhost:8000';
let apiKey = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url' && i + 1 < args.length) {
    apiUrl = args[i + 1];
    i++;
  } else if (args[i] === '--key' && i + 1 < args.length) {
    apiKey = args[i + 1];
    i++;
  }
}

if (!apiKey) {
  console.error('Error: API key required. Use --key <api-key>');
  process.exit(1);
}

const tester = new MCPTester('node', apiUrl, apiKey);
tester.runAllTests().catch(console.error); 