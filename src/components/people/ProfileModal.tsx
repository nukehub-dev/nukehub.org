import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Briefcase, Mail, Globe, ArrowUpRight } from 'lucide-react';
import { Badge } from '@components/ui/Badge';
import { SocialIcon, getSocialUrl } from '@components/ui/SocialIcon';
import { cn } from '@lib/utils';
import type { Person } from '@data/people';

// ============================================================================
// Social link extraction with handles
// ============================================================================

interface SocialLink {
  platform: string;
  label: string;
  handle: string;
  url: string;
}

const SOCIAL_FIELDS: Array<{ key: keyof Person; label: string; platform: string }> = [
  { key: 'phone', label: 'Phone', platform: 'phone' },
  { key: 'whatsapp', label: 'WhatsApp', platform: 'whatsapp' },
  { key: 'skype', label: 'Skype', platform: 'skype' },
  { key: 'linkedin', label: 'LinkedIn', platform: 'linkedin' },
  { key: 'twitter', label: 'Twitter', platform: 'twitter' },
  { key: 'facebook', label: 'Facebook', platform: 'facebook' },
  { key: 'instagram', label: 'Instagram', platform: 'instagram' },
  { key: 'github', label: 'GitHub', platform: 'github' },
  { key: 'gitlab', label: 'GitLab', platform: 'gitlab' },
  { key: 'bitbucket', label: 'Bitbucket', platform: 'bitbucket' },
  { key: 'stackoverflow', label: 'Stack Overflow', platform: 'stackoverflow' },
  { key: 'scholar', label: 'Google Scholar', platform: 'scholar' },
  { key: 'orcid', label: 'ORCID', platform: 'orcid' },
  { key: 'researchgate', label: 'ResearchGate', platform: 'researchgate' },
  { key: 'zotero', label: 'Zotero', platform: 'zotero' },
  { key: 'youtube', label: 'YouTube', platform: 'youtube' },
];

function extractSocialLinks(person: Person): SocialLink[] {
  return SOCIAL_FIELDS
    .filter(({ key }) => person[key])
    .map(({ key, label, platform }) => {
      const handle = person[key] as string;
      return {
        platform,
        label,
        handle,
        url: getSocialUrl(platform, handle),
      };
    });
}

// ============================================================================
// Profile Modal
// ============================================================================

interface ProfileModalProps {
  person: Person | null;
  onClose: () => void;
}

export function ProfileModal({ person, onClose }: ProfileModalProps) {
  React.useEffect(() => {
    if (person) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [person]);

  React.useEffect(() => {
    if (!person) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [person, onClose]);

  const socials = person ? extractSocialLinks(person) : [];

  return (
    <AnimatePresence>
      {person && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className={cn(
              'relative w-full rounded-2xl border border-border/60',
              'bg-background/95 dark:bg-background/90',
              'shadow-2xl',
              'max-w-md md:max-w-xl lg:max-w-3xl',
              'max-h-[85vh] flex flex-col overflow-hidden'
            )}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted/90 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <div className="overflow-y-auto">
              {/* Header row — avatar + info side by side on desktop */}
              <div className="flex flex-col md:flex-row items-center md:items-start gap-5 px-6 pt-7 pb-5 md:border-b md:border-border/40">
                {/* Avatar */}
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.08, type: 'spring', stiffness: 200 }}
                  className="shrink-0"
                >
                  <div className="h-24 w-24 md:h-20 md:w-20 rounded-full overflow-hidden ring-4 ring-primary/10 bg-muted shadow-lg">
                    <img
                      src={person.image}
                      alt={person.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<div class="flex h-full w-full items-center justify-center text-3xl font-bold text-muted-foreground">${person.name.charAt(0)}</div>`;
                        }
                      }}
                    />
                  </div>
                </motion.div>

                {/* Info */}
                <motion.div
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.12 }}
                  className="flex-1 text-center md:text-left"
                >
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-1">
                    {person.name}
                  </h2>

                  {person.role && (
                    <Badge variant="default" className="mb-2 text-[11px]">
                      {person.role}
                    </Badge>
                  )}

                  <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-4 text-sm text-muted-foreground">
                    {person.organization && (
                      <span className="flex items-center gap-1.5">
                        <Briefcase size={13} />
                        {person.organization}
                      </span>
                    )}
                    {person.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin size={13} />
                        {person.location}
                      </span>
                    )}
                  </div>

                  {/* Action buttons — inline on desktop */}
                  <div className="flex items-center justify-center md:justify-start gap-2 mt-3">
                    {person.email && (
                      <a
                        href={`mailto:${person.email}`}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5',
                          'bg-primary text-primary-foreground text-sm font-medium',
                          'hover:brightness-110 transition-all shadow-sm'
                        )}
                      >
                        <Mail size={14} />
                        Email
                      </a>
                    )}
                    {person.url && (
                      <a
                        href={person.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5',
                          'bg-muted text-foreground text-sm font-medium',
                          'hover:bg-accent transition-colors border border-border'
                        )}
                      >
                        <Globe size={14} />
                        Website
                      </a>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Links section — 2-col grid on desktop */}
              {socials.length > 0 && (
                <motion.div
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.18 }}
                  className="px-6 py-5"
                >
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Links
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {socials.map((social, idx) => (
                      <motion.a
                        key={social.platform}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.22 + idx * 0.02 }}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-3.5 py-3',
                          'bg-muted/40 hover:bg-primary/8',
                          'border border-transparent hover:border-primary/15',
                          'transition-all group'
                        )}
                      >
                        <SocialIcon
                          platform={social.platform}
                          size={17}
                          className="text-muted-foreground group-hover:text-primary transition-colors shrink-0"
                        />

                        <div className="min-w-0 flex-1 text-left">
                          <p className="text-sm font-medium">
                            {social.handle}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {social.label}
                          </p>
                        </div>

                        <ArrowUpRight
                          size={15}
                          className="text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0"
                        />
                      </motion.a>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
