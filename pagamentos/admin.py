# pagamentos/admin.py
from django.contrib import admin
from django.utils.html import format_html
from .models import Pagamento


@admin.register(Pagamento)
class PagamentoAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'contrato',
        'cliente',
        'valor_formatado',
        'metodo_badge',
        'status_badge',
        'data_criacao',
        'mercadopago_payment_id'
    ]
    list_filter = ['status', 'metodo', 'data_criacao']
    search_fields = [
        'mercadopago_payment_id',
        'payment_intent_id',
        'codigo_transacao',
        'cliente__nome',
        'cliente__email',
        'contrato__trabalho__titulo'
    ]
    readonly_fields = [
        'data_criacao', 
        'mercadopago_payment_id',
        'payment_intent_id',
        'qr_code_preview'
    ]
    list_per_page = 20
    date_hierarchy = 'data_criacao'
    
    # Actions customizadas
    actions = [
        'aprovar_pagamento',
        'rejeitar_pagamento',
        'marcar_como_processando'
    ]
   
    fieldsets = (
        ('📋 Informações Principais', {
            'fields': ('contrato', 'cliente', 'valor', 'metodo', 'status')
        }),
        ('💳 Mercado Pago', {
            'fields': ('mercadopago_payment_id', 'codigo_transacao', 'qr_code_preview'),
            'description': 'Informações da integração com Mercado Pago'
        }),
        ('🔄 Stripe (DEPRECATED)', {
            'fields': ('payment_intent_id',),
            'classes': ('collapse',),
            'description': 'Mantido apenas para compatibilidade'
        }),
        ('📝 Observações', {
            'fields': ('observacoes',),
            'classes': ('collapse',)
        }),
        ('📅 Metadados', {
            'fields': ('data_criacao',),
            'classes': ('collapse',)
        }),
    )
    
    def valor_formatado(self, obj):
        """Exibe o valor formatado em reais"""
        return f"R$ {obj.valor:,.2f}".replace(',', '_').replace('.', ',').replace('_', '.')
    valor_formatado.short_description = "💰 Valor"
    
    def metodo_badge(self, obj):
        """Exibe badge colorido para o método de pagamento"""
        cores = {
            'pix': '#00b894',
            'boleto': '#fdcb6e',
            'card': '#6c5ce7'
        }
        icones = {
            'pix': '⚡',
            'boleto': '📄',
            'card': '💳'
        }
        cor = cores.get(obj.metodo, '#95a5a6')
        icone = icones.get(obj.metodo, '💰')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 5px 10px; border-radius: 5px; font-weight: bold;">'
            '{} {}</span>',
            cor,
            icone,
            obj.get_metodo_display()
        )
    metodo_badge.short_description = "🎯 Método"
    
    def status_badge(self, obj):
        """Exibe badge colorido para o status"""
        cores = {
            'pendente': '#f39c12',
            'em_processamento': '#3498db',
            'aprovado': '#27ae60',
            'rejeitado': '#e74c3c',
            'reembolsado': '#95a5a6'
        }
        icones = {
            'pendente': '⏳',
            'em_processamento': '⚙️',
            'aprovado': '✅',
            'rejeitado': '❌',
            'reembolsado': '↩️'
        }
        cor = cores.get(obj.status, '#95a5a6')
        icone = icones.get(obj.status, '❓')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 5px 10px; border-radius: 5px; font-weight: bold;">'
            '{} {}</span>',
            cor,
            icone,
            obj.get_status_display()
        )
    status_badge.short_description = "📊 Status"
    
    def qr_code_preview(self, obj):
        """Mostra preview do QR Code PIX se disponível"""
        if obj.metodo == 'pix' and obj.codigo_transacao:
            return format_html(
                '<div style="padding: 10px; background: #f8f9fa; border-radius: 5px;">'
                '<strong>Código PIX:</strong><br>'
                '<code style="font-size: 10px; word-break: break-all;">{}</code><br><br>'
                '<a href="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={}" target="_blank">'
                '<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={}" '
                'style="border: 2px solid #ddd; padding: 5px; background: white;"></a>'
                '</div>',
                obj.codigo_transacao[:50] + '...',
                obj.codigo_transacao,
                obj.codigo_transacao
            )
        return "—"
    qr_code_preview.short_description = "📱 QR Code PIX"
    
    # ==================== ACTIONS ====================
    
    def aprovar_pagamento(self, request, queryset):
        """
        ✅ Simula aprovação de pagamento (APENAS PARA TESTES)
        Marca o pagamento como aprovado e conclui o contrato
        """
        count = 0
        for pagamento in queryset:
            if pagamento.status in ['pendente', 'em_processamento']:
                # Atualiza o pagamento
                pagamento.status = 'aprovado'
                pagamento.save()
                
                # Conclui o contrato
                contrato = pagamento.contrato
                if contrato.status != 'concluido':
                    contrato.status = 'concluido'
                    contrato.save()
                    
                    # Conclui o trabalho
                    if contrato.trabalho.status != 'concluido':
                        contrato.trabalho.status = 'concluido'
                        contrato.trabalho.save()
                
                count += 1
        
        self.message_user(
            request, 
            f"✅ {count} pagamento(s) aprovado(s) com sucesso! Os contratos foram concluídos.",
            level='success'
        )
    aprovar_pagamento.short_description = "✅ Aprovar pagamentos (TESTE)"
    
    def rejeitar_pagamento(self, request, queryset):
        """
        ❌ Marca pagamentos como rejeitados (APENAS PARA TESTES)
        """
        count = queryset.filter(status__in=['pendente', 'em_processamento']).update(status='rejeitado')
        self.message_user(
            request,
            f"❌ {count} pagamento(s) marcado(s) como rejeitado(s).",
            level='warning'
        )
    rejeitar_pagamento.short_description = "❌ Rejeitar pagamentos (TESTE)"
    
    def marcar_como_processando(self, request, queryset):
        """
        ⚙️ Marca pagamentos como em processamento
        """
        count = queryset.filter(status='pendente').update(status='em_processamento')
        self.message_user(
            request,
            f"⚙️ {count} pagamento(s) marcado(s) como 'Em Processamento'.",
            level='info'
        )
    marcar_como_processando.short_description = "⚙️ Marcar como processando"
    
    def get_queryset(self, request):
        """Otimiza consultas com select_related"""
        qs = super().get_queryset(request)
        return qs.select_related('contrato', 'cliente', 'contrato__trabalho')