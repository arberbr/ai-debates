import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { DebateCard } from "@/components/debate/DebateCard";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebates } from "@/hooks/useDebates";
import { extractErrorMessage } from "@/lib/error-utils";

function DebatesComponent() {
  const navigate = useNavigate();
  const { debates: savedDebates, deleteDebate, isLoading } = useDebates();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [debateToDelete, setDebateToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const handleCardClick = useCallback(
    (debateId: string) => {
      navigate({
        to: "/debate/$debateId",
        params: { debateId },
      });
    },
    [navigate]
  );

  const handleDeleteClick = useCallback((debate: { id: string; title: string }) => {
    setDebateToDelete(debate);
    setDeleteConfirmOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (debateToDelete) {
      try {
        deleteDebate(debateToDelete.id);
        toast.success("Debate deleted successfully");
        setDeleteConfirmOpen(false);
        setDebateToDelete(null);
      } catch (error) {
        const errorMessage = extractErrorMessage(
          error,
          "Failed to delete debate. Please try again."
        );
        toast.error(errorMessage);
        console.error("Delete error:", error);
      }
    }
  }, [debateToDelete, deleteDebate]);

  return (
    <div className="flex flex-col items-center justify-start p-8 bg-background">
      <FeatureErrorBoundary featureName="Debates List">
        <div className="w-full">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48 mb-6" />
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 w-full rounded-lg" />
              ))}
            </div>
          ) : savedDebates.length === 0 ? (
            <EmptyState
              title="No debates found"
              description="Start a new debate from the Home page to see it here."
              actionLabel="Go to Home"
              actionTo="/"
            />
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">All Debates</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {savedDebates.length} {savedDebates.length === 1 ? "debate" : "debates"} found
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {savedDebates.map((debate) => (
                  <DebateCard
                    key={debate.debateId}
                    debate={debate}
                    onCardClick={handleCardClick}
                    onDeleteClick={handleDeleteClick}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </FeatureErrorBoundary>
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Debate</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{debateToDelete?.title}"? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/debates")({
  component: DebatesComponent,
});
