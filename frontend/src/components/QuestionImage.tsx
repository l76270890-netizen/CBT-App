import { useState } from "react";
import { resolveQuestionImageUrl } from "../api";

type Props = {
  imageUrl: string;
  className: string;
  alt?: string;
}

function candidatesFor(imageUrl: string): string[] {
  const resolved = resolveQuestionImageUrl(imageUrl);
  const withVersion = resolved.startsWith("/images/")
    ? `${resolved}${resolved.includes("?") ? "&" : "?"}v=2`
    : resolved;
  const normalized = imageUrl.replace(/^\/?uploads\/+/i, "/");
  return Array.from(new Set([withVersion, resolved, imageUrl, normalized].filter(Boolean)));
}

export default function QuestionImage({ imageUrl, className, alt = "Question diagram" }: Props) {
  const [attempt, setAttempt] = useState(0);
  const candidates = candidatesFor(imageUrl);

  if (attempt >= candidates.length) {
    return <p className={`${className} question-image-fallback`} role="status">This diagram could not be loaded.</p>;
  }

  return (
    <img
      key={`${imageUrl}-${attempt}`}
      className={className}
      src={candidates[attempt]}
      alt={alt}
      onError={() => setAttempt((value) => value + 1)}
    />
  );
}