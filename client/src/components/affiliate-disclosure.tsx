import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Info, ExternalLink } from "lucide-react";

interface AffiliateDisclosureProps {
  compact?: boolean;
  className?: string;
}

export function AffiliateDisclosure({ compact = false, className }: AffiliateDisclosureProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (compact) {
    return (
      <>
        <button
          onClick={() => setShowDetails(true)}
          className={`text-xs text-muted-foreground underline decoration-dotted underline-offset-2 cursor-pointer ${className || ""}`}
          data-testid="link-affiliate-disclosure"
        >
          <Info className="w-3 h-3 inline mr-1" />
          Affiliate Disclosure
        </button>
        <AffiliateDetailsDialog open={showDetails} onOpenChange={setShowDetails} />
      </>
    );
  }

  return (
    <>
      <Alert className={className} data-testid="alert-affiliate-disclosure">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Affiliate Disclosure:</strong> Some links to sportsbooks on this platform may be affiliate links. 
          We may earn a commission if you sign up through these links, at no additional cost to you. 
          This does not influence our analysis or recommendations.{" "}
          <button
            onClick={() => setShowDetails(true)}
            className="underline underline-offset-2 cursor-pointer"
            data-testid="button-affiliate-learn-more"
          >
            Learn more
          </button>
        </AlertDescription>
      </Alert>
      <AffiliateDetailsDialog open={showDetails} onOpenChange={setShowDetails} />
    </>
  );
}

function AffiliateDetailsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Affiliate & Partner Disclosure
          </DialogTitle>
          <DialogDescription>
            Transparency about our partnerships and how we earn revenue.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm" data-testid="affiliate-details">
          <div className="space-y-2">
            <h4 className="font-medium">How We Earn Revenue</h4>
            <p className="text-muted-foreground">
              Sors Maxima may receive compensation through affiliate partnerships with licensed 
              sportsbooks when users click links or sign up through our platform. This helps us 
              keep the platform running and improve our services.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Our Commitment</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="shrink-0 mt-1 w-1 h-1 rounded-full bg-muted-foreground" />
                Affiliate relationships never influence our analysis algorithms or recommendations
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0 mt-1 w-1 h-1 rounded-full bg-muted-foreground" />
                We display odds from multiple sportsbooks for comparison
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0 mt-1 w-1 h-1 rounded-full bg-muted-foreground" />
                Our recommendations are based solely on data-driven analysis
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0 mt-1 w-1 h-1 rounded-full bg-muted-foreground" />
                You pay no additional fees through our affiliate links
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Partner Sportsbooks</h4>
            <p className="text-muted-foreground">
              We display odds from licensed, regulated sportsbooks including DraftKings, FanDuel,
              BetMGM, Caesars, ESPN BET, bet365, Fanatics, Hard Rock Bet, BetRivers, PointsBet,
              WynnBET, BetParx, Bally Bet, Betway, Circa Sports, and Unibet. All sportsbooks
              displayed are licensed in their respective jurisdictions. Line data is sourced from
              The Odds API and refreshed in real time.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Tipster Community Revenue</h4>
            <p className="text-muted-foreground">
              For the Tipster Communities feature, the platform retains 15% of tipster earnings 
              as a service fee. This is clearly displayed before any transactions.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
