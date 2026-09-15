export function sortChequesByVencimento(items) {
  return [...items].sort((a, b) => {
    const av = a.data_vencimento;
    const bv = b.data_vencimento;
    const aHas = av && String(av).trim() !== "";
    const bHas = bv && String(bv).trim() !== "";
    if (!aHas && !bHas) return String(a.id || "").localeCompare(String(b.id || ""));
    if (!aHas) return 1;
    if (!bHas) return -1;
    if (av !== bv) return String(av).localeCompare(String(bv));
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

export function filterAndSortCheques(items, filter) {
  const statusFilter = filter === "compensados" ? "compensado" : filter;
  const selected = filter === "todos"
    ? items
    : items.filter((cheque) => cheque.status === statusFilter);
  return sortChequesByVencimento(selected);
}