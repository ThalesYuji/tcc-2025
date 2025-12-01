import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Login from "./Paginas/Login";
import Dashboard from "./Paginas/Dashboard";
import Trabalhos from "./Paginas/Trabalhos";
import CadastroTrabalho from "./Paginas/CadastroTrabalho";
import EditarTrabalho from "./Paginas/EditarTrabalho";
import DetalhesTrabalho from "./Paginas/DetalhesTrabalho";
import CadastroUsuario from "./Paginas/CadastroUsuario";
import RotaProtegida from "./Componentes/RotaProtegida";
import { UsuarioProvider } from "./Contextos/UsuarioContext";
import Propostas from "./Paginas/Propostas";
import Contratos from "./Paginas/Contratos";
import PagamentoContrato from "./Paginas/PagamentoContrato";
import AvaliacaoContrato from "./Paginas/AvaliacaoContrato";
import MinhasAvaliacoes from "./Paginas/MinhasAvaliacoes";
import Conta from "./Paginas/Conta";
import Navbar from "./Componentes/Navbar";
import PerfilPublico from "./Paginas/PerfilPublico";
import CadastrarDenuncia from "./Paginas/CadastrarDenuncia";
import PainelDenuncias from "./Paginas/PainelDenuncias";
import MinhasDenuncias from "./Paginas/MinhasDenuncias";
import HistoricoNotificacoes from "./Paginas/HistoricoNotificacoes";
import ChatContrato from "./Paginas/ChatContrato";
import HomeInicial from "./Paginas/HomeInicial";

// Recuperação de senha
import EsqueciSenha from "./Paginas/EsqueciSenha";
import ResetarSenha from "./Paginas/ResetarSenha";

// Retorno Mercado Pago
import CheckoutRetorno from "./Paginas/CheckoutRetorno";

// Toastify
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Histórico de Punições
import HistoricoPunicoes from "./Paginas/HistoricoPunicoes";

import "./App.css";

function App() {
  return (
    <UsuarioProvider>
      <Router>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          draggable
          pauseOnHover
          theme="colored"
        />

        <Routes>

          {/* ROTAS PÚBLICAS */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<CadastroUsuario />} />
          <Route path="/perfil/:id" element={<PerfilPublico />} />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
          <Route path="/reset-password/:uid/:token" element={<ResetarSenha />} />

          {/* ROTAS PROTEGIDAS */}
          <Route
            path="*"
            element={
              <RotaProtegida>
                <>
                  <Navbar />
                  <div className="app-container">
                    <Routes>

                      {/* HOME / DASHBOARD */}
                      <Route path="/home" element={<HomeInicial />} />
                      <Route path="/dashboard" element={<Dashboard />} />

                      {/* TRABALHOS */}
                      <Route path="/trabalhos" element={<Trabalhos />} />
                      <Route path="/trabalhos/novo" element={<CadastroTrabalho />} />
                      <Route path="/trabalhos/editar/:id" element={<EditarTrabalho />} />
                      <Route path="/trabalhos/detalhes/:id" element={<DetalhesTrabalho />} />

                      {/* PROPOSTAS */}
                      <Route path="/propostas" element={<Propostas />} />

                      {/* CONTRATOS */}
                      <Route path="/contratos" element={<Contratos />} />
                      <Route path="/contratos/:id/pagamento" element={<PagamentoContrato />} />
                      <Route path="/contratos/:id/avaliacao" element={<AvaliacaoContrato />} />
                      <Route path="/contratos/:contratoId/chat" element={<ChatContrato />} />

                      {/* AVALIAÇÕES */}
                      <Route path="/avaliacoes" element={<MinhasAvaliacoes />} />

                      {/* MINHA CONTA */}
                      <Route path="/conta" element={<Conta />} />

                      {/* DENÚNCIAS */}
                      <Route path="/denuncias/cadastrar" element={<CadastrarDenuncia />} />
                      <Route path="/painel-denuncias" element={<PainelDenuncias />} />
                      <Route path="/minhas-denuncias" element={<MinhasDenuncias />} />

                      {/* NOTIFICAÇÕES */}
                      <Route path="/notificacoes" element={<HistoricoNotificacoes />} />

                      {/* MERCADO PAGO */}
                      <Route path="/checkout/retorno" element={<CheckoutRetorno />} />

                      {/* HISTÓRICO DE PUNIÇÕES */}
                      <Route path="/historico-punicoes" element={<HistoricoPunicoes />} />

                      {/* CASO A ROTA NÃO EXISTA */}
                      <Route path="*" element={<Navigate to="/home" replace />} />

                    </Routes>
                  </div>
                </>
              </RotaProtegida>
            }
          />
        </Routes>
      </Router>
    </UsuarioProvider>
  );
}

export default App;
