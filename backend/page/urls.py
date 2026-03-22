from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse


def health(request):
    return JsonResponse({'status': 'ok'})


def diagnostics(request):
    """Temporary endpoint to debug deployment DB issues."""
    from django.db import connection
    info = {'db_engine': settings.DATABASES['default']['ENGINE']}
    try:
        with connection.cursor() as cur:
            cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
            info['tables'] = [r[0] for r in cur.fetchall()]
            for tbl in ['Categories', 'Products', 'Customers', 'Orders']:
                try:
                    cur.execute(f'SELECT COUNT(*) FROM "{tbl}"')
                    info[f'{tbl}_count'] = cur.fetchone()[0]
                except Exception as e:
                    info[f'{tbl}_count'] = str(e)
    except Exception as e:
        info['error'] = str(e)
    return JsonResponse(info)


urlpatterns = [
    path('', health),
    path('ping/', health),
    path('debug/db/', diagnostics),
    path('admin/', admin.site.urls),

    path('api/auth/', include('accounts.urls')),
    path('api/', include('products.urls')),
    path('api/', include('orders.urls')),

    path('api/warehouse/', include('warehouse.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/admin/', include('admin_panel.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
