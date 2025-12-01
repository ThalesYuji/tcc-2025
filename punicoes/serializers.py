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
        source="usuario_punido.nome", read_only=True
    )

    admin_responsavel_nome = serializers.CharField(
        source="admin_responsavel.nome", read_only=True
    )

    removida_por_admin_nome = serializers.CharField(
        source="removida_por_admin.nome", read_only=True, default=None
    )

    denuncia_id = serializers.IntegerField(
        source="denuncia_relacionada.id", read_only=True
    )

    class Meta:
        model = Punicao
        fields = [
            "id",
            "usuario_punido",
            "usuario_punido_nome",

            "admin_responsavel",
            "admin_responsavel_nome",

            "tipo",
            "motivo",

            "criado_em",
            "valido_ate",

            "ativo",

            "removida_em",
            "removida_por_admin",
            "removida_por_admin_nome",

            "denuncia_relacionada",
            "denuncia_id",
        ]
        read_only_fields = fields  # Tudo apenas leitura no histórico



# ============================================================
# 🔍 SERIALIZERS DE AÇÃO (ADVERTÊNCIA / SUSPENSÃO / BANIMENTO)
# ============================================================

class AplicarAdvertenciaSerializer(serializers.Serializer):
    usuario_id = serializers.IntegerField()
    motivo = serializers.CharField()
    denuncia_id = serializers.IntegerField(required=False)


class AplicarSuspensaoSerializer(serializers.Serializer):
    usuario_id = serializers.IntegerField()
    motivo = serializers.CharField()
    dias = serializers.IntegerField(min_value=1)
    denuncia_id = serializers.IntegerField(required=False)


class AplicarBanimentoSerializer(serializers.Serializer):
    usuario_id = serializers.IntegerField()
    motivo = serializers.CharField()
    denuncia_id = serializers.IntegerField(required=False)


class RemoverSuspensaoSerializer(serializers.Serializer):
    usuario_id = serializers.IntegerField()
