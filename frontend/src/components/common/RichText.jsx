/**
 * RichText — renders markdown text with:
 * - Bold, italic, headers, bullet lists, numbered lists
 * - YouTube/Vimeo videos as embedded players
 * - Image URLs as inline images
 * - Other URLs as clickable links
 *
 * Uses react-markdown (safe — no dangerouslySetInnerHTML).
 */
import Markdown from "react-markdown";

const YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const VIMEO_REGEX = /vimeo\.com\/(\d+)/;

function getYoutubeId(url) {
  const m = url.match(YOUTUBE_REGEX);
  return m ? m[1] : null;
}

function getVimeoId(url) {
  const m = url.match(VIMEO_REGEX);
  return m ? m[1] : null;
}

// Custom link renderer — embeds YouTube/Vimeo, opens others in new tab
function LinkRenderer({ href, children }) {
  const ytId = getYoutubeId(href);
  if (ytId) {
    return (
      <div style={{ margin: "0.5rem 0" }}>
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

  const vimeoId = getVimeoId(href);
  if (vimeoId) {
    return (
      <div style={{ margin: "0.5rem 0" }}>
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

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)" }}>
      {children}
    </a>
  );
}

// Custom image renderer
function ImageRenderer({ src, alt }) {
  return (
    <img src={src} alt={alt || ""} loading="lazy"
      style={{ maxWidth: "100%", maxHeight: 400, borderRadius: "var(--radius)", border: "1px solid var(--color-border)", margin: "0.5rem 0" }} />
  );
}

// Pre-process: detect bare URLs (not already in markdown link syntax) and wrap them
function preprocessUrls(text) {
  if (!text) return "";
  // Match URLs that are NOT already inside markdown link syntax [text](url) or <url>
  return text.replace(
    /(?<!\]\()(?<!\<)(https?:\/\/[^\s<>\)]+)/g,
    (url) => `[${url.length > 70 ? url.slice(0, 67) + "..." : url}](${url})`
  );
}

export default function RichText({ text, className, style }) {
  if (!text) return null;

  const processed = preprocessUrls(text);

  return (
    <div className={`rich-text ${className || ""}`} style={style}>
      <Markdown
        components={{
          a: LinkRenderer,
          img: ImageRenderer,
        }}
      >
        {processed}
      </Markdown>
    </div>
  );
}
