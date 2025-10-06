# pagamentos/admin.py
from django.contrib import admin
from .models import Pagamento


@admin.register(Pagamento)
class PagamentoAdmin(admin.ModelAdmin):
    list_display = [
        'id', 
        'contrato', 
        'cliente', 
        'valor', 
        'metodo', 
        'status', 
        'data_criacao',
        'payment_intent_id'
    ]
    list_filter = ['status', 'metodo', 'data_criacao']
    search_fields = [
        'payment_intent_id', 
        'codigo_transacao', 
        'cliente__nome',
        'contrato__trabalho__titulo'
    ]
    readonly_fields = ['data_criacao', 'payment_intent_id']
    list_editable = ['status']  # Permite editar status direto na lista
    
    fieldsets = (
        ('Informações Principais', {
            'fields': ('contrato', 'cliente', 'valor', 'metodo', 'status')
        }),
        ('Stripe', {
            'fields': ('payment_intent_id', 'codigo_transacao')
        }),
        ('Observações', {
            'fields': ('observacoes',),
            'classes': ('collapse',)
        }),
        ('Metadados', {
            'fields': ('data_criacao',),
            'classes': ('collapse',)
        }),
    )