import { clubMarks } from "@/src/content/clubMarks";

export function ClubMark({ slug, className }: { slug: string; className?: string }) {
  const mark = clubMarks[slug];
  if (!mark) return null;

  return (
    <svg
      viewBox={mark.viewBox}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      data-club-mark={slug}
    >
      {mark.paths.map((path, index) => (
        <path
          key={index}
          d={path}
          fill="currentColor"
          stroke="currentColor"
          strokeWidth={1}
        />
      ))}
    </svg>
  );
}
