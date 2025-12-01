from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(BaseUserAdmin):
    search_fields = ('email', 'nome', 'cpf', 'cnpj')
    
    # Listagem
    list_display = ('email', 'nome', 'tipo', 'is_active', 'is_staff', 'is_suspended_self')
    list_filter = ('tipo', 'is_active', 'is_staff', 'is_superuser', 'is_suspended_self')
    ordering = ('email',)
    
    # Campos no formulário de edição
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Informações Pessoais', {
            'fields': ('nome', 'cpf', 'cnpj', 'sou_empresa', 'telefone', 'foto_perfil', 'bio', 'nota_media')
        }),
        ('Tipo e Configurações', {
            'fields': ('tipo', 'notificacao_email')
        }),
        ('Desativação Voluntária', {
            'fields': ('is_suspended_self', 'deactivated_at', 'deactivated_reason'),
            'classes': ('collapse',)
        }),
        ('Permissões Django', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
            'classes': ('collapse',)
        }),
    )
    
    # Campos no formulário de criação
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'nome', 'tipo', 'cpf', 'telefone', 'password1', 'password2'),
        }),
    )
    
    # Campos somente leitura
    readonly_fields = ('deactivated_at',)