from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .models import Trabalho
from .serializers import TrabalhoSerializer
from notificacoes.utils import enviar_notificacao
from habilidades.models import Habilidade


class TrabalhoAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = request.user
        busca = request.query_params.get('busca', '').lower()
        habilidade_param = request.query_params.get('habilidade')  # pode ser ID ou nome
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 5))

        # 🔹 Filtra trabalhos conforme o tipo de usuário
        if usuario.tipo == 'cliente' and not usuario.is_superuser:
            trabalhos = Trabalho.objects.filter(cliente=usuario)
        else:
            trabalhos = Trabalho.objects.all()

        # 🔹 Busca por título, descrição ou habilidades
        if busca:
            trabalhos = trabalhos.filter(
                Q(titulo__icontains=busca) |
                Q(descricao__icontains=busca) |
                Q(habilidades__nome__icontains=busca)
            ).distinct()

        # 🔹 Filtro por habilidade (aceita ID ou nome)
        if habilidade_param:
            try:
                # tenta por ID
                habilidade_obj = Habilidade.objects.get(id=habilidade_param)
            except (ValueError, Habilidade.DoesNotExist):
                # tenta por nome (case insensitive)
                try:
                    habilidade_obj = Habilidade.objects.get(nome__iexact=habilidade_param)
                except Habilidade.DoesNotExist:
                    habilidade_obj = None

            if habilidade_obj:
                trabalhos = trabalhos.filter(habilidades=habilidade_obj)
            else:
                trabalhos = trabalhos.none()

        # 🔹 Ordena e pagina
        trabalhos = trabalhos.order_by('-criado_em')
        total = trabalhos.count()
        start = (page - 1) * page_size
        end = start + page_size
        trabalhos_paginados = trabalhos[start:end]

        serializer = TrabalhoSerializer(trabalhos_paginados, many=True)
        return Response({
            "results": serializer.data,
            "total": total,
            "page": page,
            "page_size": page_size,
            "num_pages": (total + page_size - 1) // page_size
        })

    def post(self, request):
        serializer = TrabalhoSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            trabalho = serializer.save()

            from usuarios.models import Usuario
            freelancers = Usuario.objects.filter(tipo='freelancer')
            for freelancer in freelancers:
                enviar_notificacao(
                    usuario=freelancer,
                    mensagem=f"Novo trabalho publicado: '{trabalho.titulo}'.",
                    link=f"/trabalhos/detalhes/{trabalho.id}"
                )

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TrabalhoDetalheAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        return get_object_or_404(Trabalho, pk=pk)

    def get(self, request, pk):
        trabalho = self.get_object(pk)
        serializer = TrabalhoSerializer(trabalho)
        return Response(serializer.data)

    def put(self, request, pk):
        trabalho = self.get_object(pk)
        if request.user != trabalho.cliente and not request.user.is_superuser:
            return Response({'erro': 'Você não tem permissão para editar este trabalho.'},
                            status=status.HTTP_403_FORBIDDEN)

        serializer = TrabalhoSerializer(trabalho, data=request.data, context={'request': request})
        if serializer.is_valid():
            trabalho_atualizado = serializer.save()

            from usuarios.models import Usuario
            freelancers = Usuario.objects.filter(tipo='freelancer')
            for freelancer in freelancers:
                enviar_notificacao(
                    usuario=freelancer,
                    mensagem=f"O trabalho '{trabalho_atualizado.titulo}' foi atualizado.",
                    link=f"/trabalhos/detalhes/{trabalho_atualizado.id}"
                )

            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        trabalho = self.get_object(pk)
        if request.user != trabalho.cliente and not request.user.is_superuser:
            return Response({'erro': 'Você não tem permissão para excluir este trabalho.'},
                            status=status.HTTP_403_FORBIDDEN)

        titulo = trabalho.titulo
        trabalho.delete()

        from usuarios.models import Usuario
        freelancers = Usuario.objects.filter(tipo='freelancer')
        for freelancer in freelancers:
            enviar_notificacao(
                usuario=freelancer,
                mensagem=f"O trabalho '{titulo}' foi removido pelo cliente.",
                link="/trabalhos"
            )

        return Response({'mensagem': 'Trabalho excluído com sucesso.'}, status=status.HTTP_204_NO_CONTENT)
