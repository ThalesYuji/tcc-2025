from pathlib import Path
from datetime import timedelta
import os
import dj_database_url
from dotenv import load_dotenv
from urllib.parse import urlparse
import pymysql  # ✅ Driver MySQL
pymysql.install_as_MySQLdb()  # ✅ Faz Django usar o PyMySQL

# ------------------------
# Caminho base do projeto
# ------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

# ------------------------
# Carrega variáveis do .env
# ------------------------
load_dotenv(BASE_DIR / ".env")

# ------------------------
# Segurança
# ------------------------
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-123')
DEBUG = os.getenv('DEBUG', 'False') == 'True'

# ------------------------
# Funções auxiliares
# ------------------------
def _host_from_url(url: str | None) -> str | None:
    if not url:
        return None
    try:
        p = urlparse(url)
        return p.netloc or None
    except Exception:
        return None


def _origin(url: str | None) -> str | None:
    if not url:
        return None
    try:
        p = urlparse(url)
        if p.scheme and p.netloc:
            return f"{p.scheme}://{p.netloc}"
    except Exception:
        pass
    return None

# ------------------------
# URLs e Hosts
# ------------------------
SITE_URL = os.getenv("SITE_URL", "").rstrip("/")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
FRONT_RETURN_URL = os.getenv("FRONT_RETURN_URL", f"{FRONTEND_URL}/checkout/retorno").rstrip("/")
MP_WEBHOOK_URL = os.getenv("MP_WEBHOOK_URL", f"{SITE_URL}/mercadopago/webhook/").rstrip("/")

_default_allowed = ['localhost', '127.0.0.1']
_site_host = _host_from_url(SITE_URL)
ALLOWED_HOSTS = list(filter(None, os.getenv('ALLOWED_HOSTS', '').split(','))) or _default_allowed
if _site_host and _site_host not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(_site_host)

# ------------------------
# APPS INSTALADOS
# ------------------------
INSTALLED_APPS = [
    # Django padrão
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Terceiros
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',

    # Cloudinary (storage)
    'cloudinary',
    'cloudinary_storage',

    # Apps do projeto
    'usuarios.apps.UsuariosConfig',
    'trabalhos',
    'propostas',
    'contratos',
    'pagamentos',
    'avaliacoes',
    'mensagens',
    'denuncias',
    'habilidades',
    'notificacoes',
]

# ------------------------
# MIDDLEWARE
# ------------------------
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# ------------------------
# URLS / TEMPLATES
# ------------------------
ROOT_URLCONF = 'freelancer.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, "templates")],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# ------------------------
# WSGI
# ------------------------
WSGI_APPLICATION = 'freelancer.wsgi.application'

# BANCO DE DADOS
# ------------------------
DATABASES = {
    'default': dj_database_url.config(
        default=os.getenv('DATABASE_URL'),
        engine='django.db.backends.mysql',
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# ------------------------
# VALIDAÇÃO DE SENHA
# ------------------------
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ------------------------
# INTERNACIONALIZAÇÃO
# ------------------------
LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Sao_Paulo'
USE_I18N = True
USE_TZ = True

# ------------------------
# STATIC / MEDIA
# ------------------------
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

STORAGES = {
    "default": {"BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# ------------------------
# CLOUDINARY
# ------------------------
CLOUDINARY_URL = os.getenv("CLOUDINARY_URL")
CLOUDINARY_STORAGE = {
    "CLOUD_NAME": os.getenv("CLOUDINARY_CLOUD_NAME", "dtxz7xxrh"),
    "API_KEY": os.getenv("CLOUDINARY_API_KEY", "182582265899342"),
    "API_SECRET": os.getenv("CLOUDINARY_API_SECRET", "xhNjam6wM6DeUCmzKKmcfUQEKEk"),
}

# ------------------------
# USER CUSTOM
# ------------------------
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
AUTH_USER_MODEL = 'usuarios.Usuario'

# ------------------------
# DJANGO REST + JWT
# ------------------------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 6,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# ------------------------
# CORS
# ------------------------
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
    CORS_ALLOW_CREDENTIALS = True
    CORS_ALLOW_HEADERS = ['*']
    CORS_ALLOW_METHODS = ['*']
else:
    _front_origin = _origin(FRONTEND_URL)
    CORS_ALLOWED_ORIGINS = [o for o in [_front_origin] if o]
    CORS_ALLOW_CREDENTIALS = True

# ------------------------
# CSRF
# ------------------------
_csrf_default = ['http://localhost:8000']
_front_origin = _origin(FRONTEND_URL)
_site_origin = _origin(SITE_URL)
CSRF_TRUSTED_ORIGINS = list({
    *(_csrf_default),
    *([_front_origin] if _front_origin else []),
    *([_site_origin] if _site_origin else []),
    *[o for o in os.getenv('CSRF_TRUSTED_ORIGINS', '').split(',') if o],
})

# ------------------------
# E-MAIL (SendGrid)
# ------------------------
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.sendgrid.net")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() in ("true", "1", "yes")
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "apikey")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "no-reply@profreelabr.com")

SITE_NAME = os.getenv("SITE_NAME", "ProFreelaBR")

# ------------------------
# API CPF/CNPJ
# ------------------------
CPF_CNPJ_API_BASE = os.getenv("CPF_CNPJ_API_BASE")
CPF_CNPJ_TOKEN = os.getenv("CPF_CNPJ_TOKEN")
CPF_CNPJ_PACOTE_CPF_C = int(os.getenv("CPF_CNPJ_PACOTE_CPF_C", 2))
CPF_CNPJ_PACOTE_CNPJ_C = int(os.getenv("CPF_CNPJ_PACOTE_CNPJ_C", 10))
CPF_CNPJ_TIMEOUT = int(os.getenv("CPF_CNPJ_TIMEOUT", 15))

# ------------------------
# MERCADO PAGO
# ------------------------
MERCADOPAGO_ACCESS_TOKEN = os.getenv("MERCADOPAGO_ACCESS_TOKEN")
MERCADOPAGO_PUBLIC_KEY = os.getenv("MERCADOPAGO_PUBLIC_KEY")
MP_WEBHOOK_SECRET = os.getenv("MP_WEBHOOK_SECRET")
MP_INCLUDE_PAYER = False

# ------------------------
# HTTPS / SEGURANÇA
# ------------------------
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
else:
    SECURE_SSL_REDIRECT = False
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False
