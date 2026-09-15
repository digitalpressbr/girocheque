import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { isOwnerEmail } from "@/lib/userIsolation";
import {
  buildInitialResponsaveis,
  normalizeResponsavelName,
  dedupeResponsaveis,
  canDeleteResponsavel,
  deleteResponsavelEntity,
} from "@/lib/responsaveis";

const OWNER_SEEDS = ["Rodrigo", "Isabela"];

async function fetchList() {
  const list = await base44.entities.Responsavel.list("nome", 200);
  return Array.isArray(list) ? list : [];
}

export function useResponsaveis() {
  const { user } = useAuth();
  const [responsaveis, setResponsaveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(false);
    try {
      let list = await fetchList();
      if (list.length === 0) {
        // releia antes de criar para evitar duplicação/race
        const reRead = await fetchList();
        if (reRead.length > 0) {
          list = reRead;
        } else {
          const seeds = isOwnerEmail(user.email)
            ? OWNER_SEEDS
            : (buildInitialResponsaveis(user)[0] ? [buildInitialResponsaveis(user)[0]] : []);
          const normalized = dedupeResponsaveis(seeds);
          if (normalized.length) {
            await base44.entities.Responsavel.bulkCreate(
              normalized.map((nome) => ({ nome, ativo: true }))
            );
            list = await fetchList();
          }
        }
      }
      setResponsaveis(list);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const ativos = responsaveis.filter((r) => r.ativo !== false);

  const add = useCallback(async (nome) => {
    const normalized = normalizeResponsavelName(nome);
    if (!normalized) return null;
    const exists = responsaveis.some(
      (r) => r.nome.toLowerCase() === normalized.toLowerCase()
    );
    if (exists) return null;
    try {
      const created = await base44.entities.Responsavel.create({ nome: normalized, ativo: true });
      await refetch();
      return created;
    } catch (e) {
      setError(true);
      return null;
    }
  }, [responsaveis, refetch]);

  const toggle = useCallback(async (id, ativo) => {
    try {
      await base44.entities.Responsavel.update(id, { ativo: !!ativo });
      await refetch();
    } catch (e) {
      setError(true);
    }
  }, [refetch]);

  const remove = useCallback(async (id) => {
    const check = canDeleteResponsavel(responsaveis, id);
    if (!check.ok) {
      throw new Error("Mantenha pelo menos um responsável ativo.");
    }
    const result = await deleteResponsavelEntity(base44, id);
    await refetch();
    return result;
  }, [responsaveis, refetch]);

  return { responsaveis, ativos, loading, error, add, toggle, remove, refetch };
}

export default useResponsaveis;