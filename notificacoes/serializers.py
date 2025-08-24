from rest_framework import serializers
from .models import Notificacao

class NotificacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacao
        fields = ["id", "mensagem", "link", "lida", "data_criacao"]
        read_only_fields = ["id", "mensagem", "link", "data_criacao"]
