"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";
import { useState, useRef, useEffect } from "react";
import { RealtimeCollabCard } from "@/components/ui/FeatureCards/RealtimeCollabCard";
import { SmartEditorCard } from "@/components/ui/FeatureCards/SmartEditorCard";
import { ProjectManagementCard } from "@/components/ui/FeatureCards/ProjectManagementCard";
import { ChatCard } from "@/components/ui/FeatureCards/ChatCard";
import { PermissionsCard } from "@/components/ui/FeatureCards/PermissionsCard";
import { InstantExecutionCard } from "@/components/ui/FeatureCards/InstantExecutionCard";

// Lazy load below-fold components for better performance
const Footer = dynamic(() => Promise.resolve(FooterComponent), { ssr: true });

//NAVBAR
function Navbar() {
  const router = useRouter()
  return (
    <motion.nav 
      className="fixed top-0 left-0 w-full z-50 backdrop-blur-xl bg-background/60 border-b border-border/40"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-12 lg:px-16">
        <div className="flex justify-between items-center py-3 md:py-4">
          <motion.h1 
            className="text-xl md:text-2xl font-bold tracking-tight flex items-center cursor-pointer" 
            onClick={() => {router.push("/")}}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Image src="/logo.svg" alt="logo" width={20} height={20} className="mr-2 md:w-6 md:h-6" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-foreground">
              CodeCollab
            </span>
          </motion.h1>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="ghost" 
                  className="hover:bg-primary/10 cursor-pointer"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Features
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="ghost" 
                  className="hover:bg-primary/10 cursor-pointer"
                  onClick={() => document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Testimonials
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="ghost" 
                  className="hover:bg-primary/10 cursor-pointer"
                  onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  FAQ
                </Button>
              </motion.div>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                variant="default" 
                className="shadow-md cursor-pointer text-sm md:text-base relative overflow-hidden group" 
                onClick={() => {router.push("/auth/signup")}}
              >
                <span className="relative z-10">Get Started</span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.6 }}
                />
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

//HERO SECTION
function Hero() {
  const router = useRouter();
  return (
    <section className="relative flex flex-col items-center justify-center min-h-screen pt-20 pb-10 md:pt-0 md:pb-0 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none select-none [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]" />

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-12 lg:px-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center min-h-[85vh]">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col justify-center"
          >
            {/* Badge */}
            <motion.div
              className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl w-fit"
              whileHover={{ scale: 1.05 }}
            >
              <motion.div
                className="w-2 h-2 bg-white rounded-full"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [1, 0.7, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <span className="text-xs md:text-sm font-medium">
                Real-time Collaborative Coding Platform
              </span>
            </motion.div>

            {/* Heading */}
            <motion.h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight text-white drop-shadow-2xl"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <motion.span
                className="inline-block"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                Code
              </motion.span>{" "}
              <motion.span
                className="inline-block"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                Together,
              </motion.span>
              <br />
              <motion.span
                className="inline-block text-white/90"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                Build Better
              </motion.span>
            </motion.h1>

            {/* Description */}
            <motion.p
              className="mt-6 text-base sm:text-lg md:text-xl text-muted-foreground/90 leading-relaxed max-w-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Experience collaborative real-time coding, instant execution, and seamless
              team collaboration. Code with your team simultaneously, see live cursors,
              and build faster with zero setup.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  size="lg"
                  className="px-8 py-6 text-base shadow-2xl hover:shadow-primary/30 transition-all w-full sm:w-auto relative overflow-hidden group"
                  onClick={() => {
                    router.push("/auth/signup");
                  }}
                >
                  <span className="relative z-10">Get Started</span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.5 }}
                  />
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8 py-6 text-base border-border/60 hover:bg-primary/10 transition-all w-full sm:w-auto"
                >
                  Watch Demo
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Right - Hero Visual */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="relative h-full flex items-center justify-center"
          >
            <Image
              src="/hero.png"
              alt="Hero"
              width={600}
              height={600}
              className="w-full h-auto max-w-lg drop-shadow-2xl opacity-100"
              priority
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// EVERYTHING YOU NEED SECTION
function EverythingYouNeedSection() {
  return (
    <section className="py-20 md:py-28 lg:py-32 relative" id="features">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-12 lg:px-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything You <span className="text-gradient">Need</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            All the tools and features to collaborate effectively and ship faster
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-[auto_minmax(280px,320px)_auto] gap-6">
          {/* Real-time Collaboration - 2 cols, 1 row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="md:col-span-2"
          >
            <RealtimeCollabCard />
          </motion.div>

          {/* Smart Editor - 1 col, 1 row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="md:col-span-1"
          >
            <SmartEditorCard />
          </motion.div>

          {/* Project Management - 1 col, 1 row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="md:col-span-1"
          >
            <ProjectManagementCard />
          </motion.div>

          {/* Permissions - 1 col, 1 row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="md:col-span-1"
          >
            <PermissionsCard />
          </motion.div>

          {/* Team Chat - 1 col, 2 rows */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            viewport={{ once: true }}
            className="md:col-span-1 md:row-span-2"
          >
            <ChatCard />
          </motion.div>

          {/* Instant Execution - 2 cols, 1 row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            viewport={{ once: true }}
            className="md:col-span-2"
          >
            <InstantExecutionCard />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// TESTIMONIALS SECTION
const testimonials = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "Lead Developer",
    company: "TechCorp",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    text: "CodeCollab transformed how our team works. The real-time collaboration features are game-changing. We can code together seamlessly, no matter where we are.",
    rating: 5,
  },
  {
    id: 2,
    name: "Michael Chen",
    role: "Software Engineer",
    company: "StartupXYZ",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    text: "The instant execution and smart editor features save us hours every week. It's like having a superpower for coding collaboration.",
    rating: 5,
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    role: "Full Stack Developer",
    company: "DevStudio",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    text: "Best collaborative coding platform I've used. The team chat integration and permission controls make it perfect for our distributed team.",
    rating: 5,
  },
  {
    id: 4,
    name: "David Kim",
    role: "Engineering Manager",
    company: "CloudSystems",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    text: "CodeCollab has significantly improved our development workflow. The real-time features are incredibly smooth and reliable.",
    rating: 5,
  },
  {
    id: 5,
    name: "Jessica Taylor",
    role: "Senior Developer",
    company: "InnovateLabs",
    image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop",
    text: "Finally, a platform that gets collaborative coding right. The interface is intuitive and the performance is outstanding.",
    rating: 5,
  },
];

function TestimonialsSection() {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div className="bg-black relative shrink-0 w-full py-32 overflow-hidden" id="testimonials">
      <div className="relative mx-auto w-full px-6">
        {/* Header */}
        <div className="mb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2
              className="text-5xl md:text-6xl font-bold mb-4 text-center"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(153, 161, 175) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Trusted by Developers
            </h2>
            <p className="text-[#99a1af] text-xl mt-4 max-w-2xl mx-auto">
              See what our community has to say about their experience with CodeCollab
            </p>
          </motion.div>
        </div>

        {/* Scrollable Testimonials */}
        <div className="relative w-full" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
          {/* Gradient Overlays for scroll indication */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
          
          {/* Testimonial Cards Container with Auto-Scroll */}
          <AutoScrollTestimonials paused={isHovering} testimonials={testimonials} />
        </div>
      </div>
    </div>
  );
}

function AutoScrollTestimonials({ paused, testimonials }) {
  const [offset, setOffset] = useState(0);
  const containerRef = useRef(null);
  const cardWidth = 406;
  const gap = 24; // 6 in Tailwind = 24px
  const totalWidth = testimonials.length * (cardWidth + gap);

  useEffect(() => {
    if (paused) return;

    const interval = setInterval(() => {
      setOffset((prev) => {
        const newOffset = prev + 1;
        // Reset to 0 when we've scrolled one full set
        if (newOffset >= totalWidth) {
          return 0;
        }
        return newOffset;
      });
    }, 20); // Smooth continuous scroll

    return () => clearInterval(interval);
  }, [paused, totalWidth]);

  // Duplicate testimonials for seamless infinite scroll
  const duplicatedTestimonials = [...testimonials, ...testimonials];

  return (
    <div className="flex gap-6 overflow-hidden pb-6 px-6">
      <motion.div
        className="flex gap-6"
        style={{ x: -offset }}
        transition={{ duration: 0 }}
      >
        {duplicatedTestimonials.map((testimonial, index) => (
          <motion.div
            key={`testimonial-${index}`}
            whileHover={{ y: -5 }}
            className="bg-gradient-to-br from-[rgba(33,33,33,0.8)] to-[rgba(17,17,17,0.8)] rounded-[24px] p-8 min-w-[400px] max-w-[400px] shrink-0 relative"
          >
            <div
              aria-hidden="true"
              className="absolute border-[0.8px] border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[24px]"
            />
            
            <div className="flex flex-col gap-6 relative">
              {/* Rating Stars */}
              {/* <div className="flex gap-1">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <svg
                    key={i}
                    className="size-5"
                    fill="#FFD700"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div> */}

              {/* Testimonial Text */}
              <p className="text-[16px] leading-[24px] text-[#d1d5dc]">
                "{testimonial.text}"
              </p>

              {/* Author Info */}
              <div className="flex gap-4 items-center pt-4 border-t border-[rgba(255,255,255,0.1)]">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="size-12 rounded-full object-cover"
                />
                <div className="flex flex-col">
                  <p className="text-[16px] leading-[20px] text-white font-semibold">
                    {testimonial.name}
                  </p>
                  <p className="text-[12px] leading-[16px] text-[#99a1af]">
                    {testimonial.role} at {testimonial.company}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

// FAQ SECTION
const faqs = [
  {
    question: "What is CodeCollab and how does it work?",
    answer:
      "CodeCollab is a real-time collaborative coding platform that allows teams to code together seamlessly. You can create a project, invite team members, and start collaborating with live code editing, real-time cursors, and instant execution.",
  },
  {
    question: "Is CodeCollab free to use?",
    answer:
      "Yes, CodeCollab offers a free tier with essential features. We also offer premium plans with advanced features for teams and enterprises.",
  },
  {
    question: "Which programming languages are supported?",
    answer:
      "CodeCollab supports all major programming languages including JavaScript, Python, Java, C++, Go, Rust, and many more. You can seamlessly switch between languages in the same project.",
  },
  {
    question: "How does real-time collaboration work?",
    answer:
      "When multiple users work on the same project, all changes are synchronized in real-time. You can see other users' cursors, see their edits instantly, and chat with them directly in the platform.",
  },
  {
    question: "How do I get started with CodeCollab?",
    answer:
      "Getting started is simple! Sign up for a free account, create a new project, invite your team members, and start coding together. No installation required - it all works directly in your browser.",
  },
];

function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="bg-black relative shrink-0 w-full py-32" id="faq">
      <div
        className="absolute bg-gradient-to-b from-[rgba(0,0,0,0)] h-full left-0 to-[rgba(0,0,0,0)] top-0 via-1/2 via-[rgba(22,36,86,0.05)] w-full pointer-events-none"
      />

      <div className="relative mx-auto w-full max-w-4xl px-6 flex flex-col gap-16">
        {/* Header */}
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2
              className="text-5xl md:text-6xl font-bold mb-4 text-center"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(153, 161, 175) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Frequently Asked Questions
            </h2>
            <p className="text-[#99a1af] text-xl mt-4">
              Everything you need to know about CodeCollab
            </p>
          </motion.div>
        </div>

        {/* FAQ Items */}
        <div className="flex flex-col gap-4 w-full">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={false}
              animate={{ height: openIndex === index ? "auto" : "77.6px" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="relative rounded-[16px] shrink-0 w-full overflow-hidden group"
              style={{
                backgroundImage: "linear-gradient(to bottom right, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
              }}
            >
              <div
                aria-hidden="true"
                className="absolute border-[0.8px] border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[16px] group-hover:border-[rgba(147, 147, 147, 0.6)] group-hover:shadow-lg group-hover:shadow-white/30 transition-all duration-300"
              />
              <div className="content-stretch flex flex-col items-start p-[0.8px] relative size-full">
                <motion.button
                  onClick={() => toggleFAQ(index)}
                  whileHover={{ backgroundColor: "rgba(109, 109, 109, 0.1)" }}
                  className="h-[76px] relative rounded-[16px] shrink-0 w-full cursor-pointer transition-colors duration-300"
                >
                  <div className="flex flex-row items-center size-full">
                    <div className="flex items-center justify-between px-6 py-4 relative size-full">
                      <p className="text-[18px] leading-[28px] text-white font-semibold">
                        {faq.question}
                      </p>
                      <div className="relative shrink-0 size-5 flex-shrink-0">
                        <AnimatePresence mode="wait">
                          {openIndex === index ? (
                            <motion.div
                              key="up"
                              initial={{ rotate: -90, opacity: 0 }}
                              animate={{ rotate: 0, opacity: 1 }}
                              exit={{ rotate: 90, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className="size-5 text-[#99a1af] rotate-180" strokeWidth={2} />
                            </motion.div>
                          ) : (
                            <motion.div
                              key="down"
                              initial={{ rotate: 90, opacity: 0 }}
                              animate={{ rotate: 0, opacity: 1 }}
                              exit={{ rotate: -90, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className="size-5 text-[#99a1af]" strokeWidth={2} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </motion.button>

                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="px-6 pb-6 w-full"
                    >
                      <p className="text-[16px] leading-[24px] text-[#d1d5dc]">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}


//FOOTER
function FooterComponent() {
  return (
    <footer className="mt-32 py-12 border-t border-white/10 bg-black">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-12 lg:px-16">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center md:text-left"
          >
            <h2 className="text-2xl font-bold text-white mb-2">CodeCollab</h2>
            <p className="text-[#99a1af] text-sm">Build together, ship faster</p>
          </motion.div>

          <motion.div
            className="flex items-center gap-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <a href="#" className="text-[#99a1af] hover:text-white transition-colors text-sm">
              Docs
            </a>
            <a href="#" className="text-[#99a1af] hover:text-white transition-colors text-sm">
              Twitter
            </a>
            <a href="#" className="text-[#99a1af] hover:text-white transition-colors text-sm">
              GitHub
            </a>
          </motion.div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8 text-center">
          <p className="text-[#99a1af] text-xs">
            © 2025 CodeCollab. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="bg-black text-foreground overflow-x-hidden">
      <Navbar />
      <Hero />
      <EverythingYouNeedSection />
      <TestimonialsSection />
      <FAQSection />
      <Footer />
    </main>
  );
}
