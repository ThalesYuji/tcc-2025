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
import ChatContrato from "./Paginas/ChatContrato"; // ← import do chat

import "./App.css";

function App() {
  return (
    <UsuarioProvider>
      <Router>
        <Routes>
          {/* Rotas públicas */}
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<CadastroUsuario />} />
          <Route path="/perfil/:id" element={<PerfilPublico />} />

          {/* Rotas protegidas */}
          <Route
            path="*"
            element={
              <RotaProtegida>
                <>
                  <Navbar />
                  <div className="app-container">
                    <Routes>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/trabalhos" element={<Trabalhos />} />
                      <Route path="/trabalhos/novo" element={<CadastroTrabalho />} />
                      <Route path="/trabalhos/editar/:id" element={<EditarTrabalho />} />
                      <Route path="/trabalhos/detalhes/:id" element={<DetalhesTrabalho />} />
                      <Route path="/propostas" element={<Propostas />} />
                      <Route path="/contratos" element={<Contratos />} />
                      <Route path="/contratos/:id/pagamento" element={<PagamentoContrato />} />
                      <Route path="/contratos/:id/avaliacao" element={<AvaliacaoContrato />} />
                      <Route path="/avaliacoes" element={<MinhasAvaliacoes />} />
                      <Route path="/conta" element={<Conta />} />
                      <Route path="/denuncias/cadastrar" element={<CadastrarDenuncia />} />
                      <Route path="/painel-denuncias" element={<PainelDenuncias />} />
                      <Route path="/minhas-denuncias" element={<MinhasDenuncias />} />
                      <Route path="/notificacoes" element={<HistoricoNotificacoes />} />
                      <Route path="/contratos/:contratoId/chat" element={<ChatContrato />} />
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
