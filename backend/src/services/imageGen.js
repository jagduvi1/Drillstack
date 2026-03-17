/**
 * AI diagram generation service for training drills.
 * Uses the configured text AI provider (Anthropic, OpenAI, Ollama) to generate
 * SVG tactical diagrams — no separate image generation API needed.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { completeWithDebug } = require("./ai");

const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");

const SVG_DIAGRAM_PROMPT = `You generate simple SVG drill setup diagrams for sports coaches. The goal is purely functional — show WHERE to place cones/equipment and HOW players move. It does NOT need to look pretty.

Given a drill description, generate a valid SVG showing the setup from a top-down (bird's-eye) view.

RULES:
- Output ONLY the raw SVG code — no markdown, no explanation, no code fences
- Must start with <svg and end with </svg>
- Use viewBox="0 0 800 600", white background
- Draw a simple field/area outline (rectangle or appropriate shape)
- Cones: small orange triangles (▲)
- Players: circles with labels — blue (#2563eb) for group A, red (#ef4444) for group B, green (#16a34a) for coaches
- Movement: solid arrows showing where players run
- Passing/ball: dashed arrows
- Goals/targets: simple rectangles
- Add a short legend in one corner (cone = ▲, player = ●, run = →, pass = -→)
- Title at the top
- Keep it SIMPLE — just positions, cones, and movement arrows. No decorations.
- Space elements so nothing overlaps`;

/**
 * Build a user prompt from drill data.
 */
function buildDiagramUserPrompt(drill) {
  const parts = [
    `Create a tactical diagram for: "${drill.title}"`,
    `Sport: ${drill.sport || "general"}`,
  ];

  if (drill.setup?.players) parts.push(`Players: ${drill.setup.players}`);
  if (drill.setup?.space) parts.push(`Field/space: ${drill.setup.space}`);
  if (drill.setup?.equipment?.length)
    parts.push(`Equipment: ${drill.setup.equipment.join(", ")}`);
  if (drill.howItWorks)
    parts.push(`How it works: ${drill.howItWorks.slice(0, 800)}`);
  if (drill.coachingPoints?.length)
    parts.push(`Key points: ${drill.coachingPoints.slice(0, 3).join("; ")}`);

  return parts.join("\n");
}

/**
 * Extract SVG content from AI response (handles potential wrapper text).
 */
function extractSVG(raw) {
  // Try to find SVG tags in the response
  const svgMatch = raw.match(/<svg[\s\S]*<\/svg>/i);
  if (svgMatch) return svgMatch[0];

  // If no SVG found, throw with a snippet of what was returned for debugging
  const preview = raw ? raw.slice(0, 200) : "(empty response)";
  throw new Error(`AI did not return valid SVG content. Response preview: ${preview}`);
}

/**
 * Generate a tactical diagram SVG using the configured AI provider.
 * Returns the saved file path (relative, e.g. "/uploads/diagram-xxx.svg").
 */
async function generateDiagram(drill) {
  const userPrompt = buildDiagramUserPrompt(drill);
  const { content: raw, debug } = await completeWithDebug(SVG_DIAGRAM_PROMPT, userPrompt);
  const svg = extractSVG(raw);

  // Ensure uploads dir exists
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  // Save SVG file
  const filename = `diagram-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.svg`;
  const filepath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filepath, svg, "utf-8");

  return { path: `/uploads/${filename}`, debug };
}

module.exports = { generateDiagram };
