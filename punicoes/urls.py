from django.urls import path
from .views import AplicarAdvertenciaView, AplicarSuspensaoView, AplicarBanimentoView, RemoverSuspensaoView

urlpatterns = [
    path("advertir/", AplicarAdvertenciaView.as_view(), name="punir-advertencia"),
    path("suspender/", AplicarSuspensaoView.as_view(), name="punir-suspensao"),
    path("banir/", AplicarBanimentoView.as_view(), name="punir-banimento"),
    path("remover-suspensao/", RemoverSuspensaoView.as_view(), name="remover-suspensao"),
]
