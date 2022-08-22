from .handlers import DucklingHandler


def _jupyter_server_extension_points():
    return [{'module': 'duckling'}]


def load_jupyter_server_extension(nb_server_app):
    handlers = [('/duckling/ask', DucklingHandler)]
    nb_server_app.web_app.add_handlers('.*$', handlers)


# Support new jupyter server too. API changed the expected function name.
_load_jupyter_server_extension = load_jupyter_server_extension
