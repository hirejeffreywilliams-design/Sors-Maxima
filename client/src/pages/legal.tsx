import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, FileText, AlertTriangle, ExternalLink } from "lucide-react";

export default function LegalPage() {
  const [activeTab, setActiveTab] = useState("terms");

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Legal Information</h1>
        <p className="text-muted-foreground">
          Please review our terms, privacy policy, and responsible gambling guidelines.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="terms" className="gap-2" data-testid="tab-terms">
            <FileText className="w-4 h-4" />
            Terms
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-2" data-testid="tab-privacy">
            <Shield className="w-4 h-4" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="disclaimer" className="gap-2" data-testid="tab-disclaimer">
            <AlertTriangle className="w-4 h-4" />
            Disclaimer
          </TabsTrigger>
          <TabsTrigger value="affiliate" className="gap-2" data-testid="tab-affiliate">
            <ExternalLink className="w-4 h-4" />
            Affiliates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="terms">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Terms of Service
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4 text-sm">
                  <p className="text-muted-foreground">Last Updated: January 2026</p>
                  
                  <section>
                    <h3 className="font-semibold mb-2">1. Acceptance of Terms</h3>
                    <p>By accessing and using Sors Maxima ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">2. Description of Service</h3>
                    <p>Sors Maxima is a sports betting intelligence and analysis platform that provides:</p>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Betting analysis and probability calculations</li>
                      <li>Parlay optimization tools</li>
                      <li>Statistical modeling and projections</li>
                      <li>Educational content about sports betting</li>
                    </ul>
                    <p className="mt-2 font-medium text-yellow-600 dark:text-yellow-400">The Service does NOT accept bets, process wagers, or handle any gambling transactions.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">3. Eligibility</h3>
                    <p>You must be at least 21 years of age (or the legal gambling age in your jurisdiction, whichever is higher) to use this Service. By using the Service, you represent and warrant that you meet these eligibility requirements.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">4. User Accounts</h3>
                    <p>You are responsible for:</p>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Maintaining the confidentiality of your account credentials</li>
                      <li>All activities that occur under your account</li>
                      <li>Notifying us immediately of any unauthorized use</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">5. Prohibited Uses</h3>
                    <p>You agree NOT to:</p>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Use the Service for any unlawful purpose</li>
                      <li>Share your account with others</li>
                      <li>Attempt to reverse-engineer or copy our algorithms</li>
                      <li>Use automated systems to scrape or access the Service</li>
                      <li>Resell or redistribute our analysis without permission</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">6. Subscription and Payments</h3>
                    <p>Paid subscriptions are billed on a recurring basis. You may cancel at any time, but refunds are subject to our refund policy. Subscription fees are non-refundable except as required by law.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">7. Disclaimer of Warranties</h3>
                    <p>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. We do not guarantee the accuracy of predictions or analysis. Past performance does not guarantee future results.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">8. Limitation of Liability</h3>
                    <p>Sors Maxima shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from your use of the Service, including but not limited to gambling losses.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">9. Modifications</h3>
                    <p>We reserve the right to modify these terms at any time. Continued use of the Service after changes constitutes acceptance of the modified terms.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">10. Contact</h3>
                    <p>For questions about these Terms, please contact support@sorsmaxima.com</p>
                  </section>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Privacy Policy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4 text-sm">
                  <p className="text-muted-foreground">Last Updated: January 2026</p>

                  <section>
                    <h3 className="font-semibold mb-2">1. Information We Collect</h3>
                    <p>We collect information you provide directly:</p>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li><strong>Account Information:</strong> Username, email address, password (encrypted)</li>
                      <li><strong>Usage Data:</strong> Betting preferences, analysis history, feature usage</li>
                      <li><strong>Payment Information:</strong> Processed securely through Stripe; we do not store card details</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">2. How We Use Your Information</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>To provide and improve our Service</li>
                      <li>To personalize your experience and recommendations</li>
                      <li>To process payments and manage subscriptions</li>
                      <li>To send important service updates</li>
                      <li>To improve our prediction algorithms (anonymized data)</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">3. Data Sharing</h3>
                    <p>We do NOT sell your personal information. We may share data with:</p>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li><strong>Service Providers:</strong> Payment processors (Stripe), hosting providers</li>
                      <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                      <li><strong>Business Transfers:</strong> In case of merger or acquisition</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">4. Data Security</h3>
                    <p>We implement industry-standard security measures including:</p>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Encrypted data transmission (HTTPS)</li>
                      <li>Secure password hashing (bcrypt)</li>
                      <li>Regular security audits</li>
                      <li>Limited employee access to personal data</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">5. Your Rights</h3>
                    <p>You have the right to:</p>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Access your personal data</li>
                      <li>Request data correction or deletion</li>
                      <li>Opt out of marketing communications</li>
                      <li>Export your data in a portable format</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">6. Cookies</h3>
                    <p>We use essential cookies for authentication and session management. Analytics cookies may be used to improve our Service.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">7. Data Retention</h3>
                    <p>We retain your data for as long as your account is active. Upon account deletion, personal data is removed within 30 days, though anonymized analytics may be retained.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">8. Children's Privacy</h3>
                    <p>Our Service is not intended for users under 21. We do not knowingly collect data from minors.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">9. Contact Us</h3>
                    <p>For privacy inquiries: privacy@sorsmaxima.com</p>
                  </section>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disclaimer">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="w-5 h-5" />
                Gambling Disclaimer & Responsible Gaming
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4 text-sm">
                  <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <p className="font-bold text-yellow-800 dark:text-yellow-200">
                      IMPORTANT: Sors Maxima is an ENTERTAINMENT and EDUCATIONAL platform only. 
                      We do NOT accept bets or process any gambling transactions.
                    </p>
                  </div>

                  <section>
                    <h3 className="font-semibold mb-2">For Entertainment Purposes Only</h3>
                    <p>All analysis, predictions, and recommendations provided by Sors Maxima are for entertainment and educational purposes only. No guarantee of accuracy or profitability is made or implied.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">Age Requirement</h3>
                    <p className="font-medium text-red-600 dark:text-red-400">You must be 21 years of age or older (or the legal gambling age in your jurisdiction) to use this Service.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">No Guaranteed Outcomes</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Past performance does NOT guarantee future results</li>
                      <li>All sports betting involves risk of loss</li>
                      <li>Our analysis is based on statistical models that may be wrong</li>
                      <li>Never bet more than you can afford to lose</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">Responsible Gambling Guidelines</h3>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <p className="font-medium">If you choose to gamble:</p>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>Set a budget and stick to it</li>
                        <li>Never chase losses</li>
                        <li>Don't gamble when emotional or intoxicated</li>
                        <li>Take regular breaks</li>
                        <li>Balance gambling with other activities</li>
                        <li>Never borrow money to gamble</li>
                      </ul>
                    </div>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">Warning Signs of Problem Gambling</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Spending more time or money than intended</li>
                      <li>Feeling restless when trying to cut back</li>
                      <li>Gambling to escape problems</li>
                      <li>Lying about gambling activities</li>
                      <li>Jeopardizing relationships or work due to gambling</li>
                      <li>Relying on others for money due to gambling losses</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">Get Help</h3>
                    <p>If you or someone you know has a gambling problem:</p>
                    <div className="bg-muted/50 rounded-lg p-4 mt-2">
                      <ul className="space-y-2">
                        <li><strong>National Council on Problem Gambling:</strong> 1-800-522-4700</li>
                        <li><strong>Gamblers Anonymous:</strong> www.gamblersanonymous.org</li>
                        <li><strong>National Problem Gambling Helpline:</strong> 1-800-522-4700 (24/7)</li>
                      </ul>
                    </div>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">Legal Compliance</h3>
                    <p>Users are responsible for ensuring that sports betting is legal in their jurisdiction. Sors Maxima makes no representations about the legality of sports betting in any location.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">Self-Exclusion</h3>
                    <p>If you need to take a break from our Service, contact support@sorsmaxima.com to request account suspension or deletion.</p>
                  </section>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="affiliate">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5" />
                Affiliate & Partner Disclosure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4 text-sm" data-testid="affiliate-legal-content">
                  <p className="text-muted-foreground">Last Updated: February 2026</p>

                  <section>
                    <h3 className="font-semibold mb-2">1. Affiliate Relationships</h3>
                    <p>Sors Maxima maintains affiliate partnerships with licensed, regulated sportsbook operators. When you click on links to sportsbooks on our platform and subsequently register or make a deposit, we may receive a commission at no additional cost to you.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">2. Partner Sportsbooks</h3>
                    <p>Our current affiliate partnerships include, but are not limited to:</p>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>DraftKings</li>
                      <li>FanDuel</li>
                      <li>BetMGM</li>
                      <li>Caesars Sportsbook</li>
                      <li>PointsBet</li>
                      <li>BetRivers</li>
                    </ul>
                    <p className="mt-2">All partner sportsbooks are licensed and regulated in their respective operating jurisdictions.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">3. Independence of Analysis</h3>
                    <p>Our affiliate relationships do not influence our analysis algorithms, predictions, or recommendations. Our AI-powered analysis engine operates independently of any commercial partnerships. Odds are compared across multiple sportsbooks to ensure users receive the best available information.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">4. Tipster Community Revenue</h3>
                    <p>The Sors Maxima Tipster Community feature allows users to share betting tips and analysis. The platform retains 15% of tipster earnings as a service fee. This fee structure is:</p>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Clearly disclosed before any subscription is created</li>
                      <li>Applied uniformly to all tipster communities</li>
                      <li>Used to maintain platform infrastructure and moderation</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">5. Advertising Standards</h3>
                    <p>Sors Maxima adheres to responsible advertising practices:</p>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>We do not target vulnerable users or minors</li>
                      <li>We do not promise or guarantee profitability</li>
                      <li>We include responsible gambling messaging in all promotional materials</li>
                      <li>We comply with advertising regulations in all operating jurisdictions</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2">6. Contact</h3>
                    <p>For questions about our affiliate relationships, contact partnerships@sorsmaxima.com.</p>
                  </section>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
