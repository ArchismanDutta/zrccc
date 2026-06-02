import { MessageSquare } from 'lucide-react'
import { EmptyState } from '@/components/ui/Cards'

export default function MessagesPage() {
  return (
    <div className="animate-slide-up">
      <EmptyState
        icon={MessageSquare}
        title="Team Messaging"
        description="Real-time internal messaging with DMs, project channels, and department channels — coming in Phase 2."
        action={<button className="btn btn-primary">Notify me when ready</button>}
      />
    </div>
  )
}
