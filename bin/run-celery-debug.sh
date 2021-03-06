#!/bin/bash

##
# Run Celery task queue for development
#
su tg458981 -c "celery -A designsafe beat -l info --pidfile= --schedule=/tmp/celerybeat-schedule" &
su tg458981 -c "celery -A designsafe worker -l debug"
