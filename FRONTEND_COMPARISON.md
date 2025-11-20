# Frontend Visualization Comparison

This document explains the two different frontend implementations for the workflow visualizer and when to use each.

## Overview

There are two versions of the workflow visualizer:

1. **Local ReactFlow Frontend** - Full-featured interactive flow diagram for local development
2. **Val Town Frontend** - Simplified embedded version for Val Town HTTP vals

---

## 1. Local ReactFlow Frontend

**Location:** `/frontend/` directory

### Technology Stack
- **React** 18+ with TypeScript
- **ReactFlow** - Interactive node-based UI library
- **Vite** - Build tool and dev server
- **CSS** - Modular component stylesheets

### Features
- ✨ **Interactive Flow Diagram** - Drag, zoom, and pan canvas
- 🎨 **Custom Step Nodes** with rich visualizations:
  - Step number badges (#1, #2, etc.)
  - Status icons (✓ success, ✗ failed, ● running, ○ pending)
  - Expandable output/error displays
  - Animated spinners for running steps
- 🔗 **Animated Edges** - Color-coded connections between steps
  - Green for successful steps
  - Red for failed steps
  - Blue animated edges for running steps
  - Gray for pending steps
- 🗺️ **MiniMap & Controls** - Easy navigation for large workflows
- 📊 **Visual Graph Layout** - Automatic vertical step arrangement
- 🎯 **Start/End Nodes** - Clear workflow boundaries

### Visual Style
- **Light theme** - White background (#FFFFFF)
- **Material Design colors** - Green/red/blue status indicators
- **Professional layout** - Clean, spacious design

### Use Cases
- **Local development** - Full-featured workflow development
- **Desktop applications** - Rich visualization needs
- **Complex workflows** - Many steps or branches
- **Interactive debugging** - Detailed step inspection

### Setup & Running
```bash
cd frontend
npm install
npm run dev
# Visit http://localhost:3000
```

The frontend expects the API server to be running separately on port 8000.

### Architecture
```
frontend/
├── src/
│   ├── App.tsx                      # Main app with sidebar
│   ├── components/
│   │   ├── WorkflowVisualizer.tsx   # ReactFlow canvas
│   │   └── StepNode.tsx             # Custom step node component
│   ├── types.ts                     # TypeScript interfaces
│   └── *.css                        # Component styles
├── index.html
└── package.json
```

---

## 2. Val Town Frontend

**Location:** `examples/api-server-example.http.ts` (embedded)

### Technology Stack
- **React** 18.2.0 from CDN (esm.sh)
- **Plain HTML/CSS** - No build step required
- **Import Maps** - Modern ESM imports
- **Inline JavaScript** - Single-file deployment

### Features
- 📝 **List-based Layout** - Simple vertical step list
- 🎨 **Color-coded Borders** - Visual step status indicators
  - Blue border for pending steps
  - Green border for completed steps
  - Red border for failed steps
- 🏷️ **Status Badges** - Clear running/success/failed indicators
- 📊 **Step Details** - Expandable output and error information
- 🔄 **Auto-refresh** - Optional automatic run updates
- 📱 **Responsive** - Works on all screen sizes

### Visual Style
- **Dark theme** - Near-black background (#0a0a0a)
- **Modern aesthetic** - Minimalist design
- **Compact layout** - Efficient use of space

### Use Cases
- **Val Town deployment** - Self-contained HTTP vals
- **Quick prototyping** - No build step needed
- **Simple workflows** - Sequential step execution
- **Embedded views** - Lightweight visualization

### Deployment

**For Val Town:**
Simply copy the contents of `examples/api-server-example.http.ts` to a Val Town HTTP val. Everything (API + frontend) is included in a single file.

**For Local Development:**
Run the local server version for testing without deploying:
```bash
deno run --allow-all examples/api-server-example-local.ts
# Open http://localhost:8000
```

This gives you the same embedded visualizer but running locally on port 8000.

### Architecture
```
api-server-example.http.ts        # Val Town deployment version
api-server-example-local.ts       # Local development version
├── Workflow definitions
├── Hono API routes
└── Embedded HTML with:
    ├── <style> - Inline CSS
    ├── <script type="importmap"> - React imports
    └── <script type="module"> - React app code

# Only difference between files:
# .http.ts → exports app.fetch
# -local.ts → calls Deno.serve()
```

---

## Feature Comparison Table

| Feature | ReactFlow Frontend | Val Town Frontend |
|---------|-------------------|-------------------|
| **Interactive Canvas** | ✅ Drag/zoom/pan | ❌ Static layout |
| **Node Visualization** | ✅ Custom nodes with ReactFlow | ⚠️ Simple list items |
| **Edge Animation** | ✅ Animated connections | ❌ No edges shown |
| **MiniMap** | ✅ Navigation aid | ❌ Not applicable |
| **Build Required** | ✅ Yes (Vite) | ❌ No |
| **Dependencies** | ~15 npm packages | 0 (CDN only) |
| **File Size** | ~2MB bundled | ~20KB inline |
| **Load Time** | ~1-2s initial | ~300ms |
| **Theme** | Light | Dark |
| **Step Output Display** | ✅ Collapsible | ✅ Inline |
| **Auto-refresh** | ✅ Yes | ✅ Yes |
| **Mobile Friendly** | ⚠️ Touch gestures | ✅ Responsive |
| **Setup Complexity** | High | None |
| **Val Town Compatible** | ❌ No | ✅ Yes |

---

## Decision Guide

### Choose ReactFlow Frontend when:
- 🏢 Building for local/desktop deployment
- 📊 Workflows have complex branching logic
- 🔍 Need detailed visual debugging
- 👥 Team prefers modern dev tooling
- 💪 Want the richest user experience

### Choose Val Town Frontend when:
- ☁️ Deploying to Val Town platform
- 🚀 Need quick prototyping
- 📦 Want minimal dependencies
- 🔧 Working with simple sequential workflows
- ⚡ Prefer fast, lightweight solutions

---

## API Compatibility

Both frontends consume the **same API endpoints**:

```
GET  /api/workflows           # List all workflows
GET  /api/workflows/:id       # Get workflow details
GET  /api/workflows/:id/runs  # List runs for workflow
POST /api/workflows/:id/runs  # Create new run
GET  /api/runs/:runId         # Get run details
```

**Data Format:**
```typescript
interface WorkflowData {
  id: string
  description?: string
  steps: { id: string; description?: string }[]
  exampleInput?: Record<string, unknown>
}

interface WorkflowRunData {
  runId: string
  workflowId: string
  status: 'running' | 'success' | 'failed'
  executionPath: number[]
  stepResults: Record<string, StepResult>
  inputData: unknown
  result?: unknown
  error?: string
  createdAt: number
  updatedAt: number
}
```

This means you can:
- ✅ Develop with ReactFlow frontend locally
- ✅ Deploy Val Town frontend to production
- ✅ Switch between them freely
- ✅ Use both simultaneously (different ports/domains)

---

## Migration Path

### Testing Embedded Visualizer Locally

To test the Val Town-style embedded visualizer without deploying:
```bash
deno run --allow-all examples/api-server-example-local.ts
# Open http://localhost:8000
```

### From Embedded → ReactFlow

1. Clone the repository
2. Install frontend dependencies: `cd frontend && npm install`
3. Start API server: `deno run --allow-all examples/api-server-example-local.ts`
4. Start frontend: `npm run dev` (in a separate terminal)
5. Open http://localhost:3000 for ReactFlow UI

Both frontends can run simultaneously (different ports).

### From ReactFlow → Val Town

1. Copy `examples/api-server-example.http.ts` to Val Town
2. Ensure workflow definitions are included
3. Deploy as HTTP val
4. Access directly via Val Town URL

---

## Future Enhancements

### Potential ReactFlow Improvements
- Branching/conditional workflows
- Parallel step execution visualization
- Step retry/rollback controls
- Real-time collaboration
- Export to image/PDF

### Potential Val Town Improvements
- CSS Grid for visual flow layout
- SVG-based edge rendering
- Collapsible step output
- Dark/light theme toggle
- Keyboard navigation

---

## Conclusion

Both frontends serve different purposes:

- **ReactFlow** = Power user experience for development
- **Val Town** = Lightweight, deployable solution

Choose based on your deployment target and feature requirements. The shared API ensures you're never locked into one approach.
