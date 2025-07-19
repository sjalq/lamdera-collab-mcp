#!/usr/bin/env node

import { spawn } from 'child_process';

class SchemaValidator {
  constructor() {
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

  async getTools() {
    return new Promise((resolve, reject) => {
      const cmd = spawn('npx', ['@modelcontextprotocol/inspector', '--cli', 'node', 'server.js', '--key', 'test123', '--method', 'tools/list'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      cmd.stdout.on('data', (data) => stdout += data.toString());
      cmd.stderr.on('data', (data) => stderr += data.toString());

      cmd.on('close', (code) => {
        if (code === 0) {
          resolve(JSON.parse(stdout.trim()));
        } else {
          reject(new Error(`Command failed: ${stderr || stdout}`));
        }
      });
    });
  }

  validateToolSchema(tool, expectedName, requiredParams = []) {
    if (tool.name !== expectedName) {
      throw new Error(`Expected tool name ${expectedName}, got ${tool.name}`);
    }
    
    if (!tool.inputSchema || tool.inputSchema.type !== 'object') {
      throw new Error(`Tool ${expectedName} should have object input schema`);
    }
    
    for (const param of requiredParams) {
      if (!tool.inputSchema.required?.includes(param)) {
        throw new Error(`Tool ${expectedName} should require parameter ${param}`);
      }
    }
    
    if (!tool.inputSchema.properties) {
      throw new Error(`Tool ${expectedName} should have properties`);
    }
  }

  validateWorkerParams(tool) {
    const props = tool.inputSchema.properties;
    if (props.worker_type) {
      if (!props.worker_type.enum?.includes('dev') || !props.worker_type.enum?.includes('pm') || !props.worker_type.enum?.includes('reviewer')) {
        throw new Error(`Tool ${tool.name} worker_type should include dev, pm, reviewer`);
      }
    }
    if (props.worker_name && props.worker_name.type !== 'string') {
      throw new Error(`Tool ${tool.name} worker_name should be string type`);
    }
  }

  async testToolCount() {
    const result = await this.getTools();
    if (!result.tools || result.tools.length !== 18) {
      throw new Error(`Expected 18 tools, got ${result.tools?.length || 0}`);
    }
  }

  async testProjectTools() {
    const result = await this.getTools();
    const tools = result.tools;
    
    const listProjects = tools.find(t => t.name === 'list_projects');
    this.validateToolSchema(listProjects, 'list_projects');
    
    const getProject = tools.find(t => t.name === 'get_project');
    this.validateToolSchema(getProject, 'get_project', ['project_id']);
    
    const createProject = tools.find(t => t.name === 'create_project');
    this.validateToolSchema(createProject, 'create_project', ['name']);
    this.validateWorkerParams(createProject);
  }

  async testTaskTools() {
    const result = await this.getTools();
    const tools = result.tools;
    
    const listTasks = tools.find(t => t.name === 'list_tasks');
    this.validateToolSchema(listTasks, 'list_tasks');
    
    const createTask = tools.find(t => t.name === 'create_task');
    this.validateToolSchema(createTask, 'create_task', ['project_id', 'title', 'task_type']);
    this.validateWorkerParams(createTask);
    
    const updateTask = tools.find(t => t.name === 'update_task');
    this.validateToolSchema(updateTask, 'update_task', ['task_id']);
    this.validateWorkerParams(updateTask);
    
    const getTask = tools.find(t => t.name === 'get_task');
    this.validateToolSchema(getTask, 'get_task', ['task_id']);
  }

  async testDocumentTools() {
    const result = await this.getTools();
    const tools = result.tools;
    
    const searchDocs = tools.find(t => t.name === 'search_documents');
    this.validateToolSchema(searchDocs, 'search_documents', ['query']);
    
    const createDoc = tools.find(t => t.name === 'create_document');
    this.validateToolSchema(createDoc, 'create_document', ['title', 'type']);
    this.validateWorkerParams(createDoc);
    
    const updateDoc = tools.find(t => t.name === 'update_document');
    this.validateToolSchema(updateDoc, 'update_document', ['document_id']);
    this.validateWorkerParams(updateDoc);
  }

  async testCommentTools() {
    const result = await this.getTools();
    const tools = result.tools;
    
    const listComments = tools.find(t => t.name === 'list_task_comments');
    this.validateToolSchema(listComments, 'list_task_comments', ['task_id']);
    
    const createComment = tools.find(t => t.name === 'create_comment');
    this.validateToolSchema(createComment, 'create_comment', ['task_id', 'content']);
    this.validateWorkerParams(createComment);
    
    const updateComment = tools.find(t => t.name === 'update_comment');
    this.validateToolSchema(updateComment, 'update_comment', ['comment_id', 'content']);
  }

  async testEnums() {
    const result = await this.getTools();
    const createTask = result.tools.find(t => t.name === 'create_task');
    const props = createTask.inputSchema.properties;
    
    if (!props.task_type.enum?.includes('epic') || !props.task_type.enum?.includes('task')) {
      throw new Error('create_task should include epic and task types');
    }
    
    if (!props.status.enum?.includes('todo') || !props.status.enum?.includes('done')) {
      throw new Error('create_task should include todo and done status');
    }
    
    if (!props.priority.enum?.includes('low') || !props.priority.enum?.includes('critical')) {
      throw new Error('create_task should include low and critical priority');
    }
  }

  async runAllTests() {
    console.log('🚀 Testing MCP Server Schema (No Backend Required)\n');
    
    await this.runTest('Tool Count (18 tools)', () => this.testToolCount());
    await this.runTest('Project Tools Schema', () => this.testProjectTools());
    await this.runTest('Task Tools Schema', () => this.testTaskTools());
    await this.runTest('Document Tools Schema', () => this.testDocumentTools());
    await this.runTest('Comment Tools Schema', () => this.testCommentTools());
    await this.runTest('Enum Validation', () => this.testEnums());

    console.log(`\n📊 Schema Test Results: ${this.passed} passed, ${this.failed} failed`);
    
    if (this.failed > 0) {
      process.exit(1);
    } else {
      console.log('🎉 All schema tests passed! Server correctly defines 18 tools.');
    }
  }
}

const validator = new SchemaValidator();
validator.runAllTests().catch(console.error); 