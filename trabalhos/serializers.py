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
    habilidades = serializers.CharField(required=False, allow_blank=True, write_only=True)
    habilidades_detalhes = HabilidadeSerializer(source='habilidades', many=True, read_only=True)
    nome_contratante = serializers.SerializerMethodField(read_only=True)
    contratante_id = serializers.SerializerMethodField(read_only=True)
    
    anexo = serializers.FileField(required=False, allow_null=True, use_url=True)
    anexo_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Trabalho
        fields = [
            'id', 'titulo', 'descricao', 'prazo', 'orcamento', 'status',
            'contratante', 'contratante_id', 'nome_contratante',
            'freelancer', 'is_privado', 'anexo', 'anexo_url',
            'habilidades', 'habilidades_detalhes',
            'criado_em', 'atualizado_em'
        ]
        read_only_fields = [
            'contratante', 'status', 'is_privado',
            'criado_em', 'atualizado_em',
            'habilidades_detalhes', 'nome_contratante', 'contratante_id', 'anexo_url'
        ]

    def get_nome_contratante(self, obj):
        if obj.contratante:
            if hasattr(obj.contratante, 'nome') and obj.contratante.nome:
                return obj.contratante.nome
            elif hasattr(obj.contratante, 'username'):
                return obj.contratante.username
            elif hasattr(obj.contratante, 'email'):
                return obj.contratante.email
        return ""

    def get_contratante_id(self, obj):
        return obj.contratante.id if obj.contratante else None

    def get_anexo_url(self, obj):
        try:
            if obj.anexo and hasattr(obj.anexo, 'url'):
                request = self.context.get('request')
                url = obj.anexo.url
                
                if url.startswith('http'):
                    return url
                
                if request:
                    return request.build_absolute_uri(url)
                
                return url
        except Exception:
            pass
        return None

    def validate_prazo(self, value):
        if value < date.today():
            raise serializers.ValidationError("O prazo deve ser uma data futura.")
        return value

    def validate_anexo(self, value):
        if value:
            max_size = 10 * 1024 * 1024
            if value.size > max_size:
                raise serializers.ValidationError(
                    "Arquivo muito grande. Tamanho máximo: 10MB."
                )
            
            ext = str(value.name).split('.')[-1].lower()
            tipos_permitidos = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'zip', 'rar']
            if ext not in tipos_permitidos:
                raise serializers.ValidationError(
                    f"Tipo de arquivo não permitido. Use: {', '.join(tipos_permitidos).upper()}"
                )
        return value

    def validate_orcamento(self, value):
        if value <= 0:
            raise serializers.ValidationError("O orçamento deve ser maior que zero.")
        return value

    def validate(self, data):
        usuario = self.context['request'].user
        if usuario.tipo != 'contratante' and not usuario.is_superuser:
            raise serializers.ValidationError("Apenas contratantes ou administradores podem publicar trabalhos.")
        return data

    def create(self, validated_data):
        habilidades_texto = self._extrair_habilidades()
        validated_data['contratante'] = self.context['request'].user

        freelancer = validated_data.get('freelancer')
        validated_data['is_privado'] = bool(freelancer)
        validated_data['status'] = 'aberto'

        validated_data.pop('habilidades', None)
        
        trabalho = super().create(validated_data)
        self._processar_habilidades(trabalho, habilidades_texto)
        return trabalho

    def update(self, instance, validated_data):
        if 'status' in validated_data:
            validated_data.pop('status')
        if 'freelancer' in validated_data and instance.freelancer:
            validated_data.pop('freelancer')

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