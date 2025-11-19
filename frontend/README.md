# Workflow Visualizer

A React-based canvas visualizer for the wrkflw workflow engine. Provides real-time visualization of workflow execution with interactive controls.

## Features

- **Interactive Canvas**: Built with React Flow for smooth pan, zoom, and navigation
- **Real-time Updates**: Auto-refresh to watch workflow execution live
- **Step Details**: View step outputs, errors, and execution status
- **Multiple Workflows**: Switch between different workflows and their runs
- **Execution History**: Browse past workflow runs and their results
- **Status Indicators**: Visual feedback for running, success, and failed steps

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- The wrkflw backend API server running on port 8000

### Installation

```bash
npm install
# or
bun install
```

### Development

Start the development server:

```bash
npm run dev
# or
bun run dev
```

The app will be available at `http://localhost:3000`.

### Building for Production

```bash
npm run build
# or
bun run build
```

Preview the production build:

```bash
npm run preview
# or
bun run preview
```

## Usage

### 1. Start the Backend API Server

First, start the wrkflw backend with the API server:

```bash
# From the root directory
deno run --allow-all examples/api-server-example.ts
```

This will:
- Initialize the workflow engine
- Register example workflows
- Start the API server on port 8000

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

### 3. Using the Visualizer

1. **Select a Workflow**: Click on a workflow in the left sidebar
2. **Create a Run**: Click "+ New Run" to execute the workflow
3. **Watch Live**: Enable "Auto-refresh" to see real-time updates
4. **Inspect Steps**: Click on step nodes to see detailed outputs
5. **Navigate**: Use mouse to pan, scroll to zoom, minimap for overview

## Architecture

### Components

- **App.tsx**: Main application container, manages workflow and run selection
- **WorkflowVisualizer.tsx**: Canvas-based workflow renderer using React Flow
- **StepNode.tsx**: Custom node component for workflow steps

### State Management

- React hooks for local state
- Fetch API for backend communication
- Auto-refresh polling for real-time updates

### API Integration

The frontend communicates with the backend API:

```
GET  /api/workflows           - List all workflows
GET  /api/workflows/:id       - Get workflow details
GET  /api/workflows/:id/runs  - List runs for a workflow
POST /api/workflows/:id/runs  - Create a new run
GET  /api/runs/:runId         - Get run details
```

## Customization

### Styling

Modify the CSS files to customize the appearance:

- `App.css`: Main layout and sidebar styles
- `WorkflowVisualizer.css`: Canvas and header styles
- `StepNode.css`: Step node appearance and animations

### Node Layout

Adjust the graph layout in `WorkflowVisualizer.tsx`:

```typescript
const nodeWidth = 220
const nodeHeight = 100
const horizontalGap = 100
const verticalGap = 80
```

### Status Colors

Customize status colors in `StepNode.tsx`:

```typescript
const getStatusColor = () => {
  switch (status) {
    case 'success': return '#4CAF50'
    case 'failed': return '#F44336'
    case 'running': return '#2196F3'
    default: return '#999'
  }
}
```

## Technology Stack

- **React 18**: UI framework
- **TypeScript**: Type safety
- **React Flow**: Canvas rendering and interactions
- **Vite**: Build tool and dev server
- **Zustand**: State management (via React Flow)

## Development Tips

### Hot Module Replacement

Vite provides instant HMR. Changes to React components will reflect immediately without losing state.

### Debugging

Open React DevTools to inspect component state and props. The browser console shows API requests and responses.

### API Proxy

The dev server proxies `/api/*` requests to `http://localhost:8000`. This avoids CORS issues during development.

## Troubleshooting

### API Connection Issues

If workflows don't load:

1. Ensure the backend API server is running on port 8000
2. Check the browser console for CORS or network errors
3. Verify the proxy configuration in `vite.config.ts`

### Run Not Updating

If a run appears stuck:

1. Enable auto-refresh
2. Check the backend console for errors
3. Manually refresh by clicking the run again

### Build Errors

If TypeScript errors occur:

```bash
npm run build -- --force
```

Or check for missing dependencies:

```bash
npm install
```

## Contributing

When adding new features:

1. Add TypeScript types to `types.ts`
2. Update components with proper typing
3. Add CSS for new elements
4. Test with multiple workflows and run states

## License

Same license as the parent wrkflw project.
