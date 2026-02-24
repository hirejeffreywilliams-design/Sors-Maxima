import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Bell, BellRing, BellOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GameAlertButtonProps {
  gameId: string;
  sport: string;
  gameName: string;
  variant?: "icon" | "full";
}

export function GameAlertButton({ gameId, sport, gameName, variant = "icon" }: GameAlertButtonProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const { data: subscriptions = [] } = useQuery<any[]>({
    queryKey: ["/api/game-subscriptions"],
  });

  const currentSub = subscriptions.find((s: any) => s.gameId === gameId);
  const isSubscribed = !!currentSub;

  const subscribeMutation = useMutation({
    mutationFn: (alerts: { gameStart: boolean; scoreChange: boolean }) =>
      apiRequest("POST", "/api/game-subscriptions", { gameId, sport, gameName, alerts }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/game-subscriptions"] });
      toast({ title: "Alerts enabled", description: `You'll get notifications for ${gameName}` });
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/game-subscriptions/${gameId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/game-subscriptions"] });
      toast({ title: "Alerts disabled", description: `Notifications turned off for ${gameName}` });
      setOpen(false);
    },
  });

  const handleQuickSubscribe = () => {
    if (isSubscribed) {
      setOpen(true);
    } else {
      subscribeMutation.mutate({ gameStart: true, scoreChange: true });
    }
  };

  const handleToggleAlert = (type: "gameStart" | "scoreChange", checked: boolean) => {
    const alerts = {
      gameStart: type === "gameStart" ? checked : (currentSub?.alerts?.gameStart ?? true),
      scoreChange: type === "scoreChange" ? checked : (currentSub?.alerts?.scoreChange ?? true),
    };
    subscribeMutation.mutate(alerts);
  };

  if (variant === "full") {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={isSubscribed ? "secondary" : "outline"}
            size="sm"
            onClick={handleQuickSubscribe}
            disabled={subscribeMutation.isPending}
            data-testid={`button-game-alert-${gameId}`}
          >
            {isSubscribed ? (
              <BellRing className="w-3.5 h-3.5 mr-1.5 text-primary" />
            ) : (
              <Bell className="w-3.5 h-3.5 mr-1.5" />
            )}
            {isSubscribed ? "Alerts On" : "Get Alerts"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="end" data-testid={`panel-game-alerts-${gameId}`}>
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Alert Settings</p>
            <div className="flex items-center justify-between">
              <span className="text-sm">Game Start</span>
              <Switch
                checked={currentSub?.alerts?.gameStart ?? true}
                onCheckedChange={(c) => handleToggleAlert("gameStart", c)}
                data-testid={`switch-game-start-${gameId}`}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Score Changes</span>
              <Switch
                checked={currentSub?.alerts?.scoreChange ?? true}
                onCheckedChange={(c) => handleToggleAlert("scoreChange", c)}
                data-testid={`switch-score-change-${gameId}`}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => unsubscribeMutation.mutate()}
              disabled={unsubscribeMutation.isPending}
              data-testid={`button-unsubscribe-${gameId}`}
            >
              <BellOff className="w-3.5 h-3.5 mr-1.5" />
              Turn Off Alerts
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 ${isSubscribed ? "text-primary" : "text-muted-foreground"}`}
          onClick={handleQuickSubscribe}
          disabled={subscribeMutation.isPending}
          data-testid={`button-game-alert-${gameId}`}
        >
          {isSubscribed ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
        </Button>
      </PopoverTrigger>
      {isSubscribed && (
        <PopoverContent className="w-56 p-3" align="end" data-testid={`panel-game-alerts-${gameId}`}>
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Alert Settings</p>
            <div className="flex items-center justify-between">
              <span className="text-xs">Game Start</span>
              <Switch
                checked={currentSub?.alerts?.gameStart ?? true}
                onCheckedChange={(c) => handleToggleAlert("gameStart", c)}
                data-testid={`switch-game-start-${gameId}`}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs">Score Changes</span>
              <Switch
                checked={currentSub?.alerts?.scoreChange ?? true}
                onCheckedChange={(c) => handleToggleAlert("scoreChange", c)}
                data-testid={`switch-score-change-${gameId}`}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-destructive hover:text-destructive"
              onClick={() => unsubscribeMutation.mutate()}
              disabled={unsubscribeMutation.isPending}
              data-testid={`button-unsubscribe-${gameId}`}
            >
              <BellOff className="w-3 h-3 mr-1" />
              Turn Off
            </Button>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
