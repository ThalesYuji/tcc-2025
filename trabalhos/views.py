from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q

# Modelos e Serializers do app
from .models import Trabalho
from .serializers import TrabalhoSerializer

# Notificações e dependências externas
from notificacoes.utils import enviar_notificacao
from habilidades.models import Habilidade, Ramo


class TrabalhoAPIView(APIView):
    """
    Lista e cria Trabalhos.
    - GET: lista com filtros e paginação.
    - POST: cria um trabalho (apenas contratantes). Aceita upload (imagem/arquivos).
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser] 

    def get(self, request):
        """
        Lista trabalhos com filtros e paginação.
        Regra de visibilidade:
          - contratante: por padrão vê apenas os próprios; se ?todos=1, vê também os públicos (útil em consultas gerais)
          - freelancer: vê públicos e os privados destinados a ele
          - admin: vê todos
        Filtros: ?busca=, ?habilidade= (id ou nome), ?ramo= (id ou nome), ?status=,
                 ?page=, ?page_size=, ?todos=1 (só tem efeito para contratante)
        """
        usuario = request.user

        busca = (request.query_params.get("busca") or "").strip()
        habilidade_param = (request.query_params.get("habilidade") or "").strip()
        ramo_param = (request.query_params.get("ramo") or "").strip()
        status_param = (request.query_params.get("status") or "").strip().lower()
        ver_todos_contratante = (request.query_params.get("todos") or "").strip() in ("1", "true", "True")

        # paginação
        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except ValueError:
            page = 1
        try:
            page_size = max(1, min(50, int(request.query_params.get("page_size", 6))))
        except ValueError:
            page_size = 6

        # Base conforme o tipo do usuário
        if usuario.is_superuser:
            trabalhos = Trabalho.objects.all()
        elif getattr(usuario, "tipo", None) == "contratante":
            # Por padrão, contratante vê apenas os trabalhos que publicou.
            if ver_todos_contratante:
                trabalhos = Trabalho.objects.filter(
                    Q(contratante=usuario) |
                    Q(is_privado=False)
                )
            else:
                trabalhos = Trabalho.objects.filter(contratante=usuario)
        else:
            trabalhos = Trabalho.objects.filter(
                Q(is_privado=False) |
                Q(is_privado=True, freelancer=usuario)
            )

        #Filtros
            trabalhos = trabalhos.filter(
                Q(titulo__icontains=busca) |
                Q(descricao__icontains=busca) |
                Q(habilidades__nome__icontains=busca) |
                Q(ramo__nome__icontains=busca)
            ).distinct()

        #Filtro por habilidade
        if habilidade_param:
            habilidade_obj = None
            try:
                habilidade_obj = Habilidade.objects.filter(id=int(habilidade_param)).first()
            except (ValueError, TypeError):
                habilidade_obj = Habilidade.objects.filter(nome__iexact=habilidade_param).first()

            if habilidade_obj:
                trabalhos = trabalhos.filter(habilidades=habilidade_obj)
            else:
                trabalhos = trabalhos.none()

        # Filtro por ramo
        if ramo_param:
            ramo_obj = None
            try:
                ramo_obj = Ramo.objects.filter(id=int(ramo_param)).first()
            except (ValueError, TypeError):
                ramo_obj = Ramo.objects.filter(nome__iexact=ramo_param).first()

            if ramo_obj:
                trabalhos = trabalhos.filter(ramo=ramo_obj)
            else:
                trabalhos = trabalhos.none()

        # Filtro por status
        if status_param:
            trabalhos = trabalhos.filter(status=status_param)

        # Otimização + Ordenação
        trabalhos = trabalhos.select_related("contratante", "freelancer", "ramo").prefetch_related("habilidades")
        trabalhos = trabalhos.order_by("-criado_em", "-id")

        total = trabalhos.count()
        start = (page - 1) * page_size
        end = start + page_size
        trabalhos_paginados = trabalhos[start:end]

        serializer = TrabalhoSerializer(trabalhos_paginados, many=True, context={"request": request})
        return Response(
            {
                "results": serializer.data,
                "total": total,
                "page": page,
                "page_size": page_size,
                "num_pages": (total + page_size - 1) // page_size if page_size > 0 else 1,
            }
        )

    def post(self, request):
        """
        Cria um novo trabalho.
        Regras:
        - Apenas contratantes podem criar.
        - Dispara notificações: se privado → apenas ao freelancer-alvo; senão → a todos os freelancers.
        """
        # Garantia de permissão
        if not (request.user.is_superuser or getattr(request.user, "tipo", None) == "contratante"):
            return Response({"erro": "Apenas contratantes podem publicar trabalhos."}, status=status.HTTP_403_FORBIDDEN)

        serializer = TrabalhoSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        trabalho = serializer.save()

        # Disparo de notificações
        from usuarios.models import Usuario
        if trabalho.is_privado and trabalho.freelancer:
            # privado só para o freelancer selecionado
            enviar_notificacao(
                usuario=trabalho.freelancer,
                mensagem=f"Você recebeu um trabalho privado: '{trabalho.titulo}'.",
                link=f"/trabalhos/detalhes/{trabalho.id}",
            )
        else:
            # público para todos os freelancers
            freelancers = Usuario.objects.filter(tipo="freelancer").only("id")
            for f in freelancers:
                enviar_notificacao(
                    usuario=f,
                    mensagem=f"Novo trabalho publicado: '{trabalho.titulo}'.",
                    link=f"/trabalhos/detalhes/{trabalho.id}",
                )

        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TrabalhoDetalheAPIView(APIView):
    """
    Recupera/atualiza/exclui um trabalho específico.
    - GET: respeita visibilidade (privado só para contratante dono e freelancer-alvo).
    - PUT/PATCH: apenas contratante dono ou admin.
    - DELETE: apenas contratante dono ou admin.
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        return get_object_or_404(Trabalho, pk=pk)

    def _pode_ver(self, user, trabalho: Trabalho) -> bool:
        """Regra de visibilidade de um trabalho."""
        if user.is_superuser:
            return True
        if trabalho.is_privado:
            # privado: apenas contratante dono e o freelancer convidado
            return (trabalho.contratante_id == user.id) or (trabalho.freelancer_id == user.id)
        # público: qualquer autenticad
        return True

    def get(self, request, pk):
        trabalho = self.get_object(pk)

        # Visibilidade
        if not self._pode_ver(request.user, trabalho):
            return Response({"erro": "Você não tem permissão para visualizar este trabalho."},
                            status=status.HTTP_403_FORBIDDEN)

        serializer = TrabalhoSerializer(trabalho, context={"request": request})
        return Response(serializer.data)

    def put(self, request, pk):
        """Atualização total."""
        trabalho = self.get_object(pk)

        # Permissão de edição
        if not (request.user.is_superuser or request.user.id == trabalho.contratante_id):
            return Response({"erro": "Você não tem permissão para editar este trabalho."},
                            status=status.HTTP_403_FORBIDDEN)

        serializer = TrabalhoSerializer(trabalho, data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        trabalho_atualizado = serializer.save()

        # Notificações
        from usuarios.models import Usuario
        if trabalho_atualizado.is_privado and trabalho_atualizado.freelancer:
            enviar_notificacao(
                usuario=trabalho_atualizado.freelancer,
                mensagem=f"O trabalho privado '{trabalho_atualizado.titulo}' foi atualizado.",
                link=f"/trabalhos/detalhes/{trabalho_atualizado.id}",
            )
        else:
            freelancers = Usuario.objects.filter(tipo="freelancer").only("id")
            for f in freelancers:
                enviar_notificacao(
                    usuario=f,
                    mensagem=f"O trabalho '{trabalho_atualizado.titulo}' foi atualizado.",
                    link=f"/trabalhos/detalhes/{trabalho_atualizado.id}",
                )

        return Response(serializer.data)

    def patch(self, request, pk):
        """Atualização parcial."""
        trabalho = self.get_object(pk)

        # Permissão de edição
        if not (request.user.is_superuser or request.user.id == trabalho.contratante_id):
            return Response({"erro": "Você não tem permissão para editar este trabalho."},
                            status=status.HTTP_403_FORBIDDEN)

        serializer = TrabalhoSerializer(trabalho, data=request.data, partial=True, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        trabalho_atualizado = serializer.save()

        # Notificações 
        from usuarios.models import Usuario
        if trabalho_atualizado.is_privado and trabalho_atualizado.freelancer:
            enviar_notificacao(
                usuario=trabalho_atualizado.freelancer,
                mensagem=f"O trabalho privado '{trabalho_atualizado.titulo}' foi atualizado.",
                link=f"/trabalhos/detalhes/{trabalho_atualizado.id}",
            )
        else:
            freelancers = Usuario.objects.filter(tipo="freelancer").only("id")
            for f in freelancers:
                enviar_notificacao(
                    usuario=f,
                    mensagem=f"O trabalho '{trabalho_atualizado.titulo}' foi atualizado.",
                    link=f"/trabalhos/detalhes/{trabalho_atualizado.id}",
                )

        return Response(serializer.data)

    def delete(self, request, pk):
        trabalho = self.get_object(pk)

        # Permissão de exclusão
        if not (request.user.is_superuser or request.user.id == trabalho.contratante_id):
            return Response({"erro": "Você não tem permissão para excluir este trabalho."},
                            status=status.HTTP_403_FORBIDDEN)

        titulo = trabalho.titulo
        is_privado = trabalho.is_privado
        freelancer_destino = trabalho.freelancer

        trabalho.delete()

        # Notificações pós-exclusão
        from usuarios.models import Usuario
        if is_privado and freelancer_destino:
            enviar_notificacao(
                usuario=freelancer_destino,
                mensagem=f"O trabalho privado '{titulo}' foi removido pelo contratante.",
                link="/trabalhos",
            )
        else:
            freelancers = Usuario.objects.filter(tipo="freelancer").only("id")
            for f in freelancers:
                enviar_notificacao(
                    usuario=f,
                    mensagem=f"O trabalho '{titulo}' foi removido pelo contratante.",
                    link="/trabalhos",
                )

        return Response({"mensagem": "Trabalho excluído com sucesso."}, status=status.HTTP_204_NO_CONTENT)


class TrabalhoAceitarAPIView(APIView):
    """
    Endpoint para o FREELANCER aceitar um TRABALHO PRIVADO.
    - Cria contrato automaticamente (uma única vez).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from contratos.models import Contrato
        from propostas.models import Proposta

        trabalho = get_object_or_404(Trabalho, pk=pk)

        # Somente o freelancer convidado pode aceitar
        if not trabalho.is_privado or request.user.id != trabalho.freelancer_id:
            return Response(
                {"erro": "Você não tem permissão para aceitar este trabalho."},
                status=status.HTTP_403_FORBIDDEN,
            )

        with transaction.atomic():
            # Se já estiver em andamento/recusado/concluído/cancelado, bloqueia
            if trabalho.status in ("em_andamento", "recusado", "concluido", "cancelado"):
                return Response(
                    {"erro": f"Não é possível aceitar. Status atual: {trabalho.status}."},
                    status=status.HTTP_409_CONFLICT,
                )

            # Atualiza status do trabalho
            trabalho.status = "em_andamento"
            trabalho.save(update_fields=["status"])

            # Busca proposta
            proposta = Proposta.objects.filter(trabalho=trabalho, freelancer=request.user).first()

            # Evita criar contrato duplicado
            contrato_existente = Contrato.objects.filter(trabalho=trabalho).first()
            if contrato_existente:
                contrato = contrato_existente
            else:
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


class TrabalhoRecusarAPIView(APIView):
    """
    Endpoint para o FREELANCER recusar um TRABALHO PRIVADO.
    - Atualiza o status para 'recusado'.
    - Aceita um 'motivo' opcional que será encaminhado ao contratante na notificação.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        trabalho = get_object_or_404(Trabalho, pk=pk)

        # Somente o freelancer convidado pode recusar
        if not trabalho.is_privado or request.user.id != trabalho.freelancer_id:
            return Response(
                {"erro": "Você não tem permissão para recusar este trabalho."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Se já mudou de estado, impede recusa
        if trabalho.status in ("em_andamento", "concluido", "cancelado"):
            return Response(
                {"erro": f"Não é possível recusar. Status atual: {trabalho.status}."},
                status=status.HTTP_409_CONFLICT,
            )

        # Atualiza status
        trabalho.status = "recusado"
        trabalho.save(update_fields=["status"])

        # Mensagem opcional de motivo
        motivo = (request.data.get("motivo") or "").strip()
        msg = f"O freelancer recusou o trabalho privado: '{trabalho.titulo}'."
        if motivo:
            msg += f" Motivo: {motivo}"

        # Notifica o contratante
        enviar_notificacao(
            usuario=trabalho.contratante,
            mensagem=msg,
            link=f"/trabalhos/detalhes/{trabalho.id}",
        )

        return Response({"mensagem": "Trabalho recusado com sucesso!"}, status=status.HTTP_200_OK)
