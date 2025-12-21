import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useEffect, useState, useRef } from 'react'
import { DebateContent } from '@/components/debate/DebateContent'
import { JudgeEvaluationCard } from '@/components/debate/JudgeEvaluationCard'
import { FinalResultCard } from '@/components/debate/FinalResultCard'
import { UsageStatsCard } from '@/components/debate/UsageStatsCard'
import type { 
  OpeningStatements, 
  DebateRound, 
  Conclusions, 
  JudgeEvaluation, 
  UsageData,
  SavedDebate,
  DebateConfig
} from '@/lib/types'
import { STORAGE_KEYS } from '@/lib/constants'
import { useApiKey } from '@/hooks/useApiKey'
import { useDebates } from '@/hooks/useDebates'
import { cleanString } from '@/lib/debate-utils'

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
  const [debateConfig, setDebateConfig] = useState<DebateConfig | null>(null)

  const { clearApiKey } = useApiKey()
  const { saveDebate } = useDebates()

  // Load debate config on mount
  useEffect(() => {
    // First, check if this debate is already saved in localStorage
    const savedDebates = localStorage.getItem(STORAGE_KEYS.SAVED_DEBATES)
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
    const pendingDebates = localStorage.getItem(STORAGE_KEYS.PENDING_DEBATES)
    
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
        debateId: config.debateId || debateId,
        topic: config.topic,
        yesModel: config.yesModel,
        noModel: config.noModel,
        rounds: config.rounds || '3',
        judgePrompt: config.judgePrompt || '',
        timestamp: config.timestamp || new Date().toISOString()
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
    const storedApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY)
    
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
      const pendingDebates = localStorage.getItem(STORAGE_KEYS.PENDING_DEBATES)
      if (pendingDebates) {
        try {
          const pending = JSON.parse(pendingDebates)
          delete pending[debateId]
          localStorage.setItem(STORAGE_KEYS.PENDING_DEBATES, JSON.stringify(pending))
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
        finalResult: finalResult || null,
        usage: usage,
        timestamp: new Date().toISOString(),
      }

      saveDebate(savedDebate)
      console.log('Debate saved to localStorage:', debateId, { yesModel: determinedYesModel, noModel: determinedNoModel, usage })
    }
  }, [isComplete, debateId, displayTopic, debateConfig, yesModel, noModel, openingStatements, debateRounds, conclusions, judgeEvaluations, finalResult, usage, saveDebate])

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
                    <div className="mt-4 p-3 bg-destructive/5 border border-destructive/20 rounded-md text-sm text-destructive/90">
                      This appears to be a credit limit issue. Please check your OpenRouter account balance or try a different model.
                    </div>
                  ) : null}
                </div>
              )}

              {/* Debate Content */}
              <DebateContent
                openingStatements={openingStatements}
                debateRounds={debateRounds}
                conclusions={conclusions}
                status={status}
                error={error}
              />

              {/* Judge Evaluations */}
              {judgeEvaluations.length > 0 && (
                <div className="space-y-6 mt-8">
                  <h3 className="text-2xl font-bold text-foreground mb-6">Judge Evaluations</h3>
                  {judgeEvaluations.map((eval_, idx) => (
                    <JudgeEvaluationCard key={idx} evaluation={eval_} />
                  ))}
                </div>
              )}

              {/* Final Result */}
              {finalResult && (
                <FinalResultCard finalResult={finalResult} />
              )}

              {/* Usage Statistics */}
              {usage && isComplete && (
                <UsageStatsCard usage={usage} />
              )}

              {isComplete && (
                <div className="flex justify-center pt-4">
                  <Button 
                    onClick={() => window.location.href = '/'}
                    variant="primary"
                    className="px-8 py-3 text-base"
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
