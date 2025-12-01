from django.urls import path
from .views import (
    AplicarAdvertenciaView,
    AplicarSuspensaoView,
    AplicarBanimentoView,
    RemoverSuspensaoView,
    HistoricoPunicoesView,
    HistoricoPorUsuarioView,
    RemoverPunicaoView
)

urlpatterns = [
    path("advertir/", AplicarAdvertenciaView.as_view()),
    path("suspender/", AplicarSuspensaoView.as_view()),
    path("banir/", AplicarBanimentoView.as_view()),
    path("remover-suspensao/", RemoverSuspensaoView.as_view()),

    # 🔥 Histórico completo
    path("historico/", HistoricoPunicoesView.as_view()),

    # 🔍 Histórico por usuário específico
    path("historico/<int:usuario_id>/", HistoricoPorUsuarioView.as_view()),

    # ❌ Remover registro (delete)
    path("remover/<int:punicao_id>/", RemoverPunicaoView.as_view()),
]
