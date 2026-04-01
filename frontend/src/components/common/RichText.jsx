/**
 * RichText — renders plain text with auto-detected URLs as:
 * - YouTube/Vimeo videos as embedded players
 * - Image URLs (.jpg, .png, .gif, .webp) as inline images
 * - Other URLs as clickable links
 */

const URL_REGEX = /(https?:\/\/[^\s<]+)/g;

const YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const VIMEO_REGEX = /vimeo\.com\/(\d+)/;
const IMAGE_REGEX = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;

function getYoutubeId(url) {
  const m = url.match(YOUTUBE_REGEX);
  return m ? m[1] : null;
}

function getVimeoId(url) {
  const m = url.match(VIMEO_REGEX);
  return m ? m[1] : null;
}

function isImageUrl(url) {
  return IMAGE_REGEX.test(url);
}

function UrlEmbed({ url }) {
  const ytId = getYoutubeId(url);
  if (ytId) {
    return (
      <div className="rich-embed rich-embed-video">
        <iframe
          src={`https://www.youtube.com/embed/${ytId}`}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ width: "100%", maxWidth: 560, height: 315, border: "none", borderRadius: "var(--radius)" }}
        />
      </div>
    );
  }

  const vimeoId = getVimeoId(url);
  if (vimeoId) {
    return (
      <div className="rich-embed rich-embed-video">
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}`}
          title="Vimeo video"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          style={{ width: "100%", maxWidth: 560, height: 315, border: "none", borderRadius: "var(--radius)" }}
        />
      </div>
    );
  }

  if (isImageUrl(url)) {
    return (
      <div className="rich-embed rich-embed-image">
        <img src={url} alt="" loading="lazy"
          style={{ maxWidth: "100%", maxHeight: 400, borderRadius: "var(--radius)", border: "1px solid var(--color-border)" }} />
      </div>
    );
  }

  // Regular link
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="rich-link">
      {url.length > 60 ? url.slice(0, 57) + "..." : url}
    </a>
  );
}

export default function RichText({ text, className, style }) {
  if (!text) return null;

  // Split text by URLs, keeping the URLs as separate parts
  const parts = [];
  let lastIndex = 0;
  let match;

  const regex = new RegExp(URL_REGEX.source, "g");
  while ((match = regex.exec(text)) !== null) {
    // Text before the URL
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: "url", content: match[0] });
    lastIndex = match.index + match[0].length;
  }
  // Remaining text
  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  // If no URLs found, just render as plain text
  if (parts.length === 0 || (parts.length === 1 && parts[0].type === "text")) {
    return <p className={className} style={{ whiteSpace: "pre-wrap", ...style }}>{text}</p>;
  }

  return (
    <div className={className} style={{ whiteSpace: "pre-wrap", ...style }}>
      {parts.map((part, i) =>
        part.type === "url" ? <UrlEmbed key={i} url={part.content} /> : <span key={i}>{part.content}</span>
      )}
    </div>
  );
}
