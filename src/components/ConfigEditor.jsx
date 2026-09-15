import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseBRLInput } from "@/lib/formatCurrency";
import { currencyMask } from "@/lib/masks";

export default function ConfigEditor({ config, open, onClose, onSave }) {
  const [capitalStr, setCapitalStr] = useState(
    config ? currencyMask(config.capital_inicial) : ""
  );
  const [dataInicio, setDataInicio] = useState(config?.data_inicio || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const capital = parseBRLInput(capitalStr);
    if (capital <= 0) return;
    setSaving(true);
    await onSave({ capital_inicial: capital, data_inicio: dataInicio });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Configurações do Caixa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-sm font-medium text-gray-700">Capital inicial (R$)</Label>
            <Input
              type="text"
              inputMode="numeric"
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
            disabled={saving}
            className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl"
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}