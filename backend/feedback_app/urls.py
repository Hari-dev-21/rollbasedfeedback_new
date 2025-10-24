from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'forms', views.FeedbackFormViewSet, basename='feedbackform')
router.register(r'sections', views.SectionViewSet, basename='section')
router.register(r'questions', views.QuestionViewSet, basename='question')
router.register(r'question-options', views.QuestionOptionViewSet, basename='questionoption')
router.register(r'responses', views.FeedbackResponseViewSet, basename='feedbackresponse')
# router.register(r'analytics', views.FormAnalyticsViewSet, basename='analytics')
router.register(r'notifications', views.NotificationViewSet, basename='notification')
router.register(r'admin', views.AdminViewset, basename='manageadmin')
# router.register(r'dashboard', views.DashboardView, basename='dashboard')

urlpatterns = [
    # Authentication endpoints
    path('api/auth/register/', views.RegisterView.as_view(), name='register'),
    path('api/auth/login/', views.CustomAuthToken.as_view(), name='auth_login'),
    path('api/auth/logout/', views.LogoutView.as_view(), name='auth_logout'),
    path('api/auth/user/', views.CurrentUserView.as_view(), name='auth_user'),
    
    # API endpoints
    path('api/', include(router.urls)),
    path('api/admin/admins/', views.get_admins_list, name='get_admins_list'),
    path('api/approve-user/<int:pk>/', views.ApproveUserView.as_view(), name='approve-user'),
    path('api/pending-users/', views.PendingUsersView.as_view(), name='pending-users'),
    
    # Dashboard
    path('api/dashboard/summary/', views.DashboardView.as_view(), name='dashboard_summary'),
    
    # Public feedback form endpoints
    path('api/public/forms/', views.PublicFormsListView.as_view(), name='public_forms_list'),
    path('api/public/feedback/<uuid:form_id>/', views.PublicFeedbackFormView.as_view(), name='public_feedback_form'),
    
    # Nested routes for better organization
    path('api/forms/<uuid:form_pk>/sections/', 
         views.SectionViewSet.as_view({'get': 'list', 'post': 'create'}), 
         name='form-sections'),
    
    path('api/sections/<int:section_pk>/questions/', 
         views.QuestionViewSet.as_view({'get': 'list', 'post': 'create'}), 
         name='section-questions'),
    
    path('api/forms/<uuid:form_pk>/responses/', 
         views.FeedbackResponseViewSet.as_view({'get': 'list', 'post': 'create'}), 
         name='form-responses'),
    
]