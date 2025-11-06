# AG-UI ADK React Chat Playground

A simple AG-UI ADK React Chat playground to explore and understand the technology. 

![Playground Screenshot](screenshot.png)

## 🚀 Get started

### 1. Install dependencies
```bash
nvm install && npm install && npm run install:agent
```

### 2. Activate environment
```bash
source agent/.venv/bin/activate
```

### 3. Set up your Google API key
```bash
export GOOGLE_API_KEY="your-google-api-key-here"
```

### 4. Run the project

#### Option 1: Run agent and playground interface
```bash
npm run dev
```

> AG-UI ADK Server will be available on http://localhost:8000/ag-ui

> AG-UI ADK React chat playground will be available on http://localhost:3005

#### Option 2: Run playground interface only
```bash
VITE_AG_UI_URL="http://localhost:8000/ag-ui" VITE_INITIAL_STATE='{"user_id":"user-123","user_name":"John Doe"}' npm run dev:ui
```

Change `VITE_AG_UI_URL` to your AG-UI server and `VITE_INITIAL_STATE` to correspondent required state.

## 🔧 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GOOGLE_API_KEY` | Google API key for AI agent | - | ✅ |
| `VITE_AG_UI_URL` | AG-UI server URL | `http://localhost:8000/ag-ui` | ❌ |
| `VITE_INITIAL_STATE` | Initial chat state (JSON) | `'{"user_id":"user-123","user_name":"John Doe"}'`| ❌ |

## ⚠️ Disclaimer

This playground is built using specific versions of AG-UI ADK components. For compatibility and optimal performance:

- Ensure your AG-UI server version matches the ADK version used in this project
- Some features may not work correctly with different AG-UI server versions