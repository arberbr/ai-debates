import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function AboutComponent() {
  return (
    <div className="flex flex-col items-center justify-start p-8 bg-background">
      <div className="w-full space-y-6">
        {/* Header */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-foreground">About AI Debates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-muted-foreground leading-relaxed">
              AI Debates is a modern web application that facilitates structured debates between
              different AI models on any topic. Watch as AI models argue for and against
              propositions, with multiple AI judges evaluating the quality of arguments and
              determining a winner. The platform provides real-time updates, comprehensive
              statistics, and a beautiful user interface for exploring how different AI models
              approach argumentation and reasoning.
            </p>
          </CardContent>
        </Card>

        {/* How It Works Overview */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-foreground">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-base text-muted-foreground leading-relaxed">
              The debate process is orchestrated through several stages, each building upon the
              previous one to create a comprehensive discussion. Here's a detailed breakdown of how
              everything works:
            </p>
          </CardContent>
        </Card>

        {/* Stage 1: Title Generation */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">
              Stage 1: Title Generation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-base text-foreground leading-relaxed">
              When you provide a debate topic, the system first generates a concise, descriptive
              title (7-12 words) to make it easier to identify and reference your debate later. This
              helps organize your debates and makes them easier to find in your debates list.
            </p>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Note:</strong> If title generation fails, the system automatically uses the
                first 80 characters of your original topic as a fallback title.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stage 2: Opening Statements */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">
              Stage 2: Opening Statements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-base text-foreground leading-relaxed">
              Both AI models (FOR and AGAINST) generate their opening statements simultaneously in
              parallel. Each opening statement is designed to be approximately 5-10 minutes long
              when read aloud (targeting 1000-2000 words at 200 words per minute).
            </p>
            <ul className="list-disc list-outside space-y-2 ml-6 text-base text-foreground">
              <li>
                Each model receives the debate topic and their assigned position (FOR or AGAINST)
              </li>
              <li>Models present their main arguments and supporting evidence</li>
              <li>They anticipate potential counterarguments</li>
              <li>Both statements are generated in parallel for efficiency</li>
            </ul>
            <p className="text-base text-muted-foreground leading-relaxed">
              These opening statements serve as the foundation for the entire debate, establishing
              each side's position and key arguments.
            </p>
          </CardContent>
        </Card>

        {/* Stage 3: Rebuttal Rounds */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">
              Stage 3: Rebuttal Rounds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-base text-foreground leading-relaxed">
              You can configure the number of rebuttal rounds (1-5). Each round consists of both
              models responding to their opponent's arguments:
            </p>
            <ul className="list-disc list-outside space-y-2 ml-6 text-base text-foreground">
              <li>
                <strong>Round 1:</strong> Each side analyzes and rebuts the opponent's opening
                statement. They dissect arguments, identify weaknesses, logical fallacies, or
                unsupported claims, and present counterarguments.
              </li>
              <li>
                <strong>Subsequent Rounds:</strong> Models focus on the opponent's arguments from
                the previous round, addressing specific points, countering rebuttals, and
                strengthening their position.
              </li>
            </ul>
            <p className="text-base text-muted-foreground leading-relaxed">
              Throughout the rebuttal rounds, each model has access to the full debate history,
              allowing them to build upon previous arguments and maintain consistency. The responses
              are generated in parallel for efficiency.
            </p>
          </CardContent>
        </Card>

        {/* Stage 4: Conclusions */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">
              Stage 4: Conclusions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-base text-foreground leading-relaxed">
              After all rebuttal rounds are complete, both models deliver their concluding
              statements. Each conclusion is approximately 2-5 minutes long when read aloud
              (targeting 400-1000 words).
            </p>
            <p className="text-base text-foreground leading-relaxed">
              In their conclusions, each model:
            </p>
            <ul className="list-disc list-outside space-y-2 ml-6 text-base text-foreground">
              <li>Summarizes their main arguments and why they still hold</li>
              <li>Addresses how they responded to the opponent's challenges</li>
              <li>Reinforces why their position is correct</li>
              <li>
                May acknowledge weaknesses or concede if their position was successfully challenged
              </li>
            </ul>
            <p className="text-base text-muted-foreground leading-relaxed">
              The conclusions are generated in parallel, and each model has access to the complete
              debate transcript (opening statements, all rebuttal rounds) to provide a comprehensive
              final statement.
            </p>
          </CardContent>
        </Card>

        {/* Stage 5: Judge Evaluation */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">
              Stage 5: Judge Evaluation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-base text-foreground leading-relaxed">
              Three independent AI judges evaluate the entire debate using advanced models from
              leading AI providers. Each judge provides an independent assessment to ensure fairness
              and comprehensive evaluation.
            </p>
            <p className="text-base text-foreground leading-relaxed">
              Each judge receives the complete debate transcript (opening statements, all rebuttal
              rounds, and conclusions) and evaluates based on:
            </p>
            <ul className="list-disc list-outside space-y-2 ml-6 text-base text-foreground">
              <li>
                <strong>Main Points:</strong> Analysis of key arguments from each side throughout
                the debate
              </li>
              <li>
                <strong>Presentation Quality:</strong> Clarity, organization, persuasiveness, and
                rhetorical effectiveness
              </li>
              <li>
                <strong>Defense Quality:</strong> How effectively each side responded to attacks and
                maintained their position
              </li>
              <li>
                <strong>Additional Criteria:</strong> Reasoning quality, evidence strength, factual
                accuracy, and logical consistency
              </li>
            </ul>
            <p className="text-base text-muted-foreground leading-relaxed">
              You can also provide custom evaluation criteria through the "Judge system prompt"
              field when creating a debate. This allows you to emphasize specific aspects like
              factual accuracy, conciseness, or other criteria important to you.
            </p>
            <p className="text-base text-foreground leading-relaxed">Each judge provides:</p>
            <ul className="list-disc list-outside space-y-2 ml-6 text-base text-foreground">
              <li>Scores (0-100) for each side based on overall performance</li>
              <li>A declared winner (FOR, AGAINST, or TIE)</li>
              <li>Detailed reasoning explaining their decision</li>
            </ul>
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <p className="text-sm text-green-900 dark:text-green-100">
                <strong>Resilience:</strong> If one judge fails to evaluate, the system continues
                with the remaining judges to ensure a fair evaluation process.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stage 6: Final Result */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">
              Stage 6: Final Result Calculation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-base text-foreground leading-relaxed">
              The system calculates the final result by aggregating scores from all judges:
            </p>
            <ul className="list-disc list-outside space-y-2 ml-6 text-base text-foreground">
              <li>Average scores are computed for both FOR and AGAINST sides</li>
              <li>A winner is determined based on the average scores</li>
              <li>
                A 5-point threshold is used to avoid ties (e.g., if FOR averages 82.3 and AGAINST
                averages 77.7, FOR wins)
              </li>
              <li>If the difference is 5 points or less, the result is declared a TIE</li>
            </ul>
            <p className="text-base text-muted-foreground leading-relaxed">
              This aggregated approach ensures a fair evaluation by incorporating perspectives from
              multiple AI judges, reducing bias from any single judge's evaluation.
            </p>
          </CardContent>
        </Card>

        {/* Getting Started */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-foreground">Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Real-Time Updates</h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                As each stage of the debate completes, you'll see status updates and content appear
                immediately, providing a live view of the debate as it unfolds. Watch the debate
                progress in real-time from start to finish.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Data Storage</h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                All debates are automatically saved to your browser when complete. This means:
              </p>
              <ul className="list-disc list-outside space-y-2 ml-6 text-base text-muted-foreground mt-2">
                <li>Your API key is stored securely in your browser</li>
                <li>Completed debates are saved for later review</li>
                <li>All data stays in your browser - nothing is stored on external servers</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Available Models</h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-2">
                You can choose from various AI models from leading providers:
              </p>
              <ul className="list-disc list-outside space-y-1 ml-6 text-base text-muted-foreground">
                <li>Anthropic: Claude Haiku 4.5</li>
                <li>Anthropic: Claude Sonnet 4.5</li>
                <li>DeepSeek: DeepSeek V3.2</li>
                <li>Google: Gemini 3 Flash Preview</li>
                <li>Google: Gemini 3 Pro Preview</li>
                <li>OpenAI: GPT-5.2</li>
                <li>xAI: Grok 4</li>
                <li>Mistral: Mistral Medium 3.1</li>
              </ul>
              <p className="text-base text-muted-foreground leading-relaxed mt-2">
                Different models have different strengths, so experiment with different combinations
                to see how they approach arguments differently!
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">API Key Setup</h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                To use the platform, you'll need an OpenRouter API key. You can get one for free at{" "}
                <a
                  href="https://openrouter.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary/80"
                >
                  openrouter.ai
                </a>
                . Your API key is stored securely in your browser and is only used to access the AI
                models through OpenRouter.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Features */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-foreground">
              Additional Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Debates List</h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                The <strong>Debates</strong> page provides a comprehensive view of all your saved
                debates. Each debate card displays:
              </p>
              <ul className="list-disc list-outside space-y-2 ml-6 text-base text-muted-foreground mt-2">
                <li>Debate topic and timestamp</li>
                <li>Models used for each side (FOR and AGAINST)</li>
                <li>Reading time estimates for each side</li>
                <li>Number of debate rounds</li>
                <li>Final winner (if available)</li>
                <li>Token usage and cost statistics</li>
              </ul>
              <p className="text-base text-muted-foreground leading-relaxed mt-2">
                You can click on any debate card to view its full details, or delete debates you no
                longer need.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Leaderboard & Statistics
              </h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                The <strong>Leaderboard</strong> page provides detailed analytics about your
                debates:
              </p>
              <ul className="list-disc list-outside space-y-2 ml-6 text-base text-muted-foreground mt-2">
                <li>
                  <strong>Model Performance:</strong> Win rates, average scores, total
                  wins/losses/ties, and average cost per debate for each model
                </li>
                <li>
                  <strong>Overall Statistics:</strong> Total debates, total cost, total tokens used,
                  and average rounds per debate
                </li>
                <li>
                  <strong>Most Debated Topics:</strong> See which topics you've debated most
                  frequently
                </li>
                <li>
                  <strong>Sortable Rankings:</strong> Sort models by win rate, total wins, average
                  score, or number of debates
                </li>
              </ul>
              <p className="text-base text-muted-foreground leading-relaxed mt-2">
                Use the leaderboard to identify which models perform best in your debates and track
                your usage over time.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Usage Tracking & Cost Monitoring
              </h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                Every debate tracks detailed usage statistics automatically:
              </p>
              <ul className="list-disc list-outside space-y-2 ml-6 text-base text-muted-foreground mt-2">
                <li>
                  <strong>Token Usage:</strong> Total tokens, prompt tokens, and completion tokens
                  for the entire debate
                </li>
                <li>
                  <strong>Cost Tracking:</strong> Real-time cost calculation based on OpenRouter's
                  pricing for each model used
                </li>
                <li>
                  <strong>Per-Debate Breakdown:</strong> View costs and token usage for individual
                  debates on the debate detail page
                </li>
                <li>
                  <strong>Aggregate Statistics:</strong> See total costs and tokens across all your
                  debates in the leaderboard
                </li>
              </ul>
              <p className="text-base text-muted-foreground leading-relaxed mt-2">
                This helps you monitor your API usage and costs, making it easier to manage your
                OpenRouter account budget.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Reading Time Calculations
              </h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                The application automatically calculates estimated reading time for each side of the
                debate. Reading times are based on:
              </p>
              <ul className="list-disc list-outside space-y-2 ml-6 text-base text-muted-foreground mt-2">
                <li>200 words per minute reading speed</li>
                <li>
                  Full content including opening statements, all rebuttal rounds, and conclusions
                </li>
                <li>
                  Plain text extraction from markdown (excluding code blocks, formatting, etc.)
                </li>
              </ul>
              <p className="text-base text-muted-foreground leading-relaxed mt-2">
                These estimates help you understand the length and depth of each debate before you
                start reading.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Best Practices */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-foreground">Best Practices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="list-disc list-outside space-y-2 ml-6 text-base text-foreground">
              <li>
                <strong>Topic Clarity:</strong> Provide clear, specific topics (max 300 characters).
                Well-defined topics lead to more focused and meaningful debates.
              </li>
              <li>
                <strong>Round Selection:</strong> More rounds (3-5) allow for deeper exploration,
                while fewer rounds (1-2) are quicker. Choose based on how much depth you want.
              </li>
              <li>
                <strong>Model Selection:</strong> Try different model combinations to see how
                different AI systems approach arguments. Some models excel at logical reasoning,
                others at creativity.
              </li>
              <li>
                <strong>Judge Criteria:</strong> Use the optional judge system prompt to emphasize
                criteria important to you, such as factual accuracy, conciseness, or ethical
                considerations.
              </li>
            </ul>
          </CardContent>
        </Card>


        {/* Author & Credits */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-foreground">Credits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-base text-muted-foreground leading-relaxed">
              Developed by <strong className="text-foreground">Arber Braja</strong>.
            </p>
            <p className="text-sm text-muted-foreground">Licensed under the MIT License.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/about")({
  component: AboutComponent,
});
