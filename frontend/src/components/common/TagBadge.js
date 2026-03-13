export default function TagBadge({ category, name, variant = "" }) {
  const className = `tag ${variant ? `tag-${variant}` : ""}`.trim();
  return (
    <span className={className} title={category}>
      {name}
    </span>
  );
}
