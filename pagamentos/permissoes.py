from rest_framework.permissions import BasePermission, SAFE_METHODS


class PermissaoPagamento(BasePermission):
    """
    Permite que:
    - Usuários autenticados possam criar pagamentos via actions customizadas
    - Apenas o cliente do contrato possa criar/editar o pagamento
    - Cliente, freelancer e admin podem visualizar
    - Apenas admin pode deletar
    - Admin pode tudo
    """
    
    def has_permission(self, request, view):
        """
        Permissão de nível de view (para actions customizadas)
        """
        # Admin sempre tem permissão
        if request.user and request.user.is_superuser:
            return True
        
        # Usuário deve estar autenticado
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Permite actions customizadas (criar-pix, criar-boleto, criar-cartao)
        if view.action in ['criar_pix', 'criar_boleto', 'criar_cartao', 'consultar_status']:
            return True
        
        # Permite listagem e leitura para usuários autenticados
        if view.action in ['list', 'retrieve']:
            return True
        
        # Para create padrão via POST /pagamentos/ (se ainda usar)
        if view.action == 'create':
            return True
        
        # Outras ações precisam de permissão de objeto
        return True
    
    def has_object_permission(self, request, view, obj):
        """
        Permissão de nível de objeto (para operações em pagamentos existentes)
        """
        # Admin sempre tem permissão
        if request.user.is_superuser:
            return True
        
        # Métodos seguros (GET, HEAD, OPTIONS) - permite visualização
        if request.method in SAFE_METHODS:
            return (
                request.user == obj.cliente or
                request.user == obj.contrato.cliente or
                request.user == obj.contrato.freelancer
            )
        
        # Apenas admin pode deletar pagamento
        if request.method == 'DELETE':
            return False
        
        # Só cliente do contrato pode criar/editar
        return request.user == obj.cliente or request.user == obj.contrato.cliente