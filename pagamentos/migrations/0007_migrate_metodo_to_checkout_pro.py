# pagamentos/migrations/0007_migrate_metodo_to_checkout_pro.py
from django.db import migrations

def forwards(apps, schema_editor):
    Pagamento = apps.get_model('pagamentos', 'Pagamento')
    # converte métodos legados para o único método atual
    Pagamento.objects.filter(metodo__in=['pix', 'boleto', 'card']).update(metodo='checkout_pro')

def backwards(apps, schema_editor):
    Pagamento = apps.get_model('pagamentos', 'Pagamento')
    # se reverter, jogamos de volta para 'card' (valor neutro legado)
    Pagamento.objects.filter(metodo='checkout_pro').update(metodo='card')

class Migration(migrations.Migration):

    dependencies = [
        ('pagamentos', '0006_alter_pagamento_options_and_more'),  # <- ajuste para o nome gerado no passo 1
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
