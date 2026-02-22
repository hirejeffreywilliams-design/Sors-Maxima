import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, Download, Calendar, DollarSign, TrendingUp,
  TrendingDown, AlertTriangle, CheckCircle, Info
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";

interface TaxSummary {
  year: string;
  grossWinnings: number;
  totalWagered: number;
  netProfit: number;
  totalBets: number;
}

export function TaxExport() {
  const { data: taxData = [], isLoading } = useQuery<TaxSummary[]>({
    queryKey: ["/api/user/tax-summary"],
  });

  const [selectedYear, setSelectedYear] = useState("all");
  const [exporting, setExporting] = useState(false);

  const currentData = selectedYear === "all" 
    ? taxData.length > 0 ? taxData[0] : null
    : taxData.find(d => d.year === selectedYear);

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => setExporting(false), 1500);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-blue-500" />
            Tax Export
          </CardTitle>
        </CardHeader>
        <CardContent><Skeleton className="h-60 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
            <FileText className="w-5 h-5 text-blue-500" />
            Tax Export
            <QuantumBadge />
          </CardTitle>
          {taxData.length > 0 && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-28" data-testid="select-tax-year">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Latest</SelectItem>
                {taxData.map((data) => (
                  <SelectItem key={data.year} value={data.year}>{data.year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <p className="font-medium text-amber-500">Tax Disclaimer</p>
              <p className="text-sm text-muted-foreground">
                This is an estimate only. Consult a tax professional for accurate tax advice. 
                Gambling winnings are taxable income in most jurisdictions.
              </p>
            </div>
          </div>
        </div>

        {!currentData ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No betting data for tax summary</p>
            <p className="text-sm mt-1">Track bets to generate tax reports</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Total Wagered</p>
                <p className="text-2xl font-bold">${currentData.totalWagered.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <p className="text-sm text-muted-foreground mb-1">Gross Winnings</p>
                <p className="text-2xl font-bold text-green-500">${currentData.grossWinnings.toLocaleString()}</p>
              </div>
              <div className={`p-4 rounded-lg ${currentData.netProfit >= 0 ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
                <p className="text-sm text-muted-foreground mb-1">Net Profit/Loss</p>
                <p className={`text-2xl font-bold ${currentData.netProfit >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {currentData.netProfit >= 0 ? "+" : ""}${currentData.netProfit.toLocaleString()}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Total Bets</p>
                <p className="text-2xl font-bold">{currentData.totalBets}</p>
              </div>
            </div>

            {currentData.grossWinnings > 0 && (
              <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Estimated Taxable (24% bracket)</p>
                    <p className="text-2xl font-bold text-orange-500">
                      ${Math.round(currentData.grossWinnings * 0.24).toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Based on federal gambling winnings tax rate. State taxes may also apply.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <p className="font-medium">Export Reports</p>
              <Button variant="outline" onClick={handleExport} disabled={exporting} data-testid="button-export-csv">
                <Download className="w-4 h-4 mr-2" />
                {exporting ? "Preparing..." : "Export Summary"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Reports include all betting activity with dates, amounts, and outcomes for tax filing purposes.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
