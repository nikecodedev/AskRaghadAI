import Image from "next/image";
import type { Locale } from "@/lib/i18n/types";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
  priority?: boolean;
};

const SIZES = {
  sm: { box: "h-11 w-11", px: 44 },
  md: { box: "h-16 w-16", px: 64 },
  lg: { box: "h-40 w-40 sm:h-48 sm:w-48 md:h-52 md:w-52", px: 208 },
} as const;

/** Monochrome logo mark matching the site's dark brand text color. */
export function BrandLogo({ size = "sm", className = "", priority = false }: BrandLogoProps) {
  const { box, px } = SIZES[size];

  return (
    <div className={`relative shrink-0 ${box} ${className}`}>
      <Image
        src="/brand/mark-dark.png"
        alt="Raghad AI"
        fill
        sizes={`${px}px`}
        className="object-contain"
        priority={priority}
      />
    </div>
  );
}

/** Client-supplied English mini-logo + wordmark, kept as one exact lockup. */
export function BrandWordmarkLockup({ className = "" }: { className?: string }) {
  return (
    <span className={`relative block aspect-[368/95] w-full ${className}`}>
      <Image
        src="/brand/lockup.png"
        alt="Raghad AI"
        fill
        sizes="(max-width: 640px) 224px, 256px"
        className="object-contain"
      />
    </span>
  );
}

/** Client-supplied standalone Raghad AI wordmark. */
export function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`relative block aspect-[250/49] w-full ${className}`}>
      <Image
        src="/brand/wordmark.png"
        alt="Raghad AI"
        fill
        sizes="216px"
        className="object-contain"
      />
    </span>
  );
}

/** Client-supplied Arabic introduction and oval flourish as one exact artwork. */
export function BrandArabicIntro({ className = "" }: { className?: string }) {
  return (
    <span className={`relative block aspect-[781/477] w-full ${className}`}>
      <Image
        src="/brand/tagline-ar-lockup.png"
        alt="دليلك الذكي لتجربة استثنائية وموثوقة في عالم الموضة، الجمال، السفر، والرفاهية."
        fill
        sizes="160px"
        className="object-contain"
      />
    </span>
  );
}

/** @deprecated Prefer BrandLogo (mark only). Kept for compatibility. */
export function BrandLockup({
  locale,
  height = 40,
  className = "",
  priority = false,
}: {
  locale: Locale;
  height?: number;
  className?: string;
  priority?: boolean;
}) {
  const px = height;
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: px, height: px }}>
      <Image
        src="/brand/mark-dark.png"
        alt={locale === "ar" ? "رغد AI" : "Raghad AI"}
        fill
        sizes={`${px}px`}
        className="object-contain"
        priority={priority}
      />
    </div>
  );
}

/** Client-supplied hero avatar with its complete, unclipped right-hand tail. */
export function BrandHeroLogo({
  locale,
  className = "",
  priority = false,
}: {
  locale: Locale;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative mx-auto aspect-[274/249] w-full ${className}`}>
      <Image
        src="/brand/logo.png"
        alt={locale === "ar" ? "رغد AI" : "Raghad AI"}
        fill
        sizes="(max-width: 640px) 208px, 240px"
        className="object-contain"
        priority={priority}
      />
    </div>
  );
}
