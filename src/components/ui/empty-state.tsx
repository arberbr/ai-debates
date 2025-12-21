import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useNavigate } from '@tanstack/react-router'

interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  actionTo?: string
  onAction?: () => void
}

export const EmptyState = ({ 
  title, 
  description, 
  actionLabel = 'Go to Home',
  actionTo = '/',
  onAction
}: EmptyStateProps) => {
  const navigate = useNavigate()

  const handleAction = () => {
    if (onAction) {
      onAction()
    } else {
      navigate({ to: actionTo as any })
    }
  }

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground mb-4">{title}</p>
          <p className="text-sm text-muted-foreground mb-6">{description}</p>
          <Button
            onClick={handleAction}
            variant="primary"
          >
            {actionLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

