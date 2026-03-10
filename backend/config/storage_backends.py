"""
Custom Django storage backend for Supabase Storage.

Uses Supabase REST API (not S3) with the service role key.
"""

import time
import logging
import requests
from django.conf import settings
from django.core.files.storage import Storage
from django.core.files.base import ContentFile
from urllib.parse import quote

logger = logging.getLogger(__name__)

# (connect_timeout, read_timeout) in seconds
TIMEOUT = (5, 30)
MAX_RETRIES = 2
RETRY_BACKOFF = 1  # seconds


class SupabaseStorage(Storage):
    """Django storage backend for Supabase Storage REST API."""

    def __init__(self):
        self.base_url = settings.SUPABASE_URL
        self.bucket = settings.SUPABASE_STORAGE_BUCKET
        self.service_key = settings.SUPABASE_SERVICE_ROLE_KEY
        self.headers = {
            'Authorization': f'Bearer {self.service_key}',
            'apikey': self.service_key,
        }

    def _get_storage_url(self, name):
        # Normalize Windows backslashes to forward slashes for Supabase
        name = name.replace('\\', '/')
        return f'{self.base_url}/storage/v1/object/{self.bucket}/{quote(name, safe="/")}'

    def _request_with_retry(self, method, url, retries=MAX_RETRIES, **kwargs):
        """Make an HTTP request with timeout and retry on transient failures."""
        kwargs.setdefault('timeout', TIMEOUT)
        last_exc = None
        for attempt in range(retries + 1):
            try:
                response = method(url, **kwargs)
                if response.status_code < 500:
                    return response
                # 5xx = transient, retry
                last_exc = IOError(f'Supabase returned {response.status_code}')
            except requests.exceptions.RequestException as e:
                last_exc = e
            if attempt < retries:
                time.sleep(RETRY_BACKOFF * (attempt + 1))
                logger.warning(f'Supabase request retry {attempt + 1}/{retries} for {url}')
        raise last_exc or IOError('Supabase request failed')

    def _open(self, name, mode='rb'):
        """Download file from Supabase using authenticated endpoint."""
        url = self._get_storage_url(name)
        response = self._request_with_retry(requests.get, url, headers=self.headers)
        if response.status_code != 200:
            raise IOError(f'Could not open {name} from Supabase ({response.status_code})')
        f = ContentFile(response.content)
        f.name = name
        return f

    def _save(self, name, content):
        url = self._get_storage_url(name)

        data = content.read()

        # Detect content type
        content_type = 'application/octet-stream'
        if name.endswith('.wav'):
            content_type = 'audio/wav'
        elif name.endswith('.webm'):
            content_type = 'audio/webm'
        elif name.endswith('.mp3'):
            content_type = 'audio/mpeg'

        headers = {
            **self.headers,
            'Content-Type': content_type,
            'x-upsert': 'true',
        }

        response = self._request_with_retry(requests.post, url, headers=headers, data=data)

        if response.status_code not in (200, 201):
            raise IOError(
                f'Supabase upload failed ({response.status_code}): {response.text}'
            )

        return name

    def exists(self, name):
        name = name.replace('\\', '/')
        url = f'{self.base_url}/storage/v1/object/info/{self.bucket}/{quote(name, safe="/")}'
        try:
            response = requests.get(url, headers=self.headers, timeout=TIMEOUT)
            return response.status_code == 200
        except requests.exceptions.RequestException:
            return False

    def url(self, name):
        name = name.replace('\\', '/')
        return f'{self.base_url}/storage/v1/object/authenticated/{self.bucket}/{quote(name, safe="/")}'

    def delete(self, name):
        name = name.replace('\\', '/')
        url = f'{self.base_url}/storage/v1/object/{self.bucket}'
        try:
            requests.delete(
                url,
                headers={**self.headers, 'Content-Type': 'application/json'},
                json={'prefixes': [name]},
                timeout=TIMEOUT,
            )
        except requests.exceptions.RequestException:
            pass  # Silently ignore delete failures

    def size(self, name):
        name = name.replace('\\', '/')
        url = f'{self.base_url}/storage/v1/object/info/{self.bucket}/{quote(name, safe="/")}'
        try:
            response = requests.get(url, headers=self.headers, timeout=TIMEOUT)
            if response.status_code == 200:
                metadata = response.json()
                return metadata.get('metadata', {}).get('size', 0)
        except requests.exceptions.RequestException:
            pass
        return 0

    def listdir(self, path):
        url = f'{self.base_url}/storage/v1/object/list/{self.bucket}'
        try:
            response = requests.post(
                url,
                headers={**self.headers, 'Content-Type': 'application/json'},
                json={'prefix': path, 'limit': 1000},
                timeout=TIMEOUT,
            )
            dirs, files = [], []
            if response.status_code == 200:
                for item in response.json():
                    if item.get('id') is None:
                        dirs.append(item['name'])
                    else:
                        files.append(item['name'])
            return dirs, files
        except requests.exceptions.RequestException:
            return [], []

