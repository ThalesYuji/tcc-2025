from django.contrib import admin
from .models import Habilidade

@admin.register(Habilidade)
class HabilidadeAdmin(admin.ModelAdmin):
    list_display = ('id', 'nome', 'categoria', 'subcategoria')
    search_fields = ('nome', 'categoria', 'subcategoria')
    list_filter = ('categoria', 'subcategoria')
