/**
 * The Sysd mark: an S drawn as the right-angle connector used on the canvas, with a dot where a request
 * enters and a dot where it leaves. Colours are fixed so it looks the same in light and dark.
 */
export function Logo({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Sysd" fill="none">
      <rect x="1" y="1" width="30" height="30" rx="9" fill="#F0D7FF" stroke="#1A1A1A" strokeWidth="2" />
      <path d="M21.5 9.5H13.5A3 3 0 0 0 10.5 12.5V13A3 3 0 0 0 13.5 16H18.5A3 3 0 0 1 21.5 19V19.5A3 3 0 0 1 18.5 22.5H10.5" stroke="#1A1A1A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="21.5" cy="9.5" r="2.3" fill="#1A1A1A" />
      <circle cx="10.5" cy="22.5" r="2.3" fill="#1A1A1A" />
    </svg>
  );
}
