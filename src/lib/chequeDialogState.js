export function openChequeDialog(cheque) {
  return { open: true, cheque };
}

export function closeChequeDialog(state) {
  return { open: false, cheque: state ? state.cheque : undefined };
}