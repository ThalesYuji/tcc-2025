import { useState, useEffect } from 'react';
import api from '../Servicos/Api';

export const useFetchRamos = () => {
  const [ramos, setRamos] = useState([]);
  const [loadingRamos, setLoadingRamos] = useState(true);
  const [errorRamos, setErrorRamos] = useState(null);

  useEffect(() => {
    const fetchRamos = async () => {
      try {
        setLoadingRamos(true);
        setErrorRamos(null);
        const response = await api.get('/ramos/');
        setRamos(response.data || []);
      } catch (error) {
        console.error('Erro ao buscar ramos:', error);
        setErrorRamos('Não foi possível carregar os ramos');
        setRamos([]);
      } finally {
        setLoadingRamos(false);
      }
    };

    fetchRamos();
  }, []);

  return { ramos, loadingRamos, errorRamos };
};