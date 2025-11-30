from rest_framework import serializers
from .models import Denuncia, DenunciaProva
from usuarios.models import Usuario
from usuarios.serializers import UsuarioSerializer


# --------------------------------------------------
# 🔹 SERIALIZER DAS PROVAS
# --------------------------------------------------
class DenunciaProvaSerializer(serializers.ModelSerializer):
    class Meta:
        model = DenunciaProva
        fields = ["id", "arquivo", "data_upload"]


# --------------------------------------------------
# 🔹 SERIALIZER PRINCIPAL DA DENÚNCIA
# --------------------------------------------------
class DenunciaSerializer(serializers.ModelSerializer):
    denunciado = serializers.PrimaryKeyRelatedField(
        queryset=Usuario.objects.all(),
        required=True
    )
    denunciante = UsuarioSerializer(read_only=True)
    denunciado_detalhes = UsuarioSerializer(source="denunciado", read_only=True)

    contrato_titulo = serializers.SerializerMethodField()

    # 🔹 Provas anexadas
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
        read_only_fields = [
            "id",
            "denunciante",
            "provas",
            "data_criacao",
        ]

    # --------------------------------------------------
    # 🔹 TÍTULO (no futuro você pode integrar com contratos)
    # --------------------------------------------------
    def get_contrato_titulo(self, obj):
        return "Denúncia geral"

    # --------------------------------------------------
    # 🔹 VALIDAÇÃO DO MOTIVO
    # --------------------------------------------------
    def validate_motivo(self, value: str):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("O motivo da denúncia não pode estar vazio.")
        if len(value) < 5:
            raise serializers.ValidationError("O motivo deve conter pelo menos 5 caracteres.")
        if len(value) > 500:
            raise serializers.ValidationError("O motivo pode ter no máximo 500 caracteres.")
        return value

    # --------------------------------------------------
    # 🔹 VALIDAÇÕES ESPECIAIS PARA ATUALIZAÇÃO (ADMIN)
    # --------------------------------------------------
    def validate(self, data):
        request = self.context.get("request")
        is_admin = request and request.user and request.user.is_superuser

        # Se não é admin, não pode alterar status nem resposta_admin
        if not is_admin and ("status" in data or "resposta_admin" in data):
            raise serializers.ValidationError(
                "Você não tem permissão para alterar o status da denúncia."
            )

        # Admin pode atualizar sem restrições
        return data
