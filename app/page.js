"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AnimatedBg } from "@/components/ui/AnimatedBg";
import { RealTimeShowcase } from "@/components/ui/RealTimeShowcase";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Code2, Users, Zap, Shield } from "lucide-react";
import dynamic from "next/dynamic";

// Lazy load below-fold components for better performance
const Features = dynamic(() => Promise.resolve(FeaturesComponent), { ssr: true });
const CTA = dynamic(() => Promise.resolve(CTAComponent), { ssr: true });
const Footer = dynamic(() => Promise.resolve(FooterComponent), { ssr: true });

//NAVBAR
function Navbar() {
  const router = useRouter()
  return (
    <nav className="fixed top-0 left-0 w-full z-50 backdrop-blur-xl bg-background/60 border-b border-border/40">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-12 lg:px-16">
      <div className="flex justify-between items-center py-3 md:py-4">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center cursor-pointer" onClick = {() => {router.push("/")}}>
          <Image src="/logo.svg" alt="logo" width={20} height={20} className="mr-2 md:w-6 md:h-6" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-foreground">CodeCollab</span>
        </h1>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1">
            <Button variant="ghost" className="hover:bg-primary/10">Home</Button>
            <Button variant="ghost" className="hover:bg-primary/10">Features</Button>
            <Button variant="ghost" className="hover:bg-primary/10">About</Button>
          </div>
          <Button variant="default" className="shadow-md cursor-pointer text-sm md:text-base" onClick = {() => {router.push("/auth/signup")}}>Get Started</Button>
        </div>
      </div>
      </div>
    </nav>
  );
}

//HERO SECTION
function Hero() {
  const router = useRouter()
  return (
    <section className="relative flex flex-col items-center justify-center min-h-screen pt-20 pb-10 md:pt-0 md:pb-0">
      <div className="absolute inset-0 pointer-events-none select-none [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]" />

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-12 lg:px-16 text-center flex flex-col items-center">
      {/* Animated badge */}
      <motion.div
        className="mb-4 md:mb-6 inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        <span className="text-xs md:text-sm font-medium">Powered by Real-Time Technology</span>
      </motion.div>

      <motion.h1
        className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight text-white drop-shadow-2xl px-4"
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        Code Together,
        <br />
        <span className="text-white/90">
          Build Better
        </span>
      </motion.h1>

      <motion.p
        className="mt-4 md:mt-6 w-full sm:w-4/5 md:w-2/3 text-base sm:text-lg md:text-xl text-muted-foreground/90 leading-relaxed px-4"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        Experience seamless real-time collaboration. Code with your team simultaneously,
        see live cursors, and build faster with zero setup.
      </motion.p>

      <motion.div
        className="mt-8 md:mt-10 flex flex-col sm:flex-row gap-3 md:gap-4 w-full sm:w-auto px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Button
          size="lg"
          className="px-6 py-5 md:px-8 md:py-6 text-sm md:text-base shadow-2xl hover:shadow-primary/30 transition-all hover:scale-105 animate-pulse-glow w-full sm:w-auto"
          onClick={() => {router.push("/auth/signup")}}
        >
          Start Coding
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="px-6 py-5 md:px-8 md:py-6 text-sm md:text-base border-border/60 hover:bg-primary/10 transition-all hover:scale-105 w-full sm:w-auto"
        >
          Watch Demo
        </Button>
      </motion.div>
      </div>
    </section>
  );
}

//FEATURES SECTION
function FeaturesComponent() {
  const features = [
    {
      icon: Users,
      title: "Live Collaboration",
      desc: "Edit code with teammates simultaneously, like Google Docs for developers.",
      size: "large",
    },
    {
      icon: Code2,
      title: "Smart Code Editor",
      desc: "Powered by Monaco with syntax highlighting, IntelliSense, and autocomplete.",
      size: "large",
    },
    {
      icon: Zap,
      title: "Instant Execution",
      desc: "Run code directly in the browser with built-in terminal support.",
      size: "small",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      desc: "End-to-end encryption ensures your code is always safe.",
      size: "small",
    },
  ];

  return (
    <section className="py-12 md:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-12 lg:px-16">
      <motion.h2
        className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-3 md:mb-4 text-white px-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        Why Choose CodeCollab?
      </motion.h2>
      <motion.p
        className="text-center text-muted-foreground mb-10 md:mb-16 w-full text-sm md:text-base px-4"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
      >
        Everything you need to code together, built for modern development teams
      </motion.p>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        {features.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            viewport={{ once: true }}
            className="col-span-1"
          >
            <Card
              className={cn(
                "group relative overflow-hidden bg-white/5 border border-white/10",
                "rounded-xl md:rounded-2xl transition-all duration-500 hover:bg-white/10 h-full",
                "hover:border-white/20 hover:shadow-2xl hover:shadow-white/5",
                "cursor-pointer"
              )}
            >
              <CardContent className="p-4 md:p-5 relative h-full">
                <div className="mb-3 md:mb-4 inline-flex p-2.5 md:p-3 rounded-lg md:rounded-xl bg-white/10 border border-white/20 group-hover:border-white/30 transition-all duration-300">
                  <f.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-3 text-white transition-colors duration-300">
                  {f.title}
                </h3>
                <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">
                  {f.desc}
                </p>

              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      </div>
    </section>
  );
}

//CTA SECTION
function CTAComponent() {
  const router = useRouter()
  return (
    <section className="py-12 md:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-12 lg:px-16">
      <div className="py-10 md:py-16 text-center bg-white/5 rounded-2xl md:rounded-3xl border border-white/10 shadow-2xl px-4 sm:px-6 md:px-12">
      <motion.div
        className="mb-3 md:mb-4 inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/5 border border-white/10"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <Zap className="w-3 h-3 md:w-4 md:h-4" />
        <span className="text-xs md:text-sm font-medium">Get Started in Seconds</span>
      </motion.div>

      <motion.h2
        className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 text-white px-4"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        Ready to Collaborate in Real-Time?
      </motion.h2>
      <motion.p
        className="text-muted-foreground mb-8 md:mb-10 w-full text-sm sm:text-base md:text-lg px-4"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        viewport={{ once: true }}
      >
        Join thousands of developers coding together. No credit card required.
        Start building something amazing today.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        viewport={{ once: true }}
      >
        <Button
          size="lg"
          className="px-8 py-5 md:px-10 md:py-7 text-base md:text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105 w-full sm:w-auto"
          onClick={() => {router.push("/auth/signup")}}
        >
          Get Started Free
        </Button>
      </motion.div>
      </div>
      </div>
    </section>
  );
}

//FOOTER
function FooterComponent() {
  return (
    <footer className="mt-12 md:mt-20 lg:mt-24 py-8 md:py-10 border-t border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-12 lg:px-16">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0">
        <p className="text-muted-foreground text-sm md:text-base text-center md:text-left">© 2025 CodeCollab. All rights reserved.</p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="hover:bg-primary/10 text-xs md:text-sm">Twitter</Button>
          <Button variant="ghost" size="sm" className="hover:bg-primary/10 text-xs md:text-sm">LinkedIn</Button>
          <Button variant="ghost" size="sm" className="hover:bg-primary/10 text-xs md:text-sm">GitHub</Button>
        </div>
      </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <main className="bg-background text-foreground overflow-x-hidden">
      <AnimatedBg />
      <Navbar />
      <Hero />
      <RealTimeShowcase />
      <Features />
      <CTA />
      <Footer />
    </main>
  );
}
