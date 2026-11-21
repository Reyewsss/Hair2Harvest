import { useEffect, useRef, useState, type ReactNode } from "react";

/* Counts numbers up to their value.
 *
 *   <AnimatedNumber value={128} />          → 0 … 128
 *   <AnimatedNumber value="1,240.5 kg" />   → keeps the comma style, 1 decimal and " kg"
 *   <AnimatedNumber value="5 of 6" />       → both numbers count together
 *
 * - First appearance counts from 0; later changes (live data) count from the old value.
 * - Anything without a number ("…", "Online", JSX) renders unchanged.
 * - Screen readers get the final value only; "reduce motion" users see it instantly.
 */

type Token = { value: number; decimals: number; grouped: boolean };

const NUMBER_RE = /-?\d[\d,]*(?:\.\d+)?/g;

function parse(text: string) {
  const parts = text.split(NUMBER_RE); // the text around the numbers
  const tokens: Token[] = (text.match(NUMBER_RE) ?? []).map((raw) => ({
    value: Number(raw.replace(/,/g, "")),
    decimals: raw.split(".")[1]?.length ?? 0,
    grouped: raw.includes(","),
  }));
  return { parts, tokens };
}

const format = (n: number, t: Token) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: t.decimals,
    maximumFractionDigits: t.decimals,
    useGrouping: t.grouped,
  });

const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function AnimatedNumber({
  value,
  duration = 1000,
  delay = 150, // lines up with the card's entrance animation
  className,
}: {
  value: ReactNode;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value : null;
  const parsed = text !== null ? parse(text) : null;
  const animatable = !!parsed && parsed.tokens.length > 0 && parsed.tokens.every((t) => Number.isFinite(t.value));

  const targets = animatable ? parsed!.tokens.map((t) => t.value) : [];
  const targetKey = targets.join("|");

  const [current, setCurrent] = useState<number[]>(() =>
    animatable && !prefersReducedMotion() ? targets.map(() => 0) : targets,
  );
  const fromRef = useRef<number[] | null>(null); // last values shown, for the next animation
  const isFirst = useRef(true);

  useEffect(() => {
    if (!animatable) return;
    const to = targetKey.split("|").map(Number);
    if (prefersReducedMotion()) {
      setCurrent(to);
      fromRef.current = to;
      return;
    }
    const from = fromRef.current && fromRef.current.length === to.length ? fromRef.current : to.map(() => 0);
    const wait = isFirst.current ? delay : 0;
    isFirst.current = false;

    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const p = Math.min(1, (now - start) / duration);
      const e = easeOutCubic(p);
      const next = to.map((t, i) => from[i] + (t - from[i]) * e);
      setCurrent(next);
      fromRef.current = next;
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    const timer = window.setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, wait);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
    // targetKey captures the numbers; the rest are stable for a given value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey, animatable]);

  if (!animatable) return <span className={className}>{value}</span>;

  const { parts, tokens } = parsed!;
  // Until the effect starts (e.g. right after "…" turns into a number), show the start value.
  const values = current.length === tokens.length ? current : tokens.map(() => 0);
  const shown = parts
    .map((part, i) => (i < tokens.length ? part + format(values[i], tokens[i]) : part))
    .join("");

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="tabular-nums">
        {shown}
      </span>
    </span>
  );
}
