from django.urls import path
from .views import TrabalhoAPIView, TrabalhoDetalheAPIView

urlpatterns = [
    path('trabalhos/', TrabalhoAPIView.as_view(), name='trabalhos-lista-criacao'),
    path('trabalhos/<int:pk>/', TrabalhoDetalheAPIView.as_view(), name='trabalhos-detalhe'),
]
