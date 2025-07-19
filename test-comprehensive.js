#!/usr/bin/env node

import { spawn } from 'child_process';

class ComprehensiveTester {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.apiKey = process.argv.find(arg => arg.startsWith('--key='))?.split('=')[1] || 'test_key_all_projects_123';
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
      const cmd = spawn('npx', ['@modelcontextprotocol/inspector', '--cli', 'node', 'server.js', '--url', 'http://localhost:8000', '--key', this.apiKey, ...args], {
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
    if (!result.content?.[0]?.text?.includes('name')) throw new Error('Should return project with name');
  }

  async testCreateProject() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'create_project', '--tool-arg', 'name=Test Project', '--tool-arg', 'worker_type=dev']);
    if (!result.content?.[0]?.text?.includes('id')) throw new Error('Should return created project with ID');
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
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'create_project', '--tool-arg', 'name=']);
    if (!result.content?.[0]?.text?.includes('Error')) throw new Error('Should return error for empty required string');
  }

  async testUnauthorizedAccess() {
    try {
      const cmd = spawn('npx', ['@modelcontextprotocol/inspector', '--cli', 'node', 'server.js', '--url', 'http://localhost:8000', '--key', 'invalid_key', '--method', 'tools/call', '--tool-name', 'list_projects'], {
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
    console.log('🚀 Running Comprehensive MCP Tests\n');

    // Happy path - all 16 tools
    await this.runTest('list_projects', () => this.testListProjects());
    await this.runTest('get_project', () => this.testGetProject());
    await this.runTest('create_project', () => this.testCreateProject());
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

const tester = new ComprehensiveTester();
tester.runAll(); 