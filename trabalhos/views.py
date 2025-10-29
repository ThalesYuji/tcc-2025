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
        """
        Lista trabalhos com filtros e paginação.
        Inclui:
        - Busca textual
        - Filtro por habilidade
        - Paginação manual
        - Ordenação garantida (corrige erro 500)
        """
        usuario = request.user
        busca = request.query_params.get("busca", "").lower()
        habilidade_param = request.query_params.get("habilidade")
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 6))

        # 🔹 Base de trabalhos conforme o tipo de usuário
        if usuario.is_superuser:
            trabalhos = Trabalho.objects.all()
        elif usuario.tipo == "contratante":
            trabalhos = Trabalho.objects.filter(contratante=usuario)
        else:  # freelancer
            trabalhos = Trabalho.objects.filter(
                Q(is_privado=False) | Q(freelancer=usuario)
            )

        # 🔹 Busca textual
        if busca:
            trabalhos = trabalhos.filter(
                Q(titulo__icontains=busca)
                | Q(descricao__icontains=busca)
                | Q(habilidades__nome__icontains=busca)
            ).distinct()

        # 🔹 Filtro por habilidade
        if habilidade_param:
            try:
                habilidade_obj = Habilidade.objects.get(id=habilidade_param)
            except (ValueError, Habilidade.DoesNotExist):
                habilidade_obj = Habilidade.objects.filter(
                    nome__iexact=habilidade_param
                ).first()

            if habilidade_obj:
                trabalhos = trabalhos.filter(habilidades=habilidade_obj)
            else:
                trabalhos = trabalhos.none()

        # ✅ Ordenação obrigatória (evita erro 500)
        trabalhos = trabalhos.order_by("-criado_em", "-id")

        # 🔹 Paginação manual
        total = trabalhos.count()
        start = (page - 1) * page_size
        end = start + page_size
        trabalhos_paginados = trabalhos[start:end]

        serializer = TrabalhoSerializer(trabalhos_paginados, many=True)
        return Response(
            {
                "results": serializer.data,
                "total": total,
                "page": page,
                "page_size": page_size,
                "num_pages": (total + page_size - 1) // page_size,
            }
        )

    def post(self, request):
        """
        Cria um novo trabalho e dispara notificações.
        """
        serializer = TrabalhoSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            trabalho = serializer.save()
            from usuarios.models import Usuario

            # 🔹 Envio de notificações
            if trabalho.is_privado and trabalho.freelancer:
                enviar_notificacao(
                    usuario=trabalho.freelancer,
                    mensagem=f"Você recebeu uma proposta de trabalho privado: '{trabalho.titulo}'.",
                    link=f"/trabalhos/detalhes/{trabalho.id}",
                )
            else:
                freelancers = Usuario.objects.filter(tipo="freelancer")
                for freelancer in freelancers:
                    enviar_notificacao(
                        usuario=freelancer,
                        mensagem=f"Novo trabalho publicado: '{trabalho.titulo}'.",
                        link=f"/trabalhos/detalhes/{trabalho.id}",
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

        if request.user != trabalho.contratante and not request.user.is_superuser:
            return Response(
                {"erro": "Você não tem permissão para editar este trabalho."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = TrabalhoSerializer(
            trabalho, data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            trabalho_atualizado = serializer.save()
            from usuarios.models import Usuario

            # 🔹 Notificações de atualização
            if trabalho_atualizado.is_privado and trabalho_atualizado.freelancer:
                enviar_notificacao(
                    usuario=trabalho_atualizado.freelancer,
                    mensagem=f"A proposta privada '{trabalho_atualizado.titulo}' foi atualizada.",
                    link=f"/trabalhos/detalhes/{trabalho_atualizado.id}",
                )
            else:
                freelancers = Usuario.objects.filter(tipo="freelancer")
                for freelancer in freelancers:
                    enviar_notificacao(
                        usuario=freelancer,
                        mensagem=f"O trabalho '{trabalho_atualizado.titulo}' foi atualizado.",
                        link=f"/trabalhos/detalhes/{trabalho_atualizado.id}",
                    )

            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        trabalho = self.get_object(pk)

        if request.user != trabalho.contratante and not request.user.is_superuser:
            return Response(
                {"erro": "Você não tem permissão para excluir este trabalho."},
                status=status.HTTP_403_FORBIDDEN,
            )

        titulo = trabalho.titulo
        is_privado = trabalho.is_privado
        freelancer_destino = trabalho.freelancer
        trabalho.delete()

        from usuarios.models import Usuario
        if is_privado and freelancer_destino:
            enviar_notificacao(
                usuario=freelancer_destino,
                mensagem=f"O trabalho privado '{titulo}' foi removido pelo contratante.",
                link="/trabalhos",
            )
        else:
            freelancers = Usuario.objects.filter(tipo="freelancer")
            for freelancer in freelancers:
                enviar_notificacao(
                    usuario=freelancer,
                    mensagem=f"O trabalho '{titulo}' foi removido pelo contratante.",
                    link="/trabalhos",
                )

        return Response(
            {"mensagem": "Trabalho excluído com sucesso."},
            status=status.HTTP_204_NO_CONTENT,
        )


# 🔹 Aceitar trabalho privado → cria contrato automaticamente
class TrabalhoAceitarAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from contratos.models import Contrato
        from propostas.models import Proposta

        trabalho = get_object_or_404(Trabalho, pk=pk)

        if not trabalho.is_privado or request.user != trabalho.freelancer:
            return Response(
                {"erro": "Você não tem permissão para aceitar este trabalho."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Atualiza status
        trabalho.status = "em_andamento"
        trabalho.save()

        proposta = Proposta.objects.filter(
            trabalho=trabalho, freelancer=request.user
        ).first()

        contrato = Contrato.objects.create(
            proposta=proposta if proposta else None,
            trabalho=trabalho,
            contratante=trabalho.contratante,
            freelancer=request.user,
            valor=proposta.valor if proposta else trabalho.orcamento,
            status="ativo",
        )

        # Notificações
        enviar_notificacao(
            usuario=trabalho.contratante,
            mensagem=f"O freelancer aceitou o trabalho privado: '{trabalho.titulo}'. O contrato foi criado automaticamente.",
            link=f"/contratos/{contrato.id}",
        )
        enviar_notificacao(
            usuario=request.user,
            mensagem=f"Você aceitou o trabalho '{trabalho.titulo}'. O contrato foi criado automaticamente.",
            link=f"/contratos/{contrato.id}",
        )

        return Response(
            {"mensagem": "Trabalho aceito e contrato criado com sucesso!", "contrato_id": contrato.id},
            status=status.HTTP_201_CREATED,
        )


# 🔹 Recusar trabalho privado
class TrabalhoRecusarAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        trabalho = get_object_or_404(Trabalho, pk=pk)

        if not trabalho.is_privado or request.user != trabalho.freelancer:
            return Response(
                {"erro": "Você não tem permissão para recusar este trabalho."},
                status=status.HTTP_403_FORBIDDEN,
            )

        trabalho.status = "recusado"
        trabalho.save()

        enviar_notificacao(
            usuario=trabalho.contratante,
            mensagem=f"O freelancer recusou o trabalho privado: '{trabalho.titulo}'.",
            link=f"/trabalhos/detalhes/{trabalho.id}",
        )

        return Response({"mensagem": "Trabalho recusado com sucesso!"}, status=status.HTTP_200_OK)
