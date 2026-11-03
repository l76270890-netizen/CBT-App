import { useState } from "react";
import { resolveQuestionImageUrl } from "../api";

type Props = {
  imageUrl: string;
  className: string;
  alt?: string;
}

export default function QuestionImage({ imageUrl, className, alt = "Question diagram" }: Props) {
  const [failed, setFailed] = useState(false);
  if (failed) return <p className={`${className} question-image-fallback`} role="status">This diagram could not be loaded.</p>;

  return (
    <img
      className={className}
      src={resolveQuestionImageUrl(imageUrl)}
      alt={alt}
      onError={() => setFailed(true)}
    />
  );
}
