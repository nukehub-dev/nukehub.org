import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, MoreHorizontal } from 'lucide-react';
import { Image } from '@components/ui/Image';
import { Card, CardContent } from '@components/ui/Card';
import { Badge } from '@components/ui/Badge';
import { SocialIcon } from '@components/ui/SocialIcon';
import { Tooltip } from '@components/ui/Tooltip';
import { cn } from '@lib/utils';
import { type Person, type SocialLink, SOCIAL_FIELDS, extractSocialLinks } from '@modules/people/types';

// ============================================================================
// Social link extraction
// ============================================================================

function getDisplaySocials(person: Person): SocialLink[] {
  const priority = ['github', 'linkedin', 'x', 'email', 'url', 'gitlab'];
  const all = extractSocialLinks(person);
  const prioritized = priority
    .map((p) => all.find((s) => s.platform === p))
    .filter(Boolean) as SocialLink[];
  const rest = all.filter((s) => !priority.includes(s.platform));
  return [...prioritized, ...rest].slice(0, 5);
}

// ============================================================================
// Components
// ============================================================================

interface ProfileCardProps {
  person: Person;
  index?: number;
  onOpen: (person: Person) => void;
}

export function ProfileCard({ person, index = 0, onOpen }: ProfileCardProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties>({});
  const cardRef = React.useRef<HTMLDivElement>(null);
  const menuButtonRef = React.useRef<HTMLButtonElement>(null);

  const allSocials = extractSocialLinks(person);
  const displaySocials = getDisplaySocials(person);

  // Close menu on outside click or Escape
  React.useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (cardRef.current && !cardRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  const computeMenuStyle = (anchorX: number, anchorY: number): React.CSSProperties => {
    const card = cardRef.current;
    if (!card) return {};
    const rect = card.getBoundingClientRect();
    const menuWidth = 196;
    const menuHeight = Math.min(allSocials.length * 36 + 40, 320);

    let left = anchorX;
    let top = anchorY + 8;

    if (left + menuWidth > rect.width - 8) {
      left = rect.width - menuWidth - 8;
    }
    if (left < 8) left = 8;
    if (top + menuHeight > rect.height - 8) {
      top = anchorY - menuHeight - 8;
    }

    return { left, top };
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMenuStyle(computeMenuStyle(x, y));
    setMenuOpen(true);
  };

  const openMenuFromButton = () => {
    const btn = menuButtonRef.current;
    const card = cardRef.current;
    if (!btn || !card) return;
    const cardRect = card.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const x = btnRect.left - cardRect.left + btnRect.width / 2 - 98;
    const y = btnRect.top - cardRect.top + btnRect.height;
    setMenuStyle(computeMenuStyle(x, y));
    setMenuOpen(true);
  };

  const hasMoreSocials = allSocials.length > 5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.4, 0, 0.2, 1] }}
    >
      <div
        ref={cardRef}
        className="relative group"
        onContextMenu={handleContextMenu}
      >
        <Card
          variant="bubble"
          interactive
          className={cn(
            'h-full overflow-hidden transition-colors cursor-pointer',
            'dark:border dark:border-border/20'
          )}
          onClick={() => onOpen(person)}
        >
          <CardContent className="p-5 flex flex-col items-center text-center relative">
            {/* Avatar */}
            <div className="relative mb-4">
              <Image
                src={person.image}
                alt={person.name}
                fallback={person.name}
                wrapperClassName="h-24 w-24 ring-2 ring-border/60 shadow-sm"
                rounded="full"
                loading="lazy"
              />
            </div>

            {/* Info */}
            <h3 className="text-lg font-semibold leading-tight mb-1">
              {person.name}
            </h3>

            {person.role && (
              <Badge variant="default" className="mb-2 text-[11px]">
                {person.role}
              </Badge>
            )}

            {person.organization && (
              <p className="text-sm text-muted-foreground mb-1 leading-snug">
                {person.organization}
              </p>
            )}

            {person.location && (
              <p className="text-xs text-muted-foreground/80 flex items-center justify-center gap-1 mb-3">
                <MapPin size={12} />
                {person.location}
              </p>
            )}

            {/* Social Icons */}
            <div className="flex items-center justify-center gap-1 mt-auto">
              {displaySocials.map((social) => (
                <Tooltip key={social.platform} content={social.label}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                    aria-label={social.label}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SocialIcon platform={social.platform} size={16} />
                  </a>
                </Tooltip>
              ))}
              {hasMoreSocials && (
                <Tooltip content="More links">
                  <button
                    ref={menuButtonRef}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                    aria-label="More links"
                    onClick={(e) => {
                      e.stopPropagation();
                      openMenuFromButton();
                    }}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </Tooltip>
              )}
            </div>

            {/* Hover affordance */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
          </CardContent>
        </Card>

        {/* Context Menu / Dropdown */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 w-[196px] rounded-xl border border-border bg-popover text-popover-foreground shadow-xl py-1.5 overflow-hidden"
              style={menuStyle}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border/60 mb-1 truncate">
                {person.name}
              </div>
              <div className="max-h-[280px] overflow-y-auto">
                {allSocials.map((social) => (
                  <a
                    key={social.platform}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    <SocialIcon platform={social.platform} size={15} />
                    <span className="truncate">{social.label}</span>
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
