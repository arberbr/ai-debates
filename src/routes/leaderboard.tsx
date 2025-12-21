import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent } from "@/components/ui/card"

function LeaderboardComponent() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-8 bg-background">
      <div className="w-full max-w-5xl">
        <Card className="w-full">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">Leaderboard</p>
              <p className="text-sm text-muted-foreground mt-2">Coming soon...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/leaderboard')({
  component: LeaderboardComponent,
})

