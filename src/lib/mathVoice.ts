// Spoken math to LaTeX conversion engine for hands-free examination

export interface MathConversionResult {
  latex: string;
  displayLatex: string;
  detectedTerms: string[];
}

const GREEK_MAP: Record<string, string> = {
  alpha: "\\alpha",
  beta: "\\beta",
  gamma: "\\gamma",
  delta: "\\delta",
  epsilon: "\\epsilon",
  zeta: "\\zeta",
  eta: "\\eta",
  theta: "\\theta",
  iota: "\\iota",
  kappa: "\\kappa",
  lambda: "\\lambda",
  mu: "\\mu",
  nu: "\\nu",
  xi: "\\xi",
  pi: "\\pi",
  rho: "\\rho",
  sigma: "\\sigma",
  tau: "\\tau",
  upsilon: "\\upsilon",
  phi: "\\phi",
  chi: "\\chi",
  psi: "\\psi",
  omega: "\\omega",
  infinity: "\\infty",
};

const NUMBER_WORDS: Record<string, string> = {
  zero: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
};

/**
 * Converts a natural spoken mathematical phrase into clean LaTeX syntax.
 */
export function spokenMathToLaTeX(spoken: string): MathConversionResult {
  if (!spoken || !spoken.trim()) {
    return { latex: "", displayLatex: "", detectedTerms: [] };
  }

  let text = spoken.toLowerCase().trim();
  const detectedTerms: string[] = [];

  // Replace spoken number words with digits when surrounded by math context
  for (const [word, digit] of Object.entries(NUMBER_WORDS)) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    text = text.replace(regex, digit);
  }

  // 1. Integrals
  // "integral of [expr] dx from [a] to [b]"
  text = text.replace(
    /integral\s+(?:of\s+)?(.+?)\s+d([a-z])\s+from\s+(.+?)\s+to\s+(.+)/gi,
    (_, expr, variable, lower, upper) => {
      detectedTerms.push("definite integral");
      return `\\int_{${lower.trim()}}^{${upper.trim()}} ${expr.trim()} \\, d${variable}`;
    }
  );

  // "indefinite integral of [expr] dx" or "integral of [expr] dx"
  text = text.replace(
    /(?:indefinite\s+)?integral\s+(?:of\s+)?(.+?)\s+d([a-z])/gi,
    (_, expr, variable) => {
      detectedTerms.push("integral");
      return `\\int ${expr.trim()} \\, d${variable}`;
    }
  );

  // 2. Summations
  // "summation of [expr] from [var] equals [val] to [upper]"
  text = text.replace(
    /summation\s+(?:of\s+)?(.+?)\s+from\s+([a-z])\s*(?:equals|=)\s*([0-9a-z]+)\s+to\s+(.+)/gi,
    (_, expr, variable, lower, upper) => {
      detectedTerms.push("summation");
      const up = upper.trim() === "infinity" ? "\\infty" : upper.trim();
      return `\\sum_{${variable}=${lower}}^{${up}} ${expr.trim()}`;
    }
  );

  // 3. Limits
  // "limit as x approaches [val] of [expr]"
  text = text.replace(
    /limit\s+(?:as\s+)?([a-z])\s+(?:approaches|goes\s+to|tends\s+to)\s+(.+?)\s+of\s+(.+)/gi,
    (_, variable, val, expr) => {
      detectedTerms.push("limit");
      const v = val.trim() === "infinity" ? "\\infty" : val.trim();
      return `\\lim_{${variable} \\to ${v}} ${expr.trim()}`;
    }
  );

  // 4. Fractions
  // "fraction of [num] over [den]" or "[num] divided by [den]" or "[num] over [den]"
  text = text.replace(
    /fraction\s+(?:of\s+)?(.+?)\s+over\s+(.+)/gi,
    (_, num, den) => {
      detectedTerms.push("fraction");
      return `\\frac{${num.trim()}}{${den.trim()}}`;
    }
  );
  text = text.replace(/([0-9a-z]+)\s+over\s+([0-9a-z]+)/gi, (_, num, den) => {
    return `\\frac{${num.trim()}}{${den.trim()}}`;
  });

  // 5. Roots
  // "square root of [expr]"
  text = text.replace(/(?:square\s+root|sqrt)\s+(?:of\s+)?(.+?)(?=(?:\s+plus|\s+minus|\s+equals|\s*$)|\))/gi, (_, expr) => {
    detectedTerms.push("square root");
    return `\\sqrt{${expr.trim()}}`;
  });
  // "cube root of [expr]"
  text = text.replace(/cube\s+root\s+(?:of\s+)?(.+?)(?=(?:\s+plus|\s+minus|\s+equals|\s*$)|\))/gi, (_, expr) => {
    detectedTerms.push("cube root");
    return `\\sqrt[3]{${expr.trim()}}`;
  });

  // 6. Powers & Exponents
  text = text.replace(/([0-9a-z\)\\]+)\s+squared/gi, "$1^2");
  text = text.replace(/([0-9a-z\)\\]+)\s+cubed/gi, "$1^3");
  text = text.replace(
    /([0-9a-z\)\\]+)\s+to\s+the\s+power\s+of\s+([0-9a-z\+\-]+)/gi,
    "$1^{$2}"
  );
  text = text.replace(/([0-9a-z\)\\]+)\s+raised\s+to\s+([0-9a-z\+\-]+)/gi, "$1^{$2}");

  // 7. Subscripts
  text = text.replace(
    /([a-z])\s+sub\s+([0-9a-z\+\-]+)/gi,
    "$1_{$2}"
  );

  // 8. Trigonometry and Functions
  text = text.replace(/sine\s+(?:of\s+)?([a-z0-9\\]+)/gi, "\\sin($1)");
  text = text.replace(/cosine\s+(?:of\s+)?([a-z0-9\\]+)/gi, "\\cos($1)");
  text = text.replace(/tangent\s+(?:of\s+)?([a-z0-9\\]+)/gi, "\\tan($1)");
  text = text.replace(/sin\s+(?:of\s+)?([a-z0-9\\]+)/gi, "\\sin($1)");
  text = text.replace(/cos\s+(?:of\s+)?([a-z0-9\\]+)/gi, "\\cos($1)");
  text = text.replace(/tan\s+(?:of\s+)?([a-z0-9\\]+)/gi, "\\tan($1)");
  text = text.replace(/natural\s+log\s+(?:of\s+)?([a-z0-9\\]+)/gi, "\\ln($1)");
  text = text.replace(/log\s+base\s+([0-9a-z]+)\s+of\s+([a-z0-9\\]+)/gi, "\\log_{$1}($2)");
  text = text.replace(/log\s+(?:of\s+)?([a-z0-9\\]+)/gi, "\\log($1)");

  // 9. Relational & Operational Symbols
  text = text.replace(/\bplus\s+or\s+minus\b/gi, "\\pm");
  text = text.replace(/\bplus\b/gi, "+");
  text = text.replace(/\bminus\b/gi, "-");
  text = text.replace(/\btimes\b|\bmultiplied\s+by\b/gi, "\\times");
  text = text.replace(/\bdivided\s+by\b/gi, "\\div");
  text = text.replace(/\bequals\b|\bequal\s+to\b|\bis\s+equal\s+to\b/gi, "=");
  text = text.replace(/\bnot\s+equal\s+to\b|\bnot\s+equals\b/gi, "\\neq");
  text = text.replace(/\bgreater\s+than\s+or\s+equal\s+to\b/gi, "\\geq");
  text = text.replace(/\bless\s+than\s+or\s+equal\s+to\b/gi, "\\leq");
  text = text.replace(/\bgreater\s+than\b/gi, ">");
  text = text.replace(/\bless\s+than\b/gi, "<");
  text = text.replace(/\bapproximately\s+equals?\b/gi, "\\approx");

  // 10. Greek Letters
  for (const [name, latexSymbol] of Object.entries(GREEK_MAP)) {
    const regex = new RegExp(`\\b${name}\\b`, "gi");
    if (regex.test(text)) {
      detectedTerms.push(name);
      text = text.replace(regex, latexSymbol);
    }
  }

  // Cleanup spaces
  const cleanLatex = text.replace(/\s+/g, " ").trim();
  const displayLatex = `$$${cleanLatex}$$`;

  return {
    latex: cleanLatex,
    displayLatex,
    detectedTerms,
  };
}
