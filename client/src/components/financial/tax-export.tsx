import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, Download, Calendar, DollarSign, TrendingUp,
  TrendingDown, AlertTriangle, CheckCircle, Atom
} from "lucide-react";
import { QuantumBadge } from "../quantum-analysis-badge";

interface TaxSummary {
  year: number;
  totalWagered: number;
  totalWinnings: number;
  totalLosses: number;
  netProfit: number;
  taxableIncome: number;
  estimatedTax: number;
  betsPlaced: number;
  betsWon: number;
}

const mockTaxData: TaxSummary[] = [
  { year: 2024, totalWagered: 45000, totalWinnings: 52000, totalLosses: 38000, netProfit: 7000, taxableIncome: 52000, estimatedTax: 12480, betsPlaced: 892, betsWon: 478 },
  { year: 2023, totalWagered: 38000, totalWinnings: 41500, totalLosses: 35200, netProfit: 3500, taxableIncome: 41500, estimatedTax: 9960, betsPlaced: 756, betsWon: 398 },
  { year: 2022, totalWagered: 25000, totalWinnings: 24200, totalLosses: 25800, netProfit: -800, taxableIncome: 24200, estimatedTax: 5808, betsPlaced: 512, betsWon: 245 },
];

export function TaxExport() {
  const [selectedYear, setSelectedYear] = useState("2024");
  const [exporting, setExporting] = useState(false);

  const currentData = mockTaxData.find(d => d.year.toString() === selectedYear) || mockTaxData[0];

  const handleExport = (format: string) => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
    }, 1500);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg flex-wrap">
            <FileText className="w-5 h-5 text-blue-500" />
            Tax Export
            <QuantumBadge />
          </CardTitle>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-28" data-testid="select-tax-year">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mockTaxData.map((data) => (
                <SelectItem key={data.year} value={data.year.toString()}>
                  {data.year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 text-sm" data-testid="banner-demo-tax">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Demo data shown for illustration. Connect live feeds for real-time results.</span>
        </div>
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

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground mb-1">Total Wagered</p>
            <p className="text-2xl font-bold">${currentData.totalWagered.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
            <p className="text-sm text-muted-foreground mb-1">Total Winnings</p>
            <p className="text-2xl font-bold text-green-500">${currentData.totalWinnings.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-sm text-muted-foreground mb-1">Total Losses</p>
            <p className="text-2xl font-bold text-red-500">${currentData.totalLosses.toLocaleString()}</p>
          </div>
          <div className={`p-4 rounded-lg ${currentData.netProfit >= 0 ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
            <p className="text-sm text-muted-foreground mb-1">Net Profit/Loss</p>
            <p className={`text-2xl font-bold ${currentData.netProfit >= 0 ? "text-green-500" : "text-red-500"}`}>
              {currentData.netProfit >= 0 ? "+" : ""}${currentData.netProfit.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Estimated Taxable Income</p>
              <p className="text-2xl font-bold">${currentData.taxableIncome.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Est. Tax (24% bracket)</p>
              <p className="text-2xl font-bold text-orange-500">${currentData.estimatedTax.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{currentData.betsPlaced} bets placed</span>
            <span>•</span>
            <span>{currentData.betsWon} wins ({Math.round((currentData.betsWon / currentData.betsPlaced) * 100)}%)</span>
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-medium">Export Reports</p>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              onClick={() => handleExport("csv")}
              disabled={exporting}
              data-testid="button-export-csv"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleExport("pdf")}
              disabled={exporting}
              data-testid="button-export-pdf"
            >
              <FileText className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Reports include all betting activity with dates, amounts, and outcomes for tax filing purposes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
