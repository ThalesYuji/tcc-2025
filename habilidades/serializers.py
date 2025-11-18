# habilidades/serializers.py
from rest_framework import serializers
from .models import Habilidade, Ramo


class HabilidadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Habilidade
        fields = ['id', 'nome', 'categoria', 'subcategoria']


class RamoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ramo
        fields = ['id', 'nome']