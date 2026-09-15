// Mesmo pedido que a função detectarCheque fazia no Base44
export const DETECTAR_CHEQUE_PROMPT =
  "A imagem contém um cheque bancário brasileiro apoiado numa superfície (pode haver fundo ao redor). Identifique os QUATRO CANTOS do PAPEL do cheque:\n- superior_esquerdo: canto superior esquerdo do papel\n- superior_direito: canto superior direito do papel\n- inferior_direito: canto inferior direito do papel\n- inferior_esquerdo: canto inferior esquerdo do papel\n\nREGRA CRÍTICA: os quatro cantos devem conter o CHEQUE INTEIRO, incluindo TODAS as bordas do papel do cheque. Na dúvida, marque MAIS PARA FORA (inclua um pouco da superfície ao redor) em vez de cortar parte do cheque.\n\nRetorne as coordenadas x e y de cada canto em PORCENTAGEM de 0 a 100, onde (0,0) é o canto superior esquerdo da imagem e (100,100) é o canto inferior direito. NÃO use pixels nem escala 0-1000.\n\nSe não houver nenhum cheque visível na imagem, retorne encontrado=false.";

const ponto = { type: "object", properties: { x: { type: "number" }, y: { type: "number" } } };

export const DETECTAR_CHEQUE_SCHEMA = {
  type: "object",
  properties: {
    encontrado: { type: "boolean" },
    cantos: {
      type: "object",
      properties: {
        superior_esquerdo: ponto,
        superior_direito: ponto,
        inferior_direito: ponto,
        inferior_esquerdo: ponto,
      },
    },
  },
  required: ["encontrado"],
};
