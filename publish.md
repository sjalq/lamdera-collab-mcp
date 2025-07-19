# Publishing to NPM

## Pre-publish Checklist

1. **Test everything works**:
   ```bash
   npm test
   npm run test:integration
   ```

2. **Update version** (if needed):
   ```bash
   npm version patch  # or minor/major
   ```

3. **Login to NPM**:
   ```bash
   npm login
   ```

## Publish

```bash
npm publish
```

## Post-publish Testing

Test the published package:
```bash
npx @sjalq/lamdera-collab-mcp --url http://localhost:8000 --key test_key_all_projects_123
```

## Quick Usage

Users can now run:
```bash
npx @sjalq/lamdera-collab-mcp --url YOUR_LAMDERA_URL --key YOUR_API_KEY
```

Or install globally:
```bash
npm install -g @sjalq/lamdera-collab-mcp
lamdera-collab-mcp --url YOUR_LAMDERA_URL --key YOUR_API_KEY
```

## MCP Client Config

```json
{
  "mcpServers": {
    "lamdera-collab-mcp": {
      "command": "npx",
      "args": ["@sjalq/lamdera-collab-mcp", "--url", "http://localhost:8000", "--key", "YOUR_API_KEY"]
    }
  }
}
``` 