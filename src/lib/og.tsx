import fs from "node:fs/promises";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const GEIST_REGULAR = path.resolve(
  process.cwd(),
  "node_modules/geist/dist/fonts/geist-sans/Geist-Regular.ttf",
);
const GEIST_SEMIBOLD = path.resolve(
  process.cwd(),
  "node_modules/geist/dist/fonts/geist-sans/Geist-SemiBold.ttf",
);
const GEIST_BOLD = path.resolve(
  process.cwd(),
  "node_modules/geist/dist/fonts/geist-sans/Geist-Bold.ttf",
);

const LOGO_PATH = path.resolve(
  process.cwd(),
  "public/assets/images/nukehub.svg",
);

const BRAND_PRIMARY = "#f37524";

let logoDataUri: string | undefined;

async function loadLogoDataUri() {
  if (logoDataUri) return logoDataUri;
  const svg = await fs.readFile(LOGO_PATH, "utf-8");
  // Replace currentColor with the brand primary so the image renders correctly
  // when used outside of a CSS context.
  const themed = svg.replace(/currentColor/g, BRAND_PRIMARY);
  logoDataUri = `data:image/svg+xml,${encodeURIComponent(themed)}`;
  return logoDataUri;
}

let fontCache: {
  regular?: Buffer;
  semibold?: Buffer;
  bold?: Buffer;
} = {};

async function loadFonts() {
  if (!fontCache.regular) {
    [fontCache.regular, fontCache.semibold, fontCache.bold] = await Promise.all(
      [
        fs.readFile(GEIST_REGULAR),
        fs.readFile(GEIST_SEMIBOLD),
        fs.readFile(GEIST_BOLD),
      ],
    );
  }
  return [
    {
      name: "Geist",
      data: fontCache.regular!.buffer as ArrayBuffer,
      weight: 400,
      style: "normal",
    },
    {
      name: "Geist",
      data: fontCache.semibold!.buffer as ArrayBuffer,
      weight: 600,
      style: "normal",
    },
    {
      name: "Geist",
      data: fontCache.bold!.buffer as ArrayBuffer,
      weight: 700,
      style: "normal",
    },
  ] as const;
}

interface GenerateOgImageOptions {
  title: string;
  description?: string;
  meta?: string | { text: string; icon: "star" };
}

export async function generateOgImage({
  title,
  description,
  meta,
}: GenerateOgImageOptions) {
  const [fonts, logoSrc] = await Promise.all([loadFonts(), loadLogoDataUri()]);

  const svg = await satori(
    <div
      style={{
        width: 1200,
        height: 630,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        background:
          "linear-gradient(135deg, #0a0a0a 0%, #141414 50%, #0f0f0f 100%)",
        color: "#fafafa",
        fontFamily: "Geist, sans-serif",
        position: "relative",
      }}
    >
      {/* Decorative glows — rendered first so they sit behind content */}
      <div
        style={{
          position: "absolute",
          top: -120,
          right: -120,
          width: 480,
          height: 480,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(243,117,36,0.18) 0%, transparent 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -160,
          left: -80,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(87,160,224,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <img
          src={logoSrc}
          width={40}
          height={40}
          alt=""
          style={{ display: "block" }}
        />
        <span
          style={{
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
        >
          NukeHub
        </span>
      </div>

      {/* Main content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          maxWidth: 960,
        }}
      >
        <h1
          style={{
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
          }}
        >
          {title}
        </h1>
        {description && (
          <p
            style={{
              fontSize: 32,
              lineHeight: 1.4,
              color: "#a1a1aa",
              maxWidth: 880,
            }}
          >
            {description}
          </p>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 24, color: "#71717a" }}>nukehub.org</span>
        {meta && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 22,
              fontWeight: 600,
              color: BRAND_PRIMARY,
              background: "rgba(243,117,36,0.12)",
              padding: "10px 18px",
              borderRadius: 999,
            }}
          >
            {typeof meta === "object" && meta.icon === "star" && (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill={BRAND_PRIMARY}
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            )}
            <span>{typeof meta === "string" ? meta : meta.text}</span>
          </span>
        )}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: fonts.map((f) => ({ ...f })),
    },
  );

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
  });
  const png = resvg.render();
  return new Uint8Array(png.asPng());
}
