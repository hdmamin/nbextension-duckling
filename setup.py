from setuptools import setup


setup(
    name='duckling',
    version='0.0.1',
    description='Jupyter notebook server extension providing conversational '
                'debugging.',
    include_package_data=True,
    data_files=[('etc/jupyter/jupyter_server_config.d',
                 ['jupyter-config/jupyter_server_config.d/duckling.json'])]
)

