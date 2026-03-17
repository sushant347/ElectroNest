from rest_framework.pagination import PageNumberPagination


class FlexiblePagination(PageNumberPagination):
    """Allow frontend to control page size via ?page_size= query param."""
    page_size_query_param = 'page_size'
    max_page_size = 1000
