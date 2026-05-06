"""
Django settings for page project.
"""

import os
from pathlib import Path
from urllib.parse import urlparse
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure--@0wgwe@1pykf_-92-0cwn7m^u%n#-k641j6+y0j*p952*7%=w')
DEBUG = os.environ.get('DEBUG', 'True') == 'True'

def _split_env_list(value):
    return [item.strip() for item in (value or '').split(',') if item.strip()]


def _clean_host(value):
    parsed = urlparse(value if '://' in value else f'//{value}')
    return (parsed.netloc or parsed.path).strip().strip('/')


def _clean_origin(value):
    parsed = urlparse(value)
    if not parsed.scheme or not parsed.netloc:
        return value.strip().rstrip('/')
    return f'{parsed.scheme}://{parsed.netloc}'


_allowed_hosts_env = os.environ.get('ALLOWED_HOSTS')
if _allowed_hosts_env:
    ALLOWED_HOSTS = [_clean_host(h) for h in _split_env_list(_allowed_hosts_env)]
else:
    ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'electronest-api.onrender.com']


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'corsheaders',
    'django_filters',
    'rest_framework_simplejwt',
    'drf_spectacular',


    # Custom apps
    'accounts.apps.AccountsConfig',
    'products',
    'orders',
    'analytics',
    'warehouse',
    'admin_panel',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
ROOT_URLCONF = 'page.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
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

WSGI_APPLICATION = 'page.wsgi.application'


# ── Database ──
import dj_database_url

DATABASE_URL = os.environ.get('DATABASE_URL')

if DATABASE_URL:
    # Cloud: Neon PostgreSQL — conn_max_age=0 required for Neon's pgBouncer pooling
    DATABASES = {
        'default': dj_database_url.config(default=DATABASE_URL, conn_max_age=0, ssl_require=True)
    }
else:
    # Local: SQL Server Express (unchanged)
    DATABASES = {
        'default': {
            'ENGINE': 'mssql',
            'NAME': 'ElectroNestDB',
            'HOST': '.\\SQLEXPRESS',
            'PORT': '',
            'CONN_MAX_AGE': 60,
            'OPTIONS': {
                'driver': 'ODBC Driver 17 for SQL Server',
                'trusted_connection': 'yes',
                'extra_params': 'TrustServerCertificate=yes;Encrypt=no',
            },
        }
    }


# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# ── CORS ──
# Keep the deployed Vercel app allowed even if Render's CORS_ORIGINS env var is
# missing or incomplete. Extra origins can still be supplied as comma-separated
# values in CORS_ORIGINS.
DEFAULT_CORS_ORIGINS = [
    'https://electro-nest.vercel.app',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]
_cors_env = os.environ.get('CORS_ORIGINS', '')
_cors_origins = DEFAULT_CORS_ORIGINS + [_clean_origin(o) for o in _split_env_list(_cors_env)]
CORS_ALLOWED_ORIGINS = list(dict.fromkeys(_cors_origins))
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

# ── REST Framework ──
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'accounts.authentication.CustomerJWTAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        # SessionAuthentication removed — pure JWT API, sessions add unnecessary DB overhead
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'page.pagination.FlexiblePagination',
    'PAGE_SIZE': 50,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_THROTTLE_RATES': {
        'auth': '10/min',
    },
}

# ── JWT ──
from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'UPDATE_LAST_LOGIN': False,  # Disabled — was writing to DB on every authenticated request
}

# ── Media Files ──
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

AUTH_USER_MODEL = 'accounts.CustomUser'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

SPECTACULAR_SETTINGS = {
    'TITLE': 'ElectroNest API',
    'DESCRIPTION': 'ElectroNest backend API documentation.',
    'VERSION': '1.0.0',
}

# ── Production security defaults ──
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = int(os.environ.get('SECURE_HSTS_SECONDS', '31536000'))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
