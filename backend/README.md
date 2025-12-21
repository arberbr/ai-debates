# AI Debates Backend

NestJS backend service that orchestrates structured debates between AI models via the OpenRouter API. The backend handles topic analysis, debate rounds, judge evaluations, and streams real-time updates to the frontend using Server-Sent Events (SSE).

## Features

- 🎯 **Topic Processing**: Rewrites and analyzes debate topics for clarity
- 🔄 **Multi-Round Debates**: Orchestrates structured debate rounds between two AI models
- ⚖️ **AI Judge Panel**: Three independent AI judges evaluate each debate
- 📡 **Real-time Streaming**: Server-Sent Events (SSE) for live progress updates
- 🔌 **OpenRouter Integration**: Unified API for accessing multiple LLM providers
- 📊 **Result Calculation**: Aggregates judge scores to determine winners

## Tech Stack

- **Framework**: NestJS 11
- **Runtime**: Node.js 20+ (recommended)
- **LLM Gateway**: OpenRouter API (`https://openrouter.ai`)
- **Language**: TypeScript

## Prerequisites

- Node.js 20+ (recommended)
- npm or yarn
- OpenRouter API key ([Get one here](https://openrouter.ai/))

## Getting Started

### 1. Install Dependencies

From the `backend` directory:

```bash
cd backend
npm install
```

### 2. Configure Environment

The backend can read the OpenRouter API key from:
- Request body (`api_key` field)
- Environment variable `OPENROUTER_API_KEY` (optional)

**Optional Environment Variables:**

- `PORT` - HTTP port for the NestJS app (default: `3001`)

Create a `.env` file (optional):

```bash
PORT=3001
OPENROUTER_API_KEY=sk-or-v1-...  # Optional, can be provided per request
```

### 3. Run the Server

**Development mode** (with hot reload):

```bash
npm run start:dev
```

**Production mode**:

```bash
npm run build
npm run start:prod
```

The backend will be available at `http://localhost:3001` (or `http://localhost:$PORT`).

## API Endpoints

Base path: `http://localhost:3001/api/debate`

### POST `/start`

Start a new debate. Returns a Server-Sent Events (SSE) stream.

**Request Body:**

```json
{
  "topic": "Should artificial intelligence be regulated?",
  "yesModel": "openai/gpt-5.2",
  "noModel": "anthropic/claude-sonnet-4.5",
  "rounds": 3,
  "judgePrompt": "Evaluate based on reasoning quality, evidence strength, and persuasiveness",
  "api_key": "sk-or-v1-..." // Optional, falls back to OPENROUTER_API_KEY env var
}
```

**Parameters:**
- `topic` (string, required): The debate topic, question, or article
- `yesModel` (string, required): OpenRouter model ID for the "FOR" side
- `noModel` (string, required): OpenRouter model ID for the "AGAINST" side
- `rounds` (number, required): Number of debate rounds (1-5)
- `judgePrompt` (string, optional): Custom instructions for judges
- `api_key` (string, optional): OpenRouter API key for this request

**Response:** SSE stream with events:

```text
data: {"type":"stream_start","stage":"stream_start","message":"Debate stream initialized",...}

data: {"type":"topic_rewrite_start","stage":"topic_rewrite_start","message":"Analyzing and rewriting topic...",...}

data: {"type":"topic_rewrite_complete","stage":"topic_rewrite_complete","data":{"rewrittenTopic":"..."},...}

data: {"type":"analysis_start","stage":"analysis_start","message":"Analyzing topic with debate participants...",...}

data: {"type":"analysis_complete","stage":"analysis_complete","data":{"yesAnalysis":"...","noAnalysis":"..."},...}

data: {"type":"debate_start","stage":"debate_start","message":"Starting debate rounds...",...}

data: {"type":"round_start","stage":"round_start","data":{"round":1},...}

data: {"type":"round_complete","stage":"round_complete","data":{"round":1,"yesMessage":{...},"noMessage":{...}},...}

data: {"type":"debate_complete","stage":"debate_complete","data":{"rounds":[...]},...}

data: {"type":"judging_start","stage":"judging_start","message":"Judges evaluating debate...",...}

data: {"type":"judge_complete","stage":"judge_complete","data":{"judgeModel":"...","evaluation":"...","winner":"yes","scores":{"yes":85,"no":72}},...}

data: {"type":"judging_complete","stage":"judging_complete","data":{"evaluations":[...],"finalResult":{"winner":"yes","aggregateScore":{"yes":82.3,"no":75.7}}},...}

data: {"type":"complete","stage":"complete","data":{...},"message":"Debate process complete",...}
```

**Error Events:**

```text
data: {"type":"error","stage":"error","message":"Error description",...}
```

### POST `/generate-title`

Generate a concise title for a debate topic.

**Request Body:**

```json
{
  "topic": "Long article or debate topic text...",
  "api_key": "sk-or-v1-..." // Optional
}
```

**Response:**

```json
{
  "success": true,
  "title": "Should AI Be Regulated?"
}
```

### GET `/status/:debateId`

Get the last known status for a debate (if tracked).

**Response:**

```json
{
  "debateId": "...",
  "status": "...",
  "timestamp": "..."
}
```

## Debate Process Flow

1. **Topic Rewriting** (Optional)
   - Uses `google/gemini-flash-1.5` to rewrite the topic concisely
   - Falls back to original topic if rewrite fails

2. **Topic Analysis**
   - Both debate models analyze the topic in parallel
   - Each model prepares their initial position (FOR/AGAINST)

3. **Debate Rounds**
   - Models engage in structured rounds
   - Each round includes responses from both sides
   - Previous rounds are included in context for subsequent rounds

4. **Judge Evaluation**
   - Three judges evaluate independently:
     - `openai/gpt-5.2`
     - `anthropic/claude-sonnet-4.5`
     - `google/gemini-3-pro-preview`
   - Each judge provides scores (0-100) and reasoning
   - Judges continue even if one fails

5. **Final Result Calculation**
   - Aggregate scores from all judges
   - Determine winner based on average scores (5-point threshold to avoid ties)

## Project Structure

```
backend/
├── src/
│   ├── common/
│   │   ├── config.ts              # Default model configurations
│   │   └── openrouter.service.ts  # OpenRouter API client
│   ├── debate/
│   │   ├── debate.controller.ts   # HTTP endpoints
│   │   ├── debate.service.ts      # Debate orchestration logic
│   │   ├── debate-status.service.ts  # Status tracking
│   │   ├── debate.module.ts        # NestJS module
│   │   ├── dto/
│   │   │   └── start-debate.dto.ts # Request DTOs
│   │   └── interfaces/
│   │       └── debate.interface.ts # TypeScript interfaces
│   ├── app.module.ts              # Root module
│   └── main.ts                    # Application entry point
├── package.json
├── tsconfig.json
└── nest-cli.json
```

## Available Models

The backend supports any model available on OpenRouter. Common models include:

- `openai/gpt-5.2` - OpenAI GPT-5.2
- `anthropic/claude-sonnet-4.5` - Anthropic Claude Sonnet 4.5
- `google/gemini-3-pro-preview` - Google Gemini 3 Pro
- `deepseek/deepseek-v3.2` - DeepSeek V3.2
- `x-ai/grok-4` - xAI Grok 4
- `mistralai/mistral-medium-3.1` - Mistral Medium 3.1

See [OpenRouter Models](https://openrouter.ai/models) for the full list.

## Development Scripts

From the `backend` directory:

- `npm run start` - Start NestJS in normal mode
- `npm run start:dev` - Start development server with hot reload
- `npm run start:debug` - Start in debug mode with watch
- `npm run start:prod` - Start compiled app from `dist/main.js`
- `npm run build` - Compile TypeScript to `dist`
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Run tests with coverage
- `npm run test:e2e` - Run end-to-end tests

## Configuration

### Default Judge Models

Default judge models are defined in `src/debate/debate.controller.ts`:

```typescript
const judgeModels = [
  'openai/gpt-5.2',
  'anthropic/claude-sonnet-4.5',
  'google/gemini-3-pro-preview',
];
```

### Model Selection

- **Title Generation**: Uses `mistralai/ministral-14b-2512` (fast, cost-effective)
- **Topic Rewriting**: Uses `google/gemini-flash-1.5` (fast, cost-effective)
- **Debate Models**: User-selected via request
- **Judge Models**: Fixed set (see above)

## Error Handling

- API key validation occurs before any LLM calls
- Individual model failures are logged but don't stop the entire process
- Judge evaluations continue even if one judge fails
- All errors are sent as SSE events to the frontend
- HTTP errors include detailed error messages

## CORS Configuration

CORS is enabled for all origins in development. For production, update `src/main.ts`:

```typescript
app.enableCors({
  origin: ['https://yourdomain.com'],
  credentials: true,
});
```

## Logging

The backend uses NestJS's built-in Logger:

- Request/response logging in controllers
- Model query logging in services
- Error logging with stack traces
- Status updates during long-running operations

## Performance Considerations

- **Parallel Processing**: Topic analysis and debate rounds use parallel API calls where possible
- **Timeouts**: Default timeout is 120 seconds per model query (30 seconds for title generation)
- **Streaming**: SSE allows clients to receive updates without polling
- **Error Recovery**: Individual failures don't stop the entire debate process

## Security

- API keys are never logged
- CORS is configured to prevent unauthorized access
- Input validation via DTOs
- Error messages don't expose sensitive information

## Troubleshooting

### API Key Issues

- Ensure `api_key` is provided in request body or `OPENROUTER_API_KEY` env var is set
- Verify the API key is valid and has sufficient credits
- Check OpenRouter account status

### Model Query Failures

- Check OpenRouter API status
- Verify model IDs are correct
- Ensure sufficient credits in OpenRouter account
- Check network connectivity

### SSE Connection Issues

- Ensure client supports SSE
- Check for proxy/load balancer buffering (disable with `X-Accel-Buffering: no`)
- Verify CORS configuration

## License

MIT
