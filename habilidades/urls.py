# habilidades/urls.py
from django.urls import path
from .views import (
    HabilidadeListAPIView,
    HabilidadeRetrieveUpdateDestroyAPIView,
    RamoListAPIView,
    RamoRetrieveAPIView,
)

urlpatterns = [
    # Habilidades
    path("habilidades/", HabilidadeListAPIView.as_view(), name="habilidade-list"),
    path("habilidades/<int:pk>/", HabilidadeRetrieveUpdateDestroyAPIView.as_view(), name="habilidade-detail"),

    # Ramos (read-only)
    path("ramos/", RamoListAPIView.as_view(), name="ramo-list"),
    path("ramos/<int:pk>/", RamoRetrieveAPIView.as_view(), name="ramo-detail"),
]
