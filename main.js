define([
  'require',
  'jquery',
  'base/js/namespace',
  'base/js/events',
  'base/js/utils',
  'notebook/js/codecell',
  'notebook/js/textcell',
  //'@jupyterlab/services',
  //'@jupyterlab/coreutils',
], function (
  requirejs,
  $,
  Jupyter,
  events,
  utils,
  codecell,
  textcell,
  //services,
  //coreutils
) {
  "use strict";
  var CodeCell = codecell.CodeCell;
  var TextCell = textcell.TextCell;

  var Duckling = function (nb) {
    var duckling = this;
    this.notebook = nb;
    this.kernel = nb.kernel;
    this.km = nb.keyboard_manager;
    this.collapsed = true;

    // create elements
    this.element = $("<div id='nbextension-duckling'>");
    this.close_button = $("<i>").addClass("fa fa-caret-square-o-down duckling-btn duckling-close");
    this.open_button = $("<i>").addClass("fa fa-caret-square-o-up duckling-btn duckling-open");
    this.element.append(this.close_button);
    this.element.append(this.open_button);
    this.open_button.click(function () {
      duckling.expand();
    });
    this.close_button.click(function () {
      duckling.collapse();
    });

    // Create code cell that will pop up on user hotkey.
	// TODO: trying to disable syntax highlighting. Better way is prob to try to get text cell working.
	// var cell_config = {...nb.config};
	// cell_config.highlight_modes = {};
    var cell = this.cell = new CodeCell(nb.kernel, {
      events: nb.events,
	    config: nb.config,
	//	config: cell_config,
		keyboard_manager: nb.keyboard_manager,
		notebook: nb,
		tooltip: nb.tooltip,
		});
    /*var cell = this.cell = new TextCell({
      events: nb.events,
      config: nb.config,
      keyboard_manager: nb.keyboard_manager,
      notebook: nb,
    });*/
      // TODO Md cell doesn't have this method. But when commented out, cell is not showing up.
    cell.set_input_prompt("User");
    this.element.append($("<div/>").addClass('cell-wrapper').append(this.cell.element));
    cell.render();
    cell.refresh();
    this.collapse();

    // override ctrl/shift-enter to execute me if I'm focused instead of the notebook's cell
    var execute_and_select_action = this.km.actions.register({
      handler: $.proxy(this.execute_and_select_event, this),
    }, 'duckling-execute-and-select');
    var toggle_action = this.km.actions.register({
      handler: $.proxy(this.toggle, this),
    }, 'duckling-toggle');
    
    var shortcuts = {
      'shift-enter': execute_and_select_action,
      'ctrl-d': toggle_action,
    }
    this.km.edit_shortcuts.add_shortcuts(shortcuts);
    this.km.command_shortcuts.add_shortcuts(shortcuts);

    // finally, add me to the page
    $("body").append(this.element);
  };

  Duckling.prototype.toggle = function () {
    if (this.collapsed) {
      this.expand();
    } else {
      this.collapse();
    }
    return false;
  };

  Duckling.prototype.expand = function () {
    this.collapsed = false;
    var site_height = $("#site").height();
    this.element.animate({
      height: Math.max(site_height * 3 / 4, 150),
    }, 200);
    this.open_button.hide();
    this.close_button.show();
    this.cell.element.show();
    this.cell.focus_editor();
    $("#notebook-container").css('margin-left', 0);
  };

  Duckling.prototype.collapse = function () {
    this.collapsed = true;
    $("#notebook-container").css('margin-left', 'auto');
    this.element.animate({
      height: 0,
    }, 100);
    this.close_button.hide();
    this.open_button.show();
    this.cell.element.hide();
  };

    // TODO: from typescript example. Figure out js equivalent
  //async callServer(): Promise<void> {
      //let settings = services.ServerConnection.makeSettings({});
      //let serverResponse = await services.ServerConnection.makeRequest(
        //coreutils.URLExt.join(settings.baseUrl, '/duckling/ask'), {method: 'GET'}, settings);
      //)
      //alert(await serverResponse.text());
  //}

  //async callServer(url) {
	  //var req = new XMLHttpRequest();
	  //req.open("GET", url, true);
	  //req.send();

		// V2
	  //return await fetch(url).then(response => response.json());
  //}

  Duckling.prototype.execute_and_select_event = function (evt) {
    if (utils.is_focused(this.element)) {
      var txt = this.cell.get_text();

	  var cur_cell = Jupyter.notebook.get_selected_cell();
	  var code = cur_cell.get_text();

	  // Https doesn't work, even from command line with curl. Has to be http.
	  var base_url = Jupyter.notebook.kernel.ws_url.replace("ws://", "http://");
	  var url = base_url + "/duckling/ask?question=" + encodeURIComponent(txt) + "&code=" + encodeURIComponent(code);
	  //req = fetch(url).then(response => response.json());
	  var req = new XMLHttpRequest();
	  // TODO: see if we can get async working (set third arg to true or switch to using commented out fetch line above).
	  // Would need to change 1 or more functions to be async to avoid errors (sync can't call async).
	  req.open("GET", url, false);
	  req.send();

      var output = {
        header: {
			msg_type: "stream"
		},
        content: {
			//text: JSON.parse(req.response)[0].question, // parse mock jeopary api
			text: req.response, // Currently server extension just returns bytes.
			name: "My-Name",
		}
      }

	  // Clear output first otherwise subsequent executions append output.
      this.cell.output_area.clear_output()
      this.cell.output_area.handle_output(output)

      this.cell.set_input_prompt("User"); // Not working. Number next to cell is incremented rather than setting to User.

	  // GENERAL DEBUGGING
	  console.log(Jupyter);
	  //alert(Jupyter.notebook.kernel.last_execution_result); // Cell not dfeined error.

    } else {
      this.notebook.execute_cell_and_select_below();
    }
  };

  function setup_duckling () {
    // lazy, hook it up to Jupyter.notebook as the handle on all the singletons
    console.log("Setting up duckling");
    return new Duckling(Jupyter.notebook);
  }

  function load_extension () {
    // add css
    var link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = requirejs.toUrl("./duckling.css");
    document.getElementsByTagName("head")[0].appendChild(link);
    // load when the kernel's ready
    if (Jupyter.notebook.kernel) {
      setup_duckling();
    } else {
      events.on('kernel_ready.Kernel', setup_duckling);
    }
  }

  return {
    load_ipython_extension: load_extension,
  };
});
