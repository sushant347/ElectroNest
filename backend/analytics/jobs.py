import uuid
import traceback
from threading import Thread
from django.core.cache import cache
from django.utils import timezone

_JOB_TTL = 3600


def _job_key(job_id):
    return f'analytics_job:{job_id}'


def get_job(job_id):
    return cache.get(_job_key(job_id))


def _store_job(job_id, payload):
    cache.set(_job_key(job_id), payload, _JOB_TTL)


def enqueue_job(job_type, fn, *args, **kwargs):
    job_id = uuid.uuid4().hex
    created_at = timezone.now().isoformat()
    _store_job(job_id, {
        'id': job_id,
        'type': job_type,
        'status': 'queued',
        'created_at': created_at,
    })

    def _run():
        _store_job(job_id, {
            'id': job_id,
            'type': job_type,
            'status': 'running',
            'created_at': created_at,
            'started_at': timezone.now().isoformat(),
        })
        try:
            result = fn(*args, **kwargs)
            _store_job(job_id, {
                'id': job_id,
                'type': job_type,
                'status': 'done',
                'created_at': created_at,
                'finished_at': timezone.now().isoformat(),
                'result': result,
            })
        except Exception as exc:
            _store_job(job_id, {
                'id': job_id,
                'type': job_type,
                'status': 'failed',
                'created_at': created_at,
                'finished_at': timezone.now().isoformat(),
                'error': str(exc),
                'traceback': traceback.format_exc()[-4000:],
            })

    Thread(target=_run, daemon=True).start()
    return job_id
