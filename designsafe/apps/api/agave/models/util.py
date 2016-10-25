""" Agave models util module."""
import logging
from django.core.serializers.json import DjangoJSONEncoder
from . import BaseAgaveResource

logger = logging.getLogger(__name__)


class AgaveJSONEncoder(DjangoJSONEncoder):
    """ Agave json encoder class.

    This class is used when using :class:`django.http.JsonResponse` to serialize
    an agave object.

    ..todo:: We should have this as an inner class on :class:`BaseAgaveResource`
        That way we can do somethings like:

        >>> listing = BaseAgaveResource.list(...)
        >>> JsonResponse(listing, encoder = BaseAgaveResource.JSONEncoder)

    """

    def default(self, o):
        """Serializer function"""

        if isinstance(o, BaseAgaveResource):
            return o.to_dict()

        return super(AgaveJSONEncoder, self).default(o)
