# usuarios/serializers.py

from rest_framework import serializers
import re
from .models import Usuario
from notificacoes.models import Notificacao
from avaliacoes.models import Avaliacao
from trabalhos.models import Trabalho  # 🔹 para contar trabalhos


class UsuarioSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    cpf = serializers.CharField(required=True)
    cnpj = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    telefone = serializers.CharField(required=True)

    password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password'})
    foto_perfil = serializers.ImageField(use_url=True, required=False, allow_null=True)
    notificacao_email = serializers.BooleanField(required=False)

    tipo = serializers.CharField(read_only=True)

    class Meta:
        model = Usuario
        fields = '__all__'

    # ===================== NORMALIZAÇÃO =====================
    def to_internal_value(self, data):
        data = super().to_internal_value(data)

        if 'cpf' in data and data['cpf']:
            data['cpf'] = re.sub(r'\D', '', data['cpf'])
        if 'cnpj' in data and data['cnpj']:
            data['cnpj'] = re.sub(r'\D', '', data['cnpj'])
        if 'telefone' in data and data['telefone']:
            data['telefone'] = re.sub(r'\D', '', data['telefone'])

        return data

    # ===================== VALIDATORS ÚNICOS =====================
    def validate_email(self, value):
        qs = Usuario.objects.filter(email=value)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError("E-mail já cadastrado.")
        return value

    def validate_cpf(self, value):
        value = re.sub(r'\D', '', value or '')
        qs = Usuario.objects.filter(cpf=value)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError("CPF já cadastrado.")
        return value

    def validate_cnpj(self, value):
        value = re.sub(r'\D', '', value or '')
        if not value:
            return value
        qs = Usuario.objects.filter(cnpj=value)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError("CNPJ já cadastrado.")
        return value

    def validate_telefone(self, value):
        value = re.sub(r'\D', '', value or '')
        qs = Usuario.objects.filter(telefone=value)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError("Telefone já cadastrado.")
        return value

    # ===================== PASSWORD =====================
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

    # ===================== VALIDAÇÃO CPF/CNPJ POR TIPO =====================
    def validate(self, data):
        tipo = data.get('tipo') or (self.instance.tipo if self.instance else None)
        cpf = data.get('cpf') or (self.instance.cpf if self.instance else None)
        cnpj = data.get('cnpj') or (self.instance.cnpj if self.instance else None)
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
                raise serializers.ValidationError({"cpf": "Freelancers devem fornecer CPF."})
            if not validar_cpf(cpf):
                raise serializers.ValidationError({"cpf": "CPF inválido."})

        elif tipo == 'cliente':
            if not cpf:
                raise serializers.ValidationError({"cpf": "CPF é obrigatório para clientes."})
            if not cnpj:
                raise serializers.ValidationError({"cnpj": "CNPJ é obrigatório para clientes."})
            if not validar_cpf(cpf):
                raise serializers.ValidationError({"cpf": "CPF inválido."})
            if not validar_cnpj(cnpj):
                raise serializers.ValidationError({"cnpj": "CNPJ inválido."})

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


class UsuarioPublicoSerializer(serializers.ModelSerializer):
    nota_media = serializers.SerializerMethodField()
    trabalhos_publicados = serializers.SerializerMethodField()
    trabalhos_concluidos = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = [
            "id", "nome", "tipo", "foto_perfil", "bio",
            "nota_media", "trabalhos_publicados", "trabalhos_concluidos"
        ]

    def get_nota_media(self, obj):
        avaliacoes = Avaliacao.objects.filter(avaliado=obj)
        if not avaliacoes.exists():
            return None
        return round(sum(a.nota for a in avaliacoes) / avaliacoes.count(), 2)

    def get_trabalhos_publicados(self, obj):
        return obj.trabalhos_publicados.count() if obj.tipo == "cliente" else None

    def get_trabalhos_concluidos(self, obj):
        return obj.trabalhos_direcionados.filter(status="concluido").count() if obj.tipo == "freelancer" else None
