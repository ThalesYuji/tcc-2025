from rest_framework.views import APIView
from rest_framework.response import Response

class AplicarAdvertenciaView(APIView):
    def post(self, request):
        return Response({"ok": True})

class AplicarSuspensaoView(APIView):
    def post(self, request):
        return Response({"ok": True})

class AplicarBanimentoView(APIView):
    def post(self, request):
        return Response({"ok": True})

class RemoverSuspensaoView(APIView):
    def post(self, request):
        return Response({"ok": True})
