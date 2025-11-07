from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from cloudinary_storage.storage import MediaCloudinaryStorage


class UsuarioManager(BaseUserManager):
    """Gerencia a criação de usuários e superusuários."""
    def create_user(self, email, password=None, **extra_fields):
        """
        Cria um usuário comum.
        - Normaliza e valida o e-mail
        - Define a senha
        """
        if not email:
            raise ValueError('O email é obrigatório.')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Cria um superusuário (admin)."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superusuário precisa ter is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superusuário precisa ter is_superuser=True.')
        return self.create_user(email, password, **extra_fields)


class Usuario(AbstractBaseUser, PermissionsMixin):
    """
    Modelo de usuário unificado do sistema.
    Tipos possíveis: freelancer, contratante.
    Agora com suporte ao Modo Foco via campo 'status'.
    """
    # ---- Tipos de usuário
    TIPO_USUARIO = (
        ('freelancer', 'Freelancer'),
        ('contratante', 'Contratante'),
    )

    # ---- Status de disponibilidade/visibilidade
    STATUS_USUARIO = (
        ('ativo', 'Ativo'),          # funcionamento completo
        ('foco', 'Modo Foco'),       # oculta em buscas, bloqueia novas propostas, mantém chat em contratos ativos
        ('desativado', 'Desativado') # reservado para futura “desativação de conta”
    )

    # ========= Dados principais =========
    email = models.EmailField(unique=True)
    nome = models.CharField(max_length=100)
    tipo = models.CharField(max_length=20, choices=TIPO_USUARIO)

    # ========= Identificadores =========
    cpf = models.CharField(max_length=14, blank=True, null=True, unique=True)
    cnpj = models.CharField(max_length=18, blank=True, null=True, unique=True)
    sou_empresa = models.BooleanField(default=False)  # indica se o contratante é empresa
    telefone = models.CharField(max_length=15)

    # ========= Perfil e configurações =========
    foto_perfil = models.ImageField(
        upload_to='fotos_perfil/',
        storage=MediaCloudinaryStorage(),
        null=True,
        blank=True
    )
    nota_media = models.FloatField(null=True, blank=True)
    notificacao_email = models.BooleanField(default=True)
    bio = models.TextField(blank=True, null=True)

    # ========= Disponibilidade / visibilidade =========
    # ⚠️ Não confundir com is_active do Django.
    # Este 'status' controla regras de negócio (busca, propostas, notificações).
    status = models.CharField(
        max_length=12,
        choices=STATUS_USUARIO,
        default='ativo',
        db_index=True,  # ajuda nos filtros frequentes
    )

    # ========= Permissões do Django =========
    is_active = models.BooleanField(default=True)  # controla login pelo Django
    is_staff = models.BooleanField(default=False)  # acesso ao admin

    # ========= Gerenciador customizado =========
    objects = UsuarioManager()

    # ========= Campos obrigatórios =========
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nome', 'tipo', 'cpf', 'telefone']

    # ========= Helpers de domínio (qualidade de vida) =========
    @property
    def is_ativo(self) -> bool:
        """Retorna True se o usuário está em operação completa."""
        return self.status == 'ativo'

    @property
    def em_foco(self) -> bool:
        """Retorna True se o usuário está em Modo Foco."""
        return self.status == 'foco'

    @property
    def desativado(self) -> bool:
        """Retorna True se o usuário está desativado (uso futuro)."""
        return self.status == 'desativado'

    # ========= Representações =========
    def __str__(self):
        return f"{self.nome} ({self.tipo})"

    def get_full_name(self):
        return self.nome

    def get_short_name(self):
        return self.nome.split()[0] if self.nome else self.email
