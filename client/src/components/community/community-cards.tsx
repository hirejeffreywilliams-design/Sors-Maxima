import { useQuery } from "@tanstack/react-query";
import { TradingCard } from "@/components/trading-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sparkles, Trophy, Calendar, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";

interface CommunityCard {
  id: number;
  userId: number;
  username: string;
  acquiredAt: string;
  isPublicShowcase: boolean;
  card: any;
}

export function CommunityCards() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = useQuery<CommunityCard[]>({
    queryKey: ["/api/cards/community/feed"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="aspect-[2/3] w-full rounded-2xl" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    );
  }

  const cards = data || [];

  if (cards.length === 0) {
    return (
      <Card className="border-dashed py-12">
        <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-4 rounded-full bg-muted">
            <Sparkles className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">No cards shared yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Be the first to show off your pull! Go to your collection and share your best cards.
            </p>
          </div>
          <Button onClick={() => setLocation("/cards")} data-testid="button-go-to-collection">
            Go to Collection
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Calculate stats
  const totalShared = cards.length;
  const sports = cards.map(c => (c.card as any).sport);
  const mostPopularSport = sports.length > 0 
    ? Object.entries(sports.reduce((acc, s) => ({ ...acc, [s]: (acc[s] || 0) + 1 }), {} as Record<string, number>))
        .sort((a, b) => (b[1] as number) - (a[1] as number))[0][0]
    : "N/A";
  
  const grades = ["A+", "A", "B+", "B", "C+", "C", "D", "F"];
  const sharedGrades = cards.map(c => (c.card as any).grade.toUpperCase());
  const highestGrade = grades.find(g => sharedGrades.includes(g)) || "N/A";

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Shared</p>
              <p className="text-xl font-black" data-testid="text-stat-total-shared">{totalShared}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Trophy className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Top Sport</p>
              <p className="text-xl font-black" data-testid="text-stat-popular-sport">{mostPopularSport}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Calendar className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Highest Grade</p>
              <p className="text-xl font-black" data-testid="text-stat-highest-grade">{highestGrade}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feed Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {cards.map((item) => (
          <div key={item.id} className="group space-y-4">
            <div className="aspect-[2/3] w-full">
              <TradingCard 
                card={item.card} 
                isFlippable={true}
                className="h-full shadow-xl"
                collectionId={item.id}
                isPublicShowcase={item.isPublicShowcase}
              />
            </div>
            <div className="flex flex-col gap-2 px-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm" data-testid={`text-card-owner-${item.id}`}>@{item.username}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold">
                  Pulled {formatDistanceToNow(new Date(item.acquiredAt))} ago
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full gap-2 text-xs"
                onClick={() => setLocation(`/cards?id=${item.id}`)}
                data-testid={`button-view-card-${item.id}`}
              >
                <Eye className="w-3.5 h-3.5" />
                View Full Details
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
