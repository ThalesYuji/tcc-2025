# punicoes/urls.py

from django.urls import path

from .views import (
    AplicarAdvertenciaView,
    AplicarSuspensaoView,
    AplicarBanimentoView,
    RemoverSuspensaoView,
)

from .views_historico import (
    HistoricoPunicoesView,
    HistoricoPorUsuarioView,
    RemoverPunicaoView,
)

urlpatterns = [
    path("advertir/", AplicarAdvertenciaView.as_view()),
    path("suspender/", AplicarSuspensaoView.as_view()),
    path("banir/", AplicarBanimentoView.as_view()),
    path("remover-suspensao/", RemoverSuspensaoView.as_view()),

    # Histórico
    path("historico/", HistoricoPunicoesView.as_view()),
    path("historico/<int:usuario_id>/", HistoricoPorUsuarioView.as_view()),

    # Remover punição
    path("remover/<int:punicao_id>/", RemoverPunicaoView.as_view()),
]
