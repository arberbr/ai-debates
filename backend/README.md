# AI Debates Backend

NestJS backend service that orchestrates structured debates between AI models via the OpenRouter API. The backend handles topic analysis, debate rounds, judge evaluations, and streams real-time updates to the frontend using Server-Sent Events (SSE).

## Features

- 🎯 **Topic Processing**: Generates concise titles and processes debate topics
- 🔄 **Multi-Round Debates**: Orchestrates structured debate rounds between two AI models
- ⚖️ **AI Judge Panel**: Three independent AI judges evaluate each debate
- 📡 **Real-time Streaming**: Server-Sent Events (SSE) for live progress updates
- 🔌 **OpenRouter Integration**: Unified API for accessing multiple LLM providers
- 📊 **Result Calculation**: Aggregates judge scores to determine winners
- 💰 **Usage Tracking**: Tracks token usage and costs for all API calls

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
- `topic` (string, required): The debate topic, question, or article (max 300 characters)
- `yesModel` (string, required): OpenRouter model ID for the "FOR" side
- `noModel` (string, required): OpenRouter model ID for the "AGAINST" side
- `rounds` (number, required): Number of debate rounds (1-5)
- `judgePrompt` (string, optional): Custom instructions for judges
- `title` (string, optional): Pre-generated title for the debate (if not provided, frontend generates fallback)
- `api_key` (string, optional): OpenRouter API key for this request (falls back to `OPENROUTER_API_KEY` env var)

**Response:** SSE stream with events:

```text
data: {"type":"stream_start","stage":"stream_start","message":"Debate stream initialized",...}

data: {"type":"opening_statements_start","stage":"opening_statements_start","message":"Generating opening statements...",...}

data: {"type":"opening_statements_complete","stage":"opening_statements_complete","data":{"yesStatement":{...},"noStatement":{...}},...}

data: {"type":"rebuttals_start","stage":"rebuttals_start","message":"Starting rebuttal rounds...",...}

data: {"type":"rebuttal_round_start","stage":"rebuttal_round_start","data":{"round":1},...}

data: {"type":"rebuttal_round_complete","stage":"rebuttal_round_complete","data":{"round":1,"yesMessage":{...},"noMessage":{...}},...}

data: {"type":"rebuttals_complete","stage":"rebuttals_complete","data":{"rounds":[...]},...}

data: {"type":"conclusions_start","stage":"conclusions_start","message":"Generating conclusions...",...}

data: {"type":"conclusions_complete","stage":"conclusions_complete","data":{"yesConclusion":{...},"noConclusion":{...}},...}

data: {"type":"judging_start","stage":"judging_start","message":"Judges evaluating debate...",...}

data: {"type":"judge_complete","stage":"judge_complete","data":{"judgeModel":"...","evaluation":"...","winner":"yes","scores":{"yes":85,"no":72}},...}

data: {"type":"judging_complete","stage":"judging_complete","data":{"evaluations":[...],"finalResult":{"winner":"yes","aggregateScore":{"yes":82.3,"no":75.7}}},...}

data: {"type":"complete","stage":"complete","data":{...},"message":"Debate process complete",...}
```

**Note:** The `complete` event includes the full debate data including usage statistics (tokens and cost).

**Status Update Events:**

During long-running operations, you may also receive intermediate `status_update` events:

```text
data: {"type":"status_update","stage":"opening_statements_start","message":"Querying model...",...}
```

**Error Events:**

```text
data: {"type":"error","stage":"error","message":"Error description",...}
```

### POST `/generate-title`

Generate a concise title (7-12 words) for a debate topic. Uses `mistralai/ministral-14b-2512` for fast, cost-effective title generation.

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

**Note:** Title generation is optional. The frontend can provide a pre-generated `title` in the request body. If title generation fails or is not provided, the backend uses a fallback (first 80 characters of the topic).

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

The debate process follows these stages in order:

1. **Opening Statements**
   - Both debate models generate opening statements in parallel
   - Each model presents their position (FOR/AGAINST) and main arguments
   - Target length: 1000-2000 words (approximately 5-10 minutes reading time at 200 words per minute)
   - Timeout: 180 seconds per model

2. **Rebuttal Rounds**
   - Models engage in structured rounds (1-5 rounds, user-configurable)
   - Each round includes responses from both sides in parallel
   - Round 1: Models analyze and rebut the opponent's opening statement
   - Subsequent rounds: Models focus on the opponent's arguments from the previous round
   - Models have access to full debate history (opening statements and all previous rounds)
   - Timeout: 180 seconds per model per round

3. **Conclusions**
   - Both models deliver concluding statements in parallel
   - Each model summarizes their position and final arguments
   - Target length: 400-1000 words (approximately 2-5 minutes reading time at 200 words per minute)
   - Models have access to complete debate transcript (opening statements, all rebuttal rounds)
   - Timeout: 180 seconds per model

4. **Judge Evaluation**
   - Three judges evaluate independently:
     - `openai/gpt-5.2`
     - `anthropic/claude-sonnet-4.5`
     - `google/gemini-3-pro-preview`
   - Each judge receives the complete debate transcript
   - Judges evaluate based on: main points, presentation quality, defense quality, and custom criteria (from `judgePrompt`)
   - Each judge provides scores (0-100) and reasoning
   - Judges continue even if one fails (resilient design)
   - Timeout: 120 seconds per judge

5. **Final Result Calculation**
   - Aggregate scores from all judges
   - Calculate average scores for both FOR and AGAINST sides
   - Determine winner based on average scores with 5-point threshold to avoid ties
   - If difference is ≤5 points, result is declared a TIE

## Project Structure

```
backend/
├── src/
│   ├── common/
│   │   ├── config.ts              # Default model configurations
│   │   ├── openrouter.service.ts  # OpenRouter API client
│   │   └── utils.ts               # Utility functions (string cleaning, etc.)
│   ├── debate/
│   │   ├── debate.controller.ts   # HTTP endpoints and SSE streaming
│   │   ├── debate.service.ts      # Debate orchestration logic
│   │   ├── debate-status.service.ts  # Status tracking (in-memory)
│   │   ├── debate.module.ts        # NestJS module
│   │   ├── dto/
│   │   │   └── start-debate.dto.ts # Request DTOs
│   │   └── interfaces/
│   │       └── debate.interface.ts # TypeScript interfaces
│   ├── app.module.ts              # Root module
│   └── main.ts                    # Application entry point (CORS, port config)
├── dist/                          # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── nest-cli.json
```

## Available Models

The backend supports any model available on OpenRouter. Common models include:

- `anthropic/claude-haiku-4.5` - Anthropic Claude Haiku 4.5
- `anthropic/claude-sonnet-4.5` - Anthropic Claude Sonnet 4.5
- `deepseek/deepseek-v3.2` - DeepSeek V3.2
- `google/gemini-3-flash-preview` - Google Gemini 3 Flash Preview
- `google/gemini-3-pro-preview` - Google Gemini 3 Pro Preview
- `openai/gpt-5.2` - OpenAI GPT-5.2
- `x-ai/grok-4` - xAI Grok 4
- `mistralai/mistral-medium-3.1` - Mistral Medium 3.1

**Note:** Title generation uses `mistralai/ministral-14b-2512` (fast, cost-effective model).

See [OpenRouter Models](https://openrouter.ai/models) for the full list of available models.

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

- **Title Generation**: Uses `mistralai/ministral-14b-2512` (fast, cost-effective) via `/generate-title` endpoint
- **Debate Models**: User-selected via request (FOR and AGAINST sides)
- **Judge Models**: Fixed set of three models (see Default Judge Models section)

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

- **Parallel Processing**: Opening statements, rebuttal rounds, conclusions, and judge evaluations use parallel API calls where possible for efficiency
- **Timeouts**: 
  - Default timeout: 120 seconds per model query
  - Opening statements, rebuttals, conclusions: 180 seconds (longer responses)
  - Title generation: 10 seconds (fast, small model)
  - Judge evaluations: 120 seconds
- **Streaming**: SSE allows clients to receive updates without polling
- **Error Recovery**: Individual failures don't stop the entire debate process (e.g., if one judge fails, others continue)
- **Usage Tracking**: Token usage and costs are tracked and accumulated across all API calls for each debate, including detailed cost breakdowns (input/output costs, reasoning tokens, cached tokens, etc.)

## Usage Data Structure

The `usage` object in the complete event includes comprehensive tracking:

```typescript
{
  prompt_tokens: number;           // Total prompt tokens used
  completion_tokens: number;       // Total completion tokens used
  total_tokens: number;            // Total tokens (prompt + completion)
  cost: number;                    // Total cost in USD
  cost_details: {
    upstream_inference_cost: number;      // Total inference cost
    upstream_inference_input_cost: number;  // Input token cost
    upstream_inference_output_cost: number; // Output token cost
  };
  completion_tokens_details: {
    reasoning_tokens: number;      // Reasoning tokens (for models with reasoning)
  };
  prompt_tokens_details: {
    cached_tokens: number;         // Cached tokens (reused from cache)
    audio_tokens: number;          // Audio tokens (if applicable)
  };
}
```

All usage data is accumulated across all API calls in a debate (opening statements, all rebuttal rounds, conclusions, and judge evaluations).

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
