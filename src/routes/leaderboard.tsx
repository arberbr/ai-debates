import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebates } from "@/hooks/useDebates";
import { cleanString } from "@/lib/debate-utils";
import { calculateModelStats, getModelName, type ModelStats, type TotalStats } from "@/lib/utils";

function LeaderboardComponent() {
  const navigate = useNavigate();
  const { debates: savedDebates, isLoading } = useDebates();
  const [sortBy, setSortBy] = useState<"winRate" | "wins" | "averageScore" | "totalDebates">(
    "winRate"
  );

  // Calculate statistics (separate from sorting for better performance)
  const { modelStatsArray, totalStats } = useMemo(() => {
    // Return empty stats if loading or no debates
    if (isLoading || savedDebates.length === 0) {
      return {
        modelStatsArray: [] as ModelStats[],
        totalStats: {
          totalDebates: 0,
          totalCost: 0,
          totalTokens: 0,
          averageRounds: 0,
        } as TotalStats,
      };
    }

    try {
      return calculateModelStats(savedDebates, getModelName, cleanString);
    } catch (e) {
      console.error("Error calculating statistics:", e);
      return {
        modelStatsArray: [] as ModelStats[],
        totalStats: {
          totalDebates: 0,
          totalCost: 0,
          totalTokens: 0,
          averageRounds: 0,
        } as TotalStats,
      };
    }
  }, [savedDebates, isLoading]);

  // Sort model stats separately (only recalculates when sortBy changes)
  const modelStats = useMemo(() => {
    return [...modelStatsArray].sort((a, b) => {
      switch (sortBy) {
        case "winRate":
          return b.winRate - a.winRate;
        case "wins":
          return b.wins - a.wins;
        case "averageScore":
          return b.averageScore - a.averageScore;
        case "totalDebates":
          return b.totalDebates - a.totalDebates;
        default:
          return 0;
      }
    });
  }, [modelStatsArray, sortBy]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-start p-8 bg-background">
        <div className="w-full space-y-6">
          <div className="mb-6 space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex justify-between">
                <Skeleton className="h-6 w-40" />
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-9 w-20" />
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (savedDebates.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-start p-8 bg-background">
        <div className="w-full">
          <EmptyState
            title="No debates found"
            description="Start a new debate from the Home page to see leaderboards here."
            actionLabel="Go to Home"
            actionTo="/"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-8 bg-background">
      <FeatureErrorBoundary featureName="Leaderboards">
        <div className="w-full space-y-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">Leaderboards</h1>
            <p className="text-muted-foreground">
              Statistics from {totalStats.totalDebates} debate
              {totalStats.totalDebates !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Total Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Total Debates</div>
                  <div className="text-2xl font-bold">{totalStats.totalDebates}</div>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Total Cost</div>
                  <div className="text-2xl font-bold">${totalStats.totalCost.toFixed(4)}</div>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Total Tokens</div>
                  <div className="text-2xl font-bold">
                    {totalStats.totalTokens.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Avg Rounds</div>
                  <div className="text-2xl font-bold">{totalStats.averageRounds}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Model Performance Leaderboard */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <CardTitle>Model Performance</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={sortBy === "winRate" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSortBy("winRate")}
                  >
                    Win Rate
                  </Button>
                  <Button
                    variant={sortBy === "wins" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSortBy("wins")}
                  >
                    Wins
                  </Button>
                  <Button
                    variant={sortBy === "averageScore" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSortBy("averageScore")}
                  >
                    Avg Score
                  </Button>
                  <Button
                    variant={sortBy === "totalDebates" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSortBy("totalDebates")}
                  >
                    Debates
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {modelStats.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No model statistics available
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <caption className="sr-only">Model Performance Leaderboard</caption>
                    <thead>
                      <tr className="border-b border-border">
                        <th scope="col" className="text-left p-3 font-semibold">
                          Rank
                        </th>
                        <th scope="col" className="text-left p-3 font-semibold">
                          Model
                        </th>
                        <th scope="col" className="text-center p-3 font-semibold">
                          Wins
                        </th>
                        <th scope="col" className="text-center p-3 font-semibold">
                          Losses
                        </th>
                        <th scope="col" className="text-center p-3 font-semibold">
                          Ties
                        </th>
                        <th scope="col" className="text-center p-3 font-semibold">
                          Win Rate
                        </th>
                        <th scope="col" className="text-center p-3 font-semibold">
                          Avg Score
                        </th>
                        <th scope="col" className="text-center p-3 font-semibold">
                          Debates
                        </th>
                        <th scope="col" className="text-center p-3 font-semibold">
                          Avg Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {modelStats.map((stats, index) => (
                        <tr
                          key={stats.model}
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                        >
                          <th scope="row" className="p-3">
                            <div className="flex items-center gap-2">
                              {index === 0 && (
                                <span
                                  className="text-yellow-500"
                                  role="img"
                                  aria-label="First place"
                                >
                                  🥇
                                </span>
                              )}
                              {index === 1 && (
                                <span
                                  className="text-gray-400"
                                  role="img"
                                  aria-label="Second place"
                                >
                                  🥈
                                </span>
                              )}
                              {index === 2 && (
                                <span
                                  className="text-amber-600"
                                  role="img"
                                  aria-label="Third place"
                                >
                                  🥉
                                </span>
                              )}
                              <span className="font-semibold">#{index + 1}</span>
                            </div>
                          </th>
                          <td className="p-3 font-medium">{stats.modelName}</td>
                          <td className="p-3 text-center text-green-600 dark:text-green-400 font-semibold">
                            {stats.wins}
                          </td>
                          <td className="p-3 text-center text-red-600 dark:text-red-400 font-semibold">
                            {stats.losses}
                          </td>
                          <td className="p-3 text-center text-yellow-600 dark:text-yellow-400 font-semibold">
                            {stats.ties}
                          </td>
                          <td className="p-3 text-center font-semibold">
                            {stats.winRate.toFixed(1)}%
                          </td>
                          <td className="p-3 text-center">
                            {stats.averageScore > 0 ? stats.averageScore.toFixed(1) : "N/A"}
                          </td>
                          <td className="p-3 text-center">{stats.totalDebates}</td>
                          <td className="p-3 text-center text-sm">
                            ${stats.averageCost.toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate({ to: "/" })} variant="primary">
              Start New Debate
            </Button>
            <Button onClick={() => navigate({ to: "/debates" })} variant="outline">
              View All Debates
            </Button>
          </div>
        </div>
      </FeatureErrorBoundary>
    </div>
  );
}

export const Route = createFileRoute("/leaderboard")({
  component: LeaderboardComponent,
});
