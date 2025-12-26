import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { STORAGE_KEYS } from "@/lib/constants";
import { generateUUID } from "@/lib/utils";
import type { DebateFormErrors } from "@/lib/validation";
import { parseDebateForm, validateDebateForm } from "@/lib/validation";
import { useLocalStorage } from "./useLocalStorage";
import { useRateLimit } from "./useRateLimit";

interface DebateFormValues {
  topic: string;
  yesModel: string;
  noModel: string;
  rounds: number;
  judgePrompt?: string;
}

interface UseDebateFormSubmissionOptions {
  /** Show API key field callback */
  setShowApiKeyField: (show: boolean) => void;
  /** Rate limit in milliseconds */
  rateLimitMs?: number;
}

/**
 * Custom hook for handling debate form submission logic
 */
export function useDebateFormSubmission({
  setShowApiKeyField,
  rateLimitMs = 5000,
}: UseDebateFormSubmissionOptions) {
  const navigate = useNavigate();
  const { getItemRaw, setItem, getItem } = useLocalStorage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<DebateFormErrors>({});

  const { checkRateLimit } = useRateLimit({
    limitMs: rateLimitMs,
    onRateLimitExceeded: (waitTimeSeconds) => {
      toast.error(
        `Please wait ${waitTimeSeconds} second${waitTimeSeconds !== 1 ? "s" : ""} before starting another debate`
      );
    },
  });

  /**
   * Validates API key
   */
  const validateApiKey = useCallback((): string | null => {
    const currentApiKey = getItemRaw(STORAGE_KEYS.API_KEY);
    if (!currentApiKey || !currentApiKey.trim()) {
      toast.error("Please enter your OpenRouter API key");
      setShowApiKeyField(true);
      return null;
    }
    return currentApiKey.trim();
  }, [getItemRaw, setShowApiKeyField]);

  /**
   * Saves debate config to localStorage
   */
  const saveDebateConfig = useCallback(
    (debateId: string, config: DebateFormValues): boolean => {
      const debateConfig = {
        debateId,
        topic: config.topic,
        yesModel: config.yesModel,
        noModel: config.noModel,
        rounds: config.rounds.toString(),
        judgePrompt: config.judgePrompt?.trim() || "",
        timestamp: new Date().toISOString(),
      };

      try {
        const pendingDebates = getItem<Record<string, typeof debateConfig>>(
          STORAGE_KEYS.PENDING_DEBATES,
          {}
        );
        const updated = { ...pendingDebates, [debateId]: debateConfig };
        setItem(STORAGE_KEYS.PENDING_DEBATES, updated);

        // Verify it was saved
        const verify =
          getItem<Record<string, typeof debateConfig>>(STORAGE_KEYS.PENDING_DEBATES, {}) ?? {};
        if (!verify[debateId]) {
          console.error("Failed to save debate config to localStorage");
          toast.error("Failed to save debate configuration. Please try again.");
          return false;
        }

        return true;
      } catch (e) {
        if (e instanceof Error && e.name === "QuotaExceededError") {
          toast.error("Storage limit reached. Please delete some debates to free up space.");
          return false;
        }
        throw e;
      }
    },
    [getItem, setItem]
  );

  /**
   * Handles form submission
   */
  const handleSubmit = useCallback(
    async (values: DebateFormValues) => {
      // Rate limit check
      if (!checkRateLimit()) {
        return;
      }

      setIsSubmitting(true);
      setFieldErrors({});

      try {
        // Validate form fields
        const errors = validateDebateForm({
          topic: values.topic,
          yesModel: values.yesModel,
          noModel: values.noModel,
        });

        if (Object.keys(errors).length > 0) {
          setFieldErrors(errors);
          toast.error("Please fix the errors in the form");
          return;
        }

        // Validate and sanitize form data (validation already done above)
        parseDebateForm({
          topic: values.topic,
          yesModel: values.yesModel,
          noModel: values.noModel,
        });

        // Validate API key
        const apiKey = validateApiKey();
        if (!apiKey) {
          return;
        }

        // Generate debate ID
        const debateId = generateUUID();

        // Save debate config
        if (!saveDebateConfig(debateId, values)) {
          return;
        }

        // Navigate to debate page
        navigate({
          to: "/debate/$debateId",
          params: { debateId },
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [checkRateLimit, validateApiKey, saveDebateConfig, navigate]
  );

  return {
    handleSubmit,
    isSubmitting,
    fieldErrors,
    setFieldErrors,
  };
}
