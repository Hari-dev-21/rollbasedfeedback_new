from django.db import models
from django.contrib.auth.models import User
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
import uuid





# ------------------------
# User Models
# ------------------------
class CustomUser(AbstractUser):
    is_approved = models.BooleanField(default=False)


# ------------------------
# Feedback Form Models
# ------------------------
class FeedbackForm(models.Model):
    FORM_TYPES = [
        ('empty', 'Empty Form'),
        ('customer_satisfaction', 'Customer Satisfaction'),
        ('employee_feedback', 'Employee Feedback'),
        ('product_feedback', 'Product Feedback'),
        ('service_feedback', 'Service Feedback'),
        ('general', 'General Feedback'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    form_type = models.CharField(max_length=50, choices=FORM_TYPES, default='general')
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='created_forms')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title
    
    @property
    def is_expired(self):
        """
        Check if the form has expired.
        Returns True if expires_at is set and in the past, False otherwise.
        """
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False  # Never expires if no expiration d


# ------------------------
# Section Model
# ------------------------
# In your models.py, add this field to the Section model
class Section(models.Model):
    form = models.ForeignKey(FeedbackForm, on_delete=models.CASCADE, related_name='sections')
    frontend_id = models.CharField(max_length=50, blank=True, null=True)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    order = models.IntegerField(default=0)
    next_section_on_submit = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='previous_sections'
    )  # Add this field
    
    class Meta:
        ordering = ['order']
    
    def __str__(self):
        return f"{self.title} (Form: {self.form.title})"

# ------------------------
# Question Model
# ------------------------
# In your models.py, add this field to the Question model
class Question(models.Model):
    QUESTION_TYPES = [
        ('text', 'Text Input'),
        ('textarea', 'Long Text'),
        ('radio', 'Single Choice'),
        ('dropdown', 'Single Choice (Dropdown)'),
        ('checkbox', 'Multiple Choice'),
        ('email', 'Email'),
        ('phone', 'Phone Number'),
        ('rating', 'Rating'),
        ('yes_no', 'Yes or No'),
    ]
    
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='questions', null= True, blank=True)
    frontend_id = models.CharField(max_length=50, blank=True, null=True)
    text = models.CharField(max_length=500)
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES)
    is_required = models.BooleanField(default=False)
    order = models.IntegerField(default=0)
    options = models.JSONField(blank=True, null=True)
    enable_option_navigation = models.BooleanField(default=False)  # Add this field
    
    class Meta:
        ordering = ['order']
    
    def __str__(self):
        return f"{self.text} ({self.question_type})"


class QuestionOption(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='option_links')
    text = models.CharField(max_length=255)
    next_section = models.ForeignKey(
        Section,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='incoming_options'
    )

    class Meta:
        ordering = ['id']

    def __str__(self):
        if self.next_section:
            return f"{self.text} → {self.next_section.title}"
        return self.text







# ------------------------
# Responses
# ------------------------
class FeedbackResponse(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    form = models.ForeignKey(FeedbackForm, on_delete=models.CASCADE, related_name='responses')
    submitted_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return f"Response to {self.form.title} - {self.submitted_at}"
    

   


class Answer(models.Model):
    response = models.ForeignKey(FeedbackResponse, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    answer_text = models.TextField()
    answer_value = models.JSONField(default=dict, blank=True)  # For structured answers

    class Meta:
        unique_together = ['response', 'question']

    def __str__(self):
        return f"Answer to {self.question.text[:30]}"


class FormAnalytics(models.Model):
    form = models.OneToOneField(FeedbackForm, on_delete=models.CASCADE, related_name='analytics')
    total_responses = models.PositiveIntegerField(default=0)
    completion_rate = models.FloatField(default=0.0)
    average_rating = models.FloatField(default=0.0)
    questions_summary = models.JSONField(default=dict, blank=True)  # NEW
    last_updated = models.DateTimeField(auto_now=True)

    def update_analytics(self):
        from django.db.models import Count
        
        responses = self.form.responses.all()
        self.total_responses = responses.count()
        self.completion_rate = 0.0
        self.average_rating = 0.0
        self.questions_summary = {}

        # 🔥 FIX: Calculate total questions through sections
        total_questions = 0
        all_questions = []
        for section in self.form.sections.all():
            section_questions = section.questions.all()
            total_questions += section_questions.count()
            all_questions.extend(section_questions)

        if self.total_responses > 0 and total_questions > 0:
            # Completion rate
            completed_responses = responses.annotate(answer_count=Count('answers')).filter(answer_count=total_questions).count()
            self.completion_rate = (completed_responses / self.total_responses) * 100

            # Average rating
            rating_answers = Answer.objects.filter(response__form=self.form, question__question_type__in=['rating', 'rating_10'])
            valid_ratings = [float(a.answer_text) for a in rating_answers if a.answer_text and a.answer_text.isdigit()]
            if valid_ratings:
                self.average_rating = sum(valid_ratings) / len(valid_ratings)

            # Per-question aggregation
            for question in all_questions:  # 🔥 Use the collected questions
                q_type = question.question_type
                answers = Answer.objects.filter(question=question)
                
                if q_type in ['radio', 'checkbox', 'yes_no']:
                    counts = {option: answers.filter(answer_text__icontains=option).count() for option in question.options}
                    self.questions_summary[str(question.id)] = counts
                
                elif q_type in ['rating', 'rating_10']:
                    ratings = [float(a.answer_text) for a in answers if a.answer_text and a.answer_text.isdigit()]
                    self.questions_summary[str(question.id)] = ratings
                
                elif q_type in ['text', 'textarea']:
                    self.questions_summary[str(question.id)] = [a.answer_text for a in answers]
                
                elif q_type in ['email', 'phone']:
                    self.questions_summary[str(question.id)] = {"total_submissions": answers.count()}

        self.save()



class Notification(models.Model):
    """Model for storing real-time notifications"""
    NOTIFICATION_TYPES = [
        ('new_response', 'New Response'),
        ('form_created', 'Form Created'),
        ('form_updated', 'Form Updated'),
        ('analytics_update', 'Analytics Update'),
    ]
    
    user = models.ForeignKey("feedback_app.CustomUser", on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    data = models.JSONField(default=dict, blank=True)  # Additional data
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.notification_type} - {self.title}"