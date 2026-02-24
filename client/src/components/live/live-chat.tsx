import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send } from "lucide-react";

interface ChatMessage {
  id: string;
  username: string;
  content: string;
  timestamp: Date;
}

const simulatedMessages = [
  { username: "LiveTracker", content: "Momentum just shifted after that turnover" },
  { username: "OddsWatch", content: "Line moved 1.5 points in the last 3 minutes" },
  { username: "GameFlow", content: "Second half trends favor the under here" },
  { username: "StatGuru", content: "Key player just returned from the bench" },
  { username: "BetAlert", content: "Sharp action coming in on the live spread" },
  { username: "CourtVision", content: "Pace of play has slowed significantly" },
  { username: "EdgeFinder", content: "Value showing on the alternate line right now" },
  { username: "PropMaster", content: "Player prop looking good with current usage rate" },
  { username: "SpreadKing", content: "This cover is looking more likely each possession" },
  { username: "TotalGuru", content: "Scoring pace suggests the over hits easily" },
];

export function LiveChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init-1",
      username: "LiveTracker",
      content: "Welcome to the live game chat. Share your thoughts on the action!",
      timestamp: new Date(Date.now() - 120000),
    },
    {
      id: "init-2",
      username: "OddsWatch",
      content: "Opening lines have shifted significantly since tip-off",
      timestamp: new Date(Date.now() - 60000),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const simulationIndex = useRef(0);

  useEffect(() => {
    const delay = 10000;
    const interval = setInterval(() => {
      const simMsg = simulatedMessages[simulationIndex.current % simulatedMessages.length];
      simulationIndex.current += 1;
      setMessages((prev) => [
        ...prev,
        {
          id: `sim-${Date.now()}`,
          username: simMsg.username,
          content: simMsg.content,
          timestamp: new Date(),
        },
      ]);
    }, delay);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        username: "You",
        content: trimmed,
        timestamp: new Date(),
      },
    ]);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-lg flex-wrap">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            Live Game Chat
          </div>
          <Badge variant="outline" className="gap-1 bg-green-500/10 border-green-500/30 text-green-500" data-testid="badge-message-count">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {messages.length} messages
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-[400px] pr-4" ref={scrollRef}>
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-3" data-testid={`chat-message-${msg.id}`}>
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="text-xs bg-muted">
                    {msg.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium" data-testid={`chat-username-${msg.id}`}>
                      {msg.username}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5" data-testid={`chat-content-${msg.id}`}>
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex items-start gap-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="resize-none min-h-[40px]"
            rows={1}
            data-testid="input-chat-message"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!inputValue.trim()}
            data-testid="button-send-chat"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
