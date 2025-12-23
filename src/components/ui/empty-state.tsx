import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
}

export const EmptyState = ({
  title,
  description,
  actionLabel = "Go to Home",
  actionTo = "/",
  onAction,
}: EmptyStateProps) => {
  const navigate = useNavigate();

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else {
      navigate({ to: actionTo as string });
    }
  };

  return (
    <Card className="w-full" role="region" aria-labelledby="empty-state-title">
      <CardContent className="pt-6">
        <div className="text-center py-12">
          <h2 id="empty-state-title" className="text-lg text-muted-foreground mb-4">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">{description}</p>
          <Button onClick={handleAction} variant="primary" aria-label={actionLabel}>
            {actionLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
