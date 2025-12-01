from rest_framework import serializers
from .models import Trabalho
from habilidades.models import Habilidade, Ramo
from datetime import date
import re


# Palavras proibidas
PALAVRAS_PROIBIDAS = [
    "merda", "porra", "puta", "puto", "caralho", "buceta", "pinto", "piroca",
    "pau", "rola", "bosta", "arrombado", "vagabundo", "vagabunda", "corno",
    "fdp", "foda-se", "foder", "cu", "cuzão", "desgraçado", "otário", "otaria",
    "asdf", "qwerty", "lorem", "teste", "aaaa", "bbbb", "cccc", "zzzz", "xxx",
]


class RamoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ramo
        fields = ["id", "nome"]


class HabilidadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Habilidade
        fields = ["id", "nome", "categoria", "subcategoria"]


class TrabalhoSerializer(serializers.ModelSerializer):
    # Ramo
    ramo = serializers.CharField(required=False, allow_blank=True, allow_null=True, write_only=True)
    ramo_detalhes = RamoSerializer(source="ramo", read_only=True)

    # Habilidades
    habilidades = serializers.CharField(required=False, allow_blank=True, write_only=True)
    habilidades_detalhes = HabilidadeSerializer(source="habilidades", many=True, read_only=True)

    # Conveniências
    nome_contratante = serializers.SerializerMethodField(read_only=True)
    contratante_id = serializers.SerializerMethodField(read_only=True)

    # Anexo
    anexo = serializers.FileField(required=False, allow_null=True, use_url=True)
    anexo_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Trabalho
        fields = [
            "id", "titulo", "descricao", "prazo", "orcamento", "status",
            "contratante", "contratante_id", "nome_contratante",
            "freelancer", "is_privado", "anexo", "anexo_url",
            "ramo", "ramo_detalhes",
            "habilidades", "habilidades_detalhes",
            "criado_em", "atualizado_em",
        ]
        read_only_fields = [
            "contratante", "status", "is_privado",
            "criado_em", "atualizado_em",
            "habilidades_detalhes", "nome_contratante",
            "contratante_id", "anexo_url", "ramo_detalhes",
        ]

    # Helpers de leitura
    def get_nome_contratante(self, obj):
        if obj.contratante:
            if getattr(obj.contratante, "nome", None):
                return obj.contratante.nome
            if getattr(obj.contratante, "username", None):
                return obj.contratante.username
            if getattr(obj.contratante, "email", None):
                return obj.contratante.email
        return ""

    def get_contratante_id(self, obj):
        return obj.contratante.id if obj.contratante else None

    def get_anexo_url(self, obj):
        """Retorna a URL completa e pública do arquivo no Cloudinary (ou None em erro)."""
        try:
            if not obj.anexo or not hasattr(obj.anexo, "url"):
                return None
            url = obj.anexo.url
            if url.startswith("http://") or url.startswith("https://"):
                return url
            request = self.context.get("request")
            return request.build_absolute_uri(url) if request else url
        except (AttributeError, ValueError, TypeError):
            return None

    # Validações
    def validate_prazo(self, value):
        if value < date.today():
            raise serializers.ValidationError("O prazo deve ser uma data futura.")
        return value

    def validate_anexo(self, value):
        if value:
            max_size = 10 * 1024 * 1024
            if value.size > max_size:
                raise serializers.ValidationError("Arquivo muito grande. Tamanho máximo: 10MB.")
            ext = str(value.name).split(".")[-1].lower()
            tipos = ["pdf", "doc", "docx", "jpg", "jpeg", "png", "zip", "rar"]
            if ext not in tipos:
                raise serializers.ValidationError(f"Tipo de arquivo não permitido. Use: {', '.join(tipos).upper()}")
        return value

    def validate_orcamento(self, value):
        if value <= 0:
            raise serializers.ValidationError("O orçamento deve ser maior que zero.")
        return value

    def validate(self, data):
        usuario = self.context["request"].user
        if usuario.tipo != "contratante" and not usuario.is_superuser:
            raise serializers.ValidationError("Apenas contratantes ou administradores podem publicar trabalhos.")
        return data

    # Create / Update
    def create(self, validated_data):
        habilidades_texto = self._extrair_habilidades()
        ramo_input = self._extrair_ramo(validated_data)
        validated_data["contratante"] = self.context["request"].user

        freelancer = validated_data.get("freelancer")
        validated_data["is_privado"] = bool(freelancer)
        validated_data["status"] = "aberto"

        validated_data.pop("habilidades", None)
        validated_data.pop("ramo", None)
        
        trabalho = super().create(validated_data)

        # Processa ramo
        self._processar_ramo(trabalho, ramo_input)
        
        # Processa habilidades
        self._processar_habilidades(trabalho, habilidades_texto)
        
        return trabalho

    def update(self, instance, validated_data):
        # status não é editável por aqui
        validated_data.pop("status", None)
        # não permite mudar freelancer se já existir
        if "freelancer" in validated_data and instance.freelancer:
            validated_data.pop("freelancer")

        habilidades_texto = self._extrair_habilidades()
        ramo_input = self._extrair_ramo(validated_data)
        
        validated_data.pop("habilidades", None)
        validated_data.pop("ramo", None)

        trabalho = super().update(instance, validated_data)

        # Processa ramo se foi enviado
        if ramo_input is not None:
            self._processar_ramo(trabalho, ramo_input)

        # Processa habilidades se foram enviadas
        if habilidades_texto is not None:
            trabalho.habilidades.clear()
            self._processar_habilidades(trabalho, habilidades_texto)

        return trabalho

    # Internos para ramo
    def _extrair_ramo(self, validated_data):
        """
        Extrai o ramo do request.
        Pode ser: ID (número), nome (string), vazio ou None.
        """
        request = self.context.get("request")
        ramo_input = None
        
        # Tenta pegar do validated_data primeiro
        if "ramo" in validated_data:
            ramo_input = validated_data.get("ramo")
        # Fallback para request.data
        elif request and hasattr(request, "data"):
            ramo_input = request.data.get("ramo")
        
        # Normaliza valor vazio
        if ramo_input in [None, "", "null", "undefined"]:
            return None
            
        return ramo_input

    def _processar_ramo(self, trabalho, ramo_input):
        """
        Processa o ramo:
        - Se for ID numérico, busca pelo ID
        - Se for string (nome), faz get_or_create
        - Valida palavras proibidas
        """
        if ramo_input is None or ramo_input == "":
            trabalho.ramo = None
            trabalho.save(update_fields=["ramo"])
            return
        
        ramo_obj = None
        
        try:
            ramo_id = int(ramo_input)
            ramo_obj = Ramo.objects.filter(id=ramo_id).first()
            if ramo_obj:
                trabalho.ramo = ramo_obj
                trabalho.save(update_fields=["ramo"])
                return
        except (ValueError, TypeError):
            pass
        
        nome_ramo = str(ramo_input).strip()
        
        if not nome_ramo or len(nome_ramo) < 2:
            return
        
        # Valida palavras proibidas
        if any(p.lower() in nome_ramo.lower() for p in PALAVRAS_PROIBIDAS):
            return
        
        # Remove caracteres especiais
        nome_limpo = re.sub(r"[^a-zA-ZÀ-ÿ0-9\s/&\-]", "", nome_ramo)
        
        if len(nome_limpo) < 2:
            return
        
        # Formata: primeira letra maiúscula de cada palavra
        nome_formatado = " ".join(word.capitalize() for word in nome_limpo.split())
        
        ramo_obj, _ = Ramo.objects.get_or_create(nome=nome_formatado)
        trabalho.ramo = ramo_obj
        trabalho.save(update_fields=["ramo"])

    # Internos para habilidades
    def _extrair_habilidades(self):
        request = self.context.get("request")
        habilidades = []
        if request and hasattr(request, "data"):
            if hasattr(request.data, "getlist"):
                habilidades = request.data.getlist("habilidades")
            else:
                habilidades = request.data.get("habilidades", [])
        if isinstance(habilidades, str):
            habilidades = [h.strip() for h in habilidades.split(",") if h.strip()]
        return habilidades

    def _processar_habilidades(self, trabalho, habilidades_texto):
        for nome in habilidades_texto:
            nome_limpo = str(nome).strip()
            if not nome_limpo:
                continue
            if any(p.lower() in nome_limpo.lower() for p in PALAVRAS_PROIBIDAS):
                continue
            nome_limpo = re.sub(r"[^a-zA-ZÀ-ÿ0-9\s]", "", nome_limpo)
            if len(nome_limpo) < 2:
                continue
            nome_formatado = nome_limpo.capitalize()
            habilidade, _ = Habilidade.objects.get_or_create(nome=nome_formatado)
            trabalho.habilidades.add(habilidade)