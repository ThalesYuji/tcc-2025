from rest_framework.routers import DefaultRouter
from .views import DenunciaViewSet

router = DefaultRouter()
router.register(r"", DenunciaViewSet)

urlpatterns = router.urls
