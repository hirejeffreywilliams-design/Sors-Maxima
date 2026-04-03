// Stub for Task #26 Monte Carlo Vertical Agent
// Real implementation ships with Task #26 (Monte Carlo Overdrive)

export function isSimulationQuery(_text: string): boolean {
  return false;
}

export async function querySimulationAgent(
  _messages: { role: string; content: string }[],
  _userId?: string,
): Promise<{ response: string; handledBy: string } | null> {
  return null;
}

export function getNewSimulationFactors(): string[] {
  return [
    "Referee crew bias",
    "Micro-matchups",
    "Coach tendencies",
    "Sentiment analysis",
    "Travel quality",
  ];
}
