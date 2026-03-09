import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, MessageCircle, Send, Rss, Info } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface FeedPost {
  id: string;
  username: string;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  liked: boolean;
}

export function SocialFeed() {
  const [newPost, setNewPost] = useState("");

  const { data: posts = [], isLoading } = useQuery<FeedPost[]>({
    queryKey: ["/api/social-feed"],
  });

  const postMutation = useMutation({
    mutationFn: (content: string) => apiRequest("POST", "/api/social-feed", { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-feed"] });
      setNewPost("");
    },
  });

  const likeMutation = useMutation({
    mutationFn: (postId: string) => apiRequest("POST", `/api/social-feed/${postId}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-feed"] });
    },
  });

  const handleSubmitPost = () => {
    const trimmed = newPost.trim();
    if (!trimmed) return;
    postMutation.mutate(trimmed);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
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
                disabled={!newPost.trim() || postMutation.isPending}
                data-testid="button-submit-post"
              >
                <Send className="w-4 h-4 mr-2" />
                Post
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
                <Separator />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Rss className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No posts in the feed yet. Be the first to share!</p>
          </div>
        ) : (
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
                      onClick={() => likeMutation.mutate(post.id)}
                      disabled={likeMutation.isPending}
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
        )}

        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <Info className="w-4 h-4 text-blue-500 shrink-0" />
          <p className="text-xs text-blue-600 dark:text-blue-400">Data source: Live social feed</p>
        </div>
      </CardContent>
    </Card>
  );
}
