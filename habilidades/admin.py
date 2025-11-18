# habilidades/admin.py
from django.contrib import admin
from .models import Habilidade, Ramo


@admin.register(Ramo)
class RamoAdmin(admin.ModelAdmin):
    list_display = ("id", "nome")
    search_fields = ("nome",)
    ordering = ("nome",)


@admin.register(Habilidade)
class HabilidadeAdmin(admin.ModelAdmin):
    list_display = ("id", "nome", "categoria", "subcategoria")
    search_fields = ("nome", "categoria", "subcategoria")
    list_filter = ("categoria", "subcategoria")
    ordering = ("nome",)
