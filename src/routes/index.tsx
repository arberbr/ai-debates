import { createFileRoute, useNavigate } from '@tanstack/react-router'
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
import { Toast } from "@/components/ui/toast"
import { useState } from 'react'
import { MODEL_OPTIONS, STORAGE_KEYS, DEBATE_CONFIG } from '@/lib/constants'
import { useApiKey } from '@/hooks/useApiKey'

function IndexComponent() {
  const navigate = useNavigate()
  const { apiKey, showApiKeyField, setShowApiKeyField, updateApiKey, hasApiKey } = useApiKey()
  const [showToast, setShowToast] = useState(false)
  const [isCardUnmounting, setIsCardUnmounting] = useState(false)

  const handleApiKeyChange = (value: string) => {
    updateApiKey(value)
    if (value.trim()) {
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

      // Validate topic length
      if (topic.length > DEBATE_CONFIG.MAX_TOPIC_LENGTH) {
        alert(`Topic must be ${DEBATE_CONFIG.MAX_TOPIC_LENGTH} characters or less. Please shorten your topic.`)
        return
      }

      // Validate API key
      const currentApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY)
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
      const pendingDebates = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_DEBATES) || '{}')
      pendingDebates[debateId] = debateConfig
      localStorage.setItem(STORAGE_KEYS.PENDING_DEBATES, JSON.stringify(pendingDebates))
      
      // Verify it was saved
      const verify = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_DEBATES) || '{}')
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-8 bg-background">
      {/* Toast Notification */}
      {showToast && (
        <Toast
          message="API key saved successfully!"
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}

      <div className="flex flex-col items-center gap-4 w-full">
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
                children={(field) => {
                  const topicValue = field.state.value || ''
                  const charCount = topicValue.length
                  const maxChars = 300
                  const isOverLimit = charCount > maxChars
                  
                  return (
                    <div className="flex flex-col gap-2">
                      <Textarea 
                        className={`w-full ${isOverLimit ? 'border-red-500' : ''}`}
                        placeholder={`Enter the debate topic (max ${DEBATE_CONFIG.MAX_TOPIC_LENGTH} characters)`}
                        rows={4}
                        value={field.state.value}
                        onChange={(e) => {
                          const value = e.target.value
                          // Allow typing but validation happens on submit
                          field.handleChange(value)
                        }}
                        onBlur={field.handleBlur}
                      />
                      <div className={`text-sm ${isOverLimit ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {charCount} / {maxChars} characters
                        {isOverLimit && (
                          <span className="ml-2 font-semibold">Topic is too long. Please shorten it to {DEBATE_CONFIG.MAX_TOPIC_LENGTH} characters or less.</span>
                        )}
                      </div>
                    </div>
                  )
                }}
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
                children={(field) => {
                  const roundsValue = field.state.value || 3
                  const isOverRecommended = roundsValue > 3
                  
                  return (
                    <div className="flex flex-col gap-2">
                      <Input
                        id="rounds"
                        type="number"
                        min={DEBATE_CONFIG.MIN_ROUNDS.toString()}
                        max={DEBATE_CONFIG.MAX_ROUNDS.toString()}
                        step="1"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(Number(e.target.value))}
                        onBlur={field.handleBlur}
                        placeholder="e.g., 3"
                        className="w-full"
                      />
                      {isOverRecommended && (
                        <p className="text-sm text-amber-600 font-semibold">
                          ⚠️ Warning: More than 3 rounds may significantly increase token usage and costs.
                        </p>
                      )}
                    </div>
                  )
                }}
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
            variant="primary"
            disabled={!hasApiKey}
            className="mt-2 px-7 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Debate
          </Button>
        </form>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/')({
  component: IndexComponent,
})
