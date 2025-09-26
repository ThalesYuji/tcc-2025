from rest_framework import serializers
from .models import Denuncia, DenunciaProva
from usuarios.models import Usuario
from usuarios.serializers import UsuarioSerializer

class DenunciaProvaSerializer(serializers.ModelSerializer):
    class Meta:
        model = DenunciaProva
        fields = ["id", "arquivo", "data_upload"]

class DenunciaSerializer(serializers.ModelSerializer):
    denunciado = serializers.PrimaryKeyRelatedField(
        queryset=Usuario.objects.all(),
        required=True
    )
    denunciante = UsuarioSerializer(read_only=True)
    denunciado_detalhes = UsuarioSerializer(source="denunciado", read_only=True)
    contrato_titulo = serializers.SerializerMethodField()

    # 🔹 lista de provas vinculadas
    provas = DenunciaProvaSerializer(many=True, read_only=True)

    class Meta:
        model = Denuncia
        fields = [
            "id",
            "denunciante",
            "denunciado",
            "denunciado_detalhes",
            "contrato_titulo",
            "motivo",
            "provas",
            "data_criacao",
            "status",
            "resposta_admin",
        ]
        read_only_fields = ["id", "denunciante", "data_criacao"]

    def get_contrato_titulo(self, obj):
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
