from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import Usuario
from notificacoes.models import Notificacao  # <-- Import atualizado
import re


class UsuarioSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        validators=[
            UniqueValidator(
                queryset=Usuario.objects.all(),
                message="E-mail já cadastrado."
            )
        ]
    )
    cpf = serializers.CharField(
        validators=[
            UniqueValidator(
                queryset=Usuario.objects.all(),
                message="CPF já cadastrado."
            )
        ]
    )
    cnpj = serializers.CharField(
        required=False,
        validators=[
            UniqueValidator(
                queryset=Usuario.objects.all(),
                message="CNPJ já cadastrado."
            )
        ]
    )
    telefone = serializers.CharField(
        required=True,
        validators=[
            UniqueValidator(
                queryset=Usuario.objects.all(),
                message="Telefone já cadastrado."
            )
        ]
    )
    
    password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password'})
    foto_perfil = serializers.ImageField(required=False, allow_null=True)
    notificacao_email = serializers.BooleanField(required=False)

    class Meta:
        model = Usuario
        fields = '__all__'

    def create(self, validated_data):
        password = validated_data.pop('password')
        validated_data.pop('groups', None)
        validated_data.pop('user_permissions', None)
        validated_data['is_active'] = True
        user = Usuario(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        if 'password' in validated_data:
            instance.set_password(validated_data.pop('password'))
        return super().update(instance, validated_data)

    def validate_password(self, password):
        if len(password) < 8:
            raise serializers.ValidationError("A senha deve ter pelo menos 8 caracteres.")
        if not re.search(r"[A-Z]", password):
            raise serializers.ValidationError("A senha deve conter ao menos uma letra maiúscula.")
        if not re.search(r"[a-z]", password):
            raise serializers.ValidationError("A senha deve conter ao menos uma letra minúscula.")
        if not re.search(r"[0-9]", password):
            raise serializers.ValidationError("A senha deve conter ao menos um número.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            raise serializers.ValidationError("A senha deve conter ao menos um símbolo especial.")
        return password

    def validate(self, data):
        tipo = data.get('tipo')
        cpf = data.get('cpf')
        cnpj = data.get('cnpj')
        senha = data.get('password')

        if senha:
            self.validate_password(senha)

        def validar_cpf(cpf):
            cpf = ''.join(filter(str.isdigit, cpf or ''))
            if len(cpf) != 11 or cpf == cpf[0] * 11:
                return False
            for i in range(9, 11):
                soma = sum(int(cpf[num]) * ((i + 1) - num) for num in range(i))
                digito = ((soma * 10) % 11) % 10
                if digito != int(cpf[i]):
                    return False
            return True

        def validar_cnpj(cnpj):
            cnpj = ''.join(filter(str.isdigit, cnpj or ''))
            if len(cnpj) != 14 or cnpj == cnpj[0] * 14:
                return False
            pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
            pesos2 = [6] + pesos1
            for i in range(12, 14):
                pesos = pesos1 if i == 12 else pesos2
                soma = sum(int(cnpj[j]) * pesos[j] for j in range(i))
                digito = 11 - (soma % 11)
                if int(cnpj[i]) != (0 if digito >= 10 else digito):
                    return False
            return True

        if tipo == 'freelancer':
            if not cpf:
                raise serializers.ValidationError("Freelancers devem fornecer CPF.")
            if not validar_cpf(cpf):
                raise serializers.ValidationError("CPF inválido.")
        elif tipo == 'cliente':
            if not cpf or not cnpj:
                raise serializers.ValidationError("Clientes devem fornecer CPF e CNPJ.")
            if not validar_cpf(cpf):
                raise serializers.ValidationError("CPF inválido.")
            if not validar_cnpj(cnpj):
                raise serializers.ValidationError("CNPJ inválido.")

        return data


class TrocaSenhaSerializer(serializers.Serializer):
    senha_atual = serializers.CharField(write_only=True)
    nova_senha = serializers.CharField(write_only=True)
    confirmar_nova_senha = serializers.CharField(write_only=True)

    def validate(self, data):
        user = self.context['request'].user
        if not user.check_password(data['senha_atual']):
            raise serializers.ValidationError({"senha_atual": "Senha atual incorreta."})

        nova = data['nova_senha']
        if len(nova) < 8:
            raise serializers.ValidationError({"nova_senha": "A senha deve ter pelo menos 8 caracteres."})
        if not re.search(r"[A-Z]", nova):
            raise serializers.ValidationError({"nova_senha": "A senha deve conter ao menos uma letra maiúscula."})
        if not re.search(r"[a-z]", nova):
            raise serializers.ValidationError({"nova_senha": "A senha deve conter ao menos uma letra minúscula."})
        if not re.search(r"[0-9]", nova):
            raise serializers.ValidationError({"nova_senha": "A senha deve conter ao menos um número."})
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", nova):
            raise serializers.ValidationError({"nova_senha": "A senha deve conter ao menos um símbolo especial."})

        if data['nova_senha'] != data['confirmar_nova_senha']:
            raise serializers.ValidationError({"confirmar_nova_senha": "As senhas não coincidem."})

        return data


class NotificacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacao
        fields = ['id', 'mensagem', 'lida', 'data_criacao', 'link']
