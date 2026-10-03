// Unlike layout.tsx, a template re-mounts on every navigation — which is what
// lets each page fade/slide in instead of snapping.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
