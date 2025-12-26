import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TIMING } from "@/lib/constants";

interface ApiKeyCardProps {
  /** API key value */
  apiKey: string;
  /** Whether the card is visible */
  isVisible: boolean;
  /** Callback when API key changes */
  onApiKeyChange: (value: string) => void;
  /** Callback when API key is saved */
  onApiKeySave: (value: string) => void;
  /** Callback when card should be hidden */
  onHide: () => void;
}

/**
 * API key input card component with unmounting animation
 */
export function ApiKeyCard({
  apiKey,
  isVisible,
  onApiKeyChange,
  onApiKeySave,
  onHide,
}: ApiKeyCardProps) {
  const [isUnmounting, setIsUnmounting] = useState(false);

  const handleBlur = (value: string) => {
    onApiKeySave(value);
    if (value.trim()) {
      toast.success("API key saved successfully!");
      setIsUnmounting(true);
      setTimeout(() => {
        onHide();
        setIsUnmounting(false);
      }, TIMING.CARD_UNMOUNT_DURATION);
    }
  };

  if (!isVisible) return null;

  return (
    <Card
      className={`w-full transition-all duration-300 ${
        isUnmounting ? "opacity-0 -translate-y-4 pointer-events-none" : "opacity-100 translate-y-0"
      }`}
    >
      <CardHeader>
        <CardTitle>OpenRouter API Key</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          <Label htmlFor="api-key">OpenRouter API Key</Label>
          <Input
            id="api-key"
            type="password"
            className="w-full"
            placeholder="Enter your OpenRouter API key"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            onBlur={(e) => handleBlur(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Your API key is stored locally and will be used for all debate requests.
          </p>
          <p className="text-sm text-amber-600 dark:text-amber-400">
            ⚠️ Your API key is stored in your browser's local storage. Only use this on trusted
            devices.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
