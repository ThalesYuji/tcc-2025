from rest_framework import serializers
from .models import Denuncia
from usuarios.models import Usuario
from usuarios.serializers import UsuarioSerializer

class DenunciaSerializer(serializers.ModelSerializer):
    # ID do denunciado no POST
    denunciado = serializers.PrimaryKeyRelatedField(
        queryset=Usuario.objects.all(),
        required=True
    )
    # Detalhes completos no GET
    denunciante = UsuarioSerializer(read_only=True)
    denunciado_detalhes = UsuarioSerializer(source="denunciado", read_only=True)

    # Campo sempre fixo
    contrato_titulo = serializers.SerializerMethodField()

    class Meta:
        model = Denuncia
        fields = [
            "id",
            "denunciante",
            "denunciado",
            "denunciado_detalhes",
            "contrato_titulo",
            "motivo",
            "data_criacao",
            "status",
            "resposta_admin",
        ]
        read_only_fields = ["id", "denunciante", "data_criacao"]

    def get_contrato_titulo(self, obj):
        # Sempre retorna a mensagem padrão
        return "Denúncia geral"

    def validate_motivo(self, value: str):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("O motivo da denúncia não pode estar vazio.")
        if len(value) < 5:
            raise serializers.ValidationError("O motivo deve conter pelo menos 5 caracteres.")
        if len(value) > 500:
            raise serializers.ValidationError("O motivo pode ter no máximo 500 caracteres.")
        return value

    def update(self, instance, validated_data):
        # Apenas admin pode alterar status ou resposta_admin
        user = self.context["request"].user
        if not user.is_superuser:
            validated_data.pop("status", None)
            validated_data.pop("resposta_admin", None)
        return super().update(instance, validated_data)
