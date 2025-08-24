from rest_framework import serializers
from .models import Habilidade

class HabilidadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Habilidade
        fields = ['id', 'nome', 'categoria', 'subcategoria']
