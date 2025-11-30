from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from cloudinary_storage.storage import MediaCloudinaryStorage


class UsuarioManager(BaseUserManager):
    """Gerencia a criação de usuários e superusuários."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('O email é obrigatório.')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superusuário precisa ter is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superusuário precisa ter is_superuser=True.')
        return self.create_user(email, password, **extra_fields)


class Usuario(AbstractBaseUser, PermissionsMixin):
    """
    Modelo unificado de usuário do sistema ProFreelaBR.
    Inclui:
    - Tipos: freelancer / contratante
    - Modo leitura (desativação voluntária)
    - Punições administrativas: advertência, suspensão e banimento
    """

    # ---------------------------
    # TIPOS DE USUÁRIO
    # ---------------------------
    TIPO_USUARIO = (
        ('freelancer', 'Freelancer'),
        ('contratante', 'Contratante'),
    )

    # ---------------------------
    # DADOS PRINCIPAIS
    # ---------------------------
    email = models.EmailField(unique=True)
    nome = models.CharField(max_length=100)
    tipo = models.CharField(max_length=20, choices=TIPO_USUARIO)

    # ---------------------------
    # IDENTIFICADORES
    # ---------------------------
    cpf = models.CharField(max_length=14, blank=True, null=True, unique=True)
    cnpj = models.CharField(max_length=18, blank=True, null=True, unique=True)
    sou_empresa = models.BooleanField(default=False)
    telefone = models.CharField(max_length=15)

    # ---------------------------
    # PERFIL / CONFIGURAÇÕES
    # ---------------------------
    foto_perfil = models.ImageField(
        upload_to='fotos_perfil/',
        storage=MediaCloudinaryStorage(),
        null=True,
        blank=True
    )
    nota_media = models.FloatField(null=True, blank=True)
    notificacao_email = models.BooleanField(default=True)
    bio = models.TextField(blank=True, null=True)

    # ---------------------------
    # DESATIVAÇÃO VOLUNTÁRIA (modo leitura)
    # ---------------------------
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
        help_text="Motivo informado pelo usuário ao desativar."
    )

    # ---------------------------
    # 🔥 PUNIÇÕES ADMINISTRATIVAS (NOVO)
    # ---------------------------
    # suspensão aplicada por admin
    is_suspended_admin = models.BooleanField(
        default=False,
        help_text="Usuário suspenso temporariamente por administrador."
    )
    suspenso_ate = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Data em que a suspensão expira."
    )
    motivo_suspensao_admin = models.TextField(
        null=True,
        blank=True,
        help_text="Motivo da suspensão aplicada pelo admin."
    )

    # banimento permanente
    banido = models.BooleanField(
        default=False,
        help_text="Se verdadeiro, o usuário está banido permanentemente."
    )
    banido_em = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Data do banimento."
    )
    motivo_banimento = models.TextField(
        null=True,
        blank=True,
        help_text="Motivo do banimento aplicado pelo admin."
    )

    # ---------------------------
    # PERMISSÕES DJANGO
    # ---------------------------
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    # ---------------------------
    # MANAGER
    # ---------------------------
    objects = UsuarioManager()

    # ---------------------------
    # CAMPOS OBRIGATÓRIOS
    # ---------------------------
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nome', 'tipo', 'cpf', 'telefone']

    # ---------------------------
    # REPRESENTAÇÕES
    # ---------------------------
    def __str__(self):
        return f"{self.nome} ({self.tipo})"

    def get_full_name(self):
        return self.nome

    def get_short_name(self):
        return self.nome.split()[0] if self.nome else self.email

    # ---------------------------
    # HELPERS DE STATUS
    # ---------------------------
    @property
    def is_read_only(self) -> bool:
        """Modo leitura voluntário."""
        return bool(self.is_suspended_self)

    @property
    def is_suspended(self) -> bool:
        """Suspensão administrativa ativa."""
        if self.is_suspended_admin:
            if self.suspenso_ate and timezone.now() > self.suspenso_ate:
                return False
            return True
        return False

    def desativar(self, motivo: str | None = None):
        """Modo leitura voluntário."""
        self.is_suspended_self = True
        self.deactivated_at = timezone.now()
        if motivo:
            self.deactivated_reason = motivo
        self.save(update_fields=["is_suspended_self", "deactivated_at", "deactivated_reason"])

    def reativar(self, limpar_motivo: bool = False):
        """Retira modo leitura voluntário."""
        self.is_suspended_self = False
        self.deactivated_at = None
        if limpar_motivo:
            self.deactivated_reason = None
            self.save(update_fields=["is_suspended_self", "deactivated_at", "deactivated_reason"])
        else:
            self.save(update_fields=["is_suspended_self", "deactivated_at"])
