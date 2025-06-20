#!/bin/bash

# Activate virtual environment
source venv/bin/activate

# Make migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser if it doesn't exist
echo "from django.contrib.auth.models import User; User.objects.filter(username='admin').exists() or User.objects.create_superuser('admin', 'admin@example.com', 'adminpassword')" | python manage.py shell

# Run server
python manage.py runserver
