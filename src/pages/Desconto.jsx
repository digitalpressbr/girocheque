import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { formatBRL, parseBRLInput, formatPercent } from "@/lib/formatCurrency";
import { currencyMask, phoneMask, percentMask } from "@/lib/masks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Check } from "lucide-react";
import ChequeScanner from "@/components/ChequeScanner";
import { useToast } from "@/components/ui/use-toast";
import BankSelect from "@/components/BankSelect";

function diasEntre(dataInicio, dataFim) {
  if (!dataInicio || !dataFim) return 0;
  const [yi, mi, di] = dataInicio.split("-").map(Number);
  const [yf, mf, df] = dataFim.split("-").map(Number);
  const ini = new Date(yi, mi - 1, di);
  const fim = new Date(yf, mf - 1, df);
  const diff = fim.getTime() - ini.getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

function somarDias(dataStr, dias) {
  if (!dataStr) return "";
  const [y, m, d] = dataStr.split("-").map(Number);
  const data = new Date(y, m - 1, d);
  data.setDate(data.getDate() + dias);
  const yy = data.getFullYear();
  const mm = String(data.getMonth() + 1).padStart(2, "0");
  const dd = String(data.getDate()).padStart(2, "0");
  return yy + "-" + mm + "-" + dd;
}

function formatDateBR(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return d + "/" + m + "/" + y;
}

export default function Desconto() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [modo, setModo] = useState("unica");
  const [valorStr, setValorStr] = useState("");
  const [taxaStr, setTaxaStr] = useState("");
  const [subModoUnica, setSubModoUnica] = useState("taxa");
  const [transferirStr, setTransferirStr] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [emitente, setEmitente] = useState("");
  const [banco, setBanco] = useState("");
  const [contato, setContato] = useState("");
  const [telefone, setTelefone] = useState("");
  const [observacao, setObservacao] = useState("");
  const [dataCaptacao, setDataCaptacao] = useState(new Date().toISOString().split("T")[0]);
  const [dataVencimento, setDataVencimento] = useState("");
  const [unidadePrazo, setUnidadePrazo] = useState("meses");
  const [prazoStr, setPrazoStr] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [foto, setFoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const autoBlurTimer = useRef(null);

  const valor = parseBRLInput(valorStr);
  const taxaInformada = parseFloat(taxaStr.replace(",", ".")) || 0;
  const transferirInformado = parseBRLInput(transferirStr);

  // Modo taxa única
  const usarSubTransferir = modo === "unica" && subModoUnica === "transferir";
  const transferirInvalido = usarSubTransferir && valor > 0 && transferirInformado >= valor;
  const lucro = usarSubTransferir
    ? (transferirInformado < valor ? valor - transferirInformado : 0)
    : valor * taxaInformada / 100;
  const transferir = usarSubTransferir ? transferirInformado : valor - lucro;
  const taxa = usarSubTransferir
    ? (valor > 0 && transferirInformado < valor ? (lucro / valor) * 100 : 0)
    : taxaInformada;

  // Modo taxa ao mês (juros compostos)
  const prazoNum = parseInt(prazoStr.replace(/\D/g, ""), 10) || 0;
  const diasDataFinal = unidadePrazo === "data_final" ? diasEntre(dataCaptacao, dataFinal) : 0;
  const diasPrazo = unidadePrazo === "meses" ? prazoNum * 30 : unidadePrazo === "dias" ? prazoNum : diasDataFinal;
  const prazoValido = unidadePrazo === "data_final" ? diasDataFinal > 0 : prazoNum > 0;
  const expMensal = diasPrazo / 30;
  const totalMensal = valor > 0 && taxa > 0 && prazoValido ? valor * Math.pow(1 + taxa / 100, expMensal) : 0;
  const jurosMensal = totalMensal - valor;
  const percentualPeriodo = valor > 0 ? (jurosMensal / valor) * 100 : 0;
  const dataVencimentoCalc = unidadePrazo === "data_final"
    ? dataFinal
    : (modo === "mensal" && valor > 0 && taxa > 0 && prazoValido && dataCaptacao)
      ? somarDias(dataCaptacao, diasPrazo)
      : "";

  const canCalculate = modo === "unica"
    ? (valor > 0 && taxa > 0 && !transferirInvalido)
    : (valor > 0 && taxa > 0 && prazoValido);

  useEffect(() => {
    if (autoBlurTimer.current) clearTimeout(autoBlurTimer.current);
    if (canCalculate) {
      autoBlurTimer.current = setTimeout(() => {
        if (document.activeElement && document.activeElement.blur) {
          document.activeElement.blur();
        }
      }, 1500);
    }
    return () => { if (autoBlurTimer.current) clearTimeout(autoBlurTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valorStr, taxaStr, transferirStr, prazoStr, dataFinal, canCalculate]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "Done") {
      e.target.blur();
    }
  };

  const switchModo = (m) => {
    setModo(m);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!emitente || valor <= 0 || taxa <= 0) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (modo === "unica" && !dataVencimento) {
      toast({ title: "Preencha a data de vencimento", variant: "destructive" });
      return;
    }
    if (modo === "mensal" && (!dataCaptacao || !prazoValido)) {
      toast({ title: "Preencha a data do empréstimo e o prazo", variant: "destructive" });
      return;
    }
    setSaving(true);
    let fotoUri = "";
    if (foto) {
      const res = await base44.integrations.Core.UploadPrivateFile({ file: foto });
      fotoUri = res.file_uri;
    }
    if (modo === "unica") {
      await base44.entities.Cheque.create({
        tipo_taxa: "unica",
        valor_cheque: valor,
        taxa_percentual: taxa,
        valor_lucro: lucro,
        valor_transferido: transferir,
        emitente,
        banco,
        contato,
        telefone_contato: telefone,
        observacao,
        data_captacao: dataCaptacao,
        data_vencimento: dataVencimento,
        status: "em_aberto",
        foto_uri: fotoUri,
      });
      toast({ title: "Cheque registrado!", description: formatBRL(transferir) + " a transferir" });
    } else {
      await base44.entities.Cheque.create({
        tipo_taxa: "mensal",
        valor_cheque: totalMensal,
        taxa_percentual: taxa,
        valor_lucro: jurosMensal,
        valor_transferido: valor,
        emitente,
        banco,
        contato,
        telefone_contato: telefone,
        observacao,
        data_captacao: dataCaptacao,
        data_vencimento: dataVencimentoCalc,
        status: "em_aberto",
        foto_uri: fotoUri,
      });
      toast({ title: "Empréstimo registrado!", description: formatBRL(totalMensal) + " a receber" });
    }
    setSaving(false);
    navigate("/");
  };

  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-bold text-gray-900 mb-4">
        {modo === "unica" ? "Calculadora de Desconto" : "Calculadora de Empréstimo"}
      </h1>

      {/* Segmented control */}
      <div className="flex bg-slate-100 rounded-xl p-2 gap-2 mb-3">
        <button
          type="button"
          aria-pressed={modo === "unica"}
          onClick={() => switchModo("unica")}
          className={`flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-lg border text-sm font-medium whitespace-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600 ${
            modo === "unica"
              ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
              : "bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100"
          }`}
        >
          {modo === "unica" && <Check size={15} className="shrink-0" />}
          Taxa única
        </button>
        <button
          type="button"
          aria-pressed={modo === "mensal"}
          onClick={() => switchModo("mensal")}
          className={`flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-lg border text-sm font-medium whitespace-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600 ${
            modo === "mensal"
              ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
              : "bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100"
          }`}
        >
          {modo === "mensal" && <Check size={15} className="shrink-0" />}
          Taxa ao mês
        </button>
      </div>

      {/* Campos da calculadora */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-3 space-y-4">
        <div>
          <Label className="text-sm font-medium text-gray-700">
            {modo === "unica" ? "Valor do cheque (R$)" : "Valor emprestado (R$)"}
          </Label>
          <Input
            type="text"
            inputMode="numeric"
            enterKeyHint="done"
            placeholder="0,00"
            value={valorStr}
            onChange={(e) => setValorStr(currencyMask(e.target.value))}
            onKeyDown={handleKeyDown}
            className="mt-1.5 h-12 text-lg"
          />
        </div>
        {modo === "unica" && (
          <div className="flex bg-slate-100 rounded-lg p-2 gap-2">
            <button
              type="button"
              aria-pressed={subModoUnica === "taxa"}
              onClick={() => setSubModoUnica("taxa")}
              className={`flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-md border text-xs font-medium whitespace-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600 ${
                subModoUnica === "taxa"
                  ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                  : "bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100"
              }`}
            >
              {subModoUnica === "taxa" && <Check size={13} className="shrink-0" />}
              Informar taxa (%)
            </button>
            <button
              type="button"
              aria-pressed={subModoUnica === "transferir"}
              onClick={() => setSubModoUnica("transferir")}
              className={`flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-md border text-xs font-medium whitespace-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600 ${
                subModoUnica === "transferir"
                  ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                  : "bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100"
              }`}
            >
              {subModoUnica === "transferir" && <Check size={13} className="shrink-0" />}
              Informar valor a transferir
            </button>
          </div>
        )}
        {modo === "mensal" || subModoUnica === "taxa" ? (
          <div>
            <Label className="text-sm font-medium text-gray-700">
              {modo === "unica" ? "Taxa (%)" : "Taxa ao mês (%)"}
            </Label>
            <div className="relative mt-1.5">
              <Input
                type="text"
                inputMode="decimal"
                enterKeyHint="done"
                placeholder="0,0"
                value={taxaStr}
                onChange={(e) => setTaxaStr(percentMask(e.target.value))}
                onKeyDown={handleKeyDown}
                className="h-12 text-lg pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-gray-400 pointer-events-none">%</span>
            </div>
          </div>
        ) : (
          <div>
            <Label className="text-sm font-medium text-gray-700">Valor a transferir (R$)</Label>
            <Input
              type="text"
              inputMode="numeric"
              enterKeyHint="done"
              placeholder="0,00"
              value={transferirStr}
              onChange={(e) => setTransferirStr(currencyMask(e.target.value))}
              onKeyDown={handleKeyDown}
              className="mt-1.5 h-12 text-lg"
            />
            {transferirInvalido && (
              <p className="text-xs text-red-500 mt-1">Valor a transferir deve ser menor que o cheque</p>
            )}
          </div>
        )}
        {modo === "mensal" && (
          <>
            <div>
              <Label className="text-sm font-medium text-gray-700">Data do empréstimo</Label>
              <Input
                type="date"
                value={dataCaptacao}
                onChange={(e) => setDataCaptacao(e.target.value)}
                className="mt-1.5 h-12"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Prazo</Label>
              <div className="flex gap-2 mt-1.5">
                <div className="flex bg-slate-100 rounded-lg p-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={unidadePrazo === "meses"}
                    onClick={() => setUnidadePrazo("meses")}
                    className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-medium whitespace-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600 ${
                      unidadePrazo === "meses"
                        ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                        : "bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100"
                    }`}
                  >
                    {unidadePrazo === "meses" && <Check size={13} className="shrink-0" />}
                    Meses
                  </button>
                  <button
                    type="button"
                    aria-pressed={unidadePrazo === "dias"}
                    onClick={() => setUnidadePrazo("dias")}
                    className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-medium whitespace-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600 ${
                      unidadePrazo === "dias"
                        ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                        : "bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100"
                    }`}
                  >
                    {unidadePrazo === "dias" && <Check size={13} className="shrink-0" />}
                    Dias
                  </button>
                  <button
                    type="button"
                    aria-pressed={unidadePrazo === "data_final"}
                    onClick={() => setUnidadePrazo("data_final")}
                    className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-medium whitespace-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600 ${
                      unidadePrazo === "data_final"
                        ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                        : "bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100"
                    }`}
                  >
                    {unidadePrazo === "data_final" && <Check size={13} className="shrink-0" />}
                    Data final
                  </button>
                </div>
                {unidadePrazo === "data_final" ? (
                  <Input
                    type="date"
                    value={dataFinal}
                    onChange={(e) => setDataFinal(e.target.value)}
                    className="flex-1 h-12"
                  />
                ) : (
                  <Input
                    type="text"
                    inputMode="numeric"
                    enterKeyHint="done"
                    placeholder="0"
                    value={prazoStr}
                    onChange={(e) => setPrazoStr(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={handleKeyDown}
                    className="flex-1 h-12 text-lg"
                  />
                )}
              </div>
              {unidadePrazo === "data_final" && dataFinal && diasDataFinal <= 0 && (
                <p className="text-xs text-amber-600 mt-1">A data final deve ser posterior à data do empréstimo</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Resultado */}
      {canCalculate && modo === "unica" && subModoUnica === "taxa" && (
        <div className="bg-emerald-50 rounded-xl p-3 mb-3 border border-emerald-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Ganho</p>
              <p className="text-sm font-semibold text-emerald-700">{formatBRL(lucro)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Transferir</p>
              <p className="text-lg font-bold text-emerald-800 whitespace-nowrap">{formatBRL(transferir)}</p>
            </div>
          </div>
        </div>
      )}

      {canCalculate && modo === "unica" && subModoUnica === "transferir" && (
        <div className="bg-emerald-50 rounded-xl p-4 mb-3 border border-emerald-100 space-y-3">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Seu ganho</p>
            <p className="text-sm font-semibold text-emerald-700">{formatBRL(lucro)}</p>
          </div>
          <div className="border-t border-emerald-200 pt-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Taxa</p>
            <p className="text-2xl font-bold text-emerald-800 whitespace-nowrap">{formatPercent(taxa)}</p>
          </div>
        </div>
      )}

      {canCalculate && modo === "mensal" && (
        <div className="bg-emerald-50 rounded-xl p-4 mb-3 border border-emerald-100 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Prazo</p>
            <p className="text-sm font-semibold text-gray-700">{diasPrazo} dias</p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Juros no período</p>
              <p className="text-sm font-semibold text-emerald-700 whitespace-nowrap">{formatBRL(jurosMensal)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">% no período</p>
              <p className="text-sm font-semibold text-emerald-700 whitespace-nowrap">{formatPercent(percentualPeriodo)}</p>
            </div>
          </div>
          <div className="border-t border-emerald-200 pt-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Total a receber no vencimento</p>
            <p className="text-2xl font-bold text-emerald-800 whitespace-nowrap">{formatBRL(totalMensal)}</p>
          </div>
          <div className="border-t border-emerald-200 pt-3 flex items-center justify-between">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Vencimento</p>
            <p className="text-sm font-semibold text-gray-700">{formatDateBR(dataVencimentoCalc)}</p>
          </div>
        </div>
      )}

      {!showForm ? (
        <Button
          onClick={() => setShowForm(true)}
          disabled={!canCalculate}
          className="w-full h-14 bg-emerald-700 hover:bg-emerald-800 text-white text-base font-semibold rounded-xl shadow-md flex items-center justify-center gap-2"
        >
          {modo === "unica" ? "Registrar cheque" : "Registrar empréstimo"}
          <ArrowRight size={18} />
        </Button>
      ) : (
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4 mb-4">
          <h2 className="text-base font-semibold text-gray-800">
            {modo === "unica" ? "Dados do cheque" : "Dados do empréstimo"}
          </h2>
          <div>
            <Label className="text-sm font-medium text-gray-700">Nome (quem entregou o cheque)</Label>
            <Input
              type="text"
              placeholder="Ex: João Silva"
              value={emitente}
              onChange={(e) => setEmitente(e.target.value)}
              className="mt-1.5 h-12"
            />
          </div>
          <BankSelect value={banco} onChange={setBanco} />
          <div>
            <Label className="text-sm font-medium text-gray-700">Contato (quem cobrar)</Label>
            <Input
              type="text"
              placeholder="Ex: Maria Santos"
              value={contato}
              onChange={(e) => setContato(e.target.value)}
              className="mt-1.5 h-12"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">Telefone do contato</Label>
            <Input
              type="text"
              inputMode="tel"
              placeholder="(00) 00000-0000"
              value={telefone}
              onChange={(e) => setTelefone(phoneMask(e.target.value))}
              className="mt-1.5 h-12"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">Observação</Label>
            <Textarea
              placeholder="Notas adicionais..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="mt-1.5 min-h-[60px] resize-none"
              rows={2}
            />
          </div>
          {modo === "unica" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium text-gray-700">Data captação</Label>
                <Input
                  type="date"
                  value={dataCaptacao}
                  onChange={(e) => setDataCaptacao(e.target.value)}
                  className="mt-1.5 h-12"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Vencimento</Label>
                <Input
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  className="mt-1.5 h-12"
                />
              </div>
            </div>
          )}
          <ChequeScanner file={foto} onFileSelected={setFoto} />

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-14 bg-emerald-700 hover:bg-emerald-800 text-white text-base font-semibold rounded-xl shadow-md"
          >
            {saving ? "Salvando..." : modo === "unica" ? "Salvar cheque" : "Salvar empréstimo"}
          </Button>
        </div>
      )}
    </div>
  );
}