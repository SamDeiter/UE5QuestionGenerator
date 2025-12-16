# AI Indexing Optimization Rules

This project uses .aiexclude to optimize AI indexing. The following directories and files are excluded to improve performance and reduce context waste.

## Excluded Directories

### Dependencies
- 
ode_modules/ - Frontend dependencies
- unctions/node_modules/ - Firebase Functions backend dependencies

### Build Outputs
- dist/ - Vite build output
- uild/ - Alternative build output
- coverage/ - Test coverage reports

### Firebase
- .firebase/ - Firebase cache files

### Python/MCP Server
- ntigravity-mcp-server/__pycache__/
- ntigravity-mcp-server/venv/
- ntigravity-mcp-server/.venv/
- ntigravity-mcp-server/.env/
- env/, .venv/, .env/ - Virtual environments

### Backups
- ackups/ - Large redundant backup files
- scripts/archive/, scripts/backups/, scripts/security_backups/

## Excluded Files

### Large Log Files
- 	est_output.txt
- lint_output.json
- lint_current.txt
- *.log

### Assets
- *.svg, *.png, *.jpg, *.jpeg, *.gif, *.ico
- *.mp4, *.webm, *.webp
- Font files: *.woff, *.woff2, *.ttf, *.eot

## Reference
See .aiexclude in project root for the full exclusion list.
