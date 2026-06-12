"use client";

import { useState, useRef, useEffect } from "react";
import { User, LogOut, Settings, ChevronDown, Loader2 } from "lucide-react";
import { useAuth } from "@lib/auth/KeycloakProvider";
import { cn } from "@lib/utils";

function md5(inputString: string): string {
  function rotateLeft(lValue: number, iShiftBits: number) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }
  function addUnsigned(lX: number, lY: number) {
    let lX4, lY4, lX8, lY8, lResult;
    lX8 = lX & 0x80000000;
    lY8 = lY & 0x80000000;
    lX4 = lX & 0x40000000;
    lY4 = lY & 0x40000000;
    lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
    if (lX4 & lY4) {
      return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    }
    if (lX4 | lY4) {
      if (lResult & 0x40000000) {
        return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
      } else {
        return lResult ^ 0x40000000 ^ lX8 ^ lY8;
      }
    } else {
      return lResult ^ lX8 ^ lY8;
    }
  }
  function f(x: number, y: number, z: number) {
    return (x & y) | (~x & z);
  }
  function g(x: number, y: number, z: number) {
    return (x & z) | (y & ~z);
  }
  function h(x: number, y: number, z: number) {
    return x ^ y ^ z;
  }
  function i(x: number, y: number, z: number) {
    return y ^ (x | ~z);
  }
  function ff(
    a: number,
    b: number,
    c: number,
    d: number,
    x: number,
    s: number,
    ac: number,
  ) {
    a = addUnsigned(a, addUnsigned(addUnsigned(f(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function gg(
    a: number,
    b: number,
    c: number,
    d: number,
    x: number,
    s: number,
    ac: number,
  ) {
    a = addUnsigned(a, addUnsigned(addUnsigned(g(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function hh(
    a: number,
    b: number,
    c: number,
    d: number,
    x: number,
    s: number,
    ac: number,
  ) {
    a = addUnsigned(a, addUnsigned(addUnsigned(h(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function ii(
    a: number,
    b: number,
    c: number,
    d: number,
    x: number,
    s: number,
    ac: number,
  ) {
    a = addUnsigned(a, addUnsigned(addUnsigned(i(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function convertToWordArray(string: string) {
    let lWordCount;
    let lMessageLength = string.length;
    let lNumberOfWordsTemp1 = lMessageLength + 8;
    let lNumberOfWordsTemp2 =
      (lNumberOfWordsTemp1 - (lNumberOfWordsTemp1 % 64)) / 64;
    let lNumberOfWords = (lNumberOfWordsTemp2 + 1) * 16;
    let lWordArray = new Array(lNumberOfWords - 1);
    let lBytePosition = 0;
    let lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] =
        (lWordArray[lWordCount] || 0) |
        (string.charCodeAt(lByteCount) << lBytePosition);
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] =
      (lWordArray[lWordCount] || 0) | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }
  function wordToHex(lValue: number) {
    let wordToHexValue = "",
      wordToHexValueTemp = "",
      lByte;
    for (let lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      wordToHexValueTemp = "0" + lByte.toString(16);
      wordToHexValue = wordToHexValue + wordToHexValueTemp.slice(-2);
    }
    return wordToHexValue;
  }

  let x = convertToWordArray(inputString);
  let AA, BB, CC, DD, a, b, c, d;
  let S11 = 7,
    S12 = 12,
    S13 = 17,
    S14 = 22;
  let S21 = 5,
    S22 = 9,
    S23 = 14,
    S24 = 20;
  let S31 = 4,
    S32 = 11,
    S33 = 16,
    S34 = 23;
  let S41 = 6,
    S42 = 10,
    S43 = 15,
    S44 = 21;

  a = 0x67452301;
  b = 0xefcdab89;
  c = 0x98badcfe;
  d = 0x10325476;

  for (let i = 0; i < x.length; i += 16) {
    AA = a;
    BB = b;
    CC = c;
    DD = d;
    a = ff(a, b, c, d, x[i + 0], S11, 0xd76aa478);
    d = ff(d, a, b, c, x[i + 1], S12, 0xe8c7b756);
    c = ff(c, d, a, b, x[i + 2], S13, 0x242070db);
    b = ff(b, c, d, a, x[i + 3], S14, 0xc1bdceee);
    a = ff(a, b, c, d, x[i + 4], S11, 0xf57c0faf);
    d = ff(d, a, b, c, x[i + 5], S12, 0x4787c62a);
    c = ff(c, d, a, b, x[i + 6], S13, 0xa8304613);
    b = ff(b, c, d, a, x[i + 7], S14, 0xfd469501);
    a = ff(a, b, c, d, x[i + 8], S11, 0x698098d8);
    d = ff(d, a, b, c, x[i + 9], S12, 0x8b44f7af);
    c = ff(c, d, a, b, x[i + 10], S13, 0xffff5bb1);
    b = ff(b, c, d, a, x[i + 11], S14, 0x895cd7be);
    a = ff(a, b, c, d, x[i + 12], S11, 0x6b901122);
    d = ff(d, a, b, c, x[i + 13], S12, 0xfd987193);
    c = ff(c, d, a, b, x[i + 14], S13, 0xa679438e);
    b = ff(b, c, d, a, x[i + 15], S14, 0x49b40821);
    a = gg(a, b, c, d, x[i + 1], S21, 0xf61e2562);
    d = gg(d, a, b, c, x[i + 6], S22, 0xc040b340);
    c = gg(c, d, a, b, x[i + 11], S23, 0x265e5a51);
    b = gg(b, c, d, a, x[i + 0], S24, 0xe9b6c7aa);
    a = gg(a, b, c, d, x[i + 5], S21, 0xd62f105d);
    d = gg(d, a, b, c, x[i + 10], S22, 0x2441453);
    c = gg(c, d, a, b, x[i + 15], S23, 0xd8a1e681);
    b = gg(b, c, d, a, x[i + 4], S24, 0xe7d3fbc8);
    a = gg(a, b, c, d, x[i + 9], S21, 0x21e1cde6);
    d = gg(d, a, b, c, x[i + 14], S22, 0xc33707d6);
    c = gg(c, d, a, b, x[i + 3], S23, 0xf4d50d87);
    b = gg(b, c, d, a, x[i + 8], S24, 0x455a14ed);
    a = gg(a, b, c, d, x[i + 13], S21, 0xa9e3e905);
    d = gg(d, a, b, c, x[i + 2], S22, 0xfcefa3f8);
    c = gg(c, d, a, b, x[i + 7], S23, 0x676f02d9);
    b = gg(b, c, d, a, x[i + 12], S24, 0x8d2a4c8a);
    a = hh(a, b, c, d, x[i + 5], S31, 0xfffa3942);
    d = hh(d, a, b, c, x[i + 8], S32, 0x8771f681);
    c = hh(c, d, a, b, x[i + 11], S33, 0x6d9d6122);
    b = hh(b, c, d, a, x[i + 14], S34, 0xfde5380c);
    a = hh(a, b, c, d, x[i + 1], S31, 0xa4beea44);
    d = hh(d, a, b, c, x[i + 4], S32, 0x4bdecfa9);
    c = hh(c, d, a, b, x[i + 7], S33, 0xf6bb4b60);
    b = hh(b, c, d, a, x[i + 10], S34, 0xbebfbc70);
    a = hh(a, b, c, d, x[i + 13], S31, 0x289b7ec6);
    d = hh(d, a, b, c, x[i + 0], S32, 0xeaa127fa);
    c = hh(c, d, a, b, x[i + 3], S33, 0xd4ef3085);
    b = hh(b, c, d, a, x[i + 6], S34, 0x4881d05);
    a = hh(a, b, c, d, x[i + 9], S31, 0xd9d4d039);
    d = hh(d, a, b, c, x[i + 12], S32, 0xe6db99e5);
    c = hh(c, d, a, b, x[i + 15], S33, 0x1fa27cf8);
    b = hh(b, c, d, a, x[i + 2], S34, 0xc4ac5665);
    a = ii(a, b, c, d, x[i + 0], S41, 0xf4292244);
    d = ii(d, a, b, c, x[i + 7], S42, 0x432aff97);
    c = ii(c, d, a, b, x[i + 14], S43, 0xab9423a7);
    b = ii(b, c, d, a, x[i + 5], S44, 0xfc93a039);
    a = ii(a, b, c, d, x[i + 12], S41, 0x655b59c3);
    d = ii(d, a, b, c, x[i + 3], S42, 0x8f0ccc92);
    c = ii(c, d, a, b, x[i + 10], S43, 0xffeff47d);
    b = ii(b, c, d, a, x[i + 1], S44, 0x85845dd1);
    a = ii(a, b, c, d, x[i + 8], S41, 0x6fa87e4f);
    d = ii(d, a, b, c, x[i + 15], S42, 0xfe2ce6e0);
    c = ii(c, d, a, b, x[i + 6], S43, 0xa3014314);
    b = ii(b, c, d, a, x[i + 13], S44, 0x4e0811a1);
    a = ii(a, b, c, d, x[i + 4], S41, 0xf7537e82);
    d = ii(d, a, b, c, x[i + 11], S42, 0xbd3af235);
    c = ii(c, d, a, b, x[i + 2], S43, 0x2ad7d2bb);
    b = ii(b, c, d, a, x[i + 9], S44, 0xeb86d391);
    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }

  return wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
}

function getGravatarUrl(email: string): string {
  const hash = md5(email.trim().toLowerCase());
  return `https://www.gravatar.com/avatar/${hash}?s=128&d=identicon`;
}

export function UserAuthMenu() {
  const { isAuthenticated, isLoading, user, login, logout, accountUrl } =
    useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) {
      setAvatarUrl(getGravatarUrl(user.email));
    } else {
      setAvatarUrl(null);
    }
  }, [user?.email]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (isLoading) {
    return (
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <button
        onClick={login}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          "text-muted-foreground hover:text-foreground hover:bg-accent",
        )}
      >
        <User className="h-4 w-4" />
        Sign In
      </button>
    );
  }

  const initials = getInitials(user?.fullName || user?.username || "U");

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
          "text-muted-foreground hover:text-foreground hover:bg-accent",
          open && "bg-accent text-accent-foreground",
        )}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={user?.username}
            width={24}
            height={24}
            className="h-6 w-6 rounded-full object-cover ring-1 ring-border"
          />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
            {initials}
          </div>
        )}
        <span className="hidden lg:inline max-w-[120px] truncate">
          {user?.username}
        </span>
        <ChevronDown
          className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 rounded-lg border border-border bg-popover p-1 shadow-lg">
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-popover-foreground truncate">
              {user?.fullName || user?.username}
            </p>
            {user?.email && (
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            )}
          </div>

          <div className="my-1 h-px bg-border" />

          <a
            href={accountUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            Account Settings
          </a>

          <button
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(/[\s_-]+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
