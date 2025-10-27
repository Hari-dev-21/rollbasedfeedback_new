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
    next_section = serializers.PrimaryKeyRelatedField(
        queryset=Section.objects.all(),
        required=False,
        allow_null=True
    )
    id = serializers.IntegerField(required=False)  # Add this for updates
    
    class Meta:
        model = QuestionOption
        fields = ['id', 'text', 'next_section']
    
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

class QuestionOptionCreateSerializer(serializers.ModelSerializer):
    next_section = serializers.CharField(  # Change from PrimaryKeyRelatedField to CharField
        required=False, 
        allow_null=True, 
        allow_blank=True
    )
    id = serializers.IntegerField(required=False)
    
    class Meta:
        model = QuestionOption
        fields = ['id', 'text', 'next_section']
    
    def to_internal_value(self, data):
        # Don't try to lookup sections during validation - just pass through the frontend_id
        # The main create method will handle the section mapping
        next_section_value = data.get('next_section')
        
        print(f"🔧 DEBUG to_internal_value: Passing through next_section value: {next_section_value}")
        
        # Just return the data as-is - don't try to convert to Section objects
        # The main create method will handle the mapping
        return super().to_internal_value(data)
    
    def to_representation(self, instance):
        """Custom representation to return frontend_id instead of database ID"""
        representation = super().to_representation(instance)
        
        print(f"🔧 DEBUG to_representation: Option '{instance.text}', next_section object: {instance.next_section}")
        
        # Return the frontend_id of the next_section instead of database ID
        if instance.next_section and hasattr(instance.next_section, 'frontend_id'):
            representation['next_section'] = instance.next_section.frontend_id
            print(f"🔧 DEBUG to_representation: Returning frontend_id: {instance.next_section.frontend_id}")
        else:
            representation['next_section'] = None
            print(f"🔧 DEBUG to_representation: Returning None for next_section")
            
        return representation
class QuestionCreateSerializer(serializers.ModelSerializer):
    option_links = QuestionOptionCreateSerializer(many=True, required=False)
    id = serializers.IntegerField(required=False)  # Add this for updates

    class Meta:
        model = Question
        fields = ['id', 'text','frontend_id', 'question_type', 'is_required', 'order', 'options', 'option_links', 'enable_option_navigation']
        extra_kwargs = {
            'enable_option_navigation': {'required': False, 'default': False},
            'frontend_id': {'required': False, 'allow_blank': True},
            'id': {'read_only': True}
        }


class SectionCreateSerializer(serializers.ModelSerializer):
    questions = QuestionCreateSerializer(many=True)
    id = serializers.IntegerField(required=False)  # Change from read_only to allow updates

    class Meta:
        model = Section
        fields = ['id', 'title','frontend_id', 'description', 'order', 'next_section_on_submit', 'questions']
        extra_kwargs = {
            'next_section_on_submit': {'required': False, 'allow_null': True},
            'frontend_id': {'required': False, 'allow_blank': True},
            'id': {'read_only': True}
        }






class FeedbackFormSerializer(serializers.ModelSerializer):
    sections = SectionCreateSerializer(many=True, read_only=True)
    response_count = serializers.ReadOnlyField()
    shareable_link = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    
    class Meta:
        model = FeedbackForm
        fields = [
            'id', 'title', 'description', 'form_type', 'created_by', 
            'created_at', 'updated_at', 'is_active', 'expires_at',
            'sections', 'response_count', 'shareable_link', 'is_expired'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_questions(self, obj):
        """Get all questions from all sections as a flat list"""
        questions = []
        for section in obj.sections.all():
            for question in section.questions.all():
                questions.append({
                    'id': question.id,
                    'frontend_id': question.frontend_id,  # Include frontend_id
                    'text': question.text,
                    'question_type': question.question_type,
                    'is_required': question.is_required,
                    'options': question.options or [],
                    'order': question.order,
                    'section_id': section.id,
                    'section_frontend_id': section.frontend_id,  # Include section frontend_id
                    'enable_option_navigation': question.enable_option_navigation,
                    'option_links': QuestionOptionCreateSerializer(question.option_links.all(), many=True).data
                })
        return questions


class FeedbackFormCreateSerializer(serializers.ModelSerializer):
    sections = SectionCreateSerializer(many=True)

    class Meta:
        model = FeedbackForm
        fields = ['id','title', 'description', 'form_type', 'is_active', 'expires_at', 'sections']

    def create(self, validated_data):
        sections_data = validated_data.pop('sections', [])
        validated_data['created_by'] = self.context['request'].user
        
        print("🔧 DEBUG: Starting form creation")
        print(f"🔧 DEBUG: Number of sections: {len(sections_data)}")
        
        # Create the form first
        form = FeedbackForm.objects.create(**validated_data)

        # Create mapping for frontend IDs to database objects
        section_frontend_id_mapping = {}
        
        # First pass: create all sections with frontend IDs
        for section_data in sections_data:
            frontend_section_id = section_data.get('frontend_id')
            print(f"🔧 DEBUG: Creating section with frontend_id: {frontend_section_id}")
            
            questions_data = section_data.pop('questions', [])
            
            # Create the section with frontend ID
            section = Section.objects.create(
                form=form,
                frontend_id=frontend_section_id,
                title=section_data.get('title', ''),
                description=section_data.get('description', ''),
                order=section_data.get('order', 0),
                next_section_on_submit=None
            )
            
            # Store mapping for navigation resolution
            if frontend_section_id:
                section_frontend_id_mapping[frontend_section_id] = section
                print(f"🔧 DEBUG: Mapped {frontend_section_id} -> section ID {section.id}")
            
            # Store questions data for second pass
            section._questions_data = questions_data

        print(f"🔧 DEBUG: Section mapping: {list(section_frontend_id_mapping.keys())}")

        # Second pass: handle navigation and create questions
        for section_data in sections_data:
            frontend_section_id = section_data.get('frontend_id')
            if not frontend_section_id:
                continue
                
            section = section_frontend_id_mapping.get(frontend_section_id)
            if not section:
                continue
            
            # Handle section-level navigation
            next_section_frontend_id = section_data.get('next_section_on_submit')
            if next_section_frontend_id:
                target_section = section_frontend_id_mapping.get(next_section_frontend_id)
                print(f"🔧 DEBUG: Section {frontend_section_id} -> next_section: {next_section_frontend_id} (found: {target_section is not None})")
                if target_section:
                    section.next_section_on_submit = target_section
                    section.save()
            
            # Create questions for this section
            questions_data = getattr(section, '_questions_data', [])
            print(f"🔧 DEBUG: Processing {len(questions_data)} questions for section {frontend_section_id}")
            
            for question_data in questions_data:
                # Make a copy of question_data to avoid modifying the original
                question_data_copy = question_data.copy()
                option_links_data = question_data_copy.pop('option_links', [])
                enable_option_navigation = question_data_copy.get('enable_option_navigation', False)
                question_frontend_id = question_data_copy.get('frontend_id')
                
                print(f"🔧 DEBUG: Creating question: {question_data_copy.get('text')}")
                print(f"🔧 DEBUG: - enable_option_navigation: {enable_option_navigation}")
                print(f"🔧 DEBUG: - option_links_data: {option_links_data}")
                print(f"🔧 DEBUG: - option_links_data length: {len(option_links_data)}")
                
                # Create the question FIRST (ONLY ONCE)
                question = Question.objects.create(
                    section=section,
                    frontend_id=question_frontend_id,
                    text=question_data_copy.get('text', ''),
                    question_type=question_data_copy.get('question_type', 'text'),
                    is_required=question_data_copy.get('is_required', False),
                    order=question_data_copy.get('order', 0),
                    options=question_data_copy.get('options', []),
                    enable_option_navigation=enable_option_navigation
                )
                
                # THEN create option links if enabled
                # In your create method, update this part:
                if enable_option_navigation and option_links_data:
                    print(f"🔧 DEBUG: Creating {len(option_links_data)} option links for question '{question.text}'")
                    
                    for i, option_link_data in enumerate(option_links_data):
                        next_section_frontend_id = option_link_data.get('next_section')
                        next_section = None
                        
                        print(f"🔧 DEBUG: Option link {i+1}: text='{option_link_data.get('text')}', next_section='{next_section_frontend_id}'")
                        
                        if next_section_frontend_id:
                            next_section = section_frontend_id_mapping.get(next_section_frontend_id)
                            print(f"🔧 DEBUG: - Looking up section {next_section_frontend_id} -> found: {next_section is not None}")
                            if next_section:
                                print(f"🔧 DEBUG: - Found section: ID {next_section.id}, frontend_id {next_section.frontend_id}")
                        
                        # Create the option link
                        option_link = QuestionOption.objects.create(
                            question=question,
                            text=option_link_data.get('text', ''),
                            next_section=next_section
                        )
                        print(f"🔧 DEBUG: - Created option link with next_section: {option_link.next_section}")
                else:
                    print(f"🔧 DEBUG: Skipping option links - enable_nav: {enable_option_navigation}, has_links: {bool(option_links_data)}")
            
            # Clean up temporary attribute
            if hasattr(section, '_questions_data'):
                delattr(section, '_questions_data')

        print("🔧 DEBUG: Form creation completed")
        return form

    def update(self, instance, validated_data):
        sections_data = validated_data.pop('sections', [])
        
        # Update the main form fields
        instance.title = validated_data.get('title', instance.title)
        instance.description = validated_data.get('description', instance.description)
        instance.form_type = validated_data.get('form_type', instance.form_type)
        instance.is_active = validated_data.get('is_active', instance.is_active)
        instance.expires_at = validated_data.get('expires_at', instance.expires_at)
        instance.save()
        
        # Handle sections and questions updates
        if sections_data:
            self.update_sections(instance, sections_data)
        
        return instance
    
    def update_sections(self, form_instance, sections_data):
        # Get existing sections by frontend_id
        existing_sections_by_frontend = {section.frontend_id: section for section in form_instance.sections.all() if section.frontend_id}
        existing_sections_by_id = {str(section.id): section for section in form_instance.sections.all()}
        
        existing_section_frontend_ids = set(existing_sections_by_frontend.keys())
        updated_section_frontend_ids = set()
        
        # Create mapping for frontend IDs to handle navigation
        section_frontend_id_mapping = {}
        
        # First pass: update or create sections
        for section_data in sections_data:
            frontend_section_id = section_data.get('frontend_id')
            section_id = section_data.get('id')
            
            if frontend_section_id and frontend_section_id in existing_sections_by_frontend:
                # Update existing section by frontend_id
                section = existing_sections_by_frontend[frontend_section_id]
                section.title = section_data.get('title', section.title)
                section.description = section_data.get('description', section.description)
                section.order = section_data.get('order', section.order)
                section.save()
                
                # Store mapping for navigation resolution
                section_frontend_id_mapping[frontend_section_id] = section
                
                # Update questions for this section
                self.update_questions(section, section_data.get('questions', []), section_frontend_id_mapping)
                updated_section_frontend_ids.add(frontend_section_id)
                
            elif section_id and section_id in existing_sections_by_id:
                # Update existing section by database ID (fallback)
                section = existing_sections_by_id[section_id]
                section.title = section_data.get('title', section.title)
                section.description = section_data.get('description', section.description)
                section.order = section_data.get('order', section.order)
                section.save()
                
                # Store mapping if frontend_id exists
                if frontend_section_id:
                    section_frontend_id_mapping[frontend_section_id] = section
                    updated_section_frontend_ids.add(frontend_section_id)
                
                # Update questions for this section
                self.update_questions(section, section_data.get('questions', []), section_frontend_id_mapping)
                
            else:
                # Create new section
                section = Section.objects.create(
                    form=form_instance,
                    frontend_id=frontend_section_id,  # Store frontend ID
                    title=section_data.get('title', ''),
                    description=section_data.get('description', ''),
                    order=section_data.get('order', 0),
                    next_section_on_submit=None  # Set to None initially
                )
                
                # Store mapping for navigation resolution
                if frontend_section_id:
                    section_frontend_id_mapping[frontend_section_id] = section
                
                # Store questions data for second pass
                section._questions_data = section_data.get('questions', [])
        
        # Second pass: handle navigation for new sections and update navigation for all
        for section_data in sections_data:
            frontend_section_id = section_data.get('frontend_id')
            if not frontend_section_id:
                continue
                
            section = section_frontend_id_mapping.get(frontend_section_id)
            if not section:
                continue
            
            # Handle section-level navigation
            next_section_frontend_id = section_data.get('next_section_on_submit')
            if next_section_frontend_id:
                target_section = section_frontend_id_mapping.get(next_section_frontend_id)
                if target_section:
                    section.next_section_on_submit = target_section
                    section.save()
            
            # Create questions for new sections
            if hasattr(section, '_questions_data'):
                self.update_questions(section, getattr(section, '_questions_data'), section_frontend_id_mapping)
                delattr(section, '_questions_data')
        
        # Delete sections that were removed
        sections_to_delete = existing_section_frontend_ids - updated_section_frontend_ids
        if sections_to_delete:
            form_instance.sections.filter(frontend_id__in=sections_to_delete).delete()
    
    def update_questions(self, section_instance, questions_data, section_frontend_id_mapping):
        # Get existing questions by frontend_id
        existing_questions_by_frontend = {q.frontend_id: q for q in section_instance.questions.all() if q.frontend_id}
        existing_questions_by_id = {str(q.id): q for q in section_instance.questions.all()}
        
        existing_question_frontend_ids = set(existing_questions_by_frontend.keys())
        updated_question_frontend_ids = set()
        
        # Update or create questions
        for question_data in questions_data:
            question_frontend_id = question_data.get('frontend_id')
            question_id = question_data.get('id')
            
            if question_frontend_id and question_frontend_id in existing_questions_by_frontend:
                # Update existing question by frontend_id
                question = existing_questions_by_frontend[question_frontend_id]
                question.text = question_data.get('text', question.text)
                question.question_type = question_data.get('question_type', question.question_type)
                question.is_required = question_data.get('is_required', question.is_required)
                question.order = question_data.get('order', question.order)
                question.options = question_data.get('options', question.options)
                question.enable_option_navigation = question_data.get('enable_option_navigation', question.enable_option_navigation)
                question.save()
                
                # Update option links
                self.update_option_links(question, question_data.get('option_links', []), section_frontend_id_mapping)
                updated_question_frontend_ids.add(question_frontend_id)
                
            elif question_id and question_id in existing_questions_by_id:
                # Update existing question by database ID (fallback)
                question = existing_questions_by_id[question_id]
                question.text = question_data.get('text', question.text)
                question.question_type = question_data.get('question_type', question.question_type)
                question.is_required = question_data.get('is_required', question.is_required)
                question.order = question_data.get('order', question.order)
                question.options = question_data.get('options', question.options)
                question.enable_option_navigation = question_data.get('enable_option_navigation', question.enable_option_navigation)
                question.save()
                
                # Update option links
                self.update_option_links(question, question_data.get('option_links', []), section_frontend_id_mapping)
                
            else:
                # Create new question
                question = Question.objects.create(
                    section=section_instance,
                    frontend_id=question_frontend_id,  # Store frontend ID
                    text=question_data.get('text', ''),
                    question_type=question_data.get('question_type', 'text'),
                    is_required=question_data.get('is_required', False),
                    order=question_data.get('order', 0),
                    options=question_data.get('options', []),
                    enable_option_navigation=question_data.get('enable_option_navigation', False)
                )
                # Create option links for new question
                self.update_option_links(question, question_data.get('option_links', []), section_frontend_id_mapping)
        
        # Delete questions that were removed
        questions_to_delete = existing_question_frontend_ids - updated_question_frontend_ids
        if questions_to_delete:
            section_instance.questions.filter(frontend_id__in=questions_to_delete).delete()
    
    def update_option_links(self, question_instance, option_links_data, section_frontend_id_mapping):
        # Get existing option links
        existing_option_links = {str(link.id): link for link in question_instance.option_links.all()}
        existing_option_link_ids = set(existing_option_links.keys())
        updated_option_link_ids = set()
        
        # Update or create option links
        for option_link_data in option_links_data:
            option_link_id = option_link_data.get('id')
            next_section_frontend_id = option_link_data.get('next_section')
            next_section = None
            
            # Find the target section using frontend ID mapping
            if next_section_frontend_id:
                next_section = section_frontend_id_mapping.get(next_section_frontend_id)
            
            if option_link_id and option_link_id in existing_option_links:
                # Update existing option link
                option_link = existing_option_links[option_link_id]
                option_link.text = option_link_data.get('text', option_link.text)
                option_link.next_section = next_section
                option_link.save()
                updated_option_link_ids.add(option_link_id)
            else:
                # Create new option link
                QuestionOption.objects.create(
                    question=question_instance,
                    text=option_link_data.get('text', ''),
                    next_section=next_section
                )
        
        # Delete option links that were removed
        option_links_to_delete = existing_option_link_ids - updated_option_link_ids
        if option_links_to_delete:
            question_instance.option_links.filter(id__in=option_links_to_delete).delete()
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
    options = serializers.ListField(
        child=serializers.CharField(), 
        required=False, 
        allow_empty=True,
        default=list  # Add this default
    )

class FormSummarySerializer(serializers.Serializer):
    total_forms = serializers.IntegerField()
    active_forms = serializers.IntegerField()
    total_responses = serializers.IntegerField()
    recent_responses = serializers.IntegerField()
    average_completion_rate = serializers.FloatField()
    recent_responses_list = serializers.ListField()