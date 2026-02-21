import { useState } from "react";
import { Settings, Sliders, Shield, TrendingUp, DollarSign, Zap, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { BettingEnvironment } from "@shared/schema";

interface BettingSettingsProps {
  settings: BettingEnvironment;
  onSettingsChange: (settings: BettingEnvironment) => void;
}

const profilePresets: Record<BettingEnvironment["profileType"], Partial<BettingEnvironment>> = {
  conservative: {
    maxStakePercent: 0.02,
    kellyMultiplier: 0.125,
    minEdgeRequired: 0.05,
    maxCorrelationAllowed: 0.6,
    enableRiskWarnings: true,
    enableAutoAdjust: true,
  },
  balanced: {
    maxStakePercent: 0.05,
    kellyMultiplier: 0.25,
    minEdgeRequired: 0.02,
    maxCorrelationAllowed: 0.8,
    enableRiskWarnings: true,
    enableAutoAdjust: false,
  },
  aggressive: {
    maxStakePercent: 0.10,
    kellyMultiplier: 0.5,
    minEdgeRequired: 0.01,
    maxCorrelationAllowed: 0.9,
    enableRiskWarnings: true,
    enableAutoAdjust: false,
  },
  sharp: {
    maxStakePercent: 0.03,
    kellyMultiplier: 0.33,
    minEdgeRequired: 0.03,
    maxCorrelationAllowed: 0.7,
    enableRiskWarnings: true,
    enableAutoAdjust: true,
  },
};

export function BettingSettings({ settings, onSettingsChange }: BettingSettingsProps) {
  const [localSettings, setLocalSettings] = useState<BettingEnvironment>(settings);

  const handleProfileChange = (profile: BettingEnvironment["profileType"]) => {
    const preset = profilePresets[profile];
    const newSettings = { ...localSettings, ...preset, profileType: profile };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleChange = <K extends keyof BettingEnvironment>(
    key: K,
    value: BettingEnvironment[K]
  ) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  return (
    <Card data-testid="card-betting-settings">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="w-5 h-5" />
              Betting Environment
            </CardTitle>
            <CardDescription>
              Adjust settings for practical real-world betting
            </CardDescription>
          </div>
          <Badge variant="outline" className="capitalize">
            {localSettings.profileType}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Profile Preset</Label>
          <Select
            value={localSettings.profileType}
            onValueChange={(v) => handleProfileChange(v as BettingEnvironment["profileType"])}
          >
            <SelectTrigger data-testid="select-profile">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="conservative">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  Conservative
                </div>
              </SelectItem>
              <SelectItem value="balanced">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-500" />
                  Balanced
                </div>
              </SelectItem>
              <SelectItem value="aggressive">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  Aggressive
                </div>
              </SelectItem>
              <SelectItem value="sharp">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  Sharp
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="stake">
            <AccordionTrigger className="text-sm">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Stake Management
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Max Stake %</Label>
                  <span className="text-sm font-mono">{(localSettings.maxStakePercent * 100).toFixed(1)}%</span>
                </div>
                <Slider
                  value={[localSettings.maxStakePercent * 100]}
                  onValueChange={([v]) => handleChange("maxStakePercent", v / 100)}
                  min={1}
                  max={20}
                  step={0.5}
                  data-testid="slider-max-stake"
                />
                <p className="text-xs text-muted-foreground">Maximum stake as % of bankroll</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Stake Sizing</Label>
                  <span className="text-sm font-mono">{(localSettings.kellyMultiplier * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[localSettings.kellyMultiplier * 100]}
                  onValueChange={([v]) => handleChange("kellyMultiplier", v / 100)}
                  min={5}
                  max={100}
                  step={5}
                  data-testid="slider-kelly"
                />
                <p className="text-xs text-muted-foreground">How aggressively to size your stakes (lower = more conservative)</p>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="edge">
            <AccordionTrigger className="text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Edge Requirements
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Minimum Edge</Label>
                  <span className="text-sm font-mono">{(localSettings.minEdgeRequired * 100).toFixed(1)}%</span>
                </div>
                <Slider
                  value={[localSettings.minEdgeRequired * 100]}
                  onValueChange={([v]) => handleChange("minEdgeRequired", v / 100)}
                  min={0}
                  max={10}
                  step={0.5}
                  data-testid="slider-min-edge"
                />
                <p className="text-xs text-muted-foreground">Minimum +EV edge to consider betting</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Max Correlation</Label>
                  <span className="text-sm font-mono">{(localSettings.maxCorrelationAllowed * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[localSettings.maxCorrelationAllowed * 100]}
                  onValueChange={([v]) => handleChange("maxCorrelationAllowed", v / 100)}
                  min={50}
                  max={100}
                  step={5}
                  data-testid="slider-max-correlation"
                />
                <p className="text-xs text-muted-foreground">Maximum correlation between parlay legs</p>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="juice">
            <AccordionTrigger className="text-sm">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Odds Margin & Adjustments
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Include Odds Margin Adjustment</Label>
                  <p className="text-xs text-muted-foreground">Adjust probabilities for sportsbook odds margin</p>
                </div>
                <Switch
                  checked={localSettings.includeJuiceAdjustment}
                  onCheckedChange={(v) => handleChange("includeJuiceAdjustment", v)}
                  data-testid="switch-juice"
                />
              </div>

              {localSettings.includeJuiceAdjustment && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Margin %</Label>
                    <span className="text-sm font-mono">{(localSettings.juicePercent * 100).toFixed(1)}%</span>
                  </div>
                  <Slider
                    value={[localSettings.juicePercent * 100]}
                    onValueChange={([v]) => handleChange("juicePercent", v / 100)}
                    min={2}
                    max={10}
                    step={0.5}
                    data-testid="slider-juice"
                  />
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="risk">
            <AccordionTrigger className="text-sm">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Risk Controls
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Enable Risk Warnings</Label>
                  <p className="text-xs text-muted-foreground">Show alerts for risky bets</p>
                </div>
                <Switch
                  checked={localSettings.enableRiskWarnings}
                  onCheckedChange={(v) => handleChange("enableRiskWarnings", v)}
                  data-testid="switch-warnings"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Auto-Adjust Stakes</Label>
                  <p className="text-xs text-muted-foreground">Automatically reduce stakes for risky bets</p>
                </div>
                <Switch
                  checked={localSettings.enableAutoAdjust}
                  onCheckedChange={(v) => handleChange("enableAutoAdjust", v)}
                  data-testid="switch-auto-adjust"
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="pt-2 border-t">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2 rounded bg-muted/50">
              <div className="text-muted-foreground">Max Stake</div>
              <div className="font-mono font-medium">{(localSettings.maxStakePercent * 100).toFixed(1)}%</div>
            </div>
            <div className="p-2 rounded bg-muted/50">
              <div className="text-muted-foreground">Sizing</div>
              <div className="font-mono font-medium">{(localSettings.kellyMultiplier * 100).toFixed(0)}%</div>
            </div>
            <div className="p-2 rounded bg-muted/50">
              <div className="text-muted-foreground">Min Edge</div>
              <div className="font-mono font-medium">{(localSettings.minEdgeRequired * 100).toFixed(1)}%</div>
            </div>
            <div className="p-2 rounded bg-muted/50">
              <div className="text-muted-foreground">Max Corr</div>
              <div className="font-mono font-medium">{(localSettings.maxCorrelationAllowed * 100).toFixed(0)}%</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function getDefaultBettingEnvironment(): BettingEnvironment {
  return {
    maxStakePercent: 0.05,
    kellyMultiplier: 0.25,
    minEdgeRequired: 0.02,
    maxCorrelationAllowed: 0.8,
    includeJuiceAdjustment: true,
    juicePercent: 0.045,
    enableRiskWarnings: true,
    enableAutoAdjust: false,
    profileType: "balanced",
  };
}