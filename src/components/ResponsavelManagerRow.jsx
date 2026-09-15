import React, { useState } from "react";
import { Trash2 } from "lucide-react";

const EXPLICACAO_BLOQUEIO =
  "Cadastre ou ative outro responsável antes de excluir este";

export default function ResponsavelManagerRow({
  responsavel,
  canDelete = true,
  busy = false,
  onToggle,
  onDelete,
}) {
  const [open, setOpen] = useState(false);
  const nome = responsavel?.nome ?? "";
  const ativo = responsavel?.ativo !== false;
  const bloqueio = !canDelete;
  const labelExcluir = `Excluir ${nome}`;

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="min-w-0 truncate text-sm font-semibold text-[#1F2937] break-words">
          {nome}
        </p>
        <p
          className={`text-[11px] font-medium ${ativo ? "text-[#16A36A]" : "text-gray-400"}`}
        >
          {ativo ? "Ativo" : "Desativado"}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          role="switch"
          aria-checked={ativo}
          aria-label={`Ativar ou desativar ${nome}`}
          onClick={() => onToggle?.(responsavel, !ativo)}
          className="relative inline-flex h-11 min-h-11 w-11 min-w-11 items-center justify-center rounded-full transition-colors"
        >
          <span
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              ativo ? "bg-emerald-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                ativo ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </span>
        </button>

        <button
          type="button"
          disabled={bloqueio || busy}
          aria-label={labelExcluir}
          aria-description={bloqueio ? EXPLICACAO_BLOQUEIO : undefined}
          title={bloqueio ? EXPLICACAO_BLOQUEIO : undefined}
          onClick={() => { if (!bloqueio && !busy) setOpen(true); }}
          className={`inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl text-[#C2414B] border border-[#C2414B]/30 hover:bg-[#C2414B]/5 ${
            bloqueio || busy ? "opacity-40 cursor-not-allowed" : ""
          }`}
        >
          <Trash2 size={16} />
        </button>
      </div>

      <dialog
        open={open}
        className="rounded-2xl p-0 max-w-sm w-full border border-gray-200"
        onClose={() => setOpen(false)}
      >
        <div className="p-5 space-y-3">
          <h2 className="text-base font-semibold text-[#1F2937]">Excluir responsável?</h2>
          <p className="text-sm text-gray-600">
            Este nome sairá das opções de novas retiradas. Os registros antigos continuarão preservados.
          </p>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={busy}
              className="flex-1 h-11 min-h-11 min-w-11 rounded-xl border border-gray-200 text-sm font-semibold"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onDelete?.(responsavel);
                setOpen(false);
              }}
              className="flex-1 h-11 min-h-11 min-w-11 rounded-xl bg-[#C2414B] text-white text-sm font-semibold hover:bg-[#C2414B]/90"
            >
              Excluir
            </button>
          </div>
        </div>
      </dialog>
    </li>
  );
}