# -*- coding: utf-8 -*-
# Generated by Django 1.10.7 on 2019-03-01 16:43
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('api', '0005_auto_20170824_1855'),
    ]

    operations = [
        migrations.CreateModel(
            name='PageAlert',
            fields=[
                ('alert_id', models.CharField(max_length=120, primary_key=True, serialize=False, unique=True)),
                ('alert_type', models.CharField(choices=[(b'alert-warning', b'WARNING'), (b'alert-danger', b'DANGER'), (b'alert-info', b'INFO'), (b'alert-success', b'SUCCESS')], default=b'alert-warning', max_length=20)),
                ('alert_message', models.TextField(help_text=b'Page alert message text.')),
            ],
        ),
    ]
