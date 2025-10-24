import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'feedback_api.settings')
django.setup()

from django.contrib.auth.models import Permission, Group
from django.contrib.contenttypes.models import ContentType
from feedback_app.models import (
    FeedbackForm, Question, FeedbackResponse, Answer, 
    FormAnalytics, Notification
)

admin_group, created = Group.objects.get_or_create(name="admin")

models = [FeedbackForm, Question, FeedbackResponse, Answer, 
    FormAnalytics, Notification
]


for model in  models:

    content_type = ContentType.objects.get_for_model(model)
    permissions = Permission.objects.filter(content_type=content_type)
    admin_group.permissions.add(*permissions)

print("Admin group with permissions created")