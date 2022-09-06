from IPython import get_ipython
from IPython.core.magics.namespace import NamespaceMagics
import json
from jupyter_server.base.handlers import JupyterHandler
import logging
import time
import tornado

from htools.core import is_ipy_name
from jabberwocky.openai_utils import GPT, PromptManager

PM = PromptManager(['debug_duckling'])
SHELL = get_ipython()
NS_MAGICS = NamespaceMagics(SHELL)
LOGGER = logging.getLogger()


def local_vars():
    varnames = NS_MAGICS.who_ls()
    return json.dumps(varnames)


class DucklingHandler(JupyterHandler):

    # TODO: reenable auth
    # @tornado.web.authenticated
    # def get(self):
    #     data = {
    #         'question': 'Why does this code raise an error?',
    #         'code': 'def foo(x):\n    return 1 / x',
    #         'local_vars': json.dumps({'x': 0}),
    #         'global_vars': json.dumps({})
    #     }
    #     for name in data:
    #         data[name] = self.get_argument(name, data[name])
    #
    #     # TODO: allow diff options based on extension config and/or payload? Only openai backend provides codex,
    #     # though GPTJ was trained on a lot of code too.
    #     # For now, just use "repeat" backend by default, or use real codex if user starts their question with "gpt".
    #     if data['question'].lower().startswith('gpt'):
    #         backend = 'openai'
    #         tmp = data['question'].lower().split('gpt', 1)[-1].strip()
    #         data['question'] = tmp[0].upper() + tmp[1:]
    #     else:
    #         backend = 'repeat'
    #
    #     # TODO: can think about when we should skip the query (i.e. no code,
    #     # no question, etc.). For now just filled in default values.
    #     if data['code']:
    #         with GPT(backend):
    #             # TODO: codex backend working terribly recently. Not sure if it's a prompt thing, an openai thing, or what. Use davinci for now.
    #             # TODO: rm stop arg. Easiest way to overwrite existing stopword which appears in the prompt itself (which in turn prematurely truncates responses when using Repeat backend).
    #             res, _ = PM.query('debug_duckling', data, model=3, stop=["zzzzzz"])
    #         LOGGER.info(res[0])
    #         self.write(res[0])
    #     else:
    #         self.write('TODO: handle no code')

    # TODO: reenable auth
    # @tornado.web.authenticated
    async def get(self):
        data = {
            'question': 'Why does this code raise an error?',
            'code': 'def foo(x):\n    return 1 / x',
            'local_vars': json.dumps({'x': 0}),
            'global_vars': json.dumps({})
        }
        for name in data:
            data[name] = self.get_argument(name, data[name])

        # TODO: allow diff options based on extension config and/or payload? Only openai backend provides codex,
        # though GPTJ was trained on a lot of code too.
        # For now, just use "repeat" backend by default, or use real codex if user starts their question with "gpt".
        if data['question'].lower().startswith('gpt'):
            backend = 'openai'
            tmp = data['question'].lower().split('gpt', 1)[-1].strip()
            data['question'] = tmp[0].upper() + tmp[1:]
        else:
            backend = 'repeat'

        # TODO: can think about when we should skip the query (i.e. no code,
        # no question, etc.). For now just filled in default values.
        # if data['code']:
        #     with GPT(backend):
        #         # TODO: codex backend working terribly recently. Not sure if it's a prompt thing, an openai thing, or what. Use davinci for now.
        #         # TODO: rm stop arg. Easiest way to overwrite existing stopword which appears in the prompt itself (which in turn prematurely truncates responses when using Repeat backend).
        #         res, _ = PM.query('debug_duckling', data, model=3, stop=["zzzzzz"])
        #     LOGGER.info(res[0])
        #     self.write(res[0])
        # else:
        #     self.write('TODO: handle no code')
        if data['code']:
            with GPT(backend):
                # TODO: codex backend working terribly recently. Not sure if it's a prompt thing, an openai thing, or what. Use davinci for now.
                # TODO: rm stop arg. Easiest way to overwrite existing stopword which appears in the prompt itself (which in turn prematurely truncates responses when using Repeat backend).
                for res, _ in PM.query('debug_duckling', data, model=3,
                                       stop=["zzzzzz"], stream=True):
                    self.write(res)
                    LOGGER.info('\t' + res)
                    # TODO rm pause
                    time.sleep(.05)
        else:
            self.write('TODO: handle no code')

    # TODO: still get permission error even without tornado auth for post.
    # Maybe jupyter enforces no post endpoints allowed?
    # TODO: reenable auth
    # @tornado.web.authenticated
    def post(self):
        code = self.get_argument('code', '')
        self.write(code)

