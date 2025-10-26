from pathlib import Path
from datetime import timedelta
import os
import dj_database_url
from dotenv import load_dotenv
from urllib.parse import urlparse

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
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-)ava3u%8_xl%&kcf-l2xwo*tr!mbv(_irqp8d&az55#0c)5t*r')
DEBUG = os.getenv('DEBUG', 'False') == 'True'

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

# URL pública do BACKEND (Railway) — use no .env em produção
SITE_URL = os.getenv("SITE_URL", "").rstrip("/")  # ex: https://seu-backend.up.railway.app
# URL pública do FRONT (onde o usuário navega)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
# URL para onde o Checkout Pro retorna (pode ser a mesma do FRONTEND_URL com rota /checkout/retorno)
FRONT_RETURN_URL = os.getenv("FRONT_RETURN_URL", f"{FRONTEND_URL}/checkout/retorno").rstrip("/")
# Webhook público do Mercado Pago (opcional; se não informar, o código só envia quando for válido)
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

    # Seus apps
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

    # Storage fotos
    'cloudinary', 'cloudinary_storage'
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

# ------------------------
# BANCO DE DADOS
# ------------------------
if os.getenv('DATABASE_URL'):
    # Produção: PostgreSQL (Railway)
    DATABASES = {
        'default': dj_database_url.config(
            default=os.getenv('DATABASE_URL'),
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    # Desenvolvimento: MySQL
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': 'freelancerdb',
            'USER': 'root',
            'PASSWORD': 'root',
            'HOST': 'localhost',
            'PORT': '3306',
            'OPTIONS': {
                'charset': 'utf8mb4',
                'init_command': "SET sql_mode='STRICT_TRANS_TABLES', NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci'",
            },
        }
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
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'

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
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',
}

# ------------------------
# CORS
# ------------------------
# Dev: liberado
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
    CORS_ALLOW_CREDENTIALS = True
    CORS_ALLOW_HEADERS = ['*']
    CORS_ALLOW_METHODS = ['*']
# Prod: restringe às origens conhecidas (front)
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
CPF_CNPJ_API_BASE = os.getenv("CPF_CNPJ_API_BASE", "https://api.cpfcnpj.com.br")
CPF_CNPJ_TOKEN = os.getenv("CPF_CNPJ_TOKEN")
CPF_CNPJ_PACOTE_CPF_C = int(os.getenv("CPF_CNPJ_PACOTE_CPF_C", 2))
CPF_CNPJ_PACOTE_CNPJ_C = int(os.getenv("CPF_CNPJ_PACOTE_CNPJ_C", 10))
CPF_CNPJ_TIMEOUT = int(os.getenv("CPF_CNPJ_TIMEOUT", 15))

# ------------------------
# MERCADO PAGO CONFIG
# ------------------------
MERCADOPAGO_ACCESS_TOKEN = os.getenv("MERCADOPAGO_ACCESS_TOKEN")
MERCADOPAGO_PUBLIC_KEY = os.getenv("MERCADOPAGO_PUBLIC_KEY")
MP_WEBHOOK_SECRET = os.getenv("MP_WEBHOOK_SECRET")
MP_INCLUDE_PAYER = False


# URLs usadas na integração (expostas nos services/views)
# - SITE_URL: backend público
# - FRONTEND_URL: app web
# - FRONT_RETURN_URL: rota do front para onde o Checkout Pro retorna
# - MP_WEBHOOK_URL: webhook público do Mercado Pago
# (Os services só enviam notification_url se ela for pública e válida)
# Já definidas no topo: SITE_URL, FRONTEND_URL, FRONT_RETURN_URL, MP_WEBHOOK_URL

# ------------------------
# Segurança HTTPS (apenas produção)
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
