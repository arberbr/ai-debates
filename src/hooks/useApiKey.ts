import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/lib/constants";
import { useLocalStorage } from "./useLocalStorage";

export function useApiKey() {
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKeyField, setShowApiKeyField] = useState(false);
  const { getItemRaw, setItem, removeItem } = useLocalStorage();

  useEffect(() => {
    const storedApiKey = getItemRaw(STORAGE_KEYS.API_KEY);
    if (storedApiKey) {
      setApiKey(storedApiKey);
      setShowApiKeyField(false);
    } else {
      setShowApiKeyField(true);
    }
  }, [getItemRaw]);

  const updateApiKey = (value: string) => {
    setApiKey(value);
  };

  const saveApiKey = (value: string) => {
    if (value.trim()) {
      setItem(STORAGE_KEYS.API_KEY, value.trim());
      setApiKey(value.trim());
    } else {
      removeItem(STORAGE_KEYS.API_KEY);
      setApiKey("");
    }
  };

  const clearApiKey = () => {
    removeItem(STORAGE_KEYS.API_KEY);
    setApiKey("");
    setShowApiKeyField(true);
  };

  return {
    apiKey,
    showApiKeyField,
    setShowApiKeyField,
    updateApiKey,
    saveApiKey,
    clearApiKey,
    hasApiKey: apiKey.trim().length > 0,
  };
}
