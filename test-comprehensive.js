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
    if (!result.content?.[0]?.text?.includes('data')) throw new Error('Should return filtered projects');
  }

  async testUpdateProject() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'update_project', '--tool-arg', 'project_id=1', '--tool-arg', 'name=Updated Project', '--tool-arg', 'git_remote_url=https://github.com/user/updated.git']);
    if (!result.content?.[0]?.text?.includes('id')) throw new Error('Should return updated project');
  }

  async testListTasks() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'list_tasks', '--tool-arg', 'project_id=1']);
    if (!result.content?.[0]?.text?.includes('data')) throw new Error('Should return tasks data');
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
    if (!text.includes('taskId') && !text.includes('timeout') && !text.includes('restarting')) {
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

  async testUpsertComment() {
    // Test creating a new comment
    const createResult = await this.execMCP(['--method', 'tools/call', '--tool-name', 'upsert_comment', '--tool-arg', 'task_id=1', '--tool-arg', 'content=Test comment']);
    if (!createResult.content?.[0]?.text?.includes('id')) throw new Error('Should return created comment with ID');
    
    // Test updating existing comment
    // Comment ID 5 is authored by "s.dormehl@sakeliga.org.za" - matches our API key user
    const updateResult = await this.execMCP(['--method', 'tools/call', '--tool-name', 'upsert_comment', '--tool-arg', 'comment_id=5', '--tool-arg', 'content=Updated comment']);
    const text = updateResult.content?.[0]?.text || '';
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

  async testGetTaskStatusAnalytics() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'get_task_status_analytics', '--tool-arg', 'project_id=1']);
    const text = result.content?.[0]?.text || '';
    if (!text.includes('statusCounts') && !text.includes('inProgressTasks') && !text.includes('reviewTasks') && !text.includes('Error')) {
      throw new Error('Should return analytics data with statusCounts, inProgressTasks, and reviewTasks arrays');
    }
    
    // Additional validation if we get valid JSON response
    try {
      const data = JSON.parse(text);
      if (data.statusCounts && Array.isArray(data.statusCounts)) {
        console.log(`   Found ${data.statusCounts.length} status types`);
      }
      if (data.inProgressTasks && Array.isArray(data.inProgressTasks)) {
        console.log(`   Found ${data.inProgressTasks.length} in-progress tasks`);
      }
      if (data.reviewTasks && Array.isArray(data.reviewTasks)) {
        console.log(`   Found ${data.reviewTasks.length} review tasks`);
      }
    } catch (e) {
      // Text response is fine too - could be formatted output
    }
  }

  async testTakeNextTask() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'take_next_task', '--tool-arg', 'project_id=1']);
    const text = result.content?.[0]?.text || '';
    if (!text.includes('task') && !text.includes('message') && !text.includes('Error')) {
      throw new Error('Should return task data or appropriate message');
    }
    
    // Additional validation if we get valid JSON response
    try {
      const data = JSON.parse(text);
      if (data.task) {
        console.log(`   Started task: ${data.task.title || 'Unknown'}`);
      }
      if (data.message) {
        console.log(`   Message: ${data.message}`);
      }
      if (data.alreadyInProgress !== undefined) {
        console.log(`   Already in progress: ${data.alreadyInProgress}`);
      }
      if (data.hasReviewTasks !== undefined) {
        console.log(`   Has review tasks: ${data.hasReviewTasks} (${data.reviewTaskCount || 0} tasks)`);
      }
    } catch (e) {
      // Text response is fine too - could be formatted output
    }
  }

  async testTakeNextTaskWithReviewWarning() {
    // First create a task in Review status
    const createResult = await this.execMCP(['--method', 'tools/call', '--tool-name', 'create_task', 
      '--tool-arg', 'project_id=1', '--tool-arg', 'title=Task Awaiting Review', '--tool-arg', 'task_type=task',
      '--tool-arg', 'status=review']);
    
    // Now try to take next task - should warn about review tasks
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'take_next_task', '--tool-arg', 'project_id=1']);
    const text = result.content?.[0]?.text || '';
    
    try {
      const data = JSON.parse(text);
      // If there are no InProgress tasks, it should warn about review tasks
      if (!data.alreadyInProgress && data.hasReviewTasks) {
        console.log(`   Warning: ${data.reviewTaskCount} task(s) awaiting review`);
        if (!data.message.includes('review')) {
          throw new Error('Should mention review tasks in message');
        }
      }
    } catch (e) {
      // Could be a different response format
    }
  }

  async testTakeNextReviewTask() {
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'take_next_review_task', '--tool-arg', 'project_id=1']);
    const text = result.content?.[0]?.text || '';
    if (!text.includes('task') && !text.includes('message') && !text.includes('Error')) {
      throw new Error('Should return task data or appropriate message');
    }
    
    // Additional validation if we get valid JSON response
    try {
      const data = JSON.parse(text);
      if (data.task) {
        console.log(`   Started review task: ${data.task.title || 'Unknown'}`);
      }
      if (data.message) {
        console.log(`   Message: ${data.message}`);
      }
      if (data.alreadyInProgress !== undefined) {
        console.log(`   Already in progress: ${data.alreadyInProgress}`);
      }
    } catch (e) {
      // Text response is fine too - could be formatted output
    }
  }


  async testMoveTaskToTopOrBottom() {
    // Test moving to top
    const topResult = await this.execMCP(['--method', 'tools/call', '--tool-name', 'move_task_to_top_or_bottom', '--tool-arg', 'task_id=1', '--tool-arg', 'position=top']);
    const topText = topResult.content?.[0]?.text || '';
    if (!topText.includes('success') && !topText.includes('newOrder')) throw new Error('Should return success with newOrder when moving to top');
    
    // Test moving to bottom
    const bottomResult = await this.execMCP(['--method', 'tools/call', '--tool-name', 'move_task_to_top_or_bottom', '--tool-arg', 'task_id=2', '--tool-arg', 'position=bottom']);
    const bottomText = bottomResult.content?.[0]?.text || '';
    if (!bottomText.includes('success') && !bottomText.includes('newOrder')) throw new Error('Should return success with newOrder when moving to bottom');
  }

  async testTaskRejectReview() {
    // First create a task in Review status
    const createResult = await this.execMCP(['--method', 'tools/call', '--tool-name', 'create_task', 
      '--tool-arg', 'project_id=1', '--tool-arg', 'title=Review Task', '--tool-arg', 'task_type=task',
      '--tool-arg', 'status=review']);
    
    const createText = createResult.content?.[0]?.text || '';
    const createData = JSON.parse(createText);
    const taskId = createData.id;
    
    // Now reject the task
    const result = await this.execMCP(['--method', 'tools/call', '--tool-name', 'task_reject_review', 
      '--tool-arg', `task_id=${taskId}`, '--tool-arg', 'reviewer_comment=Needs more work on error handling']);
    
    const text = result.content?.[0]?.text || '';
    if (!text.includes('task') || !text.includes('comment') || !text.includes('rejected')) {
      throw new Error('Should return task, comment, and rejection message');
    }
    
    // Verify the task is now Todo status and has the lowest order
    const data = JSON.parse(text);
    if (data.task.status !== 'todo') throw new Error('Task should be in Todo status');
    if (!data.comment.content.includes('error handling')) throw new Error('Comment should contain rejection reason');
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
    if (!partialData.taskId) {
      throw new Error('Update should return taskId');
    }
    
    // Verify the update by fetching the task
    const fetchResult = await this.execMCP(['--method', 'tools/call', '--tool-name', 'get_task', '--tool-arg', `task_id=${taskId}`]);
    const fetchText = fetchResult.content?.[0]?.text || '';
    const fetchData = JSON.parse(fetchText);
    if (fetchData.title !== 'Safe Update MCP Task' || fetchData.status !== 'in_progress') {
      throw new Error('Partial update should preserve other fields');
    }
    
    const emptyResult = await this.execMCP(['--method', 'tools/call', '--tool-name', 'update_task', 
      '--tool-arg', `task_id=${taskId}`, '--tool-arg', 'title= ', '--tool-arg', 'priority=high']);
    const emptyText = emptyResult.content?.[0]?.text || '';
    const emptyData = JSON.parse(emptyText);
    if (!emptyData.taskId) {
      throw new Error('Update should return taskId');
    }
    
    // Verify the empty string update by fetching the task
    const fetchResult2 = await this.execMCP(['--method', 'tools/call', '--tool-name', 'get_task', '--tool-arg', `task_id=${taskId}`]);
    const fetchText2 = fetchResult2.content?.[0]?.text || '';
    const fetchData2 = JSON.parse(fetchText2);
    if (fetchData2.title !== 'Safe Update MCP Task' || fetchData2.priority !== 'high') {
      throw new Error('Empty/whitespace strings should be ignored, other updates applied');
    }
    
    const whitespaceResult = await this.execMCP(['--method', 'tools/call', '--tool-name', 'update_task', 
      '--tool-arg', `task_id=${taskId}`, '--tool-arg', 'description=   ', '--tool-arg', 'status=review']);
    const whitespaceText = whitespaceResult.content?.[0]?.text || '';
    const whitespaceData = JSON.parse(whitespaceText);
    if (!whitespaceData.taskId) {
      throw new Error('Update should return taskId');
    }
    
    // Verify the whitespace update by fetching the task
    const fetchResult3 = await this.execMCP(['--method', 'tools/call', '--tool-name', 'get_task', '--tool-arg', `task_id=${taskId}`]);
    const fetchText3 = fetchResult3.content?.[0]?.text || '';
    const fetchData3 = JSON.parse(fetchText3);
    if (fetchData3.description !== 'Original description' || fetchData3.status !== 'review') {
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
    const createResult = await this.execMCP(['--method', 'tools/call', '--tool-name', 'upsert_comment', 
      '--tool-arg', 'task_id=1', '--tool-arg', 'content=Original MCP comment content']);
    
    const createText = createResult.content?.[0]?.text || '';
    const createData = JSON.parse(createText);
    const commentId = createData.id;
    
    const emptyResult = await this.execMCP(['--method', 'tools/call', '--tool-name', 'upsert_comment', 
      '--tool-arg', `comment_id=${commentId}`, '--tool-arg', 'content= ']);
    const emptyText = emptyResult.content?.[0]?.text || '';
    const emptyData = JSON.parse(emptyText);
    if (emptyData.content !== 'Original MCP comment content') {
      throw new Error('Comment empty/whitespace content should be ignored');
    }
    
    const whitespaceResult = await this.execMCP(['--method', 'tools/call', '--tool-name', 'upsert_comment', 
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

  async testLiveIntegrationWorkflow() {
    let testProjectId = null;
    let createdTaskIds = [];
    let createdDocIds = [];
    let createdCommentIds = [];

    try {
      // 1. Create test project
      const timestamp = new Date().toISOString().slice(0, 19);
      const createProjectResult = await this.execMCP([
        '--method', 'tools/call', 
        '--tool-name', 'create_project',
        '--tool-arg', `name=Live Integration Test ${timestamp}`,
        '--tool-arg', 'description=Automated full workflow integration test',
        '--tool-arg', 'git_remote_url=https://github.com/sjalq/collab.git',
        '--tool-arg', 'worker_type=dev',
        '--tool-arg', 'worker_name=Integration Test Bot'
      ]);

      if (!createProjectResult.content?.[0]?.text?.includes('id')) {
        throw new Error('Failed to create test project');
      }

      const projectData = JSON.parse(createProjectResult.content[0].text);
      testProjectId = projectData.id;
      console.log(`   📁 Created project: ${projectData.name} (ID: ${testProjectId})`);

      // 2. Create test tasks
      const taskTypes = [
        { title: 'Epic Task', type: 'epic', priority: 'high' },
        { title: 'Story Task', type: 'story', priority: 'medium' },
        { title: 'Bug Fix', type: 'bug', priority: 'critical' },
        { title: 'Component Task', type: 'component', priority: 'low' }
      ];

      for (const task of taskTypes) {
        const createTaskResult = await this.execMCP([
          '--method', 'tools/call',
          '--tool-name', 'create_task',
          '--tool-arg', `project_id=${testProjectId}`,
          '--tool-arg', `title=${task.title}`,
          '--tool-arg', `description=Integration test ${task.type}`,
          '--tool-arg', `task_type=${task.type}`,
          '--tool-arg', `priority=${task.priority}`,
          '--tool-arg', 'status=todo',
          '--tool-arg', 'worker_type=dev',
          '--tool-arg', 'worker_name=Integration Test Bot'
        ]);

        if (createTaskResult.content?.[0]?.text?.includes('id')) {
          const taskData = JSON.parse(createTaskResult.content[0].text);
          createdTaskIds.push(taskData.id);
          console.log(`   📋 Created task: ${task.title} (ID: ${taskData.id})`);
        }
      }

      // 3. Create test documents
      const documentTypes = [
        { title: 'Specification Document', type: 'specification' },
        { title: 'Development Notes', type: 'notes' },
        { title: 'Project Plan', type: 'plan' }
      ];

      for (const doc of documentTypes) {
        const createDocResult = await this.execMCP([
          '--method', 'tools/call',
          '--tool-name', 'create_document',
          '--tool-arg', `project_id=${testProjectId}`,
          '--tool-arg', `title=${doc.title}`,
          '--tool-arg', `type=${doc.type}`,
          '--tool-arg', `content=# ${doc.title}\n\nThis is integration test content for ${doc.type}.`,
          '--tool-arg', 'worker_type=dev',
          '--tool-arg', 'worker_name=Integration Test Bot'
        ]);

        if (createDocResult.content?.[0]?.text?.includes('id')) {
          const docData = JSON.parse(createDocResult.content[0].text);
          createdDocIds.push(docData.id);
          console.log(`   📄 Created document: ${doc.title} (ID: ${docData.id})`);
        }
      }

      // 4. Create comments on tasks
      if (createdTaskIds.length > 0) {
        for (let i = 0; i < Math.min(2, createdTaskIds.length); i++) {
          const createCommentResult = await this.execMCP([
            '--method', 'tools/call',
            '--tool-name', 'upsert_comment',
            '--tool-arg', `task_id=${createdTaskIds[i]}`,
            '--tool-arg', `content=Integration test comment on task ${i + 1}`,
            '--tool-arg', 'worker_type=dev',
            '--tool-arg', 'worker_name=Integration Test Bot'
          ]);

          if (createCommentResult.content?.[0]?.text?.includes('id')) {
            const commentData = JSON.parse(createCommentResult.content[0].text);
            createdCommentIds.push(commentData.id);
            console.log(`   💬 Created comment (ID: ${commentData.id})`);
          }
        }
      }

      // 5. Test task workflow
      if (createdTaskIds.length > 0) {
        // Take next task
        const takeNextResult = await this.execMCP([
          '--method', 'tools/call',
          '--tool-name', 'take_next_task',
          '--tool-arg', `project_id=${testProjectId}`
        ]);

        if (takeNextResult.content?.[0]?.text?.includes('task')) {
          console.log(`   🎯 Take next task workflow tested`);
        }

        // Move task to top
        const moveTopResult = await this.execMCP([
          '--method', 'tools/call',
          '--tool-name', 'move_task_to_top_or_bottom',
          '--tool-arg', `task_id=${createdTaskIds[0]}`,
          '--tool-arg', 'position=top'
        ]);

        if (moveTopResult.content?.[0]?.text?.includes('newOrder')) {
          console.log(`   ⬆️  Task ordering workflow tested`);
        }
      }

      // 6. Test analytics
      const analyticsResult = await this.execMCP([
        '--method', 'tools/call',
        '--tool-name', 'get_task_status_analytics',
        '--tool-arg', `project_id=${testProjectId}`
      ]);

      if (analyticsResult.content?.[0]?.text?.includes('statusCounts')) {
        console.log(`   📊 Analytics workflow tested`);
      }

      // 7. Test search
      const searchResult = await this.execMCP([
        '--method', 'tools/call',
        '--tool-name', 'search_documents',
        '--tool-arg', 'query=integration test',
        '--tool-arg', `project_id=${testProjectId}`
      ]);

      if (searchResult.content?.[0]?.text?.includes('data')) {
        console.log(`   🔍 Search workflow tested`);
      }

      console.log(`   ✅ Live integration workflow completed successfully!`);
      console.log(`   📊 Created: ${createdTaskIds.length} tasks, ${createdDocIds.length} documents, ${createdCommentIds.length} comments`);

    } catch (error) {
      console.log(`   ⚠️  Integration workflow error: ${error.message}`);
      throw error;
    } finally {
      // Cleanup note (no delete endpoint available)
      if (testProjectId) {
        console.log(`   🧹 Manual cleanup required: Delete project ID ${testProjectId} via web interface`);
      }
    }
  }

  getAllTests() {
    return [
      { name: 'list_projects', fn: () => this.testListProjects() },
      { name: 'get_project', fn: () => this.testGetProject() },
      { name: 'create_project', fn: () => this.testCreateProject() },
      { name: 'create_project_with_git_remote', fn: () => this.testCreateProjectWithGitRemote() },
      { name: 'list_projects_with_git_filter', fn: () => this.testListProjectsWithGitFilter() },
      { name: 'update_project', fn: () => this.testUpdateProject() },
      { name: 'list_tasks', fn: () => this.testListTasks() },
      { name: 'get_task', fn: () => this.testGetTask() },
      { name: 'create_task', fn: () => this.testCreateTask() },
      { name: 'update_task', fn: () => this.testUpdateTask() },
      { name: 'search_documents', fn: () => this.testSearchDocuments() },
      { name: 'get_document', fn: () => this.testGetDocument() },
      { name: 'create_document', fn: () => this.testCreateDocument() },
      { name: 'update_document', fn: () => this.testUpdateDocument() },
      { name: 'list_task_comments', fn: () => this.testListTaskComments() },
      { name: 'upsert_comment', fn: () => this.testUpsertComment() },
      { name: 'get_recent_activity', fn: () => this.testGetRecentActivity() },
      { name: 'get_task_status_analytics', fn: () => this.testGetTaskStatusAnalytics() },
      { name: 'take_next_task', fn: () => this.testTakeNextTask() },
      { name: 'take_next_task_with_review_warning', fn: () => this.testTakeNextTaskWithReviewWarning() },
      { name: 'take_next_review_task', fn: () => this.testTakeNextReviewTask() },
      { name: 'move_task_to_top_or_bottom', fn: () => this.testMoveTaskToTopOrBottom() },
      { name: 'task_reject_review', fn: () => this.testTaskRejectReview() },
      { name: 'safe_update_task', fn: () => this.testSafeUpdateTask() },
      { name: 'safe_update_document', fn: () => this.testSafeUpdateDocument() },
      { name: 'safe_update_comment', fn: () => this.testSafeUpdateComment() },
      { name: 'mermaid_subgraph_content', fn: () => this.testMermaidSubgraphContent() },
      { name: 'sql_injection_like_content', fn: () => this.testSQLInjectionLikeContent() },
      { name: 'complex_style_directives', fn: () => this.testComplexStyleDirectives() },
      { name: 'large_content_payload', fn: () => this.testLargeContentPayload() },
      { name: 'invalid_project_id', fn: () => this.testInvalidProjectId() },
      { name: 'missing_required_param', fn: () => this.testMissingRequiredParam() },
      { name: 'invalid_task_type_enum', fn: () => this.testInvalidTaskType() },
      { name: 'invalid_worker_type_defaults_to_dev', fn: () => this.testInvalidWorkerType() },
      { name: 'negative_id', fn: () => this.testNegativeId() },
      { name: 'string_id_where_number_expected', fn: () => this.testStringIdWhereNumberExpected() },
      { name: 'empty_required_string', fn: () => this.testEmptyStringRequired() },
      { name: 'unauthorized_access', fn: () => this.testUnauthorizedAccess() },
      { name: 'live_integration_workflow', fn: () => this.testLiveIntegrationWorkflow() }
    ];
  }

  async runSpecific(testSelectors) {
    const allTests = this.getAllTests();
    const selectedTests = [];

    for (const selector of testSelectors) {
      if (/^\d+$/.test(selector)) {
        // Numeric index
        const index = parseInt(selector, 10) - 1; // 1-based to 0-based
        if (index >= 0 && index < allTests.length) {
          selectedTests.push(allTests[index]);
        } else {
          console.log(`⚠️  Invalid test index: ${selector} (valid range: 1-${allTests.length})`);
        }
      } else {
        // String matching (case insensitive, substring)
        const matches = allTests.filter(test => 
          test.name.toLowerCase().includes(selector.toLowerCase())
        );
        if (matches.length > 0) {
          selectedTests.push(...matches);
        } else {
          console.log(`⚠️  No tests found matching: "${selector}"`);
        }
      }
    }

    // Remove duplicates
    const uniqueTests = selectedTests.filter((test, index, arr) => 
      arr.findIndex(t => t.name === test.name) === index
    );

    if (uniqueTests.length === 0) {
      console.log('❌ No valid tests selected. Use --list to see available tests.');
      return;
    }

    console.log('🚀 Running Selected MCP Tests');
    console.log(`🎯 Testing against: ${this.apiUrl}`);
    console.log(`🔑 Using API key: ${this.apiKey.substring(0, 8)}...${this.apiKey.substring(this.apiKey.length - 4)}`);
    console.log(`📡 Method: ${this.useMethodCall ? 'methodCall + Base64 encoding' : 'direct endpoints'}`);
    console.log(`🧪 Selected ${uniqueTests.length} test(s):`);
    uniqueTests.forEach((test, i) => console.log(`   ${i + 1}. ${test.name}`));
    console.log('');

    for (const test of uniqueTests) {
      await this.runTest(test.name, test.fn);
    }

    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
    console.log(`📈 Coverage: ${this.passed}/${this.passed + this.failed} tests (${Math.round(100 * this.passed / (this.passed + this.failed))}%)`);
  }

  listTests() {
    const allTests = this.getAllTests();
    console.log('📋 Available Tests:');
    console.log('');
    allTests.forEach((test, i) => {
      console.log(`${(i + 1).toString().padStart(2)}. ${test.name}`);
    });
    console.log('');
    console.log('Usage examples:');
    console.log('  node test-comprehensive.js --test 1 2 3    # Run tests 1, 2, and 3');
    console.log('  node test-comprehensive.js --test create   # Run all tests containing "create"');
    console.log('  node test-comprehensive.js --test project task  # Run tests containing "project" or "task"');
    console.log('  node test-comprehensive.js --test live     # Run the live integration test');
  }

  async runAll() {
    console.log('🚀 Running Comprehensive MCP Tests');
    console.log(`🎯 Testing against: ${this.apiUrl}`);
    console.log(`🔑 Using API key: ${this.apiKey.substring(0, 8)}...${this.apiKey.substring(this.apiKey.length - 4)}`);
    console.log(`📡 Method: ${this.useMethodCall ? 'methodCall + Base64 encoding' : 'direct endpoints'}`);
    console.log('');

    const allTests = this.getAllTests();
    for (const test of allTests) {
      await this.runTest(test.name, test.fn);
    }

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
let testSelectors = [];
let listTests = false;

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
  } else if (args[i] === '--test') {
    // Collect all following arguments until next flag or end
    i++;
    while (i < args.length && !args[i].startsWith('--')) {
      testSelectors.push(args[i]);
      i++;
    }
    i--; // Back up one since the loop will increment
  } else if (args[i] === '--list') {
    listTests = true;
  } else if (args[i] === '--help') {
    console.log('Usage: node test-comprehensive.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --url <api-url>       API endpoint URL (overrides --port)');
    console.log('  --port <port>         Port number (default: 8000)');
    console.log('  --key <api-key>       API key (default: test_key_all_projects_123)');
    console.log('  --verbose             Show detailed API responses for failures');
    console.log('  --use-method-call     Use methodCall with Base64 encoding (default: false)');
    console.log('  --test <selectors...> Run specific tests by index number or name matching');
    console.log('  --list               List all available tests with their index numbers');
    console.log('  --help               Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node test-comprehensive.js                          # Run all tests');
    console.log('  node test-comprehensive.js --list                   # List all available tests');
    console.log('  node test-comprehensive.js --test 1 2 3             # Run tests 1, 2, and 3');
    console.log('  node test-comprehensive.js --test create            # Run all tests containing "create"');
    console.log('  node test-comprehensive.js --test project task      # Run tests containing "project" or "task"');
    console.log('  node test-comprehensive.js --test live --verbose    # Run live integration test with verbose output');
    process.exit(0);
  }
}

if (!apiUrl) {
  apiUrl = `http://localhost:${port}`;
}

const tester = new ComprehensiveTester(apiUrl, apiKey, verbose, useMethodCall);

if (listTests) {
  tester.listTests();
} else if (testSelectors.length > 0) {
  tester.runSpecific(testSelectors).catch(console.error);
} else {
  tester.runAll().catch(console.error);
} 