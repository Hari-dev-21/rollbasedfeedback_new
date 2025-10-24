from rest_framework import serializers
from .models import (
    FeedbackForm, Section, Question, FeedbackResponse, Answer,
    FormAnalytics, Notification, CustomUser, QuestionOption
)

# ------------------- User Serializers -------------------
class RegisterSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'password', 'last_name', 'first_name', "is_approved"]
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        username = validated_data.get('username')
        email = validated_data.get('email')

        if CustomUser.objects.filter(username=username).exists() or CustomUser.objects.filter(email=email).exists():
            raise serializers.ValidationError({"detail": "User already exists, please login."})

        password = validated_data.pop('password')
        user = CustomUser.objects.create(**validated_data)
        user.set_password(password)
        user.is_approved = False
        user.save()
        return user


class AdminSerializers(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ['username', 'password', 'first_name', 'last_name', 'email', 'is_approved']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance:
            self.fields['password'].required = False

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = CustomUser(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

# ------------------- Form Structure -------------------
class QuestionOptionCreateSerializer(serializers.ModelSerializer):
    next_section = serializers.PrimaryKeyRelatedField(
        queryset=Section.objects.all(),
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = QuestionOption
        fields = ['text', 'next_section']
    
    def to_internal_value(self, data):
        # Handle string IDs for next_section
        next_section_value = data.get('next_section')
        
        if next_section_value and isinstance(next_section_value, str):
            try:
                # Try to find the section by ID
                section = Section.objects.get(id=next_section_value)
                data['next_section'] = section.id
            except Section.DoesNotExist:
                # If section not found, set to None
                data['next_section'] = None
            except (ValueError, TypeError):
                # If invalid ID format, set to None
                data['next_section'] = None
        
        return super().to_internal_value(data)


class QuestionCreateSerializer(serializers.ModelSerializer):
    option_links = QuestionOptionCreateSerializer(many=True, required=False)

    class Meta:
        model = Question
        fields = ['text', 'question_type', 'is_required', 'order', 'options', 'option_links']

class SectionCreateSerializer(serializers.ModelSerializer):
    questions = QuestionCreateSerializer(many=True)
    id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Section
        fields = ['id', 'title', 'description', 'order', 'questions']


# class FeedbackFormSerializer(serializers.ModelSerializer):
#     questions = QuestionCreateSerializer(many=True, read_only=True)
#     response_count = serializers.ReadOnlyField()
#     shareable_link = serializers.ReadOnlyField()
#     is_expired = serializers.ReadOnlyField()
    
#     class Meta:
#         model = FeedbackForm
#         fields = [
#             'id', 'title', 'description', 'form_type', 'created_by', 
#             'created_at', 'updated_at', 'is_active', 'expires_at',
#             'questions', 'response_count', 'shareable_link', 'is_expired'
#         ]
#         read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class FeedbackFormSerializer(serializers.ModelSerializer):
    questions = serializers.SerializerMethodField()  # Add this
    sections = SectionCreateSerializer(many=True, read_only=True)
    response_count = serializers.ReadOnlyField()
    shareable_link = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    
    class Meta:
        model = FeedbackForm
        fields = [
            'id', 'title', 'description', 'form_type', 'created_by', 
            'created_at', 'updated_at', 'is_active', 'expires_at',
            'questions', 'sections', 'response_count', 'shareable_link', 'is_expired'  # Include both
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_questions(self, obj):
        """Get all questions from all sections as a flat list"""
        questions = []
        for section in obj.sections.all():
            for question in section.questions.all():
                questions.append({
                    'id': question.id,
                    'text': question.text,
                    'question_type': question.question_type,
                    'is_required': question.is_required,
                    'options': question.options or [],  # Ensure options is never null
                    'order': question.order,
                    'section_id': section.id
                })
        return questions


class FeedbackFormCreateSerializer(serializers.ModelSerializer):
    sections = SectionCreateSerializer(many=True)  # ✅ Accept sections from frontend
    # id = serializers.IntegerField(read_only=True)

    class Meta:
        model = FeedbackForm
        fields = ['id','title', 'description', 'form_type', 'is_active', 'expires_at', 'sections']

    def create(self, validated_data):
        sections_data = validated_data.pop('sections', [])
        validated_data['created_by'] = self.context['request'].user
        
        # Create the form first
        form = FeedbackForm.objects.create(**validated_data)

        # Create sections and their questions
        for section_data in sections_data:
            questions_data = section_data.pop('questions', [])
            
            # Create the section
            section = Section.objects.create(
                form=form,
                title=section_data.get('title', ''),
                description=section_data.get('description', ''),
                order=section_data.get('order', 0)
            )
            
            # Create questions for this section
            for question_data in questions_data:
                option_links_data = question_data.pop('option_links', [])
                
                question = Question.objects.create(
                    section=section,
                    text=question_data.get('text', ''),
                    question_type=question_data.get('question_type', 'text'),
                    is_required=question_data.get('is_required', False),
                    order=question_data.get('order', 0),
                    options=question_data.get('options', [])
                )
                
                # Create option links for navigation
                for option_link_data in option_links_data:
                    next_section_id = option_link_data.get('next_section')
                    next_section = None
                    
                    if next_section_id:
                        try:
                            # Find the target section within the same form
                            next_section = Section.objects.get(
                                id=next_section_id, 
                                form=form
                            )
                        except Section.DoesNotExist:
                            # If section not found, skip this link
                            continue
                    
                    QuestionOption.objects.create(
                        question=question,
                        text=option_link_data.get('text', ''),
                        next_section=next_section
                    )

        return form


# ------------------- Response Serializers -------------------
class AnswerSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source='question.text', read_only=True)
    question_type = serializers.CharField(source='question.question_type', read_only=True)

    class Meta:
        model = Answer
        fields = ['id', 'question', 'question_text', 'question_type', 'answer_text', 'answer_value']


class FeedbackResponseSerializer(serializers.ModelSerializer):
    answers = AnswerSerializer(many=True, read_only=True)
    form_title = serializers.CharField(source='form.title', read_only=True)

    class Meta:
        model = FeedbackResponse
        fields = ['id', 'form', 'form_title', 'submitted_at', 'answers']
        read_only_fields = ['id', 'submitted_at']


class FeedbackResponseCreateSerializer(serializers.ModelSerializer):
    answers = AnswerSerializer(many=True)

    class Meta:
        model = FeedbackResponse
        fields = ['form', 'answers']

    def create(self, validated_data):
        answers_data = validated_data.pop('answers', [])
        request = self.context.get('request')
        if request:
            validated_data['ip_address'] = self.get_client_ip(request)
            validated_data['user_agent'] = request.META.get('HTTP_USER_AGENT', '')
        response = FeedbackResponse.objects.create(**validated_data)
        for answer_data in answers_data:
            Answer.objects.create(response=response, **answer_data)
        return response

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        return x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')


# ------------------- Analytics & Notifications -------------------
class FormAnalyticsSerializer(serializers.ModelSerializer):
    form_title = serializers.CharField(source='form.title', read_only=True)
    questions_summary = serializers.SerializerMethodField()

    class Meta:
        model = FormAnalytics
        fields = [
            'id', 'form', 'form_title', 'total_responses',
            'completion_rate', 'average_rating', 'questions_summary',
            'last_updated'
        ]
        read_only_fields = [
            'id', 'total_responses', 'completion_rate',
            'average_rating', 'last_updated'
        ]

    def get_questions_summary(self, obj):
        result = []
        for section in obj.form.sections.all():
            for question in section.questions.all():
                result.append({
                    "question_id": str(question.id),
                    "question_text": question.text,
                    "question_type": question.question_type,
                    "data": obj.questions_summary.get(str(question.id), {})
                })
        return result


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'notification_type', 'title', 'message', 'is_read', 'created_at', 'data']
        read_only_fields = ['id', 'created_at']


class QuestionAnalyticsSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    question_text = serializers.CharField()
    question_type = serializers.CharField()
    response_count = serializers.IntegerField()
    average_rating = serializers.FloatField(allow_null=True)
    answer_distribution = serializers.DictField()
    options = serializers.ListField(child=serializers.CharField(), required=False)


class FormSummarySerializer(serializers.Serializer):
    total_forms = serializers.IntegerField()
    active_forms = serializers.IntegerField()
    total_responses = serializers.IntegerField()
    recent_responses = serializers.IntegerField()
    average_completion_rate = serializers.FloatField()
    recent_responses_list = serializers.ListField()
