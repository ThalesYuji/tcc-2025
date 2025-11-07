# usuarios/serializers.py
from rest_framework import serializers
import re
from django.conf import settings

from .models import Usuario
from notificacoes.models import Notificacao
from avaliacoes.models import Avaliacao
from contratos.models import Contrato

# 🔹 Service real para CPF/CNPJ
from services.cpfcnpj import consultar_documento, CPF_CNPJValidationError


class UsuarioSerializer(serializers.ModelSerializer):
    """
    Serializer principal do usuário (CRUD + /me).
    - Normaliza CPF/CNPJ/telefone (remove não dígitos)
    - Valida unicidade e formato
    - Força senha forte
    - Retorna foto_perfil com URL absoluta
    - Exponde status de desativação (somente leitura)
    """
    email = serializers.EmailField(required=True)
    cpf = serializers.CharField(required=True)
    cnpj = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    telefone = serializers.CharField(required=True)
    sou_empresa = serializers.BooleanField(required=False, default=False)

    password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password'})
    foto_perfil = serializers.ImageField(use_url=True, required=False, allow_null=True)
    notificacao_email = serializers.BooleanField(required=False)

    tipo = serializers.ChoiceField(choices=Usuario.TIPO_USUARIO, required=True)

    # 🔎 Conveniência: flag derivada para o front (true quando em modo leitura)
    modo_leitura = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Usuario
        fields = '__all__'
        # 🔒 Campos que nunca devem ser alterados via PATCH/PUT genérico
        read_only_fields = (
            'is_active', 'is_staff', 'is_superuser', 'last_login',
            # 🔒 Desativação voluntária é controlada por endpoints próprios
            'is_suspended_self', 'deactivated_at', 'deactivated_reason',
            # 🔒 Permissões e grupos (se existirem no model base)
            'groups', 'user_permissions',
        )

    # --------------------- Representação (saída) ---------------------
    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        foto = data.get('foto_perfil')
        if foto and not (str(foto).startswith('http://') or str(foto).startswith('https://')):
            if request is not None:
                data['foto_perfil'] = request.build_absolute_uri(foto)
        return data

    def get_modo_leitura(self, obj):
        return bool(getattr(obj, "is_suspended_self", False))

    # --------------------- Normalização (entrada) ---------------------
    def to_internal_value(self, data):
        data = super().to_internal_value(data)
        if 'cpf' in data and data['cpf']:
            data['cpf'] = re.sub(r'\D', '', data['cpf'])
        if 'cnpj' in data and data['cnpj']:
            data['cnpj'] = re.sub(r'\D', '', data['cnpj'])
        if 'telefone' in data and data['telefone']:
            data['telefone'] = re.sub(r'\D', '', data['telefone'])
        return data

    # --------------------- Validadores únicos ---------------------
    def validate_email(self, value):
        qs = Usuario.objects.filter(email=value)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError("E-mail já cadastrado.")
        return value

    def validate_cpf(self, value):
        cpf = re.sub(r'\D', '', value or '')
        if not cpf:
            return cpf
        qs = Usuario.objects.filter(cpf=cpf)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError("CPF já cadastrado.")
        try:
            consultar_documento(cpf, settings.CPF_CNPJ_PACOTE_CPF_C)
        except CPF_CNPJValidationError as e:
            raise serializers.ValidationError(str(e))
        return cpf

    def validate_cnpj(self, value):
        cnpj = re.sub(r'\D', '', value or '')
        if not cnpj:
            return cnpj
        qs = Usuario.objects.filter(cnpj=cnpj)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError("CNPJ já cadastrado.")
        try:
            consultar_documento(cnpj, settings.CPF_CNPJ_PACOTE_CNPJ_C)
        except CPF_CNPJValidationError as e:
            raise serializers.ValidationError(str(e))
        return cnpj

    def validate_telefone(self, value):
        value = re.sub(r'\D', '', value or '')
        qs = Usuario.objects.filter(telefone=value)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError("Telefone já cadastrado.")
        return value

    # --------------------- Senha ---------------------
    def validate_password(self, password):
        if len(password or '') < 8:
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

    # --------------------- Criação / Atualização ---------------------
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        # Campos protegidos (se vierem por engano no payload)
        validated_data.pop('groups', None)
        validated_data.pop('user_permissions', None)
        validated_data.pop('is_suspended_self', None)
        validated_data.pop('deactivated_at', None)
        validated_data.pop('deactivated_reason', None)

        validated_data['is_active'] = True

        user = Usuario(**validated_data)
        if password:
            self.validate_password(password)
            user.set_password(password)
        else:
            raise serializers.ValidationError({"password": "Senha é obrigatória."})
        user.save()
        return user

    def update(self, instance, validated_data):
        # Impede alteração direta dos campos de desativação (usamos endpoints próprios)
        for field in ('is_suspended_self', 'deactivated_at', 'deactivated_reason'):
            validated_data.pop(field, None)

        if 'password' in validated_data:
            senha = validated_data.pop('password')
            self.validate_password(senha)
            instance.set_password(senha)

        return super().update(instance, validated_data)

    # --------------------- Regras por tipo + bloqueio em modo leitura ---------------------
    def validate(self, data):
        request = self.context.get('request')
        # Bloqueio amigável extra no serializer (o middleware também protege)
        if request and request.method in ('POST', 'PUT', 'PATCH'):
            user = getattr(request, 'user', None)
            if getattr(user, 'is_authenticated', False) and not getattr(user, 'is_superuser', False):
                if getattr(user, 'is_suspended_self', False):
                    raise serializers.ValidationError("Sua conta está desativada (modo leitura). Reative para alterar dados.")

        tipo = data.get('tipo') or (self.instance.tipo if self.instance else None)
        cpf = data.get('cpf') or (self.instance.cpf if self.instance else None)
        cnpj = data.get('cnpj') or (self.instance.cnpj if self.instance else None)
        sou_empresa = data.get('sou_empresa') or (self.instance.sou_empresa if self.instance else False)
        senha = data.get('password')

        if senha:
            self.validate_password(senha)

        # --- Freelancers: CPF obrigatório ---
        if tipo == 'freelancer':
            if not cpf:
                raise serializers.ValidationError({"cpf": "Freelancers devem fornecer CPF válido."})

        # --- Contratantes: CPF obrigatório, CNPJ só se for empresa ---
        elif tipo == 'contratante':
            if not cpf:
                raise serializers.ValidationError({"cpf": "CPF é obrigatório para contratantes."})
            if sou_empresa and not cnpj:
                raise serializers.ValidationError({"cnpj": "CNPJ é obrigatório para empresas contratantes."})

        return data


# --------------------- Outros Serializers ---------------------

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
    """
    Dados públicos do perfil — com estatísticas adicionais.
    """
    nota_media = serializers.SerializerMethodField()
    trabalhos_publicados = serializers.SerializerMethodField()
    trabalhos_concluidos = serializers.SerializerMethodField()
    avaliacoes_enviadas = serializers.SerializerMethodField()
    avaliacoes_recebidas = serializers.SerializerMethodField()
    denuncias_enviadas = serializers.SerializerMethodField()
    denuncias_recebidas = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = [
            "id", "nome", "tipo", "foto_perfil", "bio",
            "nota_media", "trabalhos_publicados", "trabalhos_concluidos",
            "avaliacoes_enviadas", "avaliacoes_recebidas",
            "denuncias_enviadas", "denuncias_recebidas"
        ]

    # URL absoluta da foto
    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        foto = data.get('foto_perfil')
        if foto and not (str(foto).startswith('http://') or str(foto).startswith('https://')):
            if request is not None:
                data['foto_perfil'] = request.build_absolute_uri(foto)
        return data

    def get_nota_media(self, obj):
        avaliacoes = Avaliacao.objects.filter(avaliado=obj)
        if not avaliacoes.exists():
            return None
        return round(sum(a.nota for a in avaliacoes) / avaliacoes.count(), 2)

    def get_trabalhos_publicados(self, obj):
        if obj.tipo != "contratante":
            return None
        if hasattr(obj, "trabalhos_publicados_count"):
            return obj.trabalhos_publicados_count
        return obj.trabalhos_publicados.count()

    def get_trabalhos_concluidos(self, obj):
        if obj.tipo != "freelancer":
            return None
        if hasattr(obj, "contratos_concluidos_count"):
            return obj.contratos_concluidos_count
        return Contrato.objects.filter(freelancer=obj, status="concluido").count()

    def get_avaliacoes_enviadas(self, obj):
        return Avaliacao.objects.filter(avaliador=obj).count()

    def get_avaliacoes_recebidas(self, obj):
        return Avaliacao.objects.filter(avaliado=obj).count()

    def get_denuncias_enviadas(self, obj):
        from denuncias.models import Denuncia
        return Denuncia.objects.filter(denunciante=obj).count()

    def get_denuncias_recebidas(self, obj):
        from denuncias.models import Denuncia
        return Denuncia.objects.filter(denunciado=obj).count()


class PasswordResetRequestSerializer(serializers.Serializer):
    """Recebe apenas o e-mail para iniciar o reset de senha."""
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Recebe UID + Token + nova senha para confirmar reset."""
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8, write_only=True)

    def validate_new_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("A senha deve ter pelo menos 8 caracteres.")
        if not re.search(r"[A-Z]", value):
            raise serializers.ValidationError("A senha deve conter ao menos uma letra maiúscula.")
        if not re.search(r"[a-z]", value):
            raise serializers.ValidationError("A senha deve conter ao menos uma letra minúscula.")
        if not re.search(r"[0-9]", value):
            raise serializers.ValidationError("A senha deve conter ao menos um número.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", value):
            raise serializers.ValidationError("A senha deve conter ao menos um símbolo especial.")
        return value
