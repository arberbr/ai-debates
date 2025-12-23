import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useDebates } from "@/hooks/useDebates";
import { cleanString } from "@/lib/debate-utils";
import { getModelName } from "@/lib/utils";

interface ModelStats {
  model: string;
  modelName: string;
  wins: number;
  losses: number;
  ties: number;
  totalDebates: number;
  winRate: number;
  averageScore: number;
  totalTokens: number;
  totalCost: number;
  averageCost: number;
}

interface TopicStats {
  topic: string;
  count: number;
}

function LeaderboardComponent() {
  const navigate = useNavigate();
  const { debates: savedDebates } = useDebates();
  const [sortBy, setSortBy] = useState<"winRate" | "wins" | "averageScore" | "totalDebates">(
    "winRate"
  );

  // Memoize processed statistics to avoid recalculating on every render
  const { modelStats, topicStats, totalStats } = useMemo(() => {
    if (savedDebates.length === 0) {
      return {
        modelStats: [] as ModelStats[],
        topicStats: [] as TopicStats[],
        totalStats: {
          totalDebates: 0,
          totalCost: 0,
          totalTokens: 0,
          averageRounds: 0,
        },
      };
    }

    try {
      const debates = savedDebates;

      // Calculate model statistics
      const modelMap = new Map<string, ModelStats>();

      debates.forEach((debate) => {
        if (!debate.finalResult || !debate.yesModel || !debate.noModel) return;

        const yesModel = debate.yesModel;
        const noModel = debate.noModel;
        const winner = debate.finalResult.winner;
        const aggregateScore = debate.finalResult.aggregateScore;

        // Process YES model
        if (!modelMap.has(yesModel)) {
          modelMap.set(yesModel, {
            model: yesModel,
            modelName: getModelName(yesModel),
            wins: 0,
            losses: 0,
            ties: 0,
            totalDebates: 0,
            winRate: 0,
            averageScore: 0,
            totalTokens: 0,
            totalCost: 0,
            averageCost: 0,
          });
        }
        const yesStats = modelMap.get(yesModel);
        if (!yesStats) return;
        yesStats.totalDebates++;
        if (winner === "yes") yesStats.wins++;
        else if (winner === "no") yesStats.losses++;
        else if (winner === "tie") yesStats.ties++;
        if (aggregateScore?.yes) {
          yesStats.averageScore =
            (yesStats.averageScore * (yesStats.totalDebates - 1) + aggregateScore.yes) /
            yesStats.totalDebates;
        }
        if (debate.usage?.total_tokens) {
          yesStats.totalTokens += debate.usage.total_tokens;
        }
        if (debate.usage?.cost) {
          yesStats.totalCost += debate.usage.cost;
        }

        // Process NO model
        if (!modelMap.has(noModel)) {
          modelMap.set(noModel, {
            model: noModel,
            modelName: getModelName(noModel),
            wins: 0,
            losses: 0,
            ties: 0,
            totalDebates: 0,
            winRate: 0,
            averageScore: 0,
            totalTokens: 0,
            totalCost: 0,
            averageCost: 0,
          });
        }
        const noStats = modelMap.get(noModel);
        if (!noStats) return;
        noStats.totalDebates++;
        if (winner === "no") noStats.wins++;
        else if (winner === "yes") noStats.losses++;
        else if (winner === "tie") noStats.ties++;
        if (aggregateScore?.no) {
          noStats.averageScore =
            (noStats.averageScore * (noStats.totalDebates - 1) + aggregateScore.no) /
            noStats.totalDebates;
        }
        if (debate.usage?.total_tokens) {
          noStats.totalTokens += debate.usage.total_tokens;
        }
        if (debate.usage?.cost) {
          noStats.totalCost += debate.usage.cost;
        }
      });

      // Calculate win rates and average costs
      const statsArray = Array.from(modelMap.values()).map((stats) => {
        const winRate =
          stats.totalDebates > 0 ? ((stats.wins + stats.ties * 0.5) / stats.totalDebates) * 100 : 0;
        const averageCost = stats.totalDebates > 0 ? stats.totalCost / stats.totalDebates : 0;
        return {
          ...stats,
          winRate: Math.round(winRate * 100) / 100,
          averageScore: Math.round(stats.averageScore * 100) / 100,
          averageCost: Math.round(averageCost * 10000) / 10000,
        };
      });

      // Sort by selected metric (will be sorted separately in the render)
      const sortedStats = [...statsArray].sort((a, b) => {
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

      // Calculate topic statistics
      const topicMap = new Map<string, number>();
      debates.forEach((debate) => {
        const topic = cleanString(debate.topic || "Untitled Debate");
        topicMap.set(topic, (topicMap.get(topic) || 0) + 1);
      });

      const topics = Array.from(topicMap.entries())
        .map(([topic, count]) => ({ topic, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 topics

      // Calculate total statistics
      const totalCost = debates.reduce((sum, d) => sum + (d.usage?.cost || 0), 0);
      const totalTokens = debates.reduce((sum, d) => sum + (d.usage?.total_tokens || 0), 0);
      const totalRounds = debates.reduce((sum, d) => sum + (parseInt(d.rounds, 10) || 0), 0);
      const avgRounds = debates.length > 0 ? totalRounds / debates.length : 0;

      return {
        modelStats: sortedStats,
        topicStats: topics,
        totalStats: {
          totalDebates: debates.length,
          totalCost: Math.round(totalCost * 10000) / 10000,
          totalTokens,
          averageRounds: Math.round(avgRounds * 100) / 100,
        },
      };
    } catch (e) {
      console.error("Error loading debates:", e);
      return {
        modelStats: [] as ModelStats[],
        topicStats: [] as TopicStats[],
        totalStats: {
          totalDebates: 0,
          totalCost: 0,
          totalTokens: 0,
          averageRounds: 0,
        },
      };
    }
  }, [savedDebates, sortBy]);

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

          {/* Most Debated Topics */}
          {topicStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Most Debated Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topicStats.map((topicStat, index) => (
                    <div
                      key={`${topicStat.topic}-${index}`}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground w-8">
                          #{index + 1}
                        </span>
                        <span className="font-medium">{topicStat.topic}</span>
                      </div>
                      <span className="text-sm text-muted-foreground font-semibold">
                        {topicStat.count} debate{topicStat.count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
