import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useForm } from "@tanstack/react-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useState, useEffect } from 'react'

const MODEL_OPTIONS = [
  { slug: 'anthropic/claude-sonnet-4.5', name: 'Anthropic: Claude Sonnet 4.5' },
  { slug: 'deepseek/deepseek-v3.2', name: 'DeepSeek: DeepSeek V3.2' },
  { slug: 'google/gemini-3-pro-preview', name: 'Google: Gemini 3 Pro' },
  { slug: 'openai/gpt-5.2', name: 'OpenAI: GPT-5.2' },
  { slug: 'x-ai/grok-4', name: 'xAI: Grok 4' },
  { slug: 'mistralai/mistral-medium-3.1', name: 'Mistral: Mistral Medium 3.1' },
]

const API_KEY_STORAGE_KEY = 'openrouter_api_key'
const SAVED_DEBATES_KEY = 'saved_debates'

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

function IndexComponent() {
  const navigate = useNavigate()
  const [apiKey, setApiKey] = useState<string>('')
  const [showApiKeyField, setShowApiKeyField] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [isCardUnmounting, setIsCardUnmounting] = useState(false)
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
    const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY)
    if (storedApiKey) {
      setApiKey(storedApiKey)
      setShowApiKeyField(false)
    } else {
      setShowApiKeyField(true)
    }

    // Load saved debates
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleApiKeyChange = (value: string) => {
    setApiKey(value)
    if (value.trim()) {
      localStorage.setItem(API_KEY_STORAGE_KEY, value.trim())
      // Show toast
      setShowToast(true)
      // Start unmounting animation
      setIsCardUnmounting(true)
      // Hide card after animation completes
      setTimeout(() => {
        setShowApiKeyField(false)
        setIsCardUnmounting(false)
      }, 300)
      // Hide toast after 3 seconds
      setTimeout(() => {
        setShowToast(false)
      }, 3000)
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY)
    }
  }
  
  const form = useForm({
    defaultValues: {
      topic: "",
      yesModel: "",
      noModel: "",
      rounds: 3,
      judgePrompt: ""
    },
    onSubmit: async ({ value }) => {
      // Validate required fields - trim to handle whitespace
      const topic = value.topic?.trim() || ''
      const yesModel = value.yesModel?.trim() || ''
      const noModel = value.noModel?.trim() || ''
      
      // Debug logging
      console.log('Form submission values:', { topic, yesModel, noModel, rawValue: value })
      
      if (!topic || !yesModel || !noModel) {
        const missingFields = []
        if (!topic) missingFields.push('topic')
        if (!yesModel) missingFields.push('yes model')
        if (!noModel) missingFields.push('no model')
        alert(`Please fill in all required fields: ${missingFields.join(', ')}`)
        return
      }

      // Validate API key
      const currentApiKey = localStorage.getItem(API_KEY_STORAGE_KEY)
      if (!currentApiKey || !currentApiKey.trim()) {
        alert('Please enter your OpenRouter API key')
        setShowApiKeyField(true)
        return
      }

      // Generate a UUID for the debate
      const debateId = crypto.randomUUID()
      
      // Save debate config to localStorage before navigating
      const debateConfig = {
        debateId,
        topic,
        yesModel,
        noModel,
        rounds: value.rounds.toString(),
        judgePrompt: value.judgePrompt?.trim() || '',
        timestamp: new Date().toISOString()
      }
      
      // Store in a temporary key that will be used when the debate page loads
      const pendingDebates = JSON.parse(localStorage.getItem('pending_debates') || '{}')
      pendingDebates[debateId] = debateConfig
      localStorage.setItem('pending_debates', JSON.stringify(pendingDebates))
      
      // Verify it was saved
      const verify = JSON.parse(localStorage.getItem('pending_debates') || '{}')
      if (!verify[debateId]) {
        console.error('Failed to save debate config to localStorage')
        alert('Failed to save debate configuration. Please try again.')
        return
      }
      
      // Navigate to the debate page with just the debateId
      navigate({ 
        to: '/debate/$debateId', 
        params: { debateId }
      })
    }
  })

  const hasApiKey = apiKey.trim().length > 0

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-8 bg-background">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50 animate-[slideUp_0.3s_ease-out]">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>API key saved successfully!</span>
          </div>
        </div>
      )}

      <div className="mb-12 flex justify-center">
        <Link to="/">
          <h1 className="text-4xl font-bold text-foreground hover:opacity-80 transition-opacity cursor-pointer">AI Debates</h1>
        </Link>
      </div>

      <div className="flex flex-col items-center gap-4 w-full max-w-5xl">
        <form
          className="w-full flex flex-col items-center gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          {showApiKeyField && (
            <Card 
              className={`w-full transition-all duration-300 ${
                isCardUnmounting 
                  ? 'opacity-0 -translate-y-4 pointer-events-none' 
                  : 'opacity-100 translate-y-0'
              }`}
            >
              <CardHeader>
                <CardTitle>OpenRouter API Key</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <Input
                    id="api-key"
                    type="password"
                    className="w-full"
                    placeholder="Enter your OpenRouter API key"
                    value={apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Your API key is stored locally and will be used for all debate requests.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="w-full">
            <CardHeader>
              <CardTitle>Debate Topic</CardTitle>
            </CardHeader>
            <CardContent>
              <form.Field
                name="topic"
                children={(field) => (
                  <Textarea 
                    className="w-full"
                    placeholder="Enter the debate topic or a whole article which you want to debate about"
                    rows={4}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                )}
              />
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardHeader>
              <CardTitle>Select models for each side</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 w-full flex-wrap">
                <form.Field
                  name="yesModel"
                  children={(field) => (
                    <div className="flex-1 flex flex-col gap-3 min-w-[200px]">
                      <Select
                        value={field.state.value || ''}
                        onValueChange={(value) => {
                          field.handleChange(value)
                          field.handleBlur()
                        }}
                      >
                        <SelectTrigger id="yes-model" className="w-full">
                          <SelectValue placeholder="Select model for Yes" />
                        </SelectTrigger>
                        <SelectContent>
                          {MODEL_OPTIONS.map((model) => (
                            <SelectItem key={`yes-${model.slug}`} value={model.slug}>
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />

                <form.Field
                  name="noModel"
                  children={(field) => (
                    <div className="flex-1 flex flex-col gap-3 min-w-[200px]">
                      <Select
                        value={field.state.value || ''}
                        onValueChange={(value) => {
                          field.handleChange(value)
                          field.handleBlur()
                        }}
                      >
                        <SelectTrigger id="no-model" className="w-full">
                          <SelectValue placeholder="Select model for No" />
                        </SelectTrigger>
                        <SelectContent>
                          {MODEL_OPTIONS.map((model) => (
                            <SelectItem key={`no-${model.slug}`} value={model.slug}>
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardHeader>
              <CardTitle>Rounds of rebuttals</CardTitle>
            </CardHeader>
            <CardContent>
              <form.Field
                name="rounds"
                children={(field) => (
                  <div className="flex flex-col gap-2">
                    <Input
                      id="rounds"
                      type="number"
                      min="1"
                      max="5"
                      step="1"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(Number(e.target.value))}
                      onBlur={field.handleBlur}
                      placeholder="e.g., 3"
                      className="w-full"
                    />
                  </div>
                )}
              />
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardHeader>
              <CardTitle>Judge system prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <form.Field
                name="judgePrompt"
                children={(field) => (
                  <div className="flex flex-col gap-3">
                    <Textarea
                      id="judge-prompt"
                      placeholder="Describe how judges should evaluate the debate (e.g., reasoning quality, evidence, factual accuracy, conciseness)"
                      rows={4}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="w-full min-h-[120px]"
                    />
                  </div>
                )}
              />
            </CardContent>
          </Card>

          <Button 
            type="submit" 
            disabled={!hasApiKey}
            className="mt-2 bg-[#EE8955] hover:bg-[#FFA366] text-[#1a1a1a] font-semibold px-7 py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Debate
          </Button>
        </form>

        {/* Saved Debates Section */}
        {savedDebates.length > 0 && (
          <div className="w-full mt-8">
            <h2 className="text-2xl font-bold mb-4 text-foreground">Saved Debates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedDebates.map((debate, index) => {
                const colorScheme = cardColors[index % cardColors.length]
                const date = new Date(debate.timestamp)
                const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
                
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
                            deleteDebate(debate.debateId)
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
                          <div>FOR: {getModelName(debate.yesModel)}</div>
                          <div>AGAINST: {getModelName(debate.noModel)}</div>
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
          </div>
        )}
      </div>
    </div>
  )
}

export const Route = createFileRoute('/')({
  component: IndexComponent,
})
