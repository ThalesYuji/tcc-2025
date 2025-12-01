from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import serializers
from django.utils import timezone
from usuarios.models import Usuario


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Login personalizado com validação correta de:
    - credenciais
    - banimento permanente
    - suspensão temporária por admin
    - mantém login válido para modo leitura voluntário (is_suspended_self=True)
    """

    username_field = "email"

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        if not email or not password:
            raise serializers.ValidationError("Email e senha obrigatórios.")

        user: Usuario = Usuario.objects.filter(email=email).first()

        # Usuário não existe
        if user is None:
            raise serializers.ValidationError("E-mail ou senha incorretos.")

        # Senha incorreta
        if not user.check_password(password):
            raise serializers.ValidationError("E-mail ou senha incorretos.")

        # Conta desativada permanentemente
        if not user.is_active:
            raise serializers.ValidationError("Usuário inativo.")

        # ===============================
        #  BANIMENTO PERMANENTE
        # ===============================
        if user.banido:
            raise serializers.ValidationError(
                "Sua conta foi banida permanentemente. Entre em contato com o suporte."
            )

        # ===============================
        #  SUSPENSÃO ADMINISTRATIVA
        # ===============================
        if user.is_suspended_admin:
            # Se existe data de expiração da suspensão
            if user.suspenso_ate:
                if timezone.now() < user.suspenso_ate:
                    data_fmt = user.suspenso_ate.strftime("%d/%m/%Y %H:%M")
                    raise serializers.ValidationError(
                        f"Sua conta está suspensa até {data_fmt}."
                    )
                else:
                    # suspensão acabou, limpa automaticamente
                    user.is_suspended_admin = False
                    user.suspenso_ate = None
                    user.motivo_suspensao_admin = None
                    user.save(update_fields=[
                        "is_suspended_admin", "suspenso_ate", "motivo_suspensao_admin"
                    ])

        # LOGIN FINAL
        data = super().validate({"email": email, "password": password})
        data["user_id"] = user.id
        data["nome"] = user.nome
        data["tipo"] = user.tipo

        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
