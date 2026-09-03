import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

export function HorseIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 20l1.2-6.2c.3-1.6 1-3 2.1-4.1L10 7l-1-3 2.6.4L13 3l3 1-.6 2.4c1.7.6 3 2 3.4 3.8l.7 3.3" />
      <path d="M18.5 13.5c1 .3 1.8 1.1 2 2.2l.5 2.3-2.4.3" />
      <circle cx="12.6" cy="6.3" r="0.6" fill="currentColor" />
      <path d="M8 20l.6-3M13 20l.4-2.6" />
    </svg>
  );
}

export function JockeyIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="6" r="3" />
      <path d="M12 3.2a4 4 0 0 1 4 3.6" />
      <path d="M6 21v-4a6 6 0 0 1 12 0v4" />
      <path d="M9 21v-3M15 21v-3" />
    </svg>
  );
}

export function StableIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 10.5 12 4l9 6.5" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M10 20v-6h4v6" />
    </svg>
  );
}

export function FinishFlagIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 21V4" />
      <path d="M5 4h6l-1 3h6l-1 3H9l1 3H5" />
    </svg>
  );
}
