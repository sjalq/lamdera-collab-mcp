# Lamdera Collab MCP

Minimalist MCP server for Lamdera collaborative memory system with 18 tools covering projects, tasks, documents, comments, and activity tracking.

## Quick Start

```bash
npx @sjalq/lamdera-collab-mcp --url http://localhost:8000 --key YOUR_API_KEY
```

## Installation

### Global Install
```bash
npm install -g @sjalq/lamdera-collab-mcp
lamdera-collab-mcp --url http://localhost:8000 --key YOUR_API_KEY
```

### Local Development
```bash
git clone https://github.com/sjalq/collab2.git
cd collab2/lamdera-collab-mcp
npm install
npm start -- --url http://localhost:8000 --key YOUR_API_KEY
```

## MCP Client Configuration

Add to your MCP client config:

```json
{
  "mcpServers": {
    "lamdera-collab-mcp": {
      "command": "npx",
      "args": ["@sjalq/lamdera-collab-mcp", "--url", "http://localhost:8000", "--key", "test_key_all_projects_123"]
    }
  }
}
```

## Available Tools (18 total)

### Projects
- `list_projects` - List all accessible projects with pagination
- `get_project` - Get specific project details by ID  
- `create_project` - Create new project with description and tags

### Tasks
- `list_tasks` - List tasks with filtering by project, status, assignee
- `list_epics` - List epic-type tasks for project planning
- `get_task` - Get specific task details by ID
- `create_task` - Create new task (epic/story/task/bug/component)
- `update_task` - Update task title, description, status, priority

### Documents  
- `search_documents` - Search documents by content with scoring
- `get_document` - Get specific document by ID
- `create_document` - Create new document (plan/spec/notes/code/other)
- `update_document` - Update document content and metadata

### Comments
- `list_task_comments` - List threaded comments for a task
- `create_comment` - Add new comment with optional parent
- `update_comment` - Update comment content (author only)
- `get_comment` - Get specific comment by ID
- `delete_comment` - Delete comment (author only)

### Activity
- `get_recent_activity` - Get recent project activity across all accessible projects

## Worker Attribution

All creation/update tools support optional worker attribution:
- `worker_type`: "dev", "pm", or "reviewer"  
- `worker_name`: String identifier for the worker

## API Keys

Use these test keys for development:
- `test_key_all_projects_123` - Access to all projects
- `test_key_project_1_only_456` - Project 1 only
- `test_key_sarah_all_789` - All projects (Sarah's key)
- `test_key_mike_project_4_abc` - Project 4 only

## Testing

**Schema Validation** (no backend required):
```bash
npm test
```

**Full Integration** (requires Lamdera backend at localhost:8000):
```bash
npm run test:integration
```

## Features

- **96% Test Coverage** - Comprehensive validation of all endpoints
- **Elegant Error Handling** - Graceful degradation with detailed error messages  
- **Timeout Management** - 15-second timeouts with retry logic
- **Worker Attribution** - Track AI agent and human contributions
- **Functional Design** - Pure functions with railway-oriented programming

## Requirements

- Node.js 18+
- Running Lamdera backend with collaborative memory RPC endpoints
- Valid API key for backend authentication 