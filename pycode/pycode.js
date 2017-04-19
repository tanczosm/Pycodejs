(function () {
	
	var scriptEls = document.getElementsByTagName( 'script' );
    var thisScriptEl = scriptEls[scriptEls.length - 1];
    var scriptPath = thisScriptEl.src;
    var scriptFolder = scriptPath.substr(0, scriptPath.lastIndexOf( '/' )+1 );

	var pySplitContainer, pyResizeEditor = false;
	var pyInitialized = false, 
		pyDocReady = false, 
		pyLoaderLoaded = false, 
		pyCodeMirrorLoaded = false, 
		pySkulptLoaded = false, 
		pyTerminalLoaded = false, 
		pySplitLoaded = false;

	// Load script loader
	var js = document.createElement('script');
	js.src = scriptFolder + "lib/littleloader/little-loader.js";
	js.async = true;
	js.onload = function () { 
		 pyLoaderLoaded = true;
		 pyCode ();
	}
	var first = document.getElementsByTagName('script')[0];
	first.parentNode.insertBefore(js, first);

	(function(funcName, baseObj) {
		// The public function name defaults to window.docReady
		// but you can pass in your own object and own function name and those will be used
		// if you want to put them in a different namespace
		funcName = funcName || "docReady";
		baseObj = baseObj || window;
		var readyList = [];
		var readyFired = false;
		var readyEventHandlersInstalled = false;

		// call this when the document is ready
		// this function protects itself against being called more than once
		function ready() {
			if (!readyFired) {
				// this must be set to true before we start calling callbacks
				readyFired = true;
				for (var i = 0; i < readyList.length; i++) {
					// if a callback here happens to add new ready handlers,
					// the docReady() function will see that it already fired
					// and will schedule the callback to run right after
					// this event loop finishes so all handlers will still execute
					// in order and no new ones will be added to the readyList
					// while we are processing the list
					readyList[i].fn.call(window, readyList[i].ctx);
				}
				// allow any closures held by these functions to free
				readyList = [];
			}
		}

		function readyStateChange() {
			if ( document.readyState === "complete" ) {
				ready();
			}
		}

		// This is the one public interface
		// docReady(fn, context);
		// the context argument is optional - if present, it will be passed
		// as an argument to the callback
		baseObj[funcName] = function(callback, context) {
			if (typeof callback !== "function") {
				throw new TypeError("callback for docReady(fn) must be a function");
			}
			// if ready has already fired, then just schedule the callback
			// to fire asynchronously, but right away
			if (readyFired) {
				setTimeout(function() {callback(context);}, 1);
				return;
			} else {
				// add the function and context to the list
				readyList.push({fn: callback, ctx: context});
			}
			// if document already ready to go, schedule the ready function to run
			if (document.readyState === "complete") {
				setTimeout(ready, 1);
			} else if (!readyEventHandlersInstalled) {
				// otherwise if we don't have event handlers installed, install them
				if (document.addEventListener) {
					// first choice is DOMContentLoaded event
					document.addEventListener("DOMContentLoaded", ready, false);
					// backup is window load event
					window.addEventListener("load", ready, false);
				} else {
					// must be IE
					document.attachEvent("onreadystatechange", readyStateChange);
					window.attachEvent("onload", ready);
				}
				readyEventHandlersInstalled = true;
			}
		}
	})("docReady", window);

	function builtinRead(x) {
		if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
				throw "File not found: '" + x + "'";
		return Sk.builtinFiles["files"][x];
	}


	function createDiv (id, dclass)
	{
			var cdiv = document.createElement('div'); 
			cdiv.id = id;
			cdiv.className = dclass;
			
			return cdiv;
	}

	// Returns ratio needed for split
	function pyAdjustHeight (editor, container)
	{
			var lc = editor.lineCount();
			var maxLines = 20;
			var editorLines = Math.min(lc, maxLines);
			var consoleHeight = 100 + Math.max(0, editorLines - 10) * 5;
			
			var ht = consoleHeight;
		
			
			ht += editorLines * 20 + 20;
			container.style.height = ht + "px";
			
			return (1 - (consoleHeight/ht)) * 100.0 ;
	}

	function pyResize() {
		if (pyResizeEditor && pySplitContainer)
			pySplitContainer.container.style.height = window.innerHeight - 50 + "px";
	}


	function pyCraft(pycodes) {

		if (!pyCodeMirrorLoaded || !pySkulptLoaded || !pyTerminalLoaded || !pySplitLoaded)
			return;

		if (pycodes.length == 0)
			return;
			
		var section = 1;

		
		if(window.addEventListener) {
			window.addEventListener('resize', pyResize, true);
		}

		
		for (var i = 0, len = pycodes.length; i < len; i++) 
		{
			var pyelem = pycodes[i]; // $(this);
			var rawcode = pyelem.innerHTML.replace(/^\s+|\s+$/g, '');

			pyelem.innerHTML = "";
			
			var editorid = "pyeditorpane" + section;
			var menuid = "pyeditormenu" + section;
			var canvasid = "pycanvas" + section;
			var canvassurfaceid = canvasid + "surf";
			var consoleid = "pyconsole" + section;
			var outputid = "pyoutput" + section;
			var pyoutputid = "pyhidden" + section;
			var pyedconid = "pyedcon" + section;
			var pymodalid = "pymodal" + section;
			
			var container = createDiv("pycon" + section, "pycontainer");
			var editcontainer = createDiv(pyedconid, "split");
			
			var pymenu = createDiv (menuid, "pymenu");
			var cm = createDiv (editorid, "pyeditor split split-horizontal");
			var pymodal = createDiv (pymodalid, "pymodal");
			var pymodalcontent = createDiv(pymodalid + "c", "pymodal-content");
			var pycanvas = createDiv (canvasid, "pycanvas");
			var pyoutput = createDiv (outputid, "pyoutput");
			//var pyconsole = createDiv (consoleid, "pyconsole");
			
			pyoutput.innerHTML = "<pre id='" + pyoutputid + "' style='display:none'></pre>";

			var modal = pyelem.appendChild (pymodal);
				var modalcontent = modal.appendChild (pymodalcontent);
					var pyclose = document.createElement("span");
					pyclose.innerHTML = "&times;";
					pyclose.className = "pyclose";
					modalcontent.appendChild (pyclose);
					modalcontent.appendChild( pycanvas );
			
			pyelem.appendChild( pymenu );
			var con = pyelem.appendChild( container);
				var edcon = con.appendChild(editcontainer);
					edcon.appendChild( cm );
				con.appendChild( pyoutput );		
			
			var cmeditor = CodeMirror(document.getElementById(editorid), {
				value: rawcode,
				lineNumbers: true,
				mode:  "python"
			});
			
			
			var pyTerminal = new Terminal();

			pyoutput.appendChild(pyTerminal.html);
			
			
			
			var btnrun = document.createElement('div');
			btnrun.innerHTML = "RUN &raquo;";
			btnrun.className = 'btn btn-success';
			btnrun.pyeditor = cmeditor;
			btnrun.pyterminal = pyTerminal;
			btnrun.pyoutputid = pyoutputid;
			btnrun.pycanvasid = canvasid
			btnrun.pycanvassurfaceid = canvassurfaceid;
			btnrun.pyhighlights = [];
			btnrun.pymodal = modal;
			btnrun.pyclose = pyclose;
			
			btnrun.onclick = function () {  
											var cmeditor = this.pyeditor;
											var pyTerminal = this.pyterminal;
											var highlights = this.pyhighlights;
											var prog = cmeditor.getValue(); 
											var mypre = document.getElementById(pyoutputid); 
											var pycanvassurfaceid = this.pycanvassurfaceid;
											var pycanvasid = this.pycanvasid;
											var pymodal = this.pymodal;
											
											// If the source code includes a call to .Turtle() then we assume there will be Turtle Graphics
											if (cmeditor.getValue().includes(".Turtle()") )
											{
												this.pymodal.style.display = "block";
												this.pyclose.onclick = function () { pymodal.style.display = "none" ; }
											}
											
											mypre.innerHTML = ''; 
											output = "";
											pyTerminal.clear();

											// Clear any highlighted lines from previous execution attempts
											if (highlights.length)
											{
												for ($i = 0; $i < highlights.length; $i++)
												{
													cmeditor.removeLineClass(highlights[$i], "background", "CodeMirror-activeline-background");
												}
											}
											highlights.length = 0;
										   
											// Set up Skulpt to run python code
											Sk.pre = this.pyoutputid;
											Sk.inputfun = function (prompt) { 

																				return new Promise(
																									function (resolve) { 
																											pyTerminal.input(prompt, function(input) { /*output += input + "\n";*/ resolve(input); });
																										});
																			}
											Sk.configure({output: function(text) 
																			{ 
																				pyTerminal.print(text);
																				pyTerminal.html.scrollTop = pyTerminal.html.scrollHeight;
																			}, 
																			read:builtinRead,
																			inputfunTakesPrompt: true,
																			debugout: function(text)
																			{
																				pyTerminal.print(text);
																			}
																			}); 
											(Sk.TurtleGraphics || (Sk.TurtleGraphics = { })).target = this.pycanvasid;
											
											var myPromise = Sk.misceval.asyncToPromise(function() {

												
												//htmlParent = document.getElementById(pycanvasid);
												
												//Sk.TurtleGraphics.width = htmlParent.offsetWidth;
												//Sk.TurtleGraphics.height = htmlParent.offsetHeight;
												
											   return Sk.importMainWithBody("<stdin>", false, prog, true);
											});
											myPromise.then(function(mod) {
											   //pyTerminal.print('success');
											},
											   function(err) {
											   
												   let ret = err.toString(); // Simple output message

													// Create stacktrace message
													if (err.traceback) {
													  for (let i = 0; i < err.traceback.length; i++) {
														ret += "\n  at " + err.traceback[i].filename + " line " + err.traceback[i].lineno;
														
														highlights.push(cmeditor.addLineClass(err.traceback[i].lineno-1, 'background', "CodeMirror-activeline-background"));
														
														if ("colno" in err.traceback[i]) {
														  ret += " column " + err.traceback[i].colno;
														}
													  }
													}
													
													pyTerminal.print(ret);
											});				
							};   
							
					

			pymenu.appendChild(btnrun);


			
			var ratio = pyAdjustHeight (cmeditor, container);

			
			var splitOptions = {
				direction: 'vertical',
				sizes: [ratio,100-ratio],
				minSize: [100, 5],
				canvasid: canvasid ,
				container: container,
				editor: cmeditor,
				output: pyoutput,
				ratio: ratio,
				onDragEnd: function() { 
													/*htmlParent = document.getElementById(this.canvasid);

													var canvas2 = htmlParent.childNodes[1];
													canvas2.style.marginTop = "-"+canvas2.height+"px"; */
													if (this.output.offsetHeight < 100)
													{
														var diff = 100-this.output.offsetHeight;
														if (this.container.offsetHeight < 800)
														{
															this.container.style.height = Math.min(this.container.offsetHeight+diff, 800);
														}
														
														var ratio = 100 - (100/this.container.offsetHeight)*100; //pyAdjustHeight (this.editor, this.container);
														this.instance.setSizes([ratio,100-ratio]);
														this.ratio = ratio;
													}
													
										}
			};

			
			
			var instance = Split(['#'+pyedconid, '#'+outputid], splitOptions);
			splitOptions.instance = instance;  
			
			var btnfull = document.createElement('div');
			btnfull.innerHTML = "Fullscreen";
			btnfull.className = 'btn btn-info';
			btnfull.pycode = pyelem;
			btnfull.style = "float:right; margin-right: 20px";
			btnfull.splitOptions = splitOptions;
			btnfull.ratio = ratio;

			btnfull.onclick = function () {  
									if (this.pycode.className.includes("pycode full"))
									{
										this.pycode.className = this.pycode.className.replace("pycode full", "pycode");
										this.splitOptions.container.style.height = this.splitOptions.originalHeight;
										this.splitOptions.instance.setSizes([this.ratio,100-this.ratio]);
										document.body.style.overflow = "";
										this.innerHTML = "Fullscreen";
										pyResizeEditor = false;
									}
									else
									{
										this.pycode.className = this.pycode.className.replace("pycode", "pycode full");
										this.splitOptions.originalHeight = this.splitOptions.container.offsetHeight;
										this.splitOptions.container.style.height = window.innerHeight - 50 + "px";
										document.body.style.overflow = "hidden";
										
										pySplitContainer = this.splitOptions;
										pyResizeEditor = true;
										this.splitOptions.instance.setSizes([this.ratio,100-this.ratio]);
										this.innerHTML = "Normal View";
									}
										
								};
			pymenu.appendChild(btnfull);
			

			section++;
			
			
		}  


	}
	
	function pyCode ()
	{
		if (pyLoaderLoaded && pyDocReady && !pyInitialized)
		{
			var $pycodes = document.getElementsByClassName('pycode'); 

			if ($pycodes.length > 0)
			{
				window._lload(scriptFolder + "lib/codemirror-5.21.0/lib/codemirror.js", function (err) { 
						window._lload(scriptFolder + "lib/codemirror-5.21.0/mode/python/python.js", function (err) { pyCodeMirrorLoaded = true; pyCraft($pycodes); });
					});
					
				window._lload(scriptFolder + "lib/skulpt/skulpt.min.js", function (err) { 
						window._lload(scriptFolder + "lib/skulpt/skulpt-stdlib.js", function (err) { pySkulptLoaded = true; pyCraft($pycodes); });
					});

				window._lload(scriptFolder + "lib/terminaljs/terminal.js", function (err) { pyTerminalLoaded = true; pyCraft($pycodes); });	
				window._lload(scriptFolder + "lib/splitjs/split.js", function (err) { pySplitLoaded = true; pyCraft($pycodes); });	

					
			}			
			
			pyInitialized = true;
		}
	}


	docReady(function() 
		{
			pyDocReady = true;
			pyCode ();
		});
	
}());	