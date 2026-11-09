// Search by name, tags, format and folder name. Light stemming helps Russian
// endings: "стрелка" finds "Стрелки".
function normText(s) {
  return String(s || '').toLowerCase().replace(/ё/g, 'е');
}

function stemToken(t) {
  return t.length >= 6 ? t.slice(0, -2) : t;
}

export function searchElements(elements, folderOf, query) {
  const tokens = normText(query).split(/[\s,]+/).filter(Boolean);
  if (!tokens.length) return elements;
  return elements.filter((el) => {
    const folder = folderOf(el.folderId);
    const hay = normText([el.name, ...(el.tags || []), el.kind, folder ? folder.name : ''].join(' '));
    return tokens.every((t) => hay.includes(t) || hay.includes(stemToken(t)));
  });
}
