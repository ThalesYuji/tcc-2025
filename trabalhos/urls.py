from django.urls import path
from .views import (
    TrabalhoAPIView,
    TrabalhoDetalheAPIView,
    TrabalhoAceitarAPIView,
    TrabalhoRecusarAPIView
)

urlpatterns = [
    path('trabalhos/', TrabalhoAPIView.as_view(), name='trabalhos-lista-criacao'),
    path('trabalhos/<int:pk>/', TrabalhoDetalheAPIView.as_view(), name='trabalhos-detalhe'),

    # 🔹 Endpoints para freelancer aceitar/recusar trabalho privado
    path('trabalhos/<int:pk>/aceitar/', TrabalhoAceitarAPIView.as_view(), name='trabalhos-aceitar'),
    path('trabalhos/<int:pk>/recusar/', TrabalhoRecusarAPIView.as_view(), name='trabalhos-recusar'),
]
