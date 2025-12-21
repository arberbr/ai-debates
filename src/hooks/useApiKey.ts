import { useState, useEffect } from 'react'
import { STORAGE_KEYS } from '@/lib/constants'

export function useApiKey() {
  const [apiKey, setApiKey] = useState<string>('')
  const [showApiKeyField, setShowApiKeyField] = useState(false)

  useEffect(() => {
    const storedApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY)
    if (storedApiKey) {
      setApiKey(storedApiKey)
      setShowApiKeyField(false)
    } else {
      setShowApiKeyField(true)
    }
  }, [])

  const updateApiKey = (value: string) => {
    setApiKey(value)
    if (value.trim()) {
      localStorage.setItem(STORAGE_KEYS.API_KEY, value.trim())
    } else {
      localStorage.removeItem(STORAGE_KEYS.API_KEY)
    }
  }

  const clearApiKey = () => {
    localStorage.removeItem(STORAGE_KEYS.API_KEY)
    setApiKey('')
    setShowApiKeyField(true)
  }

  return {
    apiKey,
    showApiKeyField,
    setShowApiKeyField,
    updateApiKey,
    clearApiKey,
    hasApiKey: apiKey.trim().length > 0,
  }
}

