// Russian typography: glue short words (prepositions, conjunctions, particles) to the next word
// with a non-breaking space, so no "в", "на", "и" is left dangling at the end of a line.
const SHORT =
  '(?:в|во|к|ко|с|со|у|о|об|от|до|на|по|за|из|не|ни|но|и|а|я|же|бы|ли|для|при|без|над|под|про|или|как|что|это|из-за)';
const GLUE = new RegExp(`(^|[\\s(«„"])(${SHORT})[ \\t]+(?=\\S)`, 'gi');
const DASH = /[ \t]+(—|–)(?=\s)/g;

export function typo(text) {
  if (!text || text.length < 3) return text;
  let out = text;
  // twice, so chains like "и в" or "не на" are glued completely
  for (let i = 0; i < 2; i++) out = out.replace(GLUE, '$1$2 ');
  return out.replace(DASH, ' $1');
}

function fixNode(node) {
  if (node.nodeType === 3) {
    const p = node.parentNode && node.parentNode.nodeName;
    if (p === 'SCRIPT' || p === 'STYLE' || p === 'TEXTAREA') return;
    const next = typo(node.nodeValue);
    if (next !== node.nodeValue) node.nodeValue = next;
  } else if (node.nodeType === 1) {
    if (node.nodeName === 'SCRIPT' || node.nodeName === 'STYLE') return;
    const ph = node.getAttribute && node.getAttribute('placeholder');
    if (ph) {
      const next = typo(ph);
      if (next !== ph) node.setAttribute('placeholder', next);
    }
    node.childNodes.forEach(fixNode);
  }
}

export function startTypography() {
  const root = document.body;
  fixNode(root);
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') fixNode(m.target);
      else if (m.type === 'attributes') fixNode(m.target);
      else m.addedNodes.forEach(fixNode);
    }
  }).observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder'] });
}
