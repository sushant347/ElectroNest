import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from products.models import Customer


class CustomerJWTAuthentication(BaseAuthentication):
    """
    Authenticate requests that carry a custom customer HS256 JWT token.
    Returns (customer, token) so that request.user is the Customer instance.
    Falls through to the next authenticator if the token is not a customer token.
    """

    def authenticate(self, request):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None  # Not a Bearer token — let other authenticators handle it

        token = auth_header[7:]

        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Customer token has expired.')
        except jwt.InvalidTokenError:
            return None  # Not a valid HS256 token — fall through to SimpleJWT

        if payload.get('user_type') != 'customer':
            return None  # Not a customer token — let SimpleJWT handle it

        customer_id = payload.get('customer_id')
        if not customer_id:
            return None

        try:
            customer = Customer.objects.get(id=customer_id, is_active=True)
        except Customer.DoesNotExist:
            raise AuthenticationFailed('Customer account not found or inactive.')

        return (customer, token)
