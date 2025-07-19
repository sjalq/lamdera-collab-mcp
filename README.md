# Lamdera Collab MCP

A Model Context Protocol (MCP) server that provides AI assistants with tools to interact with a Lamdera-based collaborative project management system. This server enables Claude and other MCP-compatible AI assistants to manage projects, tasks, documents, and comments programmatically.

## Installation

```bash
npm install -g @sjalq/lamdera-collab-mcp
```

## Usage

### Run directly with npx (no installation required)
```bash
npx @sjalq/lamdera-collab-mcp --url YOUR_LAMDERA_URL --key YOUR_API_KEY
```

### Run after global installation
```bash
lamdera-collab-mcp --url YOUR_LAMDERA_URL --key YOUR_API_KEY
```

## Configuration for AI Assistants

Add this to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "lamdera-collab": {
      "command": "npx",
      "args": ["@sjalq/lamdera-collab-mcp", "--url", "YOUR_LAMDERA_URL", "--key", "YOUR_API_KEY"]
    }
  }
}
```

## Available Tools

This MCP server provides 18 tools organized into 5 categories:

### Project Management
- `list_projects` - View all accessible projects
- `get_project` - Get detailed project information
- `create_project` - Create new projects with tags

### Task Management  
- `list_tasks` - List and filter tasks by status, assignee, or project
- `list_epics` - View high-level epics for planning
- `get_task` - Get detailed task information
- `create_task` - Create tasks (epics, stories, tasks, bugs)
- `update_task` - Update task details and status

### Documentation
- `search_documents` - Search project documentation
- `get_document` - Retrieve specific documents
- `create_document` - Create technical docs, specs, or notes
- `update_document` - Update existing documentation

### Collaboration
- `list_task_comments` - View task discussions
- `create_comment` - Add comments to tasks
- `update_comment` - Edit your comments
- `get_comment` - Get comment details
- `delete_comment` - Remove comments

### Activity Tracking
- `get_recent_activity` - Monitor project activity

## Requirements

- Node.js 18 or higher
- A running Lamdera backend instance
- Valid API key for authentication

## What is Lamdera?

Lamdera is a full-stack pure functional programming platform for building web applications in Elm. This MCP server connects to a Lamdera backend that implements a collaborative project management system.

## License

MIT

## Author

Klaar

## Repository

[https://github.com/sjalq/lamdera-collab-mcp](https://github.com/sjalq/lamdera-collab-mcp)