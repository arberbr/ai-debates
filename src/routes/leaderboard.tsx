import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from '@/components/ui/button'

function LeaderboardComponent() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-8 bg-background">
      <div className="w-full max-w-5xl">
      <Card className="w-full">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground mb-4">Leaderboard coming soon...</p>
                <p className="text-sm text-muted-foreground mb-6">Start a new debate from the Home page to see it here.</p>
                <Button
                  onClick={() => navigate({ to: '/' })}
                  className="bg-[#EE8955] hover:bg-[#FFA366] text-[#1a1a1a] font-semibold"
                >
                  Go to Home
                </Button>
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

