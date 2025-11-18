# habilidades/views.py
from rest_framework import generics, permissions, filters
from rest_framework.response import Response

from .models import Habilidade, Ramo
from .serializers import HabilidadeSerializer, RamoSerializer


# ==============================
# HABILIDADES
# ==============================
class HabilidadeListAPIView(generics.ListAPIView):
    """
    Lista todas as habilidades com suporte a busca e ordenação.
    Desativamos a paginação para retornar todas de uma vez.
    """
    queryset = Habilidade.objects.all()
    serializer_class = HabilidadeSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["nome", "categoria", "subcategoria"]
    ordering_fields = ["nome", "categoria", "subcategoria"]
    permission_classes = [permissions.AllowAny]
    pagination_class = None  # 🔹 Retorna tudo no mesmo GET

    def list(self, request, *args, **kwargs):
        habilidades = self.get_queryset().order_by("nome")
        serializer = self.get_serializer(habilidades, many=True)
        return Response(serializer.data)


class HabilidadeRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    Permite visualizar, editar ou excluir habilidades específicas.
    Apenas admins podem editar ou excluir.
    """
    queryset = Habilidade.objects.all()
    serializer_class = HabilidadeSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]


# ==============================
# RAMOS (READ-ONLY)
# ==============================
class RamoListAPIView(generics.ListAPIView):
    """
    Lista todos os Ramos (vocabulário controlado) para popular selects no frontend.
    Sem paginação; ordenado por nome.
    """
    queryset = Ramo.objects.all().order_by("nome")
    serializer_class = RamoSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["nome"]
    ordering_fields = ["nome"]


class RamoRetrieveAPIView(generics.RetrieveAPIView):
    """
    Retorna um Ramo específico por ID. Uso eventual para detalhes.
    """
    queryset = Ramo.objects.all()
    serializer_class = RamoSerializer
    permission_classes = [permissions.AllowAny]
