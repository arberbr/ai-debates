# AI Debates

A modern web application that facilitates structured debates between AI models on any topic. Watch as different AI models argue for and against propositions, with multiple AI judges evaluating the quality of arguments and determining a winner.

## Features

- 🤖 **Multi-Model Debates**: Choose from various AI models (Claude Haiku 4.5, Claude Sonnet 4.5, DeepSeek V3.2, Gemini 3 Flash Preview, Gemini 3 Pro Preview, GPT-5.2, Grok 4, Mistral Medium 3.1) to debate any topic
- 🎯 **Structured Rounds**: Configure the number of debate rounds (1-5) for in-depth discussions
- ⚖️ **AI Judges**: Three independent AI judges (GPT-5.2, Claude Sonnet 4.5, Gemini 3 Pro) evaluate debates based on reasoning quality, evidence, and persuasiveness
- 💾 **Local Storage**: Debates are automatically saved to your browser's local storage for later review
- 🎨 **Modern UI**: Beautiful, responsive interface with dark mode support built with Tailwind CSS and shadcn/ui
- 📊 **Real-time Updates**: Server-Sent Events (SSE) provide live updates as debates progress
- 📝 **Markdown Support**: Debate content is rendered with full markdown support for better readability
- 📋 **Debates List**: View all saved debates with details including models, reading times, and usage statistics
- 🏆 **Leaderboard**: Track model performance with win rates, average scores, and comprehensive statistics
- 💰 **Usage Tracking**: Monitor token usage and costs for each debate and overall
- ⏱️ **Reading Time**: Automatic calculation of estimated reading time for each debate side
- 🔄 **Cross-Tab Sync**: Debates saved in one tab automatically appear in other tabs
- 🛡️ **Error Handling**: Comprehensive error boundaries and retry logic for resilient operation
- 🎯 **Custom Judge Criteria**: Optional judge system prompts to customize evaluation criteria

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Routing**: TanStack Router (file-based routing with type safety)
- **Forms**: TanStack Form
- **Styling**: Tailwind CSS with dark mode
- **UI Components**: shadcn/ui (built on Radix UI primitives)
- **Markdown**: react-markdown
- **Notifications**: Sonner (toast notifications)
- **Code Quality**: Biome (linting and formatting)

## Prerequisites

- Node.js 20+ (recommended)
- pnpm (package manager)
- OpenRouter API key ([Get one here](https://openrouter.ai/))

## Getting Started

### 1. Install Dependencies

From the project root:

```bash
pnpm install
```

### 2. Start the Frontend

In a new terminal, from the project root:

```bash
pnpm dev
```

The frontend will be available at `http://localhost:5173` (or the next available port).

**Note:** The backend must be running for the frontend to work. The frontend connects to `http://localhost:3001` by default (configurable via `VITE_API_BASE_URL` environment variable).

### 3. Configure API Key

1. Open the application in your browser
2. Enter your OpenRouter API key when prompted
3. The API key is stored locally in your browser and will be remembered for future sessions

## Usage

### Starting a Debate

1. **Enter Debate Topic**: Provide a topic, question, or even a full article you want to debate
2. **Select Models**: Choose one model for the "FOR" side and another for the "AGAINST" side
3. **Configure Rounds**: Set the number of debate rounds (1-5)
4. **Set Judge Criteria** (Optional): Customize how judges should evaluate the debate
5. **Start Debate**: Click "Start Debate" to begin

### Viewing Debates

- **Active Debates**: Watch debates progress in real-time with live status updates
- **Debates List**: Access the "Debates" page from the navigation to view all saved debates with summaries, models used, reading times, and usage statistics
- **Debate Details**: Click on any debate to view full transcripts, judge evaluations, scores, usage statistics, and final results
- **Leaderboard**: View the "Leaderboard" page to see model performance statistics, overall usage metrics, and most debated topics

### Debate Process

1. **Title Generation**: A concise title (7-12 words) is generated for easy identification
2. **Opening Statements**: Both models present their initial arguments simultaneously
3. **Rebuttal Rounds**: Models engage in structured rounds (1-5), responding to each other's arguments
4. **Conclusions**: Both models deliver final statements summarizing their positions
5. **Judge Evaluation**: Three AI judges (GPT-5.2, Claude Sonnet 4.5, Gemini 3 Pro) independently evaluate the debate
6. **Final Result**: Aggregate scores determine the winner based on average scores with a 5-point threshold

## Project Structure

```
ai-debates/
├── src/
│   ├── components/
│   │   ├── debate/              # Debate-specific components
│   │   │   ├── DebateContent.tsx        # Main debate content container
│   │   │   ├── DebateMessageCard.tsx    # Individual message cards (FOR/AGAINST)
│   │   │   ├── FinalResultCard.tsx       # Final result display
│   │   │   ├── JudgeEvaluationCard.tsx   # Individual judge evaluations
│   │   │   ├── MarkdownContent.tsx       # Markdown renderer component
│   │   │   └── UsageStatsCard.tsx       # Token usage and cost display
│   │   ├── layout/
│   │   │   └── Navbar.tsx               # Navigation bar component
│   │   ├── ui/                  # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── empty-state.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   ├── textarea.tsx
│   │   │   └── toast.tsx
│   │   └── ErrorBoundary.tsx    # Error boundary for error handling
│   ├── hooks/                   # Custom React hooks
│   │   ├── useApiKey.ts         # API key management hook
│   │   ├── useDebates.ts        # Debates CRUD operations hook
│   │   ├── useDebateStream.ts   # SSE streaming hook for real-time debate progress
│   │   └── useLocalStorage.ts   # Generic localStorage utility hook
│   ├── routes/                  # TanStack Router file-based routes
│   │   ├── __root.tsx           # Root layout with navigation and error boundary
│   │   ├── index.tsx            # Home page with debate creation form
│   │   ├── about.tsx            # About page with detailed documentation
│   │   ├── debates.tsx          # Debates list page
│   │   ├── leaderboard.tsx      # Leaderboard and statistics page
│   │   └── debate.$debateId.tsx # Individual debate viewing page with SSE streaming
│   ├── lib/
│   │   ├── constants.ts         # App constants (models, storage keys, config)
│   │   ├── types.ts             # TypeScript type definitions
│   │   ├── utils.ts             # Utility functions (reading time, date formatting, markdown stripping)
│   │   └── debate-utils.ts      # Debate-specific utilities (string cleaning)
│   ├── main.tsx                 # Application entry point
│   └── index.css                # Global styles and CSS variables
├── backend/                     # NestJS backend (see backend/README.md)
├── package.json
├── vite.config.ts               # Vite configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── biome.json                   # Biome linter/formatter configuration
└── tsconfig.json                # TypeScript configuration
```

## Available Scripts

- `pnpm dev` - Start development server with hot reload (Vite dev server on port 5173)
- `pnpm build` - Build for production (includes type checking, linting, and formatting)
- `pnpm preview` - Preview production build locally
- `pnpm lint` - Run Biome linter to check for issues
- `pnpm lint:fix` - Run Biome linter and automatically fix issues
- `pnpm format` - Format code with Biome
- `pnpm format:check` - Check code formatting without making changes
- `pnpm check` - Run Biome check (lint + format) without fixing
- `pnpm check:fix` - Run Biome check and automatically fix issues

**Note:** The `build` script runs `prebuild` which includes TypeScript type checking, Biome linting, and formatting before building.

## Environment Variables

The frontend supports the following optional environment variable:

- `VITE_API_BASE_URL` - Backend API base URL (default: `http://localhost:3001`)

Create a `.env` file in the project root to customize:

```env
VITE_API_BASE_URL=http://localhost:3001
```

**Note:** In Vite, environment variables must be prefixed with `VITE_` to be exposed to client-side code.

The OpenRouter API key is stored in the browser's localStorage and sent with each request (no environment variable needed).

## Browser Compatibility

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Data Storage

The application uses browser `localStorage` for all persistent data:

- **API Keys**: Stored under `openrouter_api_key` - your OpenRouter API key is stored locally and never sent to external servers except OpenRouter
- **Saved Debates**: Stored under `saved_debates` - array of completed debate objects with full transcripts, evaluations, and usage data
- **Pending Debates**: Temporarily stored under `pending_debates` during debate initialization - cleaned up after debate starts

### Storage Features

- **Cross-tab Synchronization**: Changes in one tab automatically sync to other tabs via Storage API events
- **Custom Events**: Same-tab updates trigger custom events for immediate UI updates
- **Visibility API**: Debates reload when tab becomes visible to ensure fresh data
- **Automatic Cleanup**: Pending debates are removed after successful initialization

All data is stored locally in your browser and never sent to external servers except for the OpenRouter API. No data is stored on application servers.

## Development

### Adding New UI Components

This project uses shadcn/ui. To add new components:

```bash
npx shadcn@latest add [component-name]
```

Components will be added to `src/components/ui/` and can be imported using the `@/components/ui/` alias.

### Routing

Routes are file-based using TanStack Router. Add new routes by creating files in the `src/routes/` directory:

- Static routes: `src/routes/about.tsx` → `/about`
- Dynamic routes: `src/routes/debate.$debateId.tsx` → `/debate/:debateId`
- Root layout: `src/routes/__root.tsx` wraps all routes

Routes are automatically generated and type-safe. Run `pnpm dev` to regenerate route types.

### State Management

- **Local State**: Use React hooks (`useState`, `useEffect`) for component-local state
- **Shared State**: Create custom hooks in `src/hooks/` for reusable state logic
- **Persistence**: Use `localStorage` via custom hooks (`useApiKey`, `useDebates`) for persistent data
- **Form State**: Use TanStack Form for complex forms (see `src/routes/index.tsx`)

### Styling

- **Tailwind CSS**: Utility-first styling with custom design tokens
- **Dark Mode**: Enabled by default via CSS variables in `src/index.css`
- **Theme Configuration**: Custom colors and themes in `tailwind.config.js`
- **CSS Variables**: Design tokens defined in `src/index.css` for consistent theming

### Type Safety

- **TypeScript**: Full type coverage with strict mode
- **Route Types**: TanStack Router provides type-safe navigation
- **Type Definitions**: Shared types in `src/lib/types.ts`
- **Type Inference**: Leverage TypeScript inference for props and state

### Code Quality

- **Biome**: Fast linter and formatter (replaces ESLint + Prettier)
- **Pre-commit**: Consider adding pre-commit hooks to run `pnpm check:fix`
- **Type Checking**: Run `tsc --noEmit` to check types without building

## Frontend Implementation Details

### Real-time Updates

The application uses Server-Sent Events (SSE) to stream debate progress in real-time:

- **Connection**: Established when debate starts via `/api/debate/start` endpoint
- **Streaming**: Backend sends events with `data:` prefix containing JSON payloads
- **Event Types**: `stream_start`, `opening_statements_start`, `rebuttal_round_complete`, `judging_progress`, `complete`, etc.
- **Error Handling**: Automatic retry with exponential backoff on network failures
- **Cleanup**: AbortController cancels requests on component unmount

### State Management Pattern

The application uses a hybrid approach:

1. **Component State**: React hooks for UI state (loading, errors, form values)
2. **Custom Hooks**: Encapsulate business logic (`useApiKey`, `useDebates`)
3. **localStorage**: Persistent storage with automatic synchronization
4. **Event System**: Custom events for same-tab updates, Storage API for cross-tab sync

### Reading Time Calculation

Reading times are calculated using:

- **Base Rate**: 200 words per minute
- **Markdown Stripping**: Removes formatting to count actual words
- **Aggregation**: Sums words from opening statements, all rounds, and conclusions
- **Display**: Shows "X min read" for each side

### Error Handling

- **Error Boundary**: Catches React errors and displays fallback UI
- **API Errors**: Handled with user-friendly messages and automatic API key clearing on auth errors
- **Network Errors**: Retry logic with exponential backoff (3 attempts)
- **Validation**: Client-side validation for forms with helpful error messages

### Performance Optimizations

- **Code Splitting**: Automatic route-based code splitting via TanStack Router
- **Lazy Loading**: Routes loaded on demand
- **Memoization**: Custom hooks use `useCallback` to prevent unnecessary re-renders
- **Efficient Updates**: Only affected components re-render on state changes

## Troubleshooting

### API Key Issues

- If you see authentication errors, check that your OpenRouter API key is valid
- Ensure you have sufficient credits in your OpenRouter account
- The API key is cleared automatically on authentication errors

### Debate Not Starting

- Check that all required fields are filled (topic, both models)
- Verify your API key is saved in localStorage (check browser DevTools → Application → Local Storage)
- Check browser console for error messages
- Ensure topic is not longer than 300 characters
- If you see connection errors, verify the API server is accessible

### Storage Issues

- If debates aren't saving, check browser console for localStorage errors
- Some browsers restrict localStorage in private/incognito mode
- Clear localStorage if you encounter corrupted data (DevTools → Application → Local Storage → Clear)

### Performance

- Large debates with many rounds may take time to load
- Reading time calculations process markdown, which can be slow for very long content
- Consider reducing debate rounds if experiencing performance issues

## License

MIT
