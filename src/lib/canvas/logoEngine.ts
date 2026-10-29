/**
 * noBrain Canvas Logo Design Engine
 * Provides vector shapes, curated color/gradient palettes, and Canva-grade logo archetypes.
 */

export interface LogoTemplate {
  id: string
  name: string
  category: "tech" | "monogram" | "minimal" | "luxury" | "creative" | "corporate"
  badge: string
  description: string
  thumbnailSvg: string
  colors: string[]
  design: any
}

// ==============================================================================
// 1. Vector SVG Mark Generators (Crisp, resolution-independent vector paths)
// ==============================================================================

export const VECTOR_MARKS = {
  // 1. Layered Gradient Prism / Diamond (Vertex style)
  vertexPrism: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="prism1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#06B6D4" />
        <stop offset="100%" stop-color="#3B82F6" />
      </linearGradient>
      <linearGradient id="prism2" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#10B981" />
        <stop offset="100%" stop-color="#06B6D4" />
      </linearGradient>
      <linearGradient id="prism3" x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stop-color="#FACC15" />
        <stop offset="100%" stop-color="#10B981" />
      </linearGradient>
    </defs>
    <path d="M100 20 L170 90 L100 160 L30 90 Z" fill="url(#prism1)" opacity="0.95" />
    <path d="M100 45 L150 95 L100 145 L50 95 Z" fill="url(#prism2)" opacity="0.9" />
    <path d="M100 70 L130 100 L100 130 L70 100 Z" fill="url(#prism3)" />
  </svg>`,

  // 1b. Neural AI Synapse / Cloud Network
  synapseNeural: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="synGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#06B6D4" />
        <stop offset="100%" stop-color="#3B82F6" />
      </linearGradient>
      <linearGradient id="synGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#10B981" />
        <stop offset="100%" stop-color="#06B6D4" />
      </linearGradient>
    </defs>
    <circle cx="100" cy="100" r="18" fill="url(#synGrad1)" />
    <circle cx="50" cy="65" r="13" fill="url(#synGrad2)" />
    <circle cx="150" cy="65" r="13" fill="url(#synGrad2)" />
    <circle cx="65" cy="145" r="11" fill="url(#synGrad1)" />
    <circle cx="135" cy="145" r="11" fill="url(#synGrad1)" />
    <path d="M50 65 L100 100 L150 65 M65 145 L100 100 L135 145 M50 65 L65 145 M150 65 L135 145" stroke="#38BDF8" stroke-width="4" stroke-linecap="round" opacity="0.85" />
    <circle cx="100" cy="100" r="32" stroke="#06B6D4" stroke-width="2" stroke-dasharray="6 4" opacity="0.6" />
  </svg>`,

  // 1c. Quantum Isometric 3D Gradient Cube
  quantumCube: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="qTop" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#38BDF8" />
        <stop offset="100%" stop-color="#06B6D4" />
      </linearGradient>
      <linearGradient id="qLeft" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#0284C7" />
        <stop offset="100%" stop-color="#0F172A" />
      </linearGradient>
      <linearGradient id="qRight" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#10B981" />
        <stop offset="100%" stop-color="#065F46" />
      </linearGradient>
    </defs>
    <polygon points="100,30 165,65 100,100 35,65" fill="url(#qTop)" />
    <polygon points="35,65 100,100 100,170 35,135" fill="url(#qLeft)" />
    <polygon points="100,100 165,65 165,135 100,170" fill="url(#qRight)" />
  </svg>`,

  // 1d. Cyber Hexagon Tech Mark
  cyberHexagon: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#10B981" />
        <stop offset="100%" stop-color="#06B6D4" />
      </linearGradient>
    </defs>
    <polygon points="100,20 170,60 170,140 100,180 30,140 30,60" stroke="url(#hexGrad)" stroke-width="9" stroke-linejoin="round" />
    <polygon points="100,45 145,72 145,128 100,155 55,128 55,72" fill="url(#hexGrad)" opacity="0.25" />
    <circle cx="100" cy="100" r="14" fill="#38BDF8" />
    <line x1="100" y1="20" x2="100" y2="86" stroke="#38BDF8" stroke-width="4" />
    <line x1="30" y1="140" x2="88" y2="106" stroke="#10B981" stroke-width="4" />
    <line x1="170" y1="140" x2="112" y2="106" stroke="#06B6D4" stroke-width="4" />
  </svg>`,

  // 1e. Lumina Spark
  luminaSpark: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FDE047" />
        <stop offset="50%" stop-color="#F97316" />
        <stop offset="100%" stop-color="#EC4899" />
      </linearGradient>
    </defs>
    <path d="M100 20 Q100 100 180 100 Q100 100 100 180 Q100 100 20 100 Q100 100 100 20 Z" fill="url(#sparkGrad)" />
    <circle cx="100" cy="100" r="12" fill="#FFFFFF" />
  </svg>`,

  // 2. Velocity Speed Bars (AuraMotion style - Neon Lime & Cyan)
  auraVelocity: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="neonSpeed" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#A3E635" />
        <stop offset="100%" stop-color="#22C55E" />
      </linearGradient>
    </defs>
    <polygon points="40,140 70,60 95,60 65,140" fill="url(#neonSpeed)" />
    <polygon points="85,140 115,60 140,60 110,140" fill="#FFFFFF" opacity="0.95" />
    <polygon points="130,140 160,60 175,60 145,140" fill="url(#neonSpeed)" opacity="0.75" />
  </svg>`,

  // 3. Celestial Orbit & Minimal Sphere (Circle. style)
  celestialOrbit: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="orbitGlow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#60A5FA" />
        <stop offset="100%" stop-color="#A855F7" />
      </linearGradient>
    </defs>
    <circle cx="100" cy="100" r="42" fill="url(#orbitGlow)" />
    <ellipse cx="100" cy="100" rx="78" ry="32" stroke="#FFFFFF" stroke-width="4.5" transform="rotate(-26 100 100)" stroke-dasharray="14 4 4 4" opacity="0.9" />
    <circle cx="165" cy="70" r="7" fill="#38BDF8" />
  </svg>`,

  // 4. Interlocking Geometric Knot (Borcelle & Ingoude style)
  interlockingKnot: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="goldKnot" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#F59E0B" />
        <stop offset="100%" stop-color="#D97706" />
      </linearGradient>
    </defs>
    <path d="M100 35 L155 90 L100 145 L45 90 Z" stroke="url(#goldKnot)" stroke-width="14" stroke-linejoin="round" />
    <path d="M100 55 L135 90 L100 125 L65 90 Z" stroke="#FBBF24" stroke-width="8" stroke-linejoin="round" opacity="0.8" />
    <circle cx="100" cy="90" r="10" fill="url(#goldKnot)" />
  </svg>`,

  // 5. Architectural Momentum Towers (Studio North style)
  architecturalPillars: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="pillarGrad" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stop-color="#1E3A8A" />
        <stop offset="100%" stop-color="#3B82F6" />
      </linearGradient>
      <linearGradient id="pillarOrange" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stop-color="#EA580C" />
        <stop offset="100%" stop-color="#FB923C" />
      </linearGradient>
    </defs>
    <rect x="42" y="105" width="24" height="65" rx="5" fill="url(#pillarGrad)" />
    <rect x="74" y="80" width="24" height="90" rx="5" fill="url(#pillarGrad)" />
    <rect x="106" y="55" width="24" height="115" rx="5" fill="url(#pillarGrad)" />
    <path d="M140 125 L165 40 L85 65" stroke="url(#pillarOrange)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />
    <polygon points="165,40 145,55 160,70" fill="url(#pillarOrange)" />
  </svg>`,

  // 6. Monogram Emblem Shield (ZR / HK Luxury style)
  luxuryMonogramShield: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="goldSheen" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FDE68A" />
        <stop offset="50%" stop-color="#D4AF37" />
        <stop offset="100%" stop-color="#92400E" />
      </linearGradient>
    </defs>
    <rect x="25" y="25" width="150" height="150" rx="16" stroke="url(#goldSheen)" stroke-width="4.5" />
    <rect x="36" y="36" width="128" height="128" rx="8" stroke="url(#goldSheen)" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.7" />
    <path d="M68 62 H132 L78 138 H132" stroke="url(#goldSheen)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M100 62 V138" stroke="url(#goldSheen)" stroke-width="4" opacity="0.6" />
  </svg>`,

  // 7. Folded Origami Ribbon (Creative Events style)
  foldedRibbon: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="ribbon1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#8B5CF6" />
        <stop offset="100%" stop-color="#EC4899" />
      </linearGradient>
      <linearGradient id="ribbon2" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#F43F5E" />
        <stop offset="100%" stop-color="#FB923C" />
      </linearGradient>
    </defs>
    <path d="M50 70 L110 30 L150 70 L90 110 Z" fill="url(#ribbon1)" />
    <path d="M90 110 L150 70 L150 130 L90 170 Z" fill="url(#ribbon2)" opacity="0.9" />
    <path d="M50 70 L90 110 L90 170 L50 130 Z" fill="#6366F1" opacity="0.8" />
  </svg>`,

  // 8. Fluid Liquid Tubes (Mods / Tech style)
  fluidRibbon: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fluidGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#3B82F6" />
        <stop offset="100%" stop-color="#1D4ED8" />
      </linearGradient>
    </defs>
    <path d="M45 130 C45 80 80 60 100 100 C120 140 155 120 155 70" stroke="url(#fluidGrad)" stroke-width="26" stroke-linecap="round" />
    <circle cx="50" cy="130" r="10" fill="#60A5FA" />
    <circle cx="150" cy="70" r="10" fill="#93C5FD" />
  </svg>`,
}

// ==============================================================================
// 2. Pre-curated Production Logo Templates (Ready to drop into Canvas)
// ==============================================================================

export const PRESET_LOGO_TEMPLATES: LogoTemplate[] = [
  {
    id: "vertex-tech",
    name: "Vertex Technologies",
    category: "tech",
    badge: "Gradient Prism",
    description: "Layered cyan-emerald gradient diamond on sleek dark studio backdrop",
    colors: ["#090D16", "#06B6D4", "#10B981", "#FFFFFF"],
    thumbnailSvg: VECTOR_MARKS.vertexPrism,
    design: {
      format: "instagram-feed",
      title: "Vertex Technologies Logo",
      isLogo: true,
      background: {
        type: "gradient",
        gradientType: "linear",
        angle: 145,
        stops: [
          { position: 0, color: "#0B0F19" },
          { position: 1, color: "#050811" },
        ],
      },
      layers: [
        {
          type: "svg",
          name: "Prism Emblem",
          svgContent: VECTOR_MARKS.vertexPrism,
          x: 440,
          y: 260,
          width: 200,
          height: 200,
        },
        {
          type: "text",
          name: "Brand Wordmark",
          content: "VERTEX",
          x: 90,
          y: 530,
          width: 900,
          textAlign: "center",
          fontSize: 64,
          fontWeight: 900,
          letterSpacing: 0.12,
          textTransform: "uppercase",
          color: "#FFFFFF",
        },
        {
          type: "text",
          name: "Tagline",
          content: "NEXT-GEN CLOUD COMPUTING",
          x: 90,
          y: 630,
          width: 900,
          textAlign: "center",
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: 0.28,
          textTransform: "uppercase",
          color: "#38BDF8",
        },
      ],
    },
  },

  {
    id: "auramotion-sports",
    name: "AuraMotion Performance",
    category: "creative",
    badge: "Velocity Neon",
    description: "Forward-thrust velocity bars in neon lime on obsidian carbon black",
    colors: ["#0A0A0A", "#A3E635", "#FFFFFF", "#52525B"],
    thumbnailSvg: VECTOR_MARKS.auraVelocity,
    design: {
      format: "instagram-feed",
      title: "AuraMotion Logo",
      isLogo: true,
      background: {
        type: "solid",
        color: "#09090B",
      },
      layers: [
        {
          type: "svg",
          name: "Velocity Slanted Bars",
          svgContent: VECTOR_MARKS.auraVelocity,
          x: 430,
          y: 250,
          width: 220,
          height: 220,
        },
        {
          type: "text",
          name: "Brand Wordmark",
          content: "AuraMotion",
          x: 90,
          y: 540,
          width: 900,
          textAlign: "center",
          fontSize: 66,
          fontWeight: 900,
          letterSpacing: -0.02,
          color: "#FFFFFF",
        },
        {
          type: "text",
          name: "Tagline",
          content: "HIGH VELOCITY WEAR • EST 2026",
          x: 90,
          y: 640,
          width: 900,
          textAlign: "center",
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: 0.25,
          textTransform: "uppercase",
          color: "#A3E635",
        },
      ],
    },
  },

  {
    id: "zephyr-luxury",
    name: "Zephyr & Co. Luxury",
    category: "luxury",
    badge: "Gold Crest",
    description: "Architectural serif monogram with metallic champagne gold badge",
    colors: ["#000000", "#D4AF37", "#FDE68A", "#A1A1AA"],
    thumbnailSvg: VECTOR_MARKS.luxuryMonogramShield,
    design: {
      format: "instagram-feed",
      title: "Zephyr Luxury Logo",
      isLogo: true,
      background: {
        type: "solid",
        color: "#050505",
      },
      layers: [
        {
          type: "svg",
          name: "Gold Shield Monogram",
          svgContent: VECTOR_MARKS.luxuryMonogramShield,
          x: 440,
          y: 240,
          width: 200,
          height: 200,
        },
        {
          type: "text",
          name: "Brand Wordmark",
          content: "ZEPHYR",
          x: 90,
          y: 520,
          width: 900,
          textAlign: "center",
          fontSize: 58,
          fontWeight: 700,
          letterSpacing: 0.2,
          textTransform: "uppercase",
          color: "#FDE68A",
        },
        {
          type: "text",
          name: "Tagline",
          content: "HAUTE HORLOGERIE • GENÈVE",
          x: 90,
          y: 610,
          width: 900,
          textAlign: "center",
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: 0.32,
          textTransform: "uppercase",
          color: "#A1A1AA",
        },
      ],
    },
  },

  {
    id: "circle-digital",
    name: "Circle Labs",
    category: "minimal",
    badge: "Orbital Sphere",
    description: "Celestial glowing sphere with planetary hairline orbit and accent dot",
    colors: ["#0B0F19", "#60A5FA", "#A855F7", "#FFFFFF"],
    thumbnailSvg: VECTOR_MARKS.celestialOrbit,
    design: {
      format: "instagram-feed",
      title: "Circle Labs Logo",
      isLogo: true,
      background: {
        type: "gradient",
        gradientType: "linear",
        angle: 160,
        stops: [
          { position: 0, color: "#0F172A" },
          { position: 1, color: "#020617" },
        ],
      },
      layers: [
        {
          type: "svg",
          name: "Celestial Orbit",
          svgContent: VECTOR_MARKS.celestialOrbit,
          x: 435,
          y: 250,
          width: 210,
          height: 210,
        },
        {
          type: "text",
          name: "Brand Wordmark",
          content: "circle.",
          x: 90,
          y: 535,
          width: 900,
          textAlign: "center",
          fontSize: 68,
          fontWeight: 800,
          letterSpacing: -0.04,
          color: "#FFFFFF",
        },
        {
          type: "text",
          name: "Tagline",
          content: "INTELLIGENT NEURAL NETWORK",
          x: 90,
          y: 635,
          width: 900,
          textAlign: "center",
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: 0.24,
          textTransform: "uppercase",
          color: "#94A3B8",
        },
      ],
    },
  },

  {
    id: "borcelle-knot",
    name: "Borcelle Studio",
    category: "monogram",
    badge: "Geometric Knot",
    description: "Interlocking symmetrical diamond knot in warm desert sand palette",
    colors: ["#FAFAF9", "#D97706", "#1C1917", "#78716C"],
    thumbnailSvg: VECTOR_MARKS.interlockingKnot,
    design: {
      format: "instagram-feed",
      title: "Borcelle Studio Logo",
      isLogo: true,
      background: {
        type: "solid",
        color: "#F7F5F0",
      },
      layers: [
        {
          type: "svg",
          name: "Geometric Knot",
          svgContent: VECTOR_MARKS.interlockingKnot,
          x: 440,
          y: 250,
          width: 200,
          height: 200,
        },
        {
          type: "text",
          name: "Brand Wordmark",
          content: "BORCELLE.",
          x: 90,
          y: 520,
          width: 900,
          textAlign: "center",
          fontSize: 56,
          fontWeight: 800,
          letterSpacing: 0.16,
          textTransform: "uppercase",
          color: "#1C1917",
        },
        {
          type: "text",
          name: "Tagline",
          content: "ARCHITECTURAL INTERIORS",
          x: 90,
          y: 615,
          width: 900,
          textAlign: "center",
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: 0.3,
          textTransform: "uppercase",
          color: "#78716C",
        },
      ],
    },
  },

  {
    id: "milk-bold",
    name: "Milk Creative Co.",
    category: "minimal",
    badge: "Vermillion Minimal",
    description: "Vivid solid vermillion block with chunky organic lowercase typography",
    colors: ["#FF4500", "#FFFFFF"],
    thumbnailSvg: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" rx="20" fill="#FF4500" />
      <text x="50%" y="60%" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="60" fill="#FFFFFF">milk</text>
    </svg>`,
    design: {
      format: "instagram-feed",
      title: "Milk Creative Logo",
      isLogo: true,
      background: {
        type: "solid",
        color: "#FF4500",
      },
      layers: [
        {
          type: "text",
          name: "Main Wordmark",
          content: "milk",
          x: 90,
          y: 380,
          width: 900,
          textAlign: "center",
          fontSize: 130,
          fontWeight: 900,
          letterSpacing: -0.06,
          color: "#FFFFFF",
        },
        {
          type: "text",
          name: "Tagline",
          content: "INDEPENDENT CREATIVE LAB • EST 2026",
          x: 90,
          y: 550,
          width: 900,
          textAlign: "center",
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: 0.28,
          textTransform: "uppercase",
          color: "#FFE4E6",
        },
      ],
    },
  },

  {
    id: "studio-north-fintech",
    name: "Studio North Ventures",
    category: "corporate",
    badge: "Ascent Pillars",
    description: "Rising momentum towers with dynamic arrow peak in royal navy and orange",
    colors: ["#FFFFFF", "#1E3A8A", "#FB923C", "#64748B"],
    thumbnailSvg: VECTOR_MARKS.architecturalPillars,
    design: {
      format: "instagram-feed",
      title: "Studio North Logo",
      isLogo: true,
      background: {
        type: "solid",
        color: "#FFFFFF",
      },
      layers: [
        {
          type: "svg",
          name: "Ascent Pillars",
          svgContent: VECTOR_MARKS.architecturalPillars,
          x: 440,
          y: 240,
          width: 200,
          height: 200,
        },
        {
          type: "text",
          name: "Brand Wordmark",
          content: "Studio North",
          x: 90,
          y: 520,
          width: 900,
          textAlign: "center",
          fontSize: 60,
          fontWeight: 800,
          letterSpacing: -0.02,
          color: "#0F172A",
        },
        {
          type: "text",
          name: "Tagline",
          content: "GROWTH CAPITAL & VENTURE PARTNERS",
          x: 90,
          y: 615,
          width: 900,
          textAlign: "center",
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: 0.26,
          textTransform: "uppercase",
          color: "#64748B",
        },
      ],
    },
  },
]
