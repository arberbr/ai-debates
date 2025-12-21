import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { useNavigate } from '@tanstack/react-router'
import ReactMarkdown from 'react-markdown'
import { calculateReadingTime } from '@/lib/utils'

const API_KEY_STORAGE_KEY = 'openrouter_api_key'
const SAVED_DEBATES_KEY = 'saved_debates'
const PENDING_DEBATES_KEY = 'pending_debates'

interface UsageData {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  cost?: number
  cost_details?: {
    upstream_inference_cost?: number
    upstream_inference_input_cost?: number
    upstream_inference_output_cost?: number
  }
  completion_tokens_details?: {
    reasoning_tokens?: number
  }
  prompt_tokens_details?: {
    cached_tokens?: number
    audio_tokens?: number
  }
}

interface SavedDebate {
  debateId: string
  topic: string
  yesModel: string
  noModel: string
  rounds: string
  judgePrompt: string
  openingStatements?: OpeningStatements
  debateRounds: DebateRound[]
  conclusions?: Conclusions
  judgeEvaluations: JudgeEvaluation[]
  finalResult: any
  usage?: UsageData
  timestamp: string
}

interface OpeningStatements {
  yesStatement: DebateMessage
  noStatement: DebateMessage
}

interface Conclusions {
  yesConclusion: DebateMessage
  noConclusion: DebateMessage
}

// Reusable Markdown component with consistent styling
const MarkdownContent = ({ content }: { content: string }) => (
  <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-p:leading-relaxed prose-p:text-foreground/90">
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-4 last:mb-0 leading-7 text-foreground/90">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-outside mb-4 space-y-2 ml-6 pl-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-outside mb-4 space-y-2 ml-6 pl-2">{children}</ol>,
        li: ({ children }) => <li className="leading-7 pl-1">{children}</li>,
        h1: ({ children }) => <h1 className="text-xl font-bold mb-4 mt-6 first:mt-0 text-foreground">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-semibold mb-3 mt-5 first:mt-0 text-foreground">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold mb-3 mt-4 first:mt-0 text-foreground">{children}</h3>,
        code: ({ children, className }) => {
          const isInline = !className
          return isInline ? (
            <code className="bg-muted/80 px-1.5 py-0.5 rounded text-xs font-mono text-foreground border border-border">{children}</code>
          ) : (
            <code className="block bg-muted/80 p-3 rounded-md text-xs font-mono overflow-x-auto mb-4 border border-border">{children}</code>
          )
        },
        blockquote: ({ children }) => <blockquote className="border-l-4 border-primary/40 pl-4 italic my-4 text-muted-foreground bg-muted/30 py-3 rounded-r">{children}</blockquote>,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
        a: ({ children, href }) => <a href={href} className="text-primary underline hover:text-primary/80 transition-colors" target="_blank" rel="noopener noreferrer">{children}</a>,
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
)

interface DebateMessage {
  role: 'yes' | 'no'
  model: string
  content: string
  round: number
  timestamp: string
}

interface DebateRound {
  round: number
  yesMessage: DebateMessage
  noMessage: DebateMessage
}

interface JudgeEvaluation {
  judgeModel: string
  evaluation: string
  winner?: 'yes' | 'no' | 'tie'
  scores?: { yes: number; no: number }
  reasoning: string
}

// Helper function to clean markdown formatting from titles
const cleanString = (title: string): string => {
  let cleaned = title.trim()
  // Remove markdown bold markers (**)
  cleaned = cleaned.replace(/\*\*/g, '')
  // Remove single asterisks at start/end
  cleaned = cleaned.replace(/^\*+|\*+$/g, '')
  // Remove markdown italic markers at start/end
  cleaned = cleaned.replace(/^_+|_+$/g, '')
  // Remove leading/trailing quotes
  cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, '')
  // Remove any leading/trailing whitespace
  return cleaned.trim()
}

function DebateComponent() {
  const { debateId } = Route.useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<string>('Initializing...')
  const [displayTopic, setDisplayTopic] = useState<string>('Debate Chat')
  const [openingStatements, setOpeningStatements] = useState<OpeningStatements | null>(null)
  const [debateRounds, setDebateRounds] = useState<DebateRound[]>([])
  const [conclusions, setConclusions] = useState<Conclusions | null>(null)
  const [judgeEvaluations, setJudgeEvaluations] = useState<JudgeEvaluation[]>([])
  const [finalResult, setFinalResult] = useState<any>(null)
  const [usage, setUsage] = useState<UsageData | undefined>(undefined)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [yesModel, setYesModel] = useState<string>('')
  const [noModel, setNoModel] = useState<string>('')
  const hasStartedRef = useRef(false)
  
  // Load debate config from localStorage
  const [debateConfig, setDebateConfig] = useState<{
    topic: string
    yesModel: string
    noModel: string
    rounds: string
    judgePrompt: string
  } | null>(null)

  // Clear API key from localStorage on OpenRouter errors
  const clearApiKey = () => {
    localStorage.removeItem(API_KEY_STORAGE_KEY)
  }

  // Load debate config on mount
  useEffect(() => {
    // First, check if this debate is already saved in localStorage
    const savedDebates = localStorage.getItem(SAVED_DEBATES_KEY)
    if (savedDebates) {
      try {
        const debates: SavedDebate[] = JSON.parse(savedDebates)
        const savedDebate = debates.find(d => d.debateId === debateId)
        
        if (savedDebate && savedDebate.debateRounds && savedDebate.debateRounds.length > 0) {
          // Load saved debate data
          const savedTitle = savedDebate.topic || 'Debate Chat'
          setDisplayTopic(cleanString(savedTitle))
          setYesModel(savedDebate.yesModel || '')
          setNoModel(savedDebate.noModel || '')
          setOpeningStatements(savedDebate.openingStatements || null)
          setDebateRounds(savedDebate.debateRounds || [])
          setConclusions(savedDebate.conclusions || null)
          setJudgeEvaluations(savedDebate.judgeEvaluations || [])
          setFinalResult(savedDebate.finalResult || null)
          setUsage(savedDebate.usage)
          setIsComplete(true)
          setStatus('Debate loaded from saved data')
          return // Don't start a new debate
        }
      } catch (e) {
        console.error('Error loading saved debate:', e)
      }
    }

    // Try to load config from pending debates (new debates)
    const pendingDebates = localStorage.getItem(PENDING_DEBATES_KEY)
    
    if (!pendingDebates) {
      console.error('No pending debates found in localStorage for debateId:', debateId)
      setError('Missing required debate parameters. Please start a new debate from the home page.')
      return
    }
    
    try {
      const pending = JSON.parse(pendingDebates)
      const config = pending[debateId] || null
      
      console.log('Loading debate config for debateId:', debateId)
      console.log('Available pending debates:', Object.keys(pending))
      console.log('Config found:', config)
      
      if (!config) {
        console.error('No config found for debateId:', debateId)
        setError('Missing required debate parameters. Please start a new debate from the home page.')
        return
      }
      
      if (!config.topic || !config.yesModel || !config.noModel) {
        console.error('Invalid config found - missing required fields:', {
          hasTopic: !!config.topic,
          hasYesModel: !!config.yesModel,
          hasNoModel: !!config.noModel,
          config
        })
        setError('Missing required debate parameters. Please start a new debate from the home page.')
        return
      }
      
      // Set the config - don't delete from localStorage yet
      setDebateConfig({
        topic: config.topic,
        yesModel: config.yesModel,
        noModel: config.noModel,
        rounds: config.rounds || '3',
        judgePrompt: config.judgePrompt || ''
      })
      console.log('Debate config loaded successfully')
    } catch (e) {
      console.error('Error loading pending debate config:', e)
      setError('Error loading debate configuration. Please try starting a new debate.')
    }
  }, [debateId])

  // Start debate when config is loaded
  useEffect(() => {
    // Prevent duplicate execution in React Strict Mode
    if (hasStartedRef.current || !debateConfig || isComplete) {
      return
    }
    
    // Validate config before starting
    if (!debateConfig.topic || !debateConfig.yesModel || !debateConfig.noModel) {
      console.error('Invalid debate config:', debateConfig)
      setError('Missing required debate parameters. Please start a new debate from the home page.')
      return
    }
    
    hasStartedRef.current = true

    // Get API key from localStorage
    const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY)
    
    if (!storedApiKey || !storedApiKey.trim()) {
      setError('OpenRouter API key is required. Please go back and enter your API key.')
      // Redirect to homepage after a delay
      setTimeout(() => {
        navigate({ to: '/' })
      }, 3000)
      return
    }

    const apiKey = storedApiKey.trim()

    // Generate title first, then start debate
    const generateTitleAndStartDebate = async () => {
      const { topic, yesModel, noModel, rounds, judgePrompt } = debateConfig
      
      // Clean up pending debate entry once we start
      const pendingDebates = localStorage.getItem(PENDING_DEBATES_KEY)
      if (pendingDebates) {
        try {
          const pending = JSON.parse(pendingDebates)
          delete pending[debateId]
          localStorage.setItem(PENDING_DEBATES_KEY, JSON.stringify(pending))
        } catch (e) {
          console.error('Error cleaning up pending debate:', e)
        }
      }
      
      try {
        // Step 1: Generate title
        setStatus('Generating title...')
        try {
          const titleResponse = await fetch('http://localhost:3001/api/debate/generate-title', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              topic,
              api_key: apiKey,
            }),
          })

          if (titleResponse.ok) {
            const titleData = await titleResponse.json()
            if (titleData.title) {
              // Clean the title before displaying
              const cleanedTitle = cleanString(titleData.title)
              setDisplayTopic(cleanedTitle)
              setStatus('Title generated. Starting debate...')
            }
          } else {
            // If title generation fails, use a fallback title
            console.warn('Title generation failed, using fallback')
            const fallbackTitle = topic.split('\n')[0].substring(0, 80).trim()
            setDisplayTopic(fallbackTitle.endsWith('...') ? fallbackTitle : fallbackTitle + '...')
            setStatus('Starting debate...')
          }
        } catch (titleError) {
          // If title generation fails, use a fallback title and continue
          console.warn('Title generation error:', titleError)
          const fallbackTitle = topic.split('\n')[0].substring(0, 80).trim()
          setDisplayTopic(fallbackTitle.endsWith('...') ? fallbackTitle : fallbackTitle + '...')
          setStatus('Starting debate...')
        }

        // Step 2: Start debate with SSE streaming
        const response = await fetch('http://localhost:3001/api/debate/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic,
            yesModel,
            noModel,
            rounds: parseInt(rounds || '3'),
            judgePrompt: judgePrompt || '',
            api_key: apiKey,
          }),
        })

        if (!response.ok) {
          let errorText = ''
          try {
            errorText = await response.text()
          } catch (e) {
            errorText = 'Unknown error'
          }
          
          let errorMessage = `HTTP error! status: ${response.status}`
          
          // Check for API key related errors
          if (response.status === 401 || response.status === 403 || errorText.includes('API key') || errorText.includes('OpenRouter') || errorText.includes('authentication') || errorText.includes('unauthorized')) {
            errorMessage = `Authentication error: Invalid or missing API key. Please check your API key.`
            clearApiKey()
          } else if (errorText) {
            errorMessage = `${errorMessage}: ${errorText.substring(0, 200)}`
          }
          
          throw new Error(errorMessage)
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error('No response body')
        }

        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                handleSSEEvent(data)
              } catch (e) {
                console.error('Error parsing SSE data:', e)
              }
            }
          }
        }
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to start debate'
        setError(errorMessage)
        console.error('Debate error:', err)
        
        // Clear API key on OpenRouter errors
        if (errorMessage.includes('OpenRouter') || errorMessage.includes('API key') || errorMessage.includes('401') || errorMessage.includes('403')) {
          clearApiKey()
        }
      }
    }

    const handleSSEEvent = (data: any) => {
      console.log('SSE Event:', data)

      switch (data.stage) {
        case 'stream_start':
          setStatus('Stream initialized...')
          break
        case 'title_generation_start':
          setStatus(data.message || 'Generating title...')
          break
        case 'title_generation_complete':
          if (data.data?.title) {
            setDisplayTopic(cleanString(data.data.title))
          }
          setStatus('Title generated. Starting debate...')
          break
        case 'opening_statements_start':
          setStatus(data.message || 'Generating opening statements...')
          break
        case 'opening_statements_complete':
          if (data.data) {
            setOpeningStatements(data.data)
          }
          setStatus('Opening statements complete')
          break
        case 'rebuttals_start':
          setStatus(data.message || 'Starting rebuttal rounds...')
          break
        case 'rebuttal_round_start':
          setStatus(data.message || `Starting rebuttal round ${data.data?.round}...`)
          break
        case 'rebuttal_round_complete':
          if (data.data) {
            setDebateRounds((prev) => [...prev, data.data])
            setStatus(`Rebuttal round ${data.data.round} complete`)
          }
          break
        case 'rebuttals_complete':
          setStatus('All rebuttal rounds complete')
          break
        case 'conclusions_start':
          setStatus(data.message || 'Generating conclusions...')
          break
        case 'conclusions_complete':
          if (data.data) {
            setConclusions(data.data)
          }
          setStatus('Conclusions complete')
          break
        case 'judging_start':
          setStatus('Judges evaluating debate...')
          break
        case 'judging_progress':
          setStatus(data.message || 'Judges evaluating...')
          break
        case 'judge_complete':
          if (data.data) {
            setJudgeEvaluations((prev) => [...prev, data.data])
            setStatus(`Judge ${data.data.judgeModel} evaluation complete`)
          }
          break
        case 'judging_complete':
          if (data.data?.finalResult) {
            setFinalResult(data.data.finalResult)
            setStatus('All evaluations complete')
          }
          break
        case 'complete':
          setIsComplete(true)
          setStatus('Debate process complete!')
          // Load all data from the complete event
          if (data.data) {
            // Save models from complete event
            if (data.data.yesModel) {
              setYesModel(data.data.yesModel)
            }
            if (data.data.noModel) {
              setNoModel(data.data.noModel)
            }
            if (data.data.openingStatements) {
              setOpeningStatements(data.data.openingStatements)
              // Also extract models from opening statements if not already set
              if (!data.data.yesModel && data.data.openingStatements.yesStatement?.model) {
                setYesModel(data.data.openingStatements.yesStatement.model)
              }
              if (!data.data.noModel && data.data.openingStatements.noStatement?.model) {
                setNoModel(data.data.openingStatements.noStatement.model)
              }
            }
            if (data.data.rounds && Array.isArray(data.data.rounds)) {
              setDebateRounds(data.data.rounds)
            }
            if (data.data.conclusions) {
              setConclusions(data.data.conclusions)
              // Also extract models from conclusions if not already set
              if (!data.data.yesModel && data.data.conclusions.yesConclusion?.model) {
                setYesModel(data.data.conclusions.yesConclusion.model)
              }
              if (!data.data.noModel && data.data.conclusions.noConclusion?.model) {
                setNoModel(data.data.conclusions.noConclusion.model)
              }
            }
            if (data.data.judgeEvaluations) {
              setJudgeEvaluations(data.data.judgeEvaluations)
            }
            if (data.data.finalResult) {
              setFinalResult(data.data.finalResult)
            }
            if (data.data.title) {
              setDisplayTopic(cleanString(data.data.title))
            }
            if (data.data.usage) {
              setUsage(data.data.usage)
            }
          }
          break
        case 'status_update':
          // Handle real-time status updates
          if (data.message) {
            setStatus(data.message)
          }
          break
        case 'error':
          const errorMessage = data.message || 'An error occurred'
          setError(errorMessage)
          setStatus(`Error: ${errorMessage}`)
          
          // Clear API key on OpenRouter errors (including 402 credit errors)
          if (
            errorMessage.includes('OpenRouter') || 
            errorMessage.includes('API key') || 
            errorMessage.includes('401') || 
            errorMessage.includes('402') ||
            errorMessage.includes('403') ||
            errorMessage.includes('credits') ||
            errorMessage.includes('insufficient')
          ) {
            clearApiKey()
          }
          break
      }
    }

    generateTitleAndStartDebate()

    return () => {
      // Reset ref when component unmounts or debateId changes
      hasStartedRef.current = false
    }
  }, [debateConfig, debateId, isComplete, navigate])

  // Save debate to localStorage when complete
  useEffect(() => {
    if (isComplete && (debateRounds.length > 0 || openingStatements || conclusions)) {
      // Determine models from multiple sources (priority: state > opening statements > conclusions > debateConfig)
      const determinedYesModel = yesModel || 
        openingStatements?.yesStatement?.model || 
        conclusions?.yesConclusion?.model || 
        debateConfig?.yesModel || 
        ''
      const determinedNoModel = noModel || 
        openingStatements?.noStatement?.model || 
        conclusions?.noConclusion?.model || 
        debateConfig?.noModel || 
        ''

      const savedDebate: SavedDebate = {
        debateId,
        topic: displayTopic || debateConfig?.topic || '',
        yesModel: determinedYesModel,
        noModel: determinedNoModel,
        rounds: debateConfig?.rounds || '3',
        judgePrompt: debateConfig?.judgePrompt || '',
        openingStatements: openingStatements || undefined,
        debateRounds,
        conclusions: conclusions || undefined,
        judgeEvaluations,
        finalResult,
        usage: usage,
        timestamp: new Date().toISOString(),
      }

      // Get existing saved debates
      const existingDebates = localStorage.getItem(SAVED_DEBATES_KEY)
      const debates: SavedDebate[] = existingDebates ? JSON.parse(existingDebates) : []
      
      // Check if this debate already exists (by debateId) and update it, otherwise add it
      const existingIndex = debates.findIndex(d => d.debateId === debateId)
      if (existingIndex >= 0) {
        debates[existingIndex] = savedDebate
      } else {
        debates.push(savedDebate)
      }

      // Save back to localStorage
      localStorage.setItem(SAVED_DEBATES_KEY, JSON.stringify(debates))
      console.log('Debate saved to localStorage:', debateId, { yesModel: determinedYesModel, noModel: determinedNoModel, usage })
    }
  }, [isComplete, debateId, displayTopic, debateConfig, yesModel, noModel, openingStatements, debateRounds, conclusions, judgeEvaluations, finalResult, usage])

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-8 bg-background">
      <div className="w-full">
        <Card className="w-full shadow-lg">
          <CardHeader className="pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-foreground leading-tight">{displayTopic}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {error && (
                <div className="p-5 bg-destructive/10 border-2 border-destructive/30 text-destructive rounded-lg shadow-md">
                  <div className="font-bold text-lg mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Error occurred
                  </div>
                  <div className="text-base whitespace-pre-wrap leading-relaxed">{error}</div>
                  {error.includes('credits') || error.includes('402') ? (
                    <div className="mt-4 p-3 bg-destructive/5 border border-destructive/20 rounded text-sm text-destructive/90">
                      This appears to be a credit limit issue. Please check your OpenRouter account balance or try a different model.
                    </div>
                  ) : null}
                </div>
              )}

              {/* Debate Content */}
              <div className="border rounded-lg min-h-[400px] bg-muted/30 space-y-6 max-h-[700px] overflow-y-auto shadow-sm p-6">
                {!openingStatements && debateRounds.length === 0 && !conclusions && !error && (
                  <div className="flex items-center justify-center h-full min-h-[300px]">
                    <p className="text-center text-muted-foreground text-lg">
                      {status || 'Waiting for debate to start...'}
                    </p>
                  </div>
                )}

                {/* Opening Statements */}
                {openingStatements && (
                  <div className="space-y-4 border-b border-border/50 pb-6">
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1 bg-primary/10 text-primary font-semibold rounded-full text-sm">
                        Opening Statements
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="p-5 bg-blue-500/10 rounded-lg border border-blue-500/20 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="px-3 py-1 bg-blue-600 text-white font-semibold rounded-md text-sm">
                              FOR
                            </div>
                            <div className="text-sm text-muted-foreground font-medium">
                              {openingStatements.yesStatement.model}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground/70">
                            {calculateReadingTime(openingStatements.yesStatement.content)}
                          </div>
                        </div>
                        <div className="text-base leading-relaxed">
                          <MarkdownContent content={openingStatements.yesStatement.content} />
                        </div>
                      </div>
                      <div className="p-5 bg-red-500/10 rounded-lg border border-red-500/20 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="px-3 py-1 bg-red-600 text-white font-semibold rounded-md text-sm">
                              AGAINST
                            </div>
                            <div className="text-sm text-muted-foreground font-medium">
                              {openingStatements.noStatement.model}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground/70">
                            {calculateReadingTime(openingStatements.noStatement.content)}
                          </div>
                        </div>
                        <div className="text-base leading-relaxed">
                          <MarkdownContent content={openingStatements.noStatement.content} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rebuttal Rounds */}
                {debateRounds.map((round, idx) => (
                  <div key={idx} className="space-y-4 border-b border-border/50 pb-6 last:border-b-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1 bg-primary/10 text-primary font-semibold rounded-full text-sm">
                        Round {round.round}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="p-5 bg-blue-500/10 rounded-lg border border-blue-500/20 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="px-3 py-1 bg-blue-600 text-white font-semibold rounded-md text-sm">
                              FOR
                            </div>
                            <div className="text-sm text-muted-foreground font-medium">
                              {round.yesMessage.model}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground/70">
                            {calculateReadingTime(round.yesMessage.content)}
                          </div>
                        </div>
                        <div className="text-base leading-relaxed">
                          <MarkdownContent content={round.yesMessage.content} />
                        </div>
                      </div>
                      <div className="p-5 bg-red-500/10 rounded-lg border border-red-500/20 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="px-3 py-1 bg-red-600 text-white font-semibold rounded-md text-sm">
                              AGAINST
                            </div>
                            <div className="text-sm text-muted-foreground font-medium">
                              {round.noMessage.model}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground/70">
                            {calculateReadingTime(round.noMessage.content)}
                          </div>
                        </div>
                        <div className="text-base leading-relaxed">
                          <MarkdownContent content={round.noMessage.content} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Conclusions */}
                {conclusions && (
                  <div className="space-y-4 border-t border-border/50 pt-6 mt-6">
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1 bg-primary/10 text-primary font-semibold rounded-full text-sm">
                        Conclusions
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="p-5 bg-blue-500/10 rounded-lg border border-blue-500/20 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="px-3 py-1 bg-blue-600 text-white font-semibold rounded-md text-sm">
                              FOR
                            </div>
                            <div className="text-sm text-muted-foreground font-medium">
                              {conclusions.yesConclusion.model}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground/70">
                            {calculateReadingTime(conclusions.yesConclusion.content)}
                          </div>
                        </div>
                        <div className="text-base leading-relaxed">
                          <MarkdownContent content={conclusions.yesConclusion.content} />
                        </div>
                      </div>
                      <div className="p-5 bg-red-500/10 rounded-lg border border-red-500/20 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="px-3 py-1 bg-red-600 text-white font-semibold rounded-md text-sm">
                              AGAINST
                            </div>
                            <div className="text-sm text-muted-foreground font-medium">
                              {conclusions.noConclusion.model}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground/70">
                            {calculateReadingTime(conclusions.noConclusion.content)}
                          </div>
                        </div>
                        <div className="text-base leading-relaxed">
                          <MarkdownContent content={conclusions.noConclusion.content} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Judge Evaluations */}
              {judgeEvaluations.length > 0 && (
                <div className="space-y-6 mt-8">
                  <h3 className="text-2xl font-bold text-foreground mb-6">Judge Evaluations</h3>
                  {judgeEvaluations.map((eval_, idx) => (
                    <Card key={idx} className="p-6 border-2 border-border/60 shadow-lg hover:shadow-xl transition-all bg-card/50 backdrop-blur-sm">
                      <div className="space-y-6">
                        {/* Header Section */}
                        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b-2 border-border/40">
                          <div className="flex items-center gap-3">
                            <div className="px-4 py-1.5 bg-primary/15 text-primary font-bold rounded-lg text-sm border border-primary/20">
                              Judge
                            </div>
                            <div className="font-semibold text-base text-foreground">
                              {eval_.judgeModel}
                            </div>
                          </div>
                          {eval_.winner && (
                            <div className={`px-5 py-2 rounded-lg font-bold text-sm shadow-sm ${
                              eval_.winner === 'yes' 
                                ? 'bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/30' 
                                : eval_.winner === 'no'
                                ? 'bg-red-500/25 text-red-700 dark:text-red-300 border border-red-500/30'
                                : 'bg-yellow-500/25 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30'
                            }`}>
                              Winner: {eval_.winner.toUpperCase()}
                            </div>
                          )}
                        </div>
                        
                        {/* Scores Section */}
                        {eval_.scores && (
                          <div className="flex items-center gap-6 p-6 bg-gradient-to-r from-muted/40 via-muted/30 to-muted/40 rounded-xl border border-border/50 shadow-inner">
                            <div className="flex-1 text-center">
                              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">FOR Score</div>
                              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 drop-shadow-sm">
                                {eval_.scores.yes}
                              </div>
                            </div>
                            <div className="w-px h-16 bg-border/60"></div>
                            <div className="flex-1 text-center">
                              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">AGAINST Score</div>
                              <div className="text-4xl font-bold text-red-600 dark:text-red-400 drop-shadow-sm">
                                {eval_.scores.no}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Evaluation Text Section */}
                        <div className="pt-4">
                          <div className="text-base font-bold text-foreground mb-4 pb-2 border-b border-border/30">
                            Evaluation
                          </div>
                          <div className="prose prose-base dark:prose-invert max-w-none">
                            <div className="text-[15px] leading-7 text-foreground/95 space-y-4 px-2">
                              <MarkdownContent content={eval_.reasoning || eval_.evaluation} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Final Result */}
              {finalResult && (
                <Card className="p-6 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border-2 border-primary/30 shadow-lg mt-8">
                  <h3 className="text-2xl font-bold mb-5 text-foreground">Final Result</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-semibold text-foreground/80">Winner:</span>
                      <div className={`px-5 py-2 rounded-lg font-bold text-lg ${
                        finalResult.winner === 'yes' 
                          ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400' 
                          : finalResult.winner === 'no'
                          ? 'bg-red-500/20 text-red-700 dark:text-red-400'
                          : 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                      }`}>
                        {finalResult.winner?.toUpperCase() || 'TIE'}
                      </div>
                    </div>
                    {finalResult.aggregateScore && (
                      <div className="flex items-center gap-6 p-5 bg-background/50 rounded-lg border border-border">
                        <div className="flex-1 text-center">
                          <div className="text-xs text-muted-foreground mb-2 font-medium">FOR</div>
                          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                            {finalResult.aggregateScore.yes.toFixed(1)}
                          </div>
                        </div>
                        <div className="w-px h-16 bg-border"></div>
                        <div className="flex-1 text-center">
                          <div className="text-xs text-muted-foreground mb-2 font-medium">AGAINST</div>
                          <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                            {finalResult.aggregateScore.no.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Usage Statistics */}
              {usage && isComplete && (
                <Card className="p-6 bg-gradient-to-br from-muted/40 via-muted/30 to-muted/40 border-2 border-border/50 shadow-lg mt-8">
                  <h3 className="text-2xl font-bold mb-5 text-foreground">Token Usage & Cost</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-background/50 rounded-lg border border-border">
                        <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Total Tokens</div>
                        <div className="text-2xl font-bold text-foreground">
                          {usage.total_tokens?.toLocaleString() || '0'}
                        </div>
                      </div>
                      <div className="p-4 bg-background/50 rounded-lg border border-border">
                        <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Prompt Tokens</div>
                        <div className="text-2xl font-bold text-foreground">
                          {usage.prompt_tokens?.toLocaleString() || '0'}
                        </div>
                      </div>
                      <div className="p-4 bg-background/50 rounded-lg border border-border">
                        <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Completion Tokens</div>
                        <div className="text-2xl font-bold text-foreground">
                          {usage.completion_tokens?.toLocaleString() || '0'}
                        </div>
                      </div>
                      <div className="p-4 bg-background/50 rounded-lg border border-border">
                        <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Total Cost</div>
                        <div className="text-2xl font-bold text-primary dark:text-yellow-500">
                          ${usage.cost?.toFixed(4) || '0.0000'}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {isComplete && (
                <div className="flex justify-center pt-4">
                  <Button 
                    onClick={() => window.location.href = '/'}
                    className="px-8 py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    Start New Debate
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/debate/$debateId')({
  component: DebateComponent,
})
