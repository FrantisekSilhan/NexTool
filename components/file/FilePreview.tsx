'use server'

import Image from 'next/image';

export default async function FilePreview({src, language, mimeType}: {
  src: string,
  language: string | null,
  mimeType: string
}) {
  if (mimeType.startsWith('image')) {
    return (
      <div className={"file-embed"} style={{
        position: "relative",
        width: "100%",
        height: "100vw",
      }}>
        <Image src={src} alt={"Preview image"} priority={true} unoptimized={mimeType === "image/gif"} sizes={"100vw"} fill style={{
          objectFit: "contain",
        }} />
      </div>
    );
  } else if (mimeType.startsWith('video')) {
    return (
      <video className={"file-embed"} controls>
        <source src={src} type={mimeType}/>
      </video>
    );
  } else if (mimeType.startsWith('audio')) {
    return (
      <audio className={"file-embed"} controls>
        <source src={src} type={mimeType}/>
      </audio>
    );
  } else if (language) {
    return (
      <div className={"file-embed"}>
        <pre className={"text-block"}>
          <code className={`language-${language}`}>{src}</code>
        </pre>
      </div>
    );
  } else {
    return (
      <p className={"file-embed"}>Preview not available for this type of file.</p>
    );
  }
}
