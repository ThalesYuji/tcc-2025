from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from django.utils import timezone
from .models import Mensagem
from contratos.models import Contrato
import os

# 🔹 Configurações de upload
ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".pdf"}
MAX_FILE_MB = 5


class MensagemSerializer(serializers.ModelSerializer):
    """
    Serializador das mensagens trocadas entre contratante e freelancer.
    Inclui validações de remetente, destinatário, contrato e anexos.
    """

    remetente = serializers.PrimaryKeyRelatedField(read_only=True)
    data_envio = serializers.DateTimeField(read_only=True)
    editada_em = serializers.DateTimeField(read_only=True)
    excluida = serializers.BooleanField(read_only=True)

    remetente_nome = serializers.SerializerMethodField()
    destinatario_nome = serializers.SerializerMethodField()
    anexo_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Mensagem
        fields = [
            "id",
            "contrato",
            "remetente",
            "remetente_nome",
            "destinatario",
            "destinatario_nome",
            "texto",
            "anexo",
            "anexo_url",
            "data_envio",
            "editada_em",
            "excluida",
        ]
        extra_kwargs = {
            "texto": {
                "required": False,  # 🔹 agora o campo texto é opcional
                "allow_blank": True,
                "error_messages": {
                    "blank": "O campo texto não pode ficar em branco.",
                },
            }
        }

    # -------------------------
    # GETTERS
    # -------------------------
    def get_remetente_nome(self, obj):
        return getattr(obj.remetente, "nome", None)

    def get_destinatario_nome(self, obj):
        return getattr(obj.destinatario, "nome", None)

    def get_anexo_url(self, obj):
        """Gera URL absoluta para o anexo (se existir)"""
        if not obj.anexo or not hasattr(obj.anexo, "url"):
            return None
        request = self.context.get("request")
        try:
            return request.build_absolute_uri(obj.anexo.url) if request else obj.anexo.url
        except Exception:
            return obj.anexo.url

    # -------------------------
    # VALIDAÇÕES
    # -------------------------
    def validate_texto(self, value):
        """
        Texto pode ser opcional (caso haja apenas anexo).
        Apenas valida comprimento se houver texto.
        """
        value = (value or "").strip()
        if value and len(value) > 2000:
            raise serializers.ValidationError("A mensagem não pode ter mais que 2000 caracteres.")
        return value

    def validate(self, attrs):
        """
        Validações gerais:
        - remetente = usuário autenticado
        - contrato deve envolver o remetente e o destinatário
        - destinatário não pode ser o mesmo do remetente
        - validações de anexo
        """
        request = self.context["request"]
        user = request.user
        attrs["remetente"] = user

        contrato = attrs.get("contrato") or getattr(self.instance, "contrato", None)
        destinatario = attrs.get("destinatario") or getattr(self.instance, "destinatario", None)

        if not contrato:
            raise serializers.ValidationError({"contrato": "Informe o contrato da conversa."})
        if not destinatario:
            raise serializers.ValidationError({"destinatario": "Informe o destinatário da mensagem."})

        dest_id = destinatario.id if hasattr(destinatario, "id") else destinatario
        if user.id == dest_id:
            raise serializers.ValidationError({"destinatario": "Você não pode enviar mensagem para você mesmo."})

        try:
            contrato_obj = contrato if isinstance(contrato, Contrato) else Contrato.objects.select_related(
                "contratante", "freelancer"
            ).get(id=contrato)
        except Contrato.DoesNotExist:
            raise serializers.ValidationError({"contrato": "Contrato inválido."})

        # 🔹 Garante que remetente e destinatário fazem parte do contrato
        participantes = {contrato_obj.contratante_id, contrato_obj.freelancer_id}
        if user.id not in participantes or dest_id not in participantes:
            raise serializers.ValidationError({
                "contrato": "Remetente ou destinatário não pertencem a este contrato."
            })

        # 🔹 Validação de anexo
        anexo = attrs.get("anexo")
        if anexo:
            ext = os.path.splitext(anexo.name)[1].lower()
            if ext not in ALLOWED_EXTS:
                raise serializers.ValidationError({
                    "anexo": f"Extensão não permitida. Use: {', '.join(sorted(ALLOWED_EXTS))}"
                })
            if anexo.size > MAX_FILE_MB * 1024 * 1024:
                raise serializers.ValidationError({
                    "anexo": f"Arquivo maior que {MAX_FILE_MB} MB."
                })

        return attrs

    # -------------------------
    # UPDATE (edição)
    # -------------------------
    def update(self, instance, validated_data):
        """
        - Apenas o remetente pode editar (checado na view)
        - Só é permitido editar até 5 minutos após o envio
        - Não é possível editar mensagens excluídas
        """
        if (timezone.now() - instance.data_envio).total_seconds() > 300:
            raise ValidationError("Prazo para editar mensagem expirou.")
        if instance.excluida:
            raise ValidationError("Não é possível editar uma mensagem excluída.")

        # Protege campos que não devem ser alterados
        validated_data.pop("remetente", None)
        validated_data.pop("contrato", None)
        validated_data.pop("destinatario", None)

        instance.editada_em = timezone.now()
        return super().update(instance, validated_data)
