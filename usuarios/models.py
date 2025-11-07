# usuarios/models.py
from django.db import models
from django.utils import timezone
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

    🔒 Desativação voluntária (modo leitura):
    - is_suspended_self=True => usuário pode autenticar, mas fica em read-only.
    - deactivated_at => quando desativou.
    - deactivated_reason => motivo opcional informado pelo próprio usuário.
    """

    # ---- Tipos de usuário
    TIPO_USUARIO = (
        ('freelancer', 'Freelancer'),
        ('contratante', 'Contratante'),
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

    # ========= Desativação voluntária (modo leitura) =========
    is_suspended_self = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Se verdadeiro, o usuário está em modo leitura (sem criar/editar ações)."
    )
    deactivated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Momento em que o usuário desativou a conta."
    )
    deactivated_reason = models.TextField(
        null=True,
        blank=True,
        help_text="Motivo opcional informado pelo usuário ao desativar."
    )

    # ========= Permissões do Django =========
    is_active = models.BooleanField(default=True)   # controla login pelo Django
    is_staff = models.BooleanField(default=False)   # acesso ao admin

    # ========= Gerenciador customizado =========
    objects = UsuarioManager()

    # ========= Campos obrigatórios =========
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nome', 'tipo', 'cpf', 'telefone']

    # ========= Representações =========
    def __str__(self):
        return f"{self.nome} ({self.tipo})"

    def get_full_name(self):
        return self.nome

    def get_short_name(self):
        return self.nome.split()[0] if self.nome else self.email

    # ========= Helpers de status =========
    @property
    def is_read_only(self) -> bool:
        """Retorna True quando o usuário está em modo leitura (desativado por si)."""
        return bool(self.is_suspended_self)

    def desativar(self, motivo: str | None = None):
        """Coloca o usuário em modo leitura."""
        self.is_suspended_self = True
        self.deactivated_at = timezone.now()
        if motivo:
            self.deactivated_reason = motivo
        self.save(update_fields=["is_suspended_self", "deactivated_at", "deactivated_reason"])

    def reativar(self, limpar_motivo: bool = False):
        """Sai do modo leitura."""
        self.is_suspended_self = False
        self.deactivated_at = None
        if limpar_motivo:
            self.deactivated_reason = None
            self.save(update_fields=["is_suspended_self", "deactivated_at", "deactivated_reason"])
        else:
            self.save(update_fields=["is_suspended_self", "deactivated_at"])
