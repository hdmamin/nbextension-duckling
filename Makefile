.PHONY: build run


build:
	jupyter nbextension install ~/nbextension-duckling
	jupyter nbextension enable nbextension-duckling/main
	jupyter serverextension enable duckling

run:
	jupyter notebook --ServerApp.jpserver_extensions="{'duckling': True}" --debug --no-browser
