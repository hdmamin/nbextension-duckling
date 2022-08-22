import json
from jupyter_server.base.handlers import JupyterHandler
import tornado

from jabberwocky.openai_utils import GPT, PromptManager

PM = PromptManager(['debug'])


class DucklingHandler(JupyterHandler):

    # TODO: reenable auth
    # @tornado.web.authenticated
    def get(self):
        data = {
            'question': 'Why does this code raise an error?',
            'code': 'def foo(x):\n    return 1 / x',
            'local_vars': json.dumps({'x': 0}),
            'global_vars': json.dumps({})
        }
        for name in data:
            data[name] = self.get_argument(name, data[name])
        # TODO: can think about when we should skip the query (i.e. no code,
        # no question, etc.). For now just filled in default values.
        if not data['code']:
            with GPT('repeat'):
                res, _ = PM.query('debug', data)
            self.write(res[0])
        else:
            self.write('TODO')



    # TODO: still get permission error even without tornado auth for post.
    # Maybe jupyter enforces no post endpoints allowed?
    # TODO: reenable auth
    # @tornado.web.authenticated
    def post(self):
        code = self.get_argument('code', '')
        self.write(code)
