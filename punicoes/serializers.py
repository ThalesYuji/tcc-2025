from rest_framework import serializers
from usuarios.models import Usuario
from denuncias.models import Denuncia
from .models import Punicao


class PunicaoSerializer(serializers.ModelSerializer):
    """Serializer principal das punições."""

    class Meta:
        model = Punicao
        fields = '__all__'
        read_only_fields = (
            'admin_responsavel',
            'criado_em',
            'ativo',
        )


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
