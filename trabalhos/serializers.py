from rest_framework import serializers
from .models import Trabalho
from habilidades.models import Habilidade
from datetime import date
import re

class HabilidadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Habilidade
        fields = ['id', 'nome', 'categoria', 'subcategoria']

class TrabalhoSerializer(serializers.ModelSerializer):
    habilidades = serializers.CharField(required=False, allow_blank=True)
    habilidades_detalhes = HabilidadeSerializer(source='habilidades', many=True, read_only=True)
    nome_cliente = serializers.SerializerMethodField(read_only=True)
    cliente_id = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Trabalho
        fields = '__all__'
        read_only_fields = [
            'cliente', 'status', 'criado_em', 'atualizado_em',
            'habilidades_detalhes', 'nome_cliente', 'cliente_id'
        ]
        # ⬆️  'status' permanece como read_only para impedir mudanças diretas via API

    def get_nome_cliente(self, obj):
        if obj.cliente:
            if hasattr(obj.cliente, 'nome') and obj.cliente.nome:
                return obj.cliente.nome
            elif hasattr(obj.cliente, 'username'):
                return obj.cliente.username
            elif hasattr(obj.cliente, 'email'):
                return obj.cliente.email
        return ""

    def get_cliente_id(self, obj):
        return obj.cliente.id if obj.cliente else None

    def validate_prazo(self, value):
        if value < date.today():
            raise serializers.ValidationError("O prazo deve ser uma data futura.")
        return value

    def validate_anexo(self, value):
        if value:
            ext = str(value.name).split('.')[-1].lower()
            tipos_permitidos = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']
            if ext not in tipos_permitidos:
                raise serializers.ValidationError(
                    "Tipo de arquivo não permitido. Use: PDF, DOC, DOCX, JPG, JPEG ou PNG."
                )
        return value

    def validate_orcamento(self, value):
        if value <= 0:
            raise serializers.ValidationError("O orçamento deve ser maior que zero.")
        return value

    def validate(self, data):
        request = self.context.get('request')
        usuario = getattr(request, 'user', None)
        if not usuario:
            return data
        if usuario.tipo != 'cliente' and not usuario.is_superuser:
            raise serializers.ValidationError(
                "Apenas usuários do tipo 'cliente' ou administradores podem publicar trabalhos."
            )
        return data

    def create(self, validated_data):
        habilidades_texto = self._extrair_habilidades()
        validated_data['cliente'] = self.context['request'].user
        validated_data.pop('habilidades', None)
        trabalho = super().create(validated_data)
        self._processar_habilidades(trabalho, habilidades_texto)
        return trabalho

    def update(self, instance, validated_data):
        """
        ⚠️ Bloqueia alteração direta de status via API.
        O status só pode mudar pelos fluxos de propostas/contratos.
        """
        if 'status' in validated_data:
            validated_data.pop('status')

        habilidades_texto = self._extrair_habilidades()
        validated_data.pop('habilidades', None)
        trabalho = super().update(instance, validated_data)

        if habilidades_texto is not None:
            trabalho.habilidades.clear()
            self._processar_habilidades(trabalho, habilidades_texto)

        return trabalho

    def _extrair_habilidades(self):
        request = self.context.get('request')
        habilidades = []

        if request and hasattr(request, 'data'):
            if hasattr(request.data, 'getlist'):
                habilidades = request.data.getlist('habilidades')
            else:
                habilidades = request.data.get('habilidades', [])

        if isinstance(habilidades, str):
            habilidades = [h.strip() for h in habilidades.split(',') if h.strip()]

        return habilidades

    def _processar_habilidades(self, trabalho, habilidades_texto):
        PALAVRAS_PROIBIDAS = [
            "merda", "porra", "puta", "puto", "caralho", "buceta", "pinto", "piroca",
            "pau", "rola", "bosta", "arrombado", "vagabundo", "vagabunda", "corno",
            "fdp", "foda-se", "foder", "cu", "cuzão", "desgraçado", "otário", "otaria",
            "asdf", "qwerty", "lorem", "teste", "aaaa", "bbbb", "cccc", "zzzz", "xxx",
        ]

        for nome in habilidades_texto:
            nome_limpo = str(nome).strip()
            if not nome_limpo:
                continue
            if any(p.lower() in nome_limpo.lower() for p in PALAVRAS_PROIBIDAS):
                continue
            nome_limpo = re.sub(r'[^a-zA-ZÀ-ÿ0-9\s]', '', nome_limpo)
            if len(nome_limpo) < 2:
                continue
            nome_formatado = nome_limpo.capitalize()
            habilidade, _ = Habilidade.objects.get_or_create(nome=nome_formatado)
            trabalho.habilidades.add(habilidade)
