import React from "react";
import { Users } from "lucide-react";

export default function ActiveUsersSummary({ activeAdherents = [], activeAdherentsCount = 0 }) {
  const adherents = Array.isArray(activeAdherents) ? activeAdherents : [];
  const count = typeof activeAdherentsCount === "number" ? activeAdherentsCount : adherents.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-lg bg-emerald-50 px-4 py-3">
        <Users className="h-5 w-5 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex flex-col">
          <span className="text-xs text-emerald-700">Pessoas ativas</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-semibold tabular-nums text-emerald-700">{count}</span>
            <span className="text-xs text-emerald-600">além de você</span>
          </div>
        </div>
      </div>

      {count === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Nenhuma outra pessoa ativa ainda
        </div>
      ) : (
      <ul className="flex flex-col gap-2">
        {adherents.map((u) => {
          const name = (u.name || u.full_name || u.email || "").toString();
          const email = (u.email || "").toString();
          return (
            <li
              key={email || name}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"
            >
              <div className="min-w-0 flex flex-1 flex-col">
                <span className="truncate text-sm font-medium text-slate-800">{name}</span>
                <span className="block max-w-full truncate text-xs text-slate-500">{email}</span>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                Ativo
              </span>
            </li>
          );
        })}
      </ul>
      )}
    </div>
  );
}