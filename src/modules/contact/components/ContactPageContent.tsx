'use client';

import { ContactForm } from '@components/shared/ContactForm';
import { Mail, MapPin, Clock, MessageCircle, ArrowRight } from 'lucide-react';
import { BrandIcon } from '@components/ui/BrandIcon';
import { ContactFloatingDots } from './decorations/ContactFloatingDots';

export function ContactPageContent() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <ContactFloatingDots />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[120px] opacity-50" />
        
        <div className="relative z-10 pt-28 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-8">
              <Mail size={16} />
              Contact Us
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Let&apos;s Start a <span className="text-primary">Conversation</span>
            </h1>
            <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Have a question, idea, or just want to say hello? We are here to help and would love to hear from you.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 pb-8">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="group bubble p-6 transition-all hover:border-primary/30">
              <div className="flex items-center gap-4">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <Mail size={22} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</p>
                  <p className="mt-1 text-base font-semibold text-foreground">contact@nukehub.org</p>
                </div>
              </div>
            </div>

            <div className="group bubble p-6 transition-all hover:border-primary/30">
              <div className="flex items-center gap-4">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <Clock size={22} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Response Time</p>
                  <p className="mt-1 text-base font-semibold text-foreground">Within 24 hours</p>
                </div>
              </div>
            </div>

            <div className="group bubble p-6 transition-all hover:border-primary/30">
              <div className="flex items-center gap-4">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <MapPin size={22} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</p>
                  <p className="mt-1 text-base font-semibold text-foreground">Global — Remote First</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="bubble relative overflow-hidden p-6 sm:p-8 lg:p-10">
            <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-primary/10 blur-[100px] opacity-60" />
            <div className="relative">
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground">Send us a Message</h2>
                <p className="mt-2 text-muted-foreground">Fill out the form below and we will get back to you as soon as possible.</p>
              </div>
              
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* Alternative Channels */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-semibold text-foreground">Other Ways to Connect</h2>
            <p className="mt-2 text-muted-foreground">Prefer a different platform? Reach out through any of these channels.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <a
              href="https://talk.nukehub.org"
              target="_blank"
              rel="noopener noreferrer"
              className="group bubble flex items-center gap-4 p-6 transition-all hover:border-primary/30"
            >
              <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <MessageCircle size={22} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">NukeTalk Forum</h3>
                <p className="mt-1 text-sm text-muted-foreground">Join the community discussion</p>
              </div>
              <ArrowRight size={18} className="text-muted-foreground transition-transform group-hover:translate-x-1" />
            </a>

            <a
              href="https://github.com/nukehub-dev"
              target="_blank"
              rel="noopener noreferrer"
              className="group bubble flex items-center gap-4 p-6 transition-all hover:border-primary/30"
            >
              <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <BrandIcon name="github" size={22} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">GitHub</h3>
                <p className="mt-1 text-sm text-muted-foreground">Contribute to our projects</p>
              </div>
              <ArrowRight size={18} className="text-muted-foreground transition-transform group-hover:translate-x-1" />
            </a>

            <a
              href="https://www.linkedin.com/company/nukehub"
              target="_blank"
              rel="noopener noreferrer"
              className="group bubble flex items-center gap-4 p-6 transition-all hover:border-primary/30"
            >
              <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <BrandIcon name="linkedin" size={22} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">LinkedIn</h3>
                <p className="mt-1 text-sm text-muted-foreground">Follow our company updates</p>
              </div>
              <ArrowRight size={18} className="text-muted-foreground transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
