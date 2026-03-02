import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Bot, Send, User, Sparkles, TrendingUp, Target,
  Lightbulb, Zap, Atom, Info
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Hey! I'm your Sors Intelligence Assistant — powered by real platform data, not guesses. I can pull today's top picks, live scores, injury reports, +EV plays, model stats, and bankroll strategy. What do you want to know?",
    timestamp: new Date(),
    suggestions: [
      "Build me a 3-leg parlay",
      "What are today's +EV plays?",
      "Show me live games",
      "How is the model performing?",
    ],
  },
];

export function BettingAssistant() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/live/assistant", { message });
      return res.json() as Promise<{ response: string }>;
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        suggestions: [
          "Tell me more",
          "Add to my parlay",
          "Show alternatives",
        ],
      };
      setMessages(prev => [...prev, assistantMessage]);
    },
    onError: (error: Error) => {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    },
  });

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    chatMutation.mutate(content);
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
            <Bot className="w-5 h-5 text-purple-500" />
            Sors Betting Assistant
            <QuantumBadge />
          </CardTitle>
          <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-500 border-green-500/30">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            Online
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-500/10 p-2 rounded-md">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>AI-powered responses from live model</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="space-y-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
              >
                {message.role === "assistant" && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                      <Atom className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-[80%] ${message.role === "user" ? "order-first" : ""}`}>
                  <div
                    className={`p-3 rounded-lg ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.suggestions && (
                    <div className="flex gap-2 flex-wrap mt-2">
                      {message.suggestions.map((suggestion, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleSuggestionClick(suggestion)}
                          data-testid={`button-suggestion-${idx}`}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
                {message.role === "user" && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback>
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                    <Atom className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="p-3 rounded-lg bg-muted">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Ask me anything about betting..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage(input)}
              disabled={chatMutation.isPending}
              data-testid="input-chat-message"
            />
            <Button onClick={() => sendMessage(input)} disabled={!input.trim() || chatMutation.isPending} data-testid="button-send-message">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge variant="secondary" className="cursor-pointer hover-elevate" onClick={() => sendMessage("Build me a 3-leg parlay")}>
              <Sparkles className="w-3 h-3 mr-1" />
              Build Parlay
            </Badge>
            <Badge variant="secondary" className="cursor-pointer hover-elevate" onClick={() => sendMessage("What are today's best +EV plays?")}>
              <TrendingUp className="w-3 h-3 mr-1" />
              +EV Plays
            </Badge>
            <Badge variant="secondary" className="cursor-pointer hover-elevate" onClick={() => sendMessage("Show me live games right now")}>
              <Zap className="w-3 h-3 mr-1" />
              Live Games
            </Badge>
            <Badge variant="secondary" className="cursor-pointer hover-elevate" onClick={() => sendMessage("What injury news should I know about?")}>
              <Lightbulb className="w-3 h-3 mr-1" />
              Injuries
            </Badge>
            <Badge variant="secondary" className="cursor-pointer hover-elevate" onClick={() => sendMessage("How is the model performing?")}>
              <Target className="w-3 h-3 mr-1" />
              Model Stats
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
