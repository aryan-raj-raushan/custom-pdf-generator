// lib/renderMath.tsx
// Parses inline LaTeX segments delimited by $...$ inside a text string and
// renders them with KaTeX. Falls back to printing the raw segment (with
// common LaTeX tokens lightly humanised) if KaTeX throws or isn't loaded.
'use client';

import React from 'react';

let katexModule: typeof import('katex') | null = null;
let katexLoadAttempted = false;

async function ensureKatex() {
  if (katexLoadAttempted) return katexModule;
  katexLoadAttempted = true;
  try {
    katexModule = await import('katex');
  } catch {
    katexModule = null;
  }
  return katexModule;
}

// Kick off the load eagerly on module init (browser only).
if (typeof window !== 'undefined') {
  void ensureKatex();
}

/** Very small fallback "renderer": strips backslashes and braces so raw
 * LaTeX source is at least legible if KaTeX isn't available, e.g.
 * "\frac{1}{2}" -> "1/2", "x^2" stays as x^2, "\sqrt{5}" -> "√5". */
function humaniseLatex(src: string): string {
  return src
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^}]*)\}/g, '√($1)')
    .replace(/\\sqrt/g, '√')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±')
    .replace(/\\cdot/g, '·')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\pi/g, 'π')
    .replace(/\\theta/g, 'θ')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\degree/g, '°')
    .replace(/\\infty/g, '∞')
    .replace(/[{}]/g, '')
    .replace(/\\/g, '');
}

interface SegmentProps {
  text: string;
  className?: string;
}

/**
 * Splits `text` on $...$ math delimiters and renders each math segment.
 * Plain segments render as-is. Use inside any preview / PDF-export node.
 */
export function MathText({ text, className }: Readonly<SegmentProps>) {
  const [ready, setReady] = React.useState(katexModule !== null);

  React.useEffect(() => {
    if (!ready) {
      ensureKatex().then((mod) => setReady(mod !== null));
    }
  }, [ready]);

  if (!text) return null;

  // Split on $...$ (non-greedy, no nested $)
  const parts = text.split(/(\$[^$]+\$)/g);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          const latex = part.slice(1, -1);
          if (ready && katexModule) {
            try {
              const html = katexModule.renderToString(latex, {
                throwOnError: false,
                displayMode: false,
              });
              return (
                <span
                  key={i}
                  className="katex-inline"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              );
            } catch {
              return (
                <span key={i} className="font-mono text-[0.95em]">
                  {humaniseLatex(latex)}
                </span>
              );
            }
          }
          return (
            <span key={i} className="font-mono text-[0.95em]">
              {humaniseLatex(latex)}
            </span>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </span>
  );
}

export default MathText;
