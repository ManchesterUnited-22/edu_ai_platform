const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '+': '₊', '-': '₋' };
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '-': '⁻', n: 'ⁿ' };

const map = (s, table) => [...s].map((c) => table[c] ?? c).join('');

export default function formatMath(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/\\\(([\s\S]*?)\\\)/g, '$1')
    .replace(/\\\[([\s\S]*?)\\\]/g, '$1')
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
    .replace(/\\(?:text|mathrm|mathbf|textbf)\{([^{}]*)\}/g, '$1')
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^{}]*)\}/g, '√($1)')
    .replace(/_\{([^{}]*)\}/g, (_, s) => map(s, SUB))
    .replace(/\^\{([^{}]*)\}/g, (_, s) => map(s, SUP))
    .replace(/_([0-9])/g, (_, s) => map(s, SUB))
    .replace(/\^([0-9n])/g, (_, s) => map(s, SUP))
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\rightarrow|\\to/g, '→')
    .replace(/\\leq?/g, '≤')
    .replace(/\\geq?/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\pm/g, '±')
    .replace(/\\%/g, '%');
}