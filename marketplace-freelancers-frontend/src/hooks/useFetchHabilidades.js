import { useEffect, useState } from "react";
import api from "../Servicos/Api";

export function useFetchHabilidades() {
  const [habilidades, setHabilidades] = useState([]);
  const [loadingHabilidades, setLoadingHabilidades] = useState(true);

  useEffect(() => {
    async function fetchHabs() {
      try {
        const resp = await api.get("/habilidades/");
        setHabilidades(resp.data || []);
      } catch {
        setHabilidades([]);
      } finally {
        setLoadingHabilidades(false);
      }
    }

    fetchHabs();
  }, []);

  return { habilidades, loadingHabilidades };
}
