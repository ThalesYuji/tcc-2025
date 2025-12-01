from django.contrib import admin
from django.utils.safestring import mark_safe
from .models import Trabalho


@admin.register(Trabalho)
class TrabalhoAdmin(admin.ModelAdmin):
    # Listagem
    list_display = (
        "id",
        "titulo",
        "contratante_name",
        "freelancer_name",
        "ramo",
        "status",
        "is_privado",
        "prazo",
        "orcamento",
        "criado_em",
    )
    list_select_related = ("contratante", "freelancer", "ramo")
    list_filter = ("status", "is_privado", "ramo", "prazo", "criado_em")
    
    search_fields = (
        "titulo",
        "descricao",
        "contratante__email",
        "contratante__nome",
        "freelancer__email",
        "freelancer__nome",
        "habilidades__nome",
        "ramo__nome",
    )
    ordering = ("-criado_em", "-id")
    
    # Formulário
    readonly_fields = ("criado_em", "atualizado_em", "anexo_link")
    autocomplete_fields = ("contratante", "freelancer")
    filter_horizontal = ("habilidades",)
    
    fieldsets = (
        ("Informações básicas", {
            "fields": ("titulo", "descricao", "status")
        }),
        ("Prazos e orçamento", {
            "fields": ("prazo", "orcamento")
        }),
        ("Participantes", {
            "fields": ("contratante", "freelancer", "is_privado")
        }),
        ("Categorização", {
            "fields": ("ramo", "habilidades")
        }),
        ("Anexo", {
            "fields": ("anexo", "anexo_link")
        }),
        ("Metadados", {
            "fields": ("criado_em", "atualizado_em"),
            "classes": ("collapse",)
        }),
    )
    
    # Otimização do queryset
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related("contratante", "freelancer", "ramo").prefetch_related("habilidades")
    
    # Colunas auxiliares
    def contratante_name(self, obj):
        u = obj.contratante
        if not u:
            return "-"
        return u.nome or u.email
    contratante_name.short_description = "Contratante"
    
    def freelancer_name(self, obj):
        u = obj.freelancer
        if not u:
            return "-"
        return u.nome or u.email
    freelancer_name.short_description = "Freelancer"
    
    def anexo_link(self, obj):
        if obj.anexo and hasattr(obj.anexo, "url") and obj.anexo.url:
            return mark_safe(f'<a href="{obj.anexo.url}" target="_blank">Baixar anexo</a>')
        return "—"
    anexo_link.short_description = "Anexo"
    
    # Ações em massa
    actions = ["marcar_como_concluido", "marcar_como_cancelado", "marcar_como_em_andamento"]
    
    def marcar_como_concluido(self, request, queryset):
        updated = queryset.update(status="concluido")
        self.message_user(request, f"{updated} trabalho(s) marcado(s) como concluído.")
    marcar_como_concluido.short_description = "Marcar selecionados como Concluído"
    
    def marcar_como_cancelado(self, request, queryset):
        updated = queryset.update(status="cancelado")
        self.message_user(request, f"{updated} trabalho(s) marcado(s) como cancelado.")
    marcar_como_cancelado.short_description = "Marcar selecionados como Cancelado"
    
    def marcar_como_em_andamento(self, request, queryset):
        updated = queryset.update(status="em_andamento")
        self.message_user(request, f"{updated} trabalho(s) marcado(s) como em andamento.")
    marcar_como_em_andamento.short_description = "Marcar selecionados como Em andamento"