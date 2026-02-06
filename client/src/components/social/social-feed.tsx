import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Heart, MessageCircle, Send, Rss } from "lucide-react";

interface FeedPost {
  id: string;
  username: string;
  content: string;
  timestamp: Date;
  likes: number;
  comments: number;
  liked: boolean;
}

const initialPosts: FeedPost[] = [
  {
    id: "post-1",
    username: "SharpShooter99",
    content: "Just hit a 5-leg parlay on the NFL slate. Proper research on player props paid off big time today. Trust the process!",
    timestamp: new Date(Date.now() - 1800000),
    likes: 24,
    comments: 8,
    liked: false,
  },
  {
    id: "post-2",
    username: "ParlayKing",
    content: "The line movement on tonight's NBA game is telling. Sharps are hammering the under. I'm following the smart money on this one.",
    timestamp: new Date(Date.now() - 7200000),
    likes: 18,
    comments: 5,
    liked: false,
  },
  {
    id: "post-3",
    username: "EdgeMaster",
    content: "Bankroll management tip: never risk more than 3% on a single play. Consistency beats big swings every time. Up 22% this month staying disciplined.",
    timestamp: new Date(Date.now() - 14400000),
    likes: 42,
    comments: 12,
    liked: false,
  },
  {
    id: "post-4",
    username: "BetWizard",
    content: "Interesting stat: home underdogs in the NFL after a bye week are 67% ATS over the last 3 seasons. Finding edges like this is what separates winners.",
    timestamp: new Date(Date.now() - 28800000),
    likes: 31,
    comments: 9,
    liked: false,
  },
  {
    id: "post-5",
    username: "MoneyMoves",
    content: "Closed out the week with a 71% win rate across 14 picks. NBA player props continue to be the most profitable market. Detailed breakdown coming soon.",
    timestamp: new Date(Date.now() - 43200000),
    likes: 56,
    comments: 15,
    liked: false,
  },
];

export function SocialFeed() {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [newPost, setNewPost] = useState("");

  const handleSubmitPost = () => {
    const trimmed = newPost.trim();
    if (!trimmed) return;
    const post: FeedPost = {
      id: `post-${Date.now()}`,
      username: "You",
      content: trimmed,
      timestamp: new Date(),
      likes: 0,
      comments: 0,
      liked: false,
    };
    setPosts((prev) => [post, ...prev]);
    setNewPost("");
  };

  const toggleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
          : p
      )
    );
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Rss className="w-5 h-5 text-blue-500" />
          Social Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <Textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Share your analysis, wins, or hot takes..."
              className="resize-none border-0 text-base focus-visible:ring-0"
              rows={3}
              data-testid="input-new-post"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmitPost}
                disabled={!newPost.trim()}
                data-testid="button-submit-post"
              >
                <Send className="w-4 h-4 mr-2" />
                Post
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-1">
          {posts.map((post) => (
            <div key={post.id} data-testid={`feed-post-${post.id}`}>
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-muted text-sm">
                      {post.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm" data-testid={`feed-username-${post.id}`}>
                        {post.username}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(post.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm mt-1" data-testid={`feed-content-${post.id}`}>
                      {post.content}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 pl-13">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLike(post.id)}
                    className={`gap-1 ${post.liked ? "text-red-500" : ""}`}
                    data-testid={`button-like-${post.id}`}
                  >
                    <Heart className={`w-4 h-4 ${post.liked ? "fill-current" : ""}`} />
                    <span data-testid={`text-likes-${post.id}`}>{post.likes}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    data-testid={`button-comments-${post.id}`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span data-testid={`text-comments-${post.id}`}>{post.comments}</span>
                  </Button>
                </div>
              </div>
              <Separator />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
