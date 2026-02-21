import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Bot, Send, User, Sparkles, TrendingUp, Target,
  Lightbulb, Zap, Atom
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";

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
    content: "Hey! I'm your Sors Betting Assistant. I can help you build parlays, analyze matchups, find +EV opportunities, and answer any betting questions. What would you like to explore today?",
    timestamp: new Date(),
    suggestions: [
      "Build me a 3-leg NBA parlay",
      "What are today's best +EV plays?",
      "Analyze the Chiefs vs Bills game",
      "Show me underdog opportunities",
    ],
  },
];

const mockResponses: Record<string, string> = {
  "build me a 3-leg nba parlay": `Great choice! Based on my advanced analysis, here's a sharp 3-leg NBA parlay for tonight:

**Recommended Parlay (+412)**
1. **Bucks -4.5** (-110) - Strong home court advantage, 72% ATS at home
2. **Knicks/Heat Over 228.5** (-105) - Both teams averaging 118+ PPG last 5
3. **Suns ML** (-135) - Durant averaging 31 PPG vs this opponent

**Parlay Stats:**
- Combined Win Probability: 18.2%
- Expected Value: +4.8%
- Power Score: 76%

Want me to add this to your builder?`,

  "what are today's best +ev plays?": `I've scanned all markets for positive expected value. Here are today's top +EV opportunities:

**Top 3 +EV Plays:**

1. **Bills +3.5** (+EV 6.2%)
   - Sharp money heavily on Bills
   - Line opened at +1.5, now +3.5
   - Edge Score: 84

2. **Timberwolves/Mavericks Under 215.5** (+EV 4.1%)
   - Both teams rank top-5 in defensive efficiency
   - Weather affecting visiting team
   - Edge Score: 78

3. **Nuggets ML** (+EV 3.8%)
   - Jokic triple-double trend
   - Rest advantage: 3 days vs 1 day
   - Edge Score: 75

Would you like detailed analysis on any of these?`,

  "default": `I understand you're interested in that! Based on my advanced analysis of current market conditions and historical data, I can help you make more informed decisions.

Here are some key insights:
- Current market sentiment is slightly bullish on favorites
- Sharp money has been moving toward unders today
- Several injury reports may affect lines later

What specific aspect would you like me to dive deeper into?`,
};

export function BettingAssistant() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
    setIsTyping(true);

    setTimeout(() => {
      const lowerContent = content.toLowerCase();
      let response = mockResponses.default;
      
      for (const [key, value] of Object.entries(mockResponses)) {
        if (lowerContent.includes(key)) {
          response = value;
          break;
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
        suggestions: [
          "Tell me more",
          "Add to my parlay",
          "Show alternatives",
        ],
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
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
            {isTyping && (
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
              data-testid="input-chat-message"
            />
            <Button onClick={() => sendMessage(input)} disabled={!input.trim()} data-testid="button-send-message">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge variant="secondary" className="cursor-pointer hover-elevate" onClick={() => sendMessage("Build me a parlay")}>
              <Sparkles className="w-3 h-3 mr-1" />
              Build Parlay
            </Badge>
            <Badge variant="secondary" className="cursor-pointer hover-elevate" onClick={() => sendMessage("Find +EV plays")}>
              <TrendingUp className="w-3 h-3 mr-1" />
              +EV Plays
            </Badge>
            <Badge variant="secondary" className="cursor-pointer hover-elevate" onClick={() => sendMessage("Analyze matchups")}>
              <Target className="w-3 h-3 mr-1" />
              Matchups
            </Badge>
            <Badge variant="secondary" className="cursor-pointer hover-elevate" onClick={() => sendMessage("Betting tips")}>
              <Lightbulb className="w-3 h-3 mr-1" />
              Tips
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
