"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AnimatedBg } from "@/components/ui/AnimatedBg";
import { useRouter } from "next/navigation"

//NAVBAR
function Navbar() {
  const router = useRouter()
  return (
    <nav className="fixed top-0 left-0 w-full z-50 backdrop-blur-xl bg-background/60 border-b border-border/40 px-2 md:px-12">
      <div className="container mx-auto flex justify-between items-center px-6 py-4">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-foreground">⚡ CodeCollab</span>
        </h1>
        <div className="hidden md:flex items-center gap-1">
          <Button variant="ghost" className="hover:bg-primary/10">Home</Button>
          <Button variant="ghost" className="hover:bg-primary/10">Features</Button>
          <Button variant="ghost" className="hover:bg-primary/10">About</Button>
          <Button variant="default" className="ml-2 shadow-md  cursor-pointer" onClick = {() => {router.push("/auth/signup")}}>Get Started</Button>
        </div>
      </div>
    </nav>
  );
}

//HERO SECTION
function Hero() {
  const router = useRouter()
  return (
    <section className="relative flex flex-col items-center justify-center min-h-screen text-center">
      <div className="absolute inset-0 pointer-events-none select-none [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]" />
      <motion.h1
        className="text-5xl md:text-6xl font-extrabold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-fuchsia-200 to-foreground drop-shadow-sm"
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        Code Together, Build Better
      </motion.h1>
      <motion.p
        className="mt-6 max-w-2xl text-lg text-muted-foreground/90"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.2 }}
      >
        Code together with your team in real time. Share sessions, review instantly,
        and build faster with zero setup.
      </motion.p>
      <motion.div
        className="mt-10 flex gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        
        <Button size="lg" className="px-7 shadow-lg cursor-pointer" onClick = {() => {router.push("/auth/signup")}}>
          Start Coding
        </Button>
        <Button size="lg" variant="outline" className="px-7 border-border/60 cursor-pointer">
          Explore More
        </Button>
      </motion.div>
      <div className="mt-12 grid grid-cols-3 gap-6 opacity-80">
        <div className="text-sm text-muted-foreground">No installs</div>
        <div className="text-sm text-muted-foreground">Zero config</div>
        <div className="text-sm text-muted-foreground">Shareable links</div>
      </div>
    </section>
  );
}

//FEATURES SECTION
function Features() {
  const features = [
    {
      title: "Live Collaboration",
      desc: "Edit code with teammates simultaneously, like Google Docs for developers.",
    },
    {
      title: "Version History",
      desc: "Track every change with time travel and one-click rollbacks.",
    },
    {
      title: "AI Assistance",
      desc: "Get instant code suggestions, error fixes, and explanations.",
    },
    {
      title: "Secure & Private",
      desc: "End-to-end encryption ensures your code is always safe.",
    },
  ];

  return (
    <section className="py-24 container mx-auto">
      <h2 className="text-4xl font-bold text-center mb-16">Why Choose CodeCollab?</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {features.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.2 }}
            viewport={{ once: true }}
          >
            <Card
              className={cn(
                "group relative overflow-hidden backdrop-blur-xl bg-background/30 border border-border/30 shadow-lg",
                "rounded-2xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
              )}
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

//CTA SECTION
function CTA() {
  return (
    <section className="py-32 text-center bg-gradient-to-r from-primary/15 via-background to-primary/15 rounded-3xl container mx-auto border border-border/40 shadow-lg">
      <motion.h2
        className="text-4xl md:text-5xl font-bold mb-6"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        Ready to Collaborate in Real-Time?
      </motion.h2>
      <motion.p
        className="text-muted-foreground mb-8 max-w-xl mx-auto"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        viewport={{ once: true }}
      >
        Start coding with your team today. No setup, no barriers. Just pure
        collaboration.
      </motion.p>
      <Button size="lg" className="px-8 py-6 text-base shadow-xl hover:shadow-primary/30">
        Get Started Free
      </Button>
    </section>
  );
}

//FOOTER
function Footer() {
  return (
    <footer className="mt-24 py-10 border-t border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
        <p className="text-muted-foreground">© 2025 CodeCollab. All rights reserved.</p>
        <div className="flex items-center gap-2 mt-4 md:mt-0">
          <Button variant="ghost" size="sm" className="hover:bg-primary/10">Twitter</Button>
          <Button variant="ghost" size="sm" className="hover:bg-primary/10">LinkedIn</Button>
          <Button variant="ghost" size="sm" className="hover:bg-primary/10">GitHub</Button>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <main className="bg-background text-foreground overflow-x-hidden mx-6 md:mx-16">
      <AnimatedBg />
      <Navbar />
      <Hero />
      <Features />
      <CTA />
      <Footer />
    </main>
  );
}
