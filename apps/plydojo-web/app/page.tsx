import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui";
import Link from "next/link";
import { CheckIcon } from "lucide-react";

export default function Page() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-[url('/images/chess-hero.png')] bg-cover bg-center bg-no-repeat before:absolute before:inset-0 before:bg-background/80 before:z-0">
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground">
                Your Personal<br />
                <span className="text-primary">Chess Coach</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl">
                Learn chess with an AI tutor that provides unlimited, personalized feedback. Play multiplayer matches for free and track your progress.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" asChild>
                  <Link href="/signup">Start Free Trial</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/login">Play Now</Link>
                </Button>
              </div>
            </div>
            <div className="relative aspect-square rounded-lg overflow-hidden border shadow-xl bg-card/20 backdrop-blur-sm">
              {/* TODO: Add interactive chess board preview */}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">Why Choose PlyDojo?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card variant="muted">
              <CardHeader>
                <CardTitle>AI-Powered Tutoring</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Get unlimited, context-aware feedback on your moves from our advanced AI tutor.</p>
              </CardContent>
            </Card>
            <Card variant="muted">
              <CardHeader>
                <CardTitle>Free Multiplayer</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Play unlimited games against players of your skill level with real-time chat.</p>
              </CardContent>
            </Card>
            <Card variant="muted">
              <CardHeader>
                <CardTitle>Track Your Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Monitor your Elo rating, analyze game history, and receive weekly progress reports.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">Simple, Transparent Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Free</CardTitle>
                <CardDescription>Perfect for casual players</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-2">
                    <CheckIcon className="h-5 w-5 text-primary" />
                    Unlimited multiplayer games
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="h-5 w-5 text-primary" />
                    Player-to-player chat
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="h-5 w-5 text-primary" />
                    Basic game history
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="default" className="w-full" asChild>
                  <Link href="/signup">Get Started</Link>
                </Button>
              </CardFooter>
            </Card>
            <Card variant="primary">
              <CardHeader>
                <CardTitle>Premium</CardTitle>
                <CardDescription>$10/month</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-2">
                    <CheckIcon className="h-5 w-5" />
                    Everything in Free
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="h-5 w-5" />
                    Unlimited AI tutoring
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="h-5 w-5" />
                    Post-game analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="h-5 w-5" />
                    Weekly progress reports
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="secondary" className="w-full" asChild>
                  <Link href="/signup?plan=premium">Start 7-Day Trial</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">Ready to Improve Your Chess Game?</h2>
          <p className="text-xl text-primary-foreground/80 mb-12">Join thousands of players learning and competing on PlyDojo</p>
          <Button variant="secondary" size="lg" asChild>
            <Link href="/signup">Start Your Free Trial Today</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
