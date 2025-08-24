from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import serializers
from usuarios.models import Usuario

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        if not email or not password:
            raise serializers.ValidationError("Email e senha obrigatórios.")

        user = Usuario.objects.filter(email=email).first()
        if user is None or not user.check_password(password):
            raise serializers.ValidationError('E-mail ou senha incorretos.')
        if not user.is_active:
            raise serializers.ValidationError('Usuário inativo.')

        # O JWT espera username_field. Aqui, é "email"
        return super().validate({'email': email, 'password': password})

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
