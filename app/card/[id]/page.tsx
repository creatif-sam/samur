import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default async function CardPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: card, error } = await supabase
    .from('business_cards')
    .select('name,email,phone,linkedin,business_title,avatar_url')
    // Ensure params.id is the USER's uuid, not the CARD's uuid
    .eq('user_id', params.id) 
    .single()

  if (error) {
    console.error("Supabase Error:", error.message)
    // This will tell you if it's an RLS issue or a "Row not found" issue
    return <div className="p-6">Error: {error.message} (ID: {params.id})</div>
  }

  if (!card) {
    return <div className="p-6">Card not found in database.</div>
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm p-6 text-center space-y-4">
        <div className="flex justify-center">
          <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
            <AvatarImage src={card.avatar_url || undefined} />
            <AvatarFallback className="text-2xl">
              {card.name?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
        </div>

        <div>
          <h1 className="text-2xl font-bold">{card.name}</h1>
          <p className="text-muted-foreground">
            {card.business_title}
          </p>
        </div>

        {card.email && (
          <Button asChild className="w-full">
            <a href={`mailto:${card.email}`}>Email</a>
          </Button>
        )}

        {card.phone && (
          <Button asChild variant="outline" className="w-full">
            <a href={`tel:${card.phone}`}>Call</a>
          </Button>
        )}

        {card.linkedin && (
          <Button asChild variant="outline" className="w-full">
            <a href={card.linkedin} target="_blank">
              LinkedIn
            </a>
          </Button>
        )}
      </Card>
    </div>
  )
}
