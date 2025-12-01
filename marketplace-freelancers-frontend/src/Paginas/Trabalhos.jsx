import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBriefcase, FaSearch, FaPlus, FaFilter, FaTimes, FaCalendar, FaDollarSign, FaClock, FaUser, FaPaperclip, FaLock, FaLayerGroup } from 'react-icons/fa';
import api from '../Servicos/Api';
import { useFetchRamos } from '../hooks/useFetchRamos';
import { UsuarioContext } from '../Contextos/UsuarioContext';
import '../styles/Trabalhos.css';

const Trabalhos = () => {
  const navigate = useNavigate();
  const { usuarioLogado } = useContext(UsuarioContext);
  
  const [trabalhos, setTrabalhos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  
  // Filtros
  const [busca, setBusca] = useState('');
  const [habilidadeFiltro, setHabilidadeFiltro] = useState('');
  const [ramoFiltro, setRamoFiltro] = useState('');
  const [filtrosAplicados, setFiltrosAplicados] = useState(false);

  // Hook personalizado para buscar ramos
  const { ramos, loadingRamos } = useFetchRamos();

  const TRABALHOS_POR_PAGINA = 6;

  useEffect(() => {
    carregarTrabalhos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginaAtual]);

  const carregarTrabalhos = async () => {
    try {
      setLoading(true);
      const offset = (paginaAtual - 1) * TRABALHOS_POR_PAGINA;
      
      let url = `/trabalhos/?limit=${TRABALHOS_POR_PAGINA}&offset=${offset}`;
      
      if (filtrosAplicados) {
        if (busca) url += `&search=${encodeURIComponent(busca)}`;
        if (habilidadeFiltro) url += `&habilidade=${encodeURIComponent(habilidadeFiltro)}`;
        if (ramoFiltro) url += `&ramo=${encodeURIComponent(ramoFiltro)}`;
      }

      const response = await api.get(url);
      
      const trabalhosFiltrados = response.data.results.filter(trabalho => 
        podeVerTrabalho(trabalho)
      );
      
      setTrabalhos(trabalhosFiltrados);
      setTotalPaginas(Math.ceil(response.data.count / TRABALHOS_POR_PAGINA));
    } catch (error) {
      console.error('Erro ao carregar trabalhos:', error);
      setTrabalhos([]);
    } finally {
      setLoading(false);
    }
  };

  const podeVerTrabalho = (trabalho) => {
    if (!trabalho.is_privado) return true;
    if (!usuarioLogado) return false;
    return trabalho.freelancer === usuarioLogado.id || 
           trabalho.contratante_id === usuarioLogado.id || 
           trabalho.cliente_id === usuarioLogado.id;
  };

  const aplicarFiltros = (e) => {
    e.preventDefault();
    setPaginaAtual(1);
    setFiltrosAplicados(true);
    carregarTrabalhos();
  };

  const limparFiltros = () => {
    setBusca('');
    setHabilidadeFiltro('');
    setRamoFiltro('');
    setFiltrosAplicados(false);
    setPaginaAtual(1);
    setTimeout(carregarTrabalhos, 100);
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  // Formatar data
  const formatarData = (dataString) => {
    if (!dataString) return "Não definido";
    
    if (dataString.includes('-') && !dataString.includes('T')) {
      const [ano, mes, dia] = dataString.split('-');
      return `${dia}/${mes}/${ano}`;
    }
    
    const dataParte = dataString.split('T')[0];
    if (dataParte) {
      const [ano, mes, dia] = dataParte.split('-');
      return `${dia}/${mes}/${ano}`;
    }
    
    const data = new Date(dataString);
    if (isNaN(data.getTime())) return "Data inválida";
    return data.toLocaleDateString('pt-BR');
  };

  const getRamoClassName = (ramoNome) => {
    if (!ramoNome) return 'ramo-default';
    
    const nome = ramoNome.toLowerCase().replace(/\s+/g, '-');
    
    if (nome.includes('backend')) return 'ramo-backend';
    if (nome.includes('frontend')) return 'ramo-frontend';
    if (nome.includes('mobile')) return 'ramo-mobile';
    if (nome.includes('ui') || nome.includes('ux')) return 'ramo-ui-ux';
    if (nome.includes('data') || nome.includes('ia')) return 'ramo-data-ia';
    if (nome.includes('devops')) return 'ramo-devops';
    
    return 'ramo-default';
  };

  const getRamoNome = (trabalho) => {
    if (trabalho.ramo_detalhes?.nome) {
      return trabalho.ramo_detalhes.nome;
    }
    if (!trabalho.ramo && !trabalho.ramo_id) return null;
    const ramoId = trabalho.ramo || trabalho.ramo_id;
    const ramoEncontrado = ramos.find(r => String(r.id) === String(ramoId));
    return ramoEncontrado ? ramoEncontrado.nome : trabalho.ramo_nome;
  };

  const getHabilidades = (trabalho) => {
    if (trabalho.habilidades_detalhes && trabalho.habilidades_detalhes.length > 0) {
      return trabalho.habilidades_detalhes.map(h => h.nome);
    }
    if (trabalho.habilidades && trabalho.habilidades.length > 0) {
      if (typeof trabalho.habilidades[0] === 'object') {
        return trabalho.habilidades.map(h => h.nome);
      }
      return trabalho.habilidades;
    }
    return [];
  };

  return (
    <div className="trabalhos-page">
      <div className="page-container">
        {/* Header */}
        <header className="trabalhos-header">
          <div className="trabalhos-title">
            <div className="trabalhos-title-icon">
              <FaBriefcase />
            </div>
            <span>Trabalhos Disponíveis</span>
          </div>
          <p className="trabalhos-subtitle">
            Explore oportunidades e encontre o projeto ideal para você
          </p>
        </header>

        {/* Filtros */}
        <div className="filtros-container">
          <form onSubmit={aplicarFiltros} className="filtros-form">
            <div className="filtros-linha-principal">
              <div className="filtro-group">
                <label className="filtro-label">Buscar por título</label>
                <div className="filtro-input-wrapper">
                  <FaSearch className="filtro-icon" />
                  <input
                    type="text"
                    className="filtro-input"
                    placeholder="Digite o título do trabalho..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </div>
              </div>

              <div className="filtro-group">
                <label className="filtro-label">Filtrar por habilidade</label>
                <select
                  className="filtro-select"
                  value={habilidadeFiltro}
                  onChange={(e) => setHabilidadeFiltro(e.target.value)}
                >
                  <option value="">Todas as habilidades</option>
                  <option value="React">React</option>
                  <option value="Python">Python</option>
                  <option value="JavaScript">JavaScript</option>
                  <option value="Node.js">Node.js</option>
                  <option value="Django">Django</option>
                  <option value="TypeScript">TypeScript</option>
                </select>
              </div>
            </div>

            <div className="filtro-group">
              <label className="filtro-label">Filtrar por ramo</label>
              <select
                className="filtro-select"
                value={ramoFiltro}
                onChange={(e) => setRamoFiltro(e.target.value)}
                disabled={loadingRamos}
              >
                <option value="">Todos os ramos</option>
                {ramos.map(ramo => (
                  <option key={ramo.id} value={ramo.id}>
                    {ramo.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="filtros-botoes">
              <button type="submit" className="btn-filtrar">
                <FaFilter /> Filtrar
              </button>
              <button type="button" className="btn-limpar" onClick={limparFiltros}>
                <FaTimes /> Limpar
              </button>
              {usuarioLogado?.tipo === 'contratante' && (
                <button
                  type="button"
                  className="btn-novo-trabalho"
                  onClick={() => navigate('/trabalhos/novo')}
                >
                  <FaPlus /> Novo Trabalho
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Grid de Trabalhos */}
        {loading ? (
          <div className="trabalhos-empty">
            <div className="empty-icon">⏳</div>
            <h3 className="empty-title">Carregando trabalhos...</h3>
          </div>
        ) : trabalhos.length === 0 ? (
          <div className="trabalhos-empty">
            <div className="empty-icon">📭</div>
            <h3 className="empty-title">Nenhum trabalho encontrado</h3>
            <p className="empty-description">
              {filtrosAplicados 
                ? 'Tente ajustar os filtros para encontrar mais resultados.'
                : 'Não há trabalhos disponíveis no momento.'}
            </p>
          </div>
        ) : (
          <>
            <div className="trabalhos-grid">
              {trabalhos.map(trabalho => {
                const habilidadesLista = getHabilidades(trabalho);
                
                return (
                  <div key={trabalho.id} className="trabalho-card">
                    <div className="trabalho-header">
                      <div className="trabalho-titulo-container">
                        {trabalho.is_privado && (
                          <span className="badge-privado-card">
                            <FaLock /> Privado
                          </span>
                        )}
                        <h3 className="trabalho-titulo">{trabalho.titulo}</h3>
                      </div>
                      <span className={`trabalho-status status-${trabalho.status.toLowerCase().replace(' ', '-')}`}>
                        {trabalho.status}
                      </span>
                    </div>

                    <div className="trabalho-body">
                      {/* RAMO/ÁREA */}
                      {getRamoNome(trabalho) && (
                        <div className={`trabalho-ramo-badge ${getRamoClassName(getRamoNome(trabalho))}`}>
                          <FaLayerGroup />
                          <span>{getRamoNome(trabalho)}</span>
                        </div>
                      )}

                      <p className="trabalho-descricao">{trabalho.descricao}</p>

                      {/* PRAZO */}
                      <div className="trabalho-info-item">
                        <FaCalendar className="trabalho-info-icon" />
                        <span className="trabalho-info-label">Prazo:</span>
                        <span className="trabalho-info-value">
                          {formatarData(trabalho.prazo)}
                        </span>
                      </div>

                      {/* ORÇAMENTO */}
                      <div className="trabalho-info-item">
                        <FaDollarSign className="trabalho-info-icon" />
                        <span className="trabalho-info-label">Orçamento:</span>
                        <span className="trabalho-orcamento">
                          {formatarMoeda(trabalho.orcamento)}
                        </span>
                      </div>

                      {/* CRIADO EM */}
                      <div className="trabalho-info-item">
                        <FaClock className="trabalho-info-icon" />
                        <span className="trabalho-info-label">Criado em:</span>
                        <span className="trabalho-info-value">
                          {formatarData(trabalho.criado_em || trabalho.data_criacao)}
                        </span>
                      </div>

                      {/* CONTRATANTE */}
                      <div className="trabalho-info-item">
                        <FaUser className="trabalho-info-icon" />
                        <span className="trabalho-info-label">Contratante:</span>
                        <span 
                          className="trabalho-contratante"
                          onClick={() => navigate(`/perfil/${trabalho.contratante_id || trabalho.cliente_id}`)}
                          style={{ cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          {trabalho.nome_contratante || trabalho.cliente_nome || 'Usuário'}
                        </span>
                      </div>

                      {/* HABILIDADES */}
                      {habilidadesLista.length > 0 && (
                        <div className="trabalho-habilidades">
                          {habilidadesLista.map((habilidade, index) => (
                            <span key={index} className="habilidade-tag">
                              {habilidade}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* ANEXO */}
                      {trabalho.anexo_url && (
                        <div className="trabalho-info-item">
                          <FaPaperclip className="trabalho-info-icon" />
                          <a 
                            href={trabalho.anexo_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="trabalho-anexo"
                          >
                            Ver anexo
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="trabalho-footer">
                      <button
                        className="btn-ver-detalhes"
                        onClick={() => navigate(`/trabalhos/detalhes/${trabalho.id}`)}
                      >
                        Ver Detalhes
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="trabalhos-pagination">
                <button
                  className="pagination-btn"
                  onClick={() => setPaginaAtual(prev => prev - 1)}
                  disabled={paginaAtual === 1}
                >
                  Anterior
                </button>

                <span className="pagination-info">
                  Página <strong>{paginaAtual}</strong> de <strong>{totalPaginas}</strong>
                </span>

                <button
                  className="pagination-btn"
                  onClick={() => setPaginaAtual(prev => prev + 1)}
                  disabled={paginaAtual === totalPaginas}
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Trabalhos;