import { describe, it, expect } from "vitest";
import { getChequePrivateFileUris, mergeChequePrivateFileUris } from "./chequePrivateFiles";

describe("getChequePrivateFileUris", () => {
  it("retorna somente foto_uri e foto_uri_2 válidos, em ordem, sem duplicar", () => {
    const cheque = { foto_uri: "uri1", foto_uri_2: "uri2" };
    expect(getChequePrivateFileUris(cheque)).toEqual(["uri1", "uri2"]);
  });

  it("ignora foto_url/foto_url_2 públicos", () => {
    const cheque = { foto_url: "public1", foto_url_2: "public2", foto_uri: "uri1" };
    expect(getChequePrivateFileUris(cheque)).toEqual(["uri1"]);
  });

  it("ignora valores vazios/nulos/undefined", () => {
    const cheque = { foto_uri: "", foto_uri_2: null };
    expect(getChequePrivateFileUris(cheque)).toEqual([]);
  });
});

describe("mergeChequePrivateFileUris", () => {
  it("preserva primeira foto ao adicionar a segunda", () => {
    const cheque = { foto_uri: "uri1" };
    const result = mergeChequePrivateFileUris(cheque, "uri2");
    expect(result).toEqual({ foto_uri: "uri1", foto_uri_2: "uri2" });
  });

  it("troca da primeira foto mantém a segunda", () => {
    const cheque = { foto_uri: "uri1", foto_uri_2: "uri2" };
    const result = mergeChequePrivateFileUris(cheque, "uri3", { slot: 1 });
    expect(result).toEqual({ foto_uri: "uri3", foto_uri_2: "uri2" });
  });
});

describe("imutabilidade", () => {
  it("getChequePrivateFileUris não muta o cheque recebido", () => {
    const cheque = { foto_uri: "uri1", foto_uri_2: "uri2" };
    const snapshot = { ...cheque };
    getChequePrivateFileUris(cheque);
    expect(cheque).toEqual(snapshot);
  });

  it("mergeChequePrivateFileUris não muta o cheque recebido", () => {
    const cheque = { foto_uri: "uri1" };
    const snapshot = { ...cheque };
    mergeChequePrivateFileUris(cheque, "uri2");
    expect(cheque).toEqual(snapshot);
  });
});