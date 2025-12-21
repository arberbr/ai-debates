import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from 'react'
import { formatDate24Hour, calculateTotalReadingTimeForSide } from '@/lib/utils'

const SAVED_DEBATES_KEY = 'saved_debates'

const MODEL_OPTIONS = [
  { slug: 'anthropic/claude-sonnet-4.5', name: 'Anthropic: Claude Sonnet 4.5' },
  { slug: 'deepseek/deepseek-v3.2', name: 'DeepSeek: DeepSeek V3.2' },
  { slug: 'google/gemini-3-pro-preview', name: 'Google: Gemini 3 Pro' },
  { slug: 'openai/gpt-5.2', name: 'OpenAI: GPT-5.2' },
  { slug: 'x-ai/grok-4', name: 'xAI: Grok 4' },
  { slug: 'mistralai/mistral-medium-3.1', name: 'Mistral: Mistral Medium 3.1' },
]

interface SavedDebate {
  debateId: string
  topic: string
  yesModel: string
  noModel: string
  rounds: string
  judgePrompt: string
  debateRounds: any[]
  judgeEvaluations: any[]
  finalResult: any
  timestamp: string
}

function DebatesComponent() {
  const navigate = useNavigate()
  const [savedDebates, setSavedDebates] = useState<SavedDebate[]>([])

  // Function to load saved debates
  const loadSavedDebates = () => {
    const saved = localStorage.getItem(SAVED_DEBATES_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Sort by timestamp, most recent first
        parsed.sort((a: SavedDebate, b: SavedDebate) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        setSavedDebates(parsed)
      } catch (e) {
        console.error('Error loading saved debates:', e)
        setSavedDebates([])
      }
    } else {
      setSavedDebates([])
    }
  }

  // Check localStorage on mount
  useEffect(() => {
    loadSavedDebates()
  }, [])

  // Listen for storage changes to update saved debates
  useEffect(() => {
    const handleStorageChange = () => {
      loadSavedDebates()
    }

    window.addEventListener('storage', handleStorageChange)
    // Also check periodically in case of same-tab updates
    const interval = setInterval(handleStorageChange, 1000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  // Reload when component becomes visible (user returns to page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadSavedDebates()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const deleteDebate = (debateId: string) => {
    const updated = savedDebates.filter(d => d.debateId !== debateId)
    setSavedDebates(updated)
    localStorage.setItem(SAVED_DEBATES_KEY, JSON.stringify(updated))
  }

  const getModelName = (slug: string) => {
    const model = MODEL_OPTIONS.find(m => m.slug === slug)
    return model ? model.name : slug
  }

  // Color palette for debate cards (with dark mode support)
  const cardColors = [
    { 
      bg: 'bg-blue-50 dark:bg-blue-950/30', 
      border: 'border-blue-200 dark:border-blue-800/50', 
      text: 'text-blue-900 dark:text-blue-100' 
    },
    { 
      bg: 'bg-purple-50 dark:bg-purple-950/30', 
      border: 'border-purple-200 dark:border-purple-800/50', 
      text: 'text-purple-900 dark:text-purple-100' 
    },
    { 
      bg: 'bg-green-50 dark:bg-green-950/30', 
      border: 'border-green-200 dark:border-green-800/50', 
      text: 'text-green-900 dark:text-green-100' 
    },
    { 
      bg: 'bg-yellow-50 dark:bg-yellow-950/30', 
      border: 'border-yellow-200 dark:border-yellow-800/50', 
      text: 'text-yellow-900 dark:text-yellow-100' 
    },
    { 
      bg: 'bg-pink-50 dark:bg-pink-950/30', 
      border: 'border-pink-200 dark:border-pink-800/50', 
      text: 'text-pink-900 dark:text-pink-100' 
    },
    { 
      bg: 'bg-indigo-50 dark:bg-indigo-950/30', 
      border: 'border-indigo-200 dark:border-indigo-800/50', 
      text: 'text-indigo-900 dark:text-indigo-100' 
    },
    { 
      bg: 'bg-orange-50 dark:bg-orange-950/30', 
      border: 'border-orange-200 dark:border-orange-800/50', 
      text: 'text-orange-900 dark:text-orange-100' 
    },
    { 
      bg: 'bg-teal-50 dark:bg-teal-950/30', 
      border: 'border-teal-200 dark:border-teal-800/50', 
      text: 'text-teal-900 dark:text-teal-100' 
    },
  ]

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-8 bg-background">
      <div className="w-full max-w-5xl">
        {savedDebates.length === 0 ? (
          <Card className="w-full">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground mb-4">No debates found</p>
                <p className="text-sm text-muted-foreground mb-6">Start a new debate from the Home page to see it here.</p>
                <Button
                  onClick={() => navigate({ to: '/' })}
                  className="bg-[#EE8955] hover:bg-[#FFA366] text-[#1a1a1a] font-semibold"
                >
                  Go to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">All Debates</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {savedDebates.length} {savedDebates.length === 1 ? 'debate' : 'debates'} found
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {savedDebates.map((debate, index) => {
                const colorScheme = cardColors[index % cardColors.length]
                const formattedDate = formatDate24Hour(debate.timestamp)
                const yesReadingTime = calculateTotalReadingTimeForSide(debate, 'yes')
                const noReadingTime = calculateTotalReadingTimeForSide(debate, 'no')
                
                const handleCardClick = () => {
                  navigate({
                    to: '/debate/$debateId',
                    params: { debateId: debate.debateId }
                  })
                }
                
                return (
                  <Card 
                    key={debate.debateId} 
                    className={`${colorScheme.bg} ${colorScheme.border} border-2 cursor-pointer hover:shadow-lg transition-shadow`}
                    onClick={handleCardClick}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className={`text-lg ${colorScheme.text} line-clamp-2`}>
                          {debate.topic?.replace(/\*\*/g, '').replace(/^["']+|["']+$/g, '').trim() || 'Untitled Debate'}
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            const debateTitle = debate.topic?.replace(/\*\*/g, '').replace(/^["']+|["']+$/g, '').trim() || 'Untitled Debate'
                            const confirmed = window.confirm(
                              `Are you sure you want to delete "${debateTitle}"?\n\nThis action cannot be undone.`
                            )
                            if (confirmed) {
                              deleteDebate(debate.debateId)
                            }
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 flex-shrink-0"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className={`${colorScheme.text} space-y-2`}>
                      <div className="text-sm">
                        <div className="font-semibold mb-1">Models:</div>
                        <div className="text-xs space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span>FOR: {getModelName(debate.yesModel)}</span>
                            <span className="opacity-70">{yesReadingTime}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span>AGAINST: {getModelName(debate.noModel)}</span>
                            <span className="opacity-70">{noReadingTime}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className="font-semibold">Rounds: {debate.debateRounds?.length || 0}</div>
                      </div>
                      {debate.finalResult?.winner && (
                        <div className="text-sm">
                          <div className="font-semibold">
                            Winner: {debate.finalResult.winner.toUpperCase()}
                          </div>
                        </div>
                      )}
                      <div className="text-xs opacity-70 dark:opacity-60 pt-2 border-t border-current/20 dark:border-current/30">
                        {formattedDate}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export const Route = createFileRoute('/debates')({
  component: DebatesComponent,
})

