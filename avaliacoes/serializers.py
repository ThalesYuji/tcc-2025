from rest_framework import serializers
from django.db import models
from .models import Avaliacao
from usuarios.models import Usuario
import re

# 🔹 Palavras proibidas em comentários
PALAVRAS_PROIBIDAS = ['ofensa', 'palavrão', 'xingar', 'idiota', 'burro']


class UsuarioBasicoSerializer(serializers.ModelSerializer):
    """Serializer simplificado para exibir dados básicos do usuário"""
    class Meta:
        model = Usuario
        fields = ['id', 'nome']


class AvaliacaoSerializer(serializers.ModelSerializer):
    """Serializer principal das avaliações"""
    avaliador = UsuarioBasicoSerializer(read_only=True)
    avaliado = UsuarioBasicoSerializer(read_only=True)

    titulo_trabalho = serializers.SerializerMethodField()
    id_trabalho = serializers.SerializerMethodField()

    class Meta:
        model = Avaliacao
        fields = '__all__'
        read_only_fields = ['avaliador', 'avaliado']

    # ----------------------------
    # CAMPOS EXTRAS
    # ----------------------------
    def get_titulo_trabalho(self, obj):
        if obj.contrato and obj.contrato.trabalho:
            return obj.contrato.trabalho.titulo
        return None

    def get_id_trabalho(self, obj):
        if obj.contrato and obj.contrato.trabalho:
            return obj.contrato.trabalho.id
        return None

    # ----------------------------
    # VALIDAÇÕES
    # ----------------------------
    def validate_nota(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("A nota deve estar entre 1 e 5.")
        return value

    def validate_comentario(self, value):
        if value and len(value) > 500:
            raise serializers.ValidationError("O comentário deve ter no máximo 500 caracteres.")
        if value:
            for palavra in PALAVRAS_PROIBIDAS:
                if re.search(rf"\b{palavra}\b", value, re.IGNORECASE):
                    raise serializers.ValidationError("Comentário contém palavras ofensivas ou inapropriadas.")
        return value

    def validate(self, data):
        """
        Validações principais:
        - Só contratante ou freelancer do contrato podem avaliar.
        - Avaliação só é permitida após o contrato estar concluído.
        - Bloqueia avaliação duplicada.
        - Define avaliador e avaliado automaticamente.
        """
        request = self.context.get('request')
        contrato = data.get('contrato')

        if not contrato:
            raise serializers.ValidationError("Contrato é obrigatório.")

        avaliador = request.user

        # 🔹 Define quem está sendo avaliado
        if avaliador == contrato.contratante:
            avaliado = contrato.freelancer
        elif avaliador == contrato.freelancer:
            avaliado = contrato.contratante
        else:
            raise serializers.ValidationError("Você não faz parte deste contrato.")

        # 🔹 Só permite avaliação após conclusão
        if contrato.status != 'concluido':
            raise serializers.ValidationError("A avaliação só pode ser feita após a conclusão do contrato.")

        # 🔹 Bloqueia avaliações duplicadas
        if Avaliacao.objects.filter(contrato=contrato, avaliador=avaliador).exists():
            raise serializers.ValidationError("Você já avaliou esse contrato.")

        # Injeta automaticamente avaliador e avaliado
        data['avaliador'] = avaliador
        data['avaliado'] = avaliado

        return data

    # ----------------------------
    # CREATE / UPDATE
    # ----------------------------
    def create(self, validated_data):
        avaliacao = super().create(validated_data)
        self.atualizar_nota_media(avaliacao.avaliado)
        return avaliacao

    def update(self, instance, validated_data):
        avaliacao = super().update(instance, validated_data)
        self.atualizar_nota_media(avaliacao.avaliado)
        return avaliacao

    # ----------------------------
    # MÉTODO AUXILIAR
    # ----------------------------
    def atualizar_nota_media(self, usuario):
        """
        Atualiza a nota média do usuário avaliado
        com base em todas as avaliações recebidas.
        """
        avaliacoes = Avaliacao.objects.filter(avaliado=usuario)
        if avaliacoes.exists():
            media = avaliacoes.aggregate(models.Avg('nota'))['nota__avg']
            usuario.nota_media = round(media, 2)
        else:
            usuario.nota_media = None
        usuario.save(update_fields=['nota_media'])
