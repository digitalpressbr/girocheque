import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BANCOS = [
  "Banco do Brasil",
  "Bradesco",
  "Sicoob",
  "Itaú",
  "Caixa Econômica Federal",
  "Santander",
  "Sicredi",
  "Outro",
];

export { BANCOS };

export default function BankSelect({ value, onChange, label = "Banco" }) {
  const isInList = BANCOS.includes(value);
  const selectValue = isInList ? value : "Outro";
  const isOutro = selectValue === "Outro";
  const outroText = !isInList ? value : "";

  const handleSelect = (e) => {
    const v = e.target.value;
    if (v === "Outro") {
      onChange("");
    } else {
      onChange(v);
    }
  };

  return (
    <div>
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      <select
        value={selectValue}
        onChange={handleSelect}
        className="mt-1.5 flex h-12 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
      >
        <option value="">Selecione...</option>
        {BANCOS.map((b) => (
          <option key={b} value={b}>{b}</option>
        ))}
      </select>
      {isOutro && (
        <Input
          type="text"
          placeholder="Digite o nome do banco"
          value={outroText}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 h-12"
        />
      )}
    </div>
  );
}