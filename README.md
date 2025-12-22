# AI Debates

A modern web application that facilitates structured debates between AI models on any topic. Watch as different AI models argue for and against propositions, with multiple AI judges evaluating the quality of arguments and determining a winner.

## Features

- 🤖 **Multi-Model Debates**: Choose from various AI models (Claude Haiku 4.5, Claude Sonnet 4.5, DeepSeek V3.2, Gemini 3 Flash Preview, Gemini 3 Pro Preview, GPT-5.2, Grok 4, Mistral Medium 3.1) to debate any topic
- 🎯 **Structured Rounds**: Configure the number of debate rounds (1-5) for in-depth discussions
- ⚖️ **AI Judges**: Multiple AI models evaluate debates based on reasoning quality, evidence, and persuasiveness
- 💾 **Local Storage**: Debates are automatically saved to your browser's local storage for later review
- 🎨 **Modern UI**: Beautiful, responsive interface with dark mode support built with Tailwind CSS and shadcn/ui
- 📊 **Real-time Updates**: Server-Sent Events (SSE) provide live updates as debates progress
- 📝 **Markdown Support**: Debate content is rendered with full markdown support for better readability
- 📋 **Debates List**: View all saved debates with details including models, reading times, and usage statistics
- 🏆 **Leaderboard**: Track model performance with win rates, average scores, and comprehensive statistics
- 💰 **Usage Tracking**: Monitor token usage and costs for each debate and overall
- ⏱️ **Reading Time**: Automatic calculation of estimated reading time for each debate side

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Routing**: TanStack Router
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Forms**: TanStack Form
- **Markdown**: react-markdown

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

### 2. Start the Backend

The backend must be running for the frontend to work. See the [backend README](./backend/README.md) for setup instructions.

```bash
cd backend
npm install
npm run start:dev
```

The backend will run on `http://localhost:3001` by default.

### 3. Start the Frontend

In a new terminal, from the project root:

```bash
pnpm dev
```

The frontend will be available at `http://localhost:5173` (or the next available port).

### 4. Configure API Key

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
│   │   ├── debate/      # Debate-specific components (DebateContent, JudgeEvaluationCard, etc.)
│   │   └── ui/          # shadcn/ui components (Button, Card, Input, etc.)
│   ├── hooks/           # Custom React hooks (useApiKey, useDebates)
│   ├── routes/          # TanStack Router file-based routes
│   │   ├── __root.tsx   # Root layout with navigation
│   │   ├── index.tsx    # Home page with debate creation form
│   │   ├── about.tsx    # About page with detailed documentation
│   │   ├── debates.tsx  # Debates list page
│   │   ├── leaderboard.tsx  # Leaderboard and statistics page
│   │   └── debate.$debateId.tsx  # Debate viewing page
│   ├── lib/
│   │   ├── constants.ts # App constants and configuration
│   │   ├── types.ts     # TypeScript type definitions
│   │   ├── utils.ts     # Utility functions
│   │   └── debate-utils.ts  # Debate-specific utilities
│   ├── main.tsx         # Application entry point
│   └── index.css        # Global styles
├── backend/             # NestJS backend (see backend/README.md)
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## Available Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Run Biome linter
- `pnpm lint:fix` - Run Biome linter and fix issues
- `pnpm format` - Format code with Biome
- `pnpm format:check` - Check code formatting
- `pnpm check` - Run Biome check (lint + format)
- `pnpm check:fix` - Run Biome check and fix issues

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

- **API Keys**: Stored in `localStorage` under the key `openrouter_api_key`
- **Saved Debates**: Stored in `localStorage` under the key `saved_debates`
- **Pending Debates**: Temporarily stored in `localStorage` under `pending_debates` during debate initialization

All data is stored locally in your browser and never sent to external servers except for the OpenRouter API.

## Development

### Adding New UI Components

This project uses shadcn/ui. To add new components:

```bash
npx shadcn@latest add [component-name]
```

### Routing

Routes are file-based using TanStack Router. Add new routes by creating files in the `src/routes/` directory.

### Styling

- Tailwind CSS for utility-first styling
- Dark mode is enabled by default
- Custom colors and themes can be configured in `tailwind.config.js`

## Troubleshooting

### API Key Issues

- If you see authentication errors, check that your OpenRouter API key is valid
- Ensure you have sufficient credits in your OpenRouter account
- The API key is cleared automatically on authentication errors

### Backend Connection Issues

- Ensure the backend is running on `http://localhost:3001` (or your configured port)
- Check browser console for CORS or connection errors
- If using a custom backend URL, set the `VITE_API_BASE_URL` environment variable (see Environment Variables section)
- Verify the backend is accessible by checking the API endpoints directly

### Debate Not Starting

- Check that all required fields are filled (topic, both models)
- Verify your API key is saved in localStorage
- Check browser console for error messages

## License

MIT
