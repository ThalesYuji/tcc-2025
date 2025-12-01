from rest_framework import serializers
from usuarios.models import Usuario
from denuncias.models import Denuncia
from .models import Punicao


# ============================================================
# 🔥 SERIALIZER COMPLETO DAS PUNIÇÕES (HISTÓRICO + DETALHES)
# ============================================================

class PunicaoSerializer(serializers.ModelSerializer):
    """
    Serializer completo para listar punições no histórico.
    Inclui nomes dos usuários e admins, além da denúncia associada.
    """

    usuario_punido_nome = serializers.CharField(
        source="usuario_punido.nome",
        read_only=True
    )

    admin_responsavel_nome = serializers.CharField(
        source="admin_responsavel.nome",
        read_only=True
    )

    removida_por_admin_nome = serializers.CharField(
        source="removida_por_admin.nome",
        read_only=True
    )

    denuncia_id = serializers.IntegerField(
        source="denuncia_relacionada.id",
        read_only=True
    )

    class Meta:
        model = Punicao
        fields = [
            "id",

            # Usuário punido
            "usuario_punido",
            "usuario_punido_nome",

            # Admin que aplicou
            "admin_responsavel",
            "admin_responsavel_nome",

            # Dados principais
            "tipo",
            "motivo",

            "criado_em",
            "valido_ate",

            # Controle interno
            "ativo",

            # Remoção
            "removida_em",
            "removida_por_admin",
            "removida_por_admin_nome",

            # Denúncia relacionada
            "denuncia_relacionada",
            "denuncia_id",
        ]

        # Histórico é somente leitura no GET
        read_only_fields = fields



# ============================================================
# 🔍 SERIALIZERS DE AÇÃO (ADVERTÊNCIA / SUSPENSÃO / BANIMENTO)
# ============================================================

class AplicarAdvertenciaSerializer(serializers.Serializer):
    usuario_id = serializers.IntegerField()
    motivo = serializers.CharField()
    denuncia_id = serializers.IntegerField(required=False, allow_null=True)


class AplicarSuspensaoSerializer(serializers.Serializer):
    usuario_id = serializers.IntegerField()
    motivo = serializers.CharField()
    dias = serializers.IntegerField(min_value=1)
    denuncia_id = serializers.IntegerField(required=False, allow_null=True)


class AplicarBanimentoSerializer(serializers.Serializer):
    usuario_id = serializers.IntegerField()
    motivo = serializers.CharField()
    denuncia_id = serializers.IntegerField(required=False, allow_null=True)


class RemoverSuspensaoSerializer(serializers.Serializer):
    usuario_id = serializers.IntegerField()
