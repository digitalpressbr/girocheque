import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet } from "lucide-react";
import { parseBRLInput } from "@/lib/formatCurrency";
import { currencyMask } from "@/lib/masks";

export default function WelcomeSetup({ onSave }) {
  const [capitalStr, setCapitalStr] = useState("");
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const capital = parseBRLInput(capitalStr);
    if (capital <= 0) return;
    setSaving(true);
    await onSave({ capital_inicial: capital, data_inicio: dataInicio });
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-700 flex items-center justify-center mb-4">
            <Wallet className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">GiroCheque</h1>
          <p className="text-gray-500 text-sm mt-1 text-center">
            Configure seu caixa para começar
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
          <div>
            <Label className="text-sm font-medium text-gray-700">Capital inicial (R$)</Label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Ex: 10.000,00"
              value={capitalStr}
              onChange={(e) => setCapitalStr(currencyMask(e.target.value))}
              className="mt-1.5 h-12 text-lg"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">Data de início</Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="mt-1.5 h-12"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || !capitalStr}
            className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-white text-base font-semibold rounded-xl"
          >
            {saving ? "Salvando..." : "Começar"}
          </Button>
        </div>
      </div>
    </div>
  );
}