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

This MCP server provides 21 tools organized into 6 categories:

### Project Management
- `list_projects` - View all accessible projects with filtering options
- `get_project` - Get detailed project information by ID
- `get_project_by_git_remote` - Find project by git remote URL
- `create_project` - Create new projects with tags and git integration
- `update_project` - Update project details and metadata

### Task Management  
- `list_tasks` - List and filter tasks by status, assignee, or project
- `get_task` - Get detailed task information with comments
- `create_task` - Create tasks (epics, stories, tasks, bugs, components)
- `update_task` - Update task details, status, and priority

### Task Workflow & Automation
- `take_next_task` - Automatically pick the next highest priority todo task
- `take_next_review_task` - Pick the next task in review status
- `move_task_to_top_or_bottom` - Reorder tasks for priority management
- `task_reject_review` - Reject review tasks back to todo with feedback
- `get_task_status_analytics` - Get task status distribution and metrics

### Documentation Management
- `search_documents` - Search project documentation with text queries
- `get_document` - Retrieve specific documents by ID
- `create_document` - Create technical docs, specifications, or notes
- `update_document` - Update existing documentation content

### Collaboration & Communication
- `list_task_comments` - View hierarchical task discussions
- `upsert_comment` - Create or update comments on tasks and documents

### Activity & Monitoring
- `get_recent_activity` - Monitor project activity and changes

## Key Features

- **Project Discovery**: Find projects by git remote URL for seamless integration
- **Automated Workflows**: Take next tasks automatically with priority ordering
- **Task Prioritization**: Move tasks to top/bottom with normalized ordering
- **Review Management**: Streamlined task review and rejection workflows
- **Rich Documentation**: Full text search and document management
- **Activity Tracking**: Monitor project progress and team activity
- **Hierarchical Comments**: Threaded discussions on tasks and documents

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