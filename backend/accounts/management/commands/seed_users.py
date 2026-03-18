"""
Management command to create built-in users.
  - 1 Admin
  - 10 Owners (mapped to real store names in Products table)
  - 1 Warehouse Manager

These users are pre-seeded and cannot be created via the public registration endpoint.
Run:  python manage.py seed_users
"""

from django.core.management.base import BaseCommand
from accounts.models import CustomUser


BUILTIN_USERS = [
    # ── Admin (1) ──
    {
        'email': 'admin@electronest.com',
        'password': 'Admin@1234',
        'first_name': 'System',
        'last_name': 'Admin',
        'role': 'admin',
        'phone': '9800000001',
    },
    # ── Owners (10) — mapped to Products.OwnerName ──
    {
        'email': 'oliz@electronest.com',
        'password': 'Owner@1234',
        'first_name': 'Oliz',
        'last_name': 'Store',
        'role': 'owner',
        'phone': '9800000010',
        'store_name': 'Oliz Store',
    },
    {
        'email': 'evo@electronest.com',
        'password': 'Owner@1234',
        'first_name': 'Evo Store',
        'last_name': 'Nepal',
        'role': 'owner',
        'phone': '9800000011',
        'store_name': 'Evo Store Nepal',
    },
    {
        'email': 'cgdigital@electronest.com',
        'password': 'Owner@1234',
        'first_name': 'CG',
        'last_name': 'Digital',
        'role': 'owner',
        'phone': '9800000012',
        'store_name': 'CG Digital ',
    },
    {
        'email': 'superstore@electronest.com',
        'password': 'Owner@1234',
        'first_name': 'SuperStore',
        'last_name': 'Nepal',
        'role': 'owner',
        'phone': '9800000013',
        'store_name': 'SuperStore Nepal',
    },
    {
        'email': 'paramount@electronest.com',
        'password': 'Owner@1234',
        'first_name': 'Paramount',
        'last_name': 'Electronics',
        'role': 'owner',
        'phone': '9800000014',
        'store_name': 'Paramount Electronics',
    },
    {
        'email': 'neo@electronest.com',
        'password': 'Owner@1234',
        'first_name': 'Neo Store',
        'last_name': 'Nepal',
        'role': 'owner',
        'phone': '9800000015',
        'store_name': 'Neo Store Nepal',
    },
    {
        'email': 'himalayan@electronest.com',
        'password': 'Owner@1234',
        'first_name': 'Himalayan',
        'last_name': 'Tech',
        'role': 'owner',
        'phone': '9800000016',
        'store_name': 'Himalayan Tech',
    },
    {
        'email': 'gadgetworld@electronest.com',
        'password': 'Owner@1234',
        'first_name': 'Gadget',
        'last_name': 'World',
        'role': 'owner',
        'phone': '9800000017',
        'store_name': 'Gadget World',
    },
    {
        'email': 'techhub@electronest.com',
        'password': 'Owner@1234',
        'first_name': 'Tech Hub',
        'last_name': 'Nepal',
        'role': 'owner',
        'phone': '9800000018',
        'store_name': 'Tech Hub Nepal',
    },
    {
        'email': 'hukut@electronest.com',
        'password': 'Owner@1234',
        'first_name': 'Hukut',
        'last_name': 'Store',
        'role': 'owner',
        'phone': '9800000019',
        'store_name': 'Hukut Store',
    },
    # ── Warehouse Manager (1) ──
    {
        'email': 'warehouse@electronest.com',
        'password': 'Warehouse@1234',
        'first_name': 'Warehouse',
        'last_name': 'Manager',
        'role': 'warehouse',
        'phone': '9800000020',
    },
]


class Command(BaseCommand):
    help = 'Seed built-in admin, owner, and warehouse users'

    def handle(self, *args, **options):
        created_count = 0
        skipped_count = 0

        for u in BUILTIN_USERS:
            if CustomUser.objects.filter(email=u['email']).exists():
                self.stdout.write(self.style.WARNING(f"  SKIP  {u['role']:10s}  {u['email']}  (already exists)"))
                skipped_count += 1
                continue

            is_admin = u['role'] == 'admin'
            CustomUser.objects.create_user(
                username=u['email'],
                email=u['email'],
                password=u['password'],
                first_name=u['first_name'],
                last_name=u['last_name'],
                role=u['role'],
                phone=u.get('phone', ''),
                is_staff=is_admin,
                is_superuser=is_admin,
            )
            self.stdout.write(self.style.SUCCESS(f"  CREATE  {u['role']:10s}  {u['email']}"))
            created_count += 1

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'Done — {created_count} created, {skipped_count} skipped.'))
        self.stdout.write('')
        self.stdout.write('Built-in credentials:')
        self.stdout.write('  Admin:       admin@electronest.com       / Admin@1234')
        self.stdout.write('  Warehouse:   warehouse@electronest.com   / Warehouse@1234')
        self.stdout.write('  All Owners (password: Owner@1234):')
        for u in BUILTIN_USERS:
            if u['role'] == 'owner':
                store = u.get('store_name', u['email'])
                self.stdout.write(f"    {store:25s}  {u['email']}")
