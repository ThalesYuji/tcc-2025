from django.db import models
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
    Tipos possíveis: freelancer, contratante, admin.
    Agora com campo 'sou_empresa' para contratantes que são empresas.
    """
    TIPO_USUARIO = (
        ('freelancer', 'Freelancer'),
        ('contratante', 'Contratante'),
    )

    # Dados principais
    email = models.EmailField(unique=True)
    nome = models.CharField(max_length=100)
    tipo = models.CharField(max_length=20, choices=TIPO_USUARIO)

    # Identificadores
    cpf = models.CharField(max_length=14, blank=True, null=True, unique=True)
    cnpj = models.CharField(max_length=18, blank=True, null=True, unique=True)
    sou_empresa = models.BooleanField(default=False)  # ✅ NOVO CAMPO: indica se o contratante é empresa
    telefone = models.CharField(max_length=15)

    # Perfil e configurações
    foto_perfil = models.ImageField(
        upload_to='fotos_perfil/',
        storage=MediaCloudinaryStorage(),
        null=True,
        blank=True
    )
    nota_media = models.FloatField(null=True, blank=True)
    notificacao_email = models.BooleanField(default=True)
    bio = models.TextField(blank=True, null=True)

    # Permissões e status
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    # Gerenciador customizado
    objects = UsuarioManager()

    # Campos obrigatórios
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nome', 'tipo', 'cpf', 'telefone']

    # Representação
    def __str__(self):
        return f"{self.nome} ({self.tipo})"

    def get_full_name(self):
        return self.nome

    def get_short_name(self):
        return self.nome.split()[0] if self.nome else self.email
