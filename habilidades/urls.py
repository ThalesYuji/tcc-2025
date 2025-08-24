# habilidades/urls.py
from django.urls import path
from .views import HabilidadeListAPIView, HabilidadeRetrieveUpdateDestroyAPIView

urlpatterns = [
    path('habilidades/', HabilidadeListAPIView.as_view(), name='habilidade-list'),
    path('habilidades/<int:pk>/', HabilidadeRetrieveUpdateDestroyAPIView.as_view(), name='habilidade-detail'),
]
