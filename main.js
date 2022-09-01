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
    var cell = this.cell = new CodeCell(nb.kernel, {
      events: nb.events,
	    config: nb.config,
		keyboard_manager: nb.keyboard_manager,
		notebook: nb,
		tooltip: nb.tooltip,
		});
    cell.set_input_prompt("User");
    this.element.append($("<div/>").addClass('cell-wrapper').append(this.cell.element));
    cell.render();
    cell.refresh();
	cell.metadata = {
		global_vars: null
	};
    this.collapse();

    // override ctrl/shift-enter to execute me if I'm focused instead of the notebook's cell
    var execute_and_select_action = this.km.actions.register({
      handler: $.proxy(this.execute_and_select_event, this),
    }, 'duckling-execute-and-select');
    var toggle_action = this.km.actions.register({
      handler: $.proxy(this.toggle, this),
    }, 'duckling-toggle');
    
	// Many other characters already perform other text editing tasks and 
	// adding them as shortcuts here doesn't remove that behavior.
    var shortcuts = {
      'shift-enter': execute_and_select_action,
      'ctrl-j': toggle_action,
    }
    this.km.edit_shortcuts.add_shortcuts(shortcuts);
    this.km.command_shortcuts.add_shortcuts(shortcuts);

    // finally, add me to the page
    $("body").append(this.element);
  };

  Duckling.prototype.toggle = function () {
    if (this.collapsed) {
      this.expand();
	  // TODO consider if I want to clear inputs/outputs when closing cell. Initially thought yes but now leaning no. Useful to toggle back and forth frequently to see code and don't want to erase everything every time.
	  // this.cell.set_text("");
      // this.cell.output_area.clear_output();
    } else {
      this.collapse();
    }
    return false;
  };

  Duckling.prototype.expand = function () {
    this.collapsed = false;
    var site_height = $("#site").height();
    this.element.animate({
      height: site_height,
    }, 150);
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

  function localVarsCmd(varnames) {
  	varnames = new Set(varnames);
	var unique_names_str = JSON.stringify([...varnames]);
	return 'print({k: v for k, v in globals().items() if k in ' + unique_names_str + '})';
  }

  function add_varnames_to_metadata (cell, msg) {
	console.log('RELEVANT VARS:', msg.content['text']);
	if (cell.metadata === undefined) {
		cell.metadata = {
		    global_vars: null
		};
	}
	cell.metadata['global_vars'] = msg.content['text'];
	console.log('META:', cell.metadata);
  }

  /*function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
  }*/

  const sleep = ms => new Promise(res => setTimeout(res, ms));

  Duckling.prototype.execute_and_select_event = async function (evt) {
    if (utils.is_focused(this.element)) {
	  // TODO: maybe can eventually switch to stream results and/or provide a spinner widget while waiting. 
	  // In the meantime, a plain text message should be fine.
      var output = {
        header: {
			msg_type: "stream"
		},
        content: {
			text: 'typing...', // Currently server extension just returns bytes.
			name: "My-Name", // TODO: does this value matter?
		}
      }
      this.cell.output_area.clear_output()
      this.cell.output_area.handle_output(output)

	  // Now that we've provided a waiting message, we get to the core functionality.
	  var question = this.cell.get_text();
	  var cur_cell = Jupyter.notebook.get_selected_cell();
	  var code = cur_cell.get_text();
	  var cur_varnames = $('div.selected').find('span.cm-variable').map(
	  	function() {
	      return this.outerText
		}
	  ).get();

	  // Find current variable values and store them as a str in cell metadata.
	  // TODO: this must be async bc my codex request is happening before it's done.
	  var onExecute = add_varnames_to_metadata.bind(null, this.cell);
	  Jupyter.notebook.kernel.execute(
	  	localVarsCmd(cur_varnames), {iopub: {output: onExecute}}, {silent: false}
	  );
	  // Must wait until the async execute call above completes before calling codex.
	  while (this.cell.metadata["global_vars"] === null) {
	  	await sleep(10);
		console.log('sleeping');
	  }

	  // Https doesn't work, even from command line with curl. Has to be http.
	  var base_url = Jupyter.notebook.kernel.ws_url.replace("ws://", "http://");
	  var url = base_url + "/duckling/ask?question=" + encodeURIComponent(question) + "&code=" + encodeURIComponent(code) + "&global_vars=" + encodeURIComponent(this.cell.metadata['global_vars']);
	  console.log("URL:", url); // TODO rm
	  //req = fetch(url).then(response => response.json());
	  var req = new XMLHttpRequest();
	  // TODO: see if we can get async working (set third arg to true or switch to using commented out fetch line above).
	  // Would need to change 1 or more functions to be async to avoid errors (sync can't call async).
	  req.open("GET", url, false);
	  req.send();

      output = {
        header: {
			msg_type: "stream"
		},
        content: {
			text: req.response, // Currently server extension just returns bytes.
			name: "My-Name", // TODO: does this value matter?
		}
      }

	  // Clear output first otherwise subsequent executions append output.
      this.cell.output_area.clear_output()
      this.cell.output_area.handle_output(output)

      this.cell.set_input_prompt("User"); // Not working. Number next to cell is incremented rather than setting to User.
   	  this.cell.metadata['global_vars'] = null;

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
