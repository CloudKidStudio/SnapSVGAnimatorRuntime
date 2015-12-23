/*! SnapSVGAnimatorRuntime 1.0.0 */
(function()
{
	// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
	// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
	// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
	// MIT license
	var vendors = ['ms', 'moz', 'webkit', 'o'];
	var len = vendors.length;
	for (var x = 0; x < len && !window.requestAnimationFrame; ++x)
	{
		window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
		window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
	}

	// create a setTimeout based fallback if there wasn't an official or prefixed version
	if (!window.requestAnimationFrame)
	{
		var TimeUtils = include('springroll.TimeUtils');
		var lastTime = 0;
		// Create the polyfill
		window.requestAnimationFrame = function(callback)
		{
			var currTime = TimeUtils.now(); //use the now function from down below
			var timeToCall = Math.max(0, 16 - (currTime - lastTime));
			var id = window.setTimeout(function()
			{
				callback(currTime + timeToCall);
			}, timeToCall);
			lastTime = currTime + timeToCall;
			return id;
		};

		// Only set this up if the corresponding requestAnimationFrame was set up
		window.cancelAnimationFrame = function(id)
		{
			clearTimeout(id);
		};
	}

	// Short alias
	window.requestAnimFrame = window.requestAnimationFrame;

}());
(function(window)
{
	// Include the window.performance object
	var performance = include('performance', false);

	// See if we have performance.now or any of
	// the brower-specific versions
	var now = performance && (
		performance.now ||
		performance.mozNow ||
		performance.msNow ||
		performance.oNow ||
		performance.webkitNow
	);

	// Browser prefix polyfill
	if (now) performance.now = now;

	/**
	 * A collection of Time related utility functions
	 * @class TimeUtils
	 * @namespace snap
	 */
	var TimeUtils = {};

	/**
	 * This method gets timestamp in micromilliseconds for doing performance
	 * intense operations. Fallback support is to `Date.now()`. We aren't overridding
	 * `performance.now()` incase dependencies on this actually demand 
	 * the optimization and accuracy that performance actually provides.
	 * @static
	 * @method now
	 * @return {int} The number of micromilliseconds of the current timestamp
	 */
	TimeUtils.now = !now ? Date.now : function()
	{
		return performance.now();
	};

	// Assign to namespace
	namespace('snap').TimeUtils = TimeUtils;

}(window));
(function(undefined)
{
	/**
	 * The EventDispatcher mirrors the functionality of AS3 and EaselJS's EventDispatcher,
	 * but is more robust in terms of inputs for the `on()` and `off()` methods.
	 *
	 * @class EventDispatcher
	 * @namespace snap
	 * @constructor
	 */
	var EventDispatcher = function()
	{
		/**
		 * The collection of listeners
		 * @property {Array} _listeners
		 * @private
		 */
		this._listeners = [];

		/**
		 * If the dispatcher is destroyed
		 * @property {Boolean} _destroyed
		 * @protected
		 */
		this._destroyed = false;
	};

	// Reference to the prototype
	var p = EventDispatcher.prototype;

	/**
	 * If the dispatcher is destroyed
	 * @property {Boolean} destroyed
	 */
	Object.defineProperty(p, 'destroyed',
	{
		enumerable: true,
		get: function()
		{
			return this._destroyed;
		}
	});

	/**
	 * Dispatch an event
	 * @method trigger
	 * @param {String} type The type of event to trigger
	 * @param {*} arguments Additional parameters for the listener functions.
	 */
	p.trigger = function(type)
	{
		if (this._destroyed) return;

		if (this._listeners[type] !== undefined)
		{
			// copy the listeners array
			var listeners = this._listeners[type].slice();

			var args;

			if (arguments.length > 1)
			{
				args = Array.prototype.slice.call(arguments, 1);
			}

			for (var i = listeners.length - 1; i >= 0; --i)
			{
				var listener = listeners[i];
				if (listener._eventDispatcherOnce)
				{
					delete listener._eventDispatcherOnce;
					this.off(type, listener);
				}
				listener.apply(this, args);
			}
		}
	};

	/**
	 * Add an event listener but only handle it one time.
	 *
	 * @method once
	 * @param {String|object} name The type of event (can be multiple events separated by spaces),
	 *      or a map of events to handlers
	 * @param {Function|Array*} callback The callback function when event is fired or an array of callbacks.
	 * @param {int} [priority=0] The priority of the event listener. Higher numbers are handled first.
	 * @return {EventDispatcher} Return this EventDispatcher for chaining calls.
	 */
	p.once = function(name, callback, priority)
	{
		return this.on(name, callback, priority, true);
	};

	/**
	 * Add an event listener. The parameters for the listener functions depend on the event.
	 *
	 * @method on
	 * @param {String|object} name The type of event (can be multiple events separated by spaces),
	 *      or a map of events to handlers
	 * @param {Function|Array*} callback The callback function when event is fired or an array of callbacks.
	 * @param {int} [priority=0] The priority of the event listener. Higher numbers are handled first.
	 * @return {EventDispatcher} Return this EventDispatcher for chaining calls.
	 */
	p.on = function(name, callback, priority, once)
	{
		if (this._destroyed) return;

		// Callbacks map
		if (type(name) === 'object')
		{
			for (var key in name)
			{
				if (name.hasOwnProperty(key))
				{
					this.on(key, name[key], priority, once);
				}
			}
		}
		// Callback
		else if (type(callback) === 'function')
		{
			var names = name.split(' '),
				n = null;

			var listener;
			for (var i = 0, nl = names.length; i < nl; i++)
			{
				n = names[i];
				listener = this._listeners[n];
				if (!listener)
					listener = this._listeners[n] = [];

				if (once)
				{
					callback._eventDispatcherOnce = true;
				}
				callback._priority = parseInt(priority) || 0;

				if (listener.indexOf(callback) === -1)
				{
					listener.push(callback);
					if (listener.length > 1)
						listener.sort(listenerSorter);
				}
			}
		}
		// Callbacks array
		else if (Array.isArray(callback))
		{
			for (var f = 0, fl = callback.length; f < fl; f++)
			{
				this.on(name, callback[f], priority, once);
			}
		}
		return this;
	};

	function listenerSorter(a, b)
	{
		return a._priority - b._priority;
	}

	/**
	 * Remove the event listener
	 *
	 * @method off
	 * @param {String*} name The type of event string separated by spaces, if no name is specifed remove all listeners.
	 * @param {Function|Array*} callback The listener function or collection of callback functions
	 * @return {EventDispatcher} Return this EventDispatcher for chaining calls.
	 */
	p.off = function(name, callback)
	{
		if (this._destroyed) return;

		// remove all
		if (name === undefined)
		{
			this._listeners = [];
		}
		// remove multiple callbacks
		else if (Array.isArray(callback))
		{
			for (var f = 0, fl = callback.length; f < fl; f++)
			{
				this.off(name, callback[f]);
			}
		}
		else
		{
			var names = name.split(' ');
			var n = null;
			var listener;
			var index;
			for (var i = 0, nl = names.length; i < nl; i++)
			{
				n = names[i];
				listener = this._listeners[n];
				if (listener)
				{
					// remove all listeners for that event
					if (callback === undefined)
					{
						listener.length = 0;
					}
					else
					{
						//remove single listener
						index = listener.indexOf(callback);
						if (index !== -1)
						{
							listener.splice(index, 1);
						}
					}
				}
			}
		}
		return this;
	};

	/**
	 * Checks if the EventDispatcher has a specific listener or any listener for a given event.
	 *
	 * @method has
	 * @param {String} name The name of the single event type to check for
	 * @param {Function} [callback] The listener function to check for. If omitted, checks for any listener.
	 * @return {Boolean} If the EventDispatcher has the specified listener.
	 */
	p.has = function(name, callback)
	{
		if (!name) return false;

		var listeners = this._listeners[name];
		if (!listeners) return false;
		if (!callback)
			return listeners.length > 0;
		return listeners.indexOf(callback) >= 0;
	};

	/**
	 * Destroy and don't use after this
	 * @method destroy
	 */
	p.destroy = function()
	{
		this._destroyed = true;
		this._listeners = null;
	};

	/**
	 * Return type of the value.
	 *
	 * @private
	 * @method type
	 * @param  {*} value
	 * @return {String} The type
	 */
	function type(value)
	{
		if (value === null)
		{
			return 'null';
		}
		var typeOfValue = typeof value;
		if (typeOfValue === 'object' || typeOfValue === 'function')
		{
			return Object.prototype.toString.call(value).match(/\s([a-z]+)/i)[1].toLowerCase() || 'object';
		}
		return typeOfValue;
	}

	// Assign to name space
	namespace('snap').EventDispatcher = EventDispatcher;

}());
(function()
{	
	/**
	 * Manage the data
	 * @class ResourceManager
	 * @namespace snap
	 * @constructor
	 * @param {Object} data The source Flash data
	 */	
	var ResourceManager = function(data)
	{
		var id;

		this.m_shapes = [];
		this.m_movieClips = [];
		this.m_bitmaps = [];
		this.m_text = [];
		this.m_data = data;
		
		var dom = this.m_data.DOMDocument;

		//Parse shapes and movieClips	
		for(var shapeIndex = 0; shapeIndex < dom.Shape.length; shapeIndex++)
		{
			id = dom.Shape[shapeIndex].charid;
			var shapeData = dom.Shape[shapeIndex];
			this.m_shapes[id] = shapeData;
		}

		// for(var bitmapIndex =0; bitmapIndex < this.m_data.DOMDocument.Bitmaps.length; bitmapIndex++)
		// {
		// 	id = this.m_data.DOMDocument.Bitmaps[bitmapIndex].charid;
		// 	var bitmapData = this.m_data.DOMDocument.Bitmaps[bitmapIndex];
		// 	this.m_bitmaps[id] = bitmapData;
		// }

		// for(var textIndex =0; textIndex < this.m_data.DOMDocument.Text.length; textIndex++)
		// {
		// 	id = this.m_data.DOMDocument.Text[textIndex].charid;
		// 	var textData = this.m_data.DOMDocument.Text[textIndex];
		// 	this.m_text[id] = textData;
		// }
		
		if(dom.Timeline !== undefined)
		{
			for(var movieClipIndex = 0; movieClipIndex < dom.Timeline.length - 1; movieClipIndex++)
			{
				id = dom.Timeline[movieClipIndex].charid;
				var movieClipData = dom.Timeline[movieClipIndex];
				this.m_movieClips[id] = movieClipData;
			}
		}
	};

	var p = ResourceManager.prototype;
	
	//Member functions
	p.getShape = function(id)
	{
		return this.m_shapes[id];
	};

	p.getMovieClip = function(id)
	{
		return this.m_movieClips[id];
	};

	// p.getBitmap = function(id)
	// {
	// 	return this.m_bitmaps[id];
	// };

	// p.getText = function(id)
	// {
	// 	return this.m_text[id];
	// };

	namespace('snap').ResourceManager = ResourceManager;

}());
(function(undefined)
{
	/**
	 * Display object
	 * @class DisplayObject
	 * @constructor
	 * @param {String} id
	 * @param {Snap|MovieClip} parentMC
	 * @param {int} placeAfter The index to place after
	 * @param {String} transform
	 */
	var DisplayObject = function(type, id, parentMC, placeAfter, transform)
	{
		//parent is stage if svg
		var parentEl = parentMC.type == 'svg' ? parentMC : parentMC.el;

		/**
		 * The element
		 * @property {SVGElement} el
		 */
		this.el = parentEl.g();

		/**
		 * The element's id
		 * @property {String} id
		 */
		this.id = id || null;

		// Set the element class and token
		this.el.attr({'class': type, 'token': this.id});

		/**
		 * The element's id
		 * @property {String} id
		 */
		this.transform = transform || null;


		if (this.transform) 
		{
			var transformData = this.transform;
			var transformArray = transformData.split(",");
			var transformMat = new Snap.Matrix(
				transformArray[0],
				transformArray[1],
				transformArray[2],
				transformArray[3],
				transformArray[4],
				transformArray[5]
			);
			this.el.transform(transformMat);
		}

		if (placeAfter && parseInt(placeAfter) !== 0)
		{
			var afterMC = parentMC.getChildById(parseInt(placeAfter));
			afterMC.el.before(this.el);
		}
		else
		{
			parentEl.add(this.el); //TODO:: handle after
		}
	};

	var p = DisplayObject.prototype;

	/**
	 * Destroy
	 * @method destroy
	 */
	p.destroy = function()
	{
		this.transform = null;
		this.el.remove();
		this.el = null;
	};

	namespace('snap').DisplayObject = DisplayObject;

}());
(function()
{
	var DisplayObject = include('snap.DisplayObject');

	var Shape = function(parentMC, resourceManager, charId, objectId, placeAfter, transform)
	{
		DisplayObject.call(this, 'shape', objectId, parentMC, placeAfter, transform);

		this.children = [];
		this.isMask = false;
		this.isMasked = false;
		this.mask = null;
		this.maskTill = null;

		var shape = resourceManager.m_data.DOMDocument.Shape;

		for (var j = 0; j < shape.length; j++)
		{
			if (shape[j].charid == charId) 
			{
				for (var k = 0; k < shape[j].path.length; k++)
				{
					this.addPath(shape[j].path[k]);
				}
			}
		}
	};

	var p = Shape.prototype = Object.create(DisplayObject.prototype);

	/**
	 * Cleanup and don't use after this
	 * @method destroy
	 */
	p.destroy = function()
	{
		this.children = null;
		this.mask = null;
		this.maskTill = null;

		DisplayObject.prototype.destroy.call(this);
	};

	p.addPath = function(resourcePath)
	{
		var shape = this.el.path();
		var path = resourcePath.d;
		shape.attr({fill: 'transparent'});
		shape.attr({d: path});

		if(resourcePath.pathType == "Fill")
		{
			this.addFill(shape, resourcePath);
		}
		else if(resourcePath.pathType == "Stroke")
		{
			this.addStroke(shape, resourcePath);
		}
	};

	p.getFillColor = function(resourcePath)
	{
		var clr = resourcePath.color;
		var r = parseInt(clr.substring(1, 3), 16);
		var g = parseInt(clr.substring(3, 5), 16);
		var b = parseInt(clr.substring(5, 7), 16);
		var a = resourcePath.colorOpacity;
		return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
	};

	p.getFillImage = function(resourceImg)
	{
		var patternArray = resourceImg.patternTransform.split(",");						
		var p = 0;
		var mat = new Snap.Matrix(patternArray[p],patternArray[p+1],patternArray[p+1],patternArray[p+3],patternArray[p+4],patternArray[p+5]);
		var src = resourceImg.bitmapPath;
		
		var exists = parentMC.el.paper.select('defs pattern image');
		
		if (exists)
		{
			if (exists.attr('href') == src)
			{
				//check if image href matches as well as other props
				fillImage = exists.parent();
			}
			else
			{
				fillImage = this.newPattern(src, resourceImg, mat);
			}
		}
		else 
		{
			fillImage = this.newPattern(src, resourceImg, mat);
		}
		return fillImage;
	};

	p.getFillGradient = function(grad, type, shape1)
	{
		var _x,
			_y,
			_x2,
			_y2,
			_fx,
			_fy,
			gradientString,
			gradientFill,
			i,
			rgb;

		if (type == 'linear')
		{
			_x = parseFloat(grad.x1);
			_y = parseFloat(grad.y1);
			_x2 = parseFloat(grad.x2);
			_y2 = parseFloat(grad.y2);
			gradientString = "L(";
			gradientString += _x + ", ";
			gradientString += _y + ", ";
			gradientString += _x2 + ", ";
			gradientString += _y2 + ")";
		}
		else
		{
			_x = (shape1.getBBox().x + shape1.getBBox().width / 2) + grad.cx / 10;
			_y = (shape1.getBBox().y + shape1.getBBox().height / 2) + grad.cy / 10;
			_fx = (shape1.getBBox().x + shape1.getBBox().width / 2) + parseFloat(grad.fx);
			_fy = (shape1.getBBox().y + shape1.getBBox().height / 2) + parseFloat(grad.fy);
			gradientString = "R("; 
			gradientString += _x + ", ";
			gradientString += _y + ", ";
			gradientString += grad.r + ", ";
			gradientString += _fx + ", ";
			gradientString += _fy + ")";
		}
		
		for (i = 0; i < grad.stop.length; i++)
		{	
			rgb = hexToRgb(grad.stop[i].stopColor);
			gradientString += 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + grad.stop[i].stopOpacity + ')';		
			gradientString += ":";
			gradientString += grad.stop[i].offset;
			if (i !== grad.stop.length-1)
			{
				gradientString += "-";
			}		
		}
		gradientFill = parentMC.el.paper.gradient(gradientString);
		return gradientFill;
	};

	p.addFill = function(shape, resourcePath)
	{
		var fillColor,
			fillImage,
			fillGradient,
			img,
			grad;

		if(resourcePath.color)
		{
			fillColor = this.getFillColor(resourcePath);
			shape.attr({fill: fillColor});
		}
		if(resourcePath.image)
		{ 
			img = resourcePath.image;
			fillImage = this.getFillImage(img);
			shape.attr({fill: fillImage});
		}
		if(resourcePath.linearGradient)
		{	
			grad = resourcePath.linearGradient;
			fillGradient = this.getFillGradient(grad, 'linear');
			shape.attr({fill: fillGradient});
		}
		if(resourcePath.radialGradient)
		{	
			grad = resourcePath.radialGradient;
			fillGradient = this.getFillGradient(grad, 'radial', shape);
			shape.attr({fill: fillGradient});
		}

	};

	p.addStroke = function(shape, resourcePath)
	{
		if (resourcePath.color)
		{
			var clr = resourcePath.color;

			var r = parseInt(clr.substring(1, 3), 16);
			var g = parseInt(clr.substring(3, 5), 16);
			var b = parseInt(clr.substring(5, 7), 16);
			var a = resourcePath.colorOpacity;

			var colStr = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';

			shape.attr({stroke: colStr, strokeWidth: resourcePath.strokeWidth});
		}
	};

	p.newPattern = function(src, resourceImg, mat)
	{
		var image = this.el.image(src);
		var pattern = image.pattern(0, 0, resourceImg.width, resourceImg.height);
		pattern.attr({x: mat.e, y: mat.f});

		return pattern;
	};

	p.toString = function()
	{
		return '[Shape id="' + this.id+'"]';
	};

	function hexToRgb(hex)
	{
		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : null;
	}

	namespace('snap').Shape = Shape;

}());
(function()
{
	/**
	 * Garbage collector/cleanup
	 * @class GarbagePool
	 * @namespace snap
	 */
	var GarbagePool = function()
	{
		this.EMPTY_POOL = [];      //if empty remove
		this.REF_POOL = [];        //if no reference remove
	};

	var p = GarbagePool.prototype;

	p.addEmpty = function(el)
	{
		this.EMPTY_POOL.push(el);
	};

	/**
	 * manages adding of references
	 *
	 */
	p.addRef = function(el, refs)
	{
		var i,
			j;

		for (i = 0; i < this.REF_POOL.length; i++)
		{
			if (this.REF_POOL[i].el.id == el.id)
			{
				for (j = 0; j < refs.length; j++)
				{
					this.REF_POOL[i].refs.push(refs[j]);   
				}
				return;
			}
		}

		this.REF_POOL.push({el: el, refs: refs});
	};

	p.purge = function()
	{
		this.purgeEmptyPool();
		this.purgeRefPool();
	};

	/**
	 * check if empty and remove
	 *
	 */
	p.purgeEmptyPool = function()
	{
		var i,
			el;

		for (i = this.EMPTY_POOL.length - 1; i > -1; i -= 1)
		{
			el = this.EMPTY_POOL[i];
			if (el.children().length === 0)
			{
				el.remove();
				this.EMPTY_POOL.splice(i, 1);
			}
		}
	};

	/**
	 * check if all references are removed then remove
	 *
	 */
	p.purgeRefPool = function()
	{
		var i,
			j,
			k,
			item;

		for (i = this.REF_POOL.length - 1; i > -1; i -= 1)
		{

			item = this.REF_POOL[i];
			k = 0;

			for (j = 0; j < item.refs.length; j++)
			{

				if (item.refs[j].removed)
				{
					k++;
				}

				if (k == item.refs.length)
				{
					item.el.remove();
					this.REF_POOL.splice(i, 1);
				}
			}
		}
	};

	namespace('snap').GarbagePool = new GarbagePool();

}());
(function()
{
	/**
	 * Commands for building the animation
	 * @class Commands
	 * @namespace snap
	 */	
	var Commands = {};
	
	//Place Class
	Commands.Place = function(charID, id, placeAfter, transform, bounds) 
	{
		this.charID = charID;
		this.id = id;
		this.placeAfter = placeAfter;
		this.transform = transform;
		this.bounds = bounds;
	};

	//Execute function for Place
	Commands.Place.prototype.execute = function(parentMC, resourceManager)
	{
		var MovieClip = include('snap.MovieClip'),
			Shape = include('snap.Shape'),
			shape = resourceManager.getShape(this.charID),
			// bitmap = resourceManager.getBitmap(this.charID),
			// text = resourceManager.getText(this.charID),
			// textObject,
			// bmpObject,
			shapeObject,
			movieclipTimeline,
			movieclip;

		if(shape !== null && shape !== undefined)
		{
			shapeObject = new Shape(parentMC, resourceManager, this.charID, this.id, this.placeAfter, this.transform);
			parentMC.addChildAt(shapeObject, this.placeAfter);
		} 
		// else if(bitmap !== null && bitmap !== undefined)
		// {
		// 	bmpObject = new Bitmap(parentMC, resourceManager, this.charID, this.id, this.placeAfter, this.transform);
		// 	parentMC.addChildAt(bmpObject, this.placeAfter);
		// }
		// else if (text !== null && text !== undefined) 
		// {
		// 	textObject = new Text(parentMC, resourceManager, this.charID, this.id, this.placeAfter, this.transform, this.bounds);
		// 	parentMC.addChildAt(textObject, this.placeAfter);
		// }
		else
		{
			movieclipTimeline = resourceManager.getMovieClip(this.charID);
			if(movieclipTimeline)
			{
				movieclip = new MovieClip(parentMC, movieclipTimeline, this.id, this.placeAfter, this.transform);
				parentMC.addChildAt(movieclip, this.placeAfter);
				movieclip.update(resourceManager);
			}
		}
	};

	//Move Class
	Commands.Move = function(id, transform) 
	{
		this.id = id;
		this.transform = transform;	
	};

	//Execute function for Place
	Commands.Move.prototype.execute = function(parentMC)
	{			
		var transform = this.transform;
		var transformArray = transform.split(",");
		var transformMat = new Snap.Matrix(
			transformArray[0],
			transformArray[1],
			transformArray[2],
			transformArray[3],
			transformArray[4],
			transformArray[5]
		);

		var child = parentMC.getChildById(this.id);
		child.el.transform(transformMat);
	};

	//Update Class
	Commands.Update = function(id, placeAfter) 
	{
		this.id = id;
		this.placeAfter = placeAfter;
	};

	//Execute function for Update
	Commands.Update.prototype.execute = function(parentMC)
	{
	};

	//Remove Class
	Commands.Remove = function(id) 
	{
		this.id = id;	
	};

	//Execute function for Remove
	Commands.Remove.prototype.execute = function(parentMC)
	{
		var child = parentMC.getChildById(this.id);
		parentMC.removeChildById(this.id);
		child.destroy();
	};

	//UpdateVisbilityCommand Class
	Commands.UpdateVisibility = function(id, visibility) 
	{
		this.id = id;	
		this.visibility = visibility;
	};

	//Execute function for UpdateVisbilityCommand
	Commands.UpdateVisibility.prototype.execute = function(parentMC)
	{
		var child = parentMC.getChildById(this.id);
		var visibleValue = this.visibility == "true" ? "visible" : "hidden";
		child.el.attr({'visibility': visibleValue});
	};
	
	Commands.UpdateMask = function(id,maskTill) 
	{
		this.id = id;
		this.maskTill = maskTill;
	};

	function updateMaskContent(parentMC, child)
	{
		var def = child.maskElement,
			orig = parentMC.getChildById(child.id);

		def.clear();

		clone = orig.el.clone();
		clone.attr({visibility: 'visible'});

		def.append(clone);
	}

	Commands.UpdateMask.prototype.execute = function(parentMC) 
	{
		var maskContent = parentMC.getChildById(this.id);
		maskContent.isMask = true;
		maskContent.maskTill = this.maskTill;

		var mask = parentMC.el.mask();
		mask.attr('mask-type', 'alpha');

		//use clone to keep element in DOM for placement, just hide
		var clone = maskContent.el.clone();
		clone.attr({visibility: 'visible'});

		var def = mask.toDefs();
		def.append(clone);
		maskContent.maskElement = def;

		maskContent.el.attr({visibility: 'hidden'});
	};

	Commands.ApplyMask = function()
	{

	};

	/**
	 * create group for mask and add masked content
	 */
	Commands.ApplyMask.prototype.execute = function(parentMC)
	{
		var gp = include('snap.GarbagePool'), 
			i,
			insideMask = false,
			currentMask = null,
			currentMaskEl = null,
			currentTill = null,
			currentMaskGroup;
		
		for (i = 0; i < parentMC.children.length; i++)
		{
			child = parentMC.children[i];

			if (child.isMask)
			{
				updateMaskContent(parentMC, child); //mask needs to update

				insideMask = true;
				currentMask = child;
				currentMaskEl = child.maskElement;
				currentTill = child.maskTill;
				currentMaskGroup = parentMC.el.g();
				currentMaskGroup.attr({'class': 'maskGroup'});
				child.el.after(currentMaskGroup);
				currentMaskGroup.attr({mask: currentMaskEl});

				gp.addEmpty(currentMaskGroup);
				gp.addRef(currentMaskEl, [currentMaskGroup]);

				if (child.id == child.maskTill)
				{
					insideMask = false;
				}
			}
			else
			{
				if (insideMask)
				{
					currentMaskGroup.prepend(child.el);
					child.isMasked = true;
					child.mask = currentMask.id;

					if (child.id == currentTill)
					{
						insideMask = false;
						currentMask = null;
						currentTill = null;
					}
				}
			}
		}
	};

	Commands.UpdateColorTransform = function(id, colorMatrix)
	{
		this.id = id;
		this.colorMatrix = colorMatrix;
	};

	Commands.UpdateColorTransform.prototype.execute = function(parentMC) 
	{
		var child,
			matrix;

		child = parentMC.getChildById(this.id);
		matrix = this.colorMatrix.split(',', 7);
		child.el.attr({opacity: parseFloat(matrix[6])}); //currently only alpha
	};

	namespace('snap').Commands = Commands;

}());
(function()
{
	var Commands = include('snap.Commands'),
		DisplayObject = include('snap.DisplayObject'),
		GarbagePool = include('snap.GarbagePool');
	
	var MovieClip = function(parentMC, commandTimeline, objectId, placeAfter, transform)
	{
		DisplayObject.call(this, 'movieclip', objectId, parentMC, placeAfter, transform);

		/**
		 * The timeline
		 * @property {Object} _timeline
		 * @private
		 */
		this._timeline = commandTimeline;

		/**
		 * The timeline current frame
		 * @property {int} _currentFrame
		 * @private
		 */
		this._currentFrame = 0;

		/**
		 * The timeline total number of frame
		 * @property {int} _totalFrames
		 * @private
		 */
		this._totalFrames = parseInt(this._timeline.frameCount);

		/**
		 * The list of children objects
		 * @property {Array} children
		 */
		this.children = [];

		/**
		 * If this is a mask
		 * @property {Boolean} isMask
		 */
		this.isMask = false;

		/**
		 * If this has a mask
		 * @property {Boolean} isMasked
		 */
		this.isMasked = false;

		/**
		 * The mask shape
		 * @property {Shape} mask
		 */
		this.mask = null;
		this.maskElement = null;
		this.maskTill = null;

		/**
		 * Does this clip loop
		 * @property {Boolean} loops
		 */
		this.loops = true;

		/**
		 * The list of commands to run per frame
		 * @property {Array} _commandList
		 */
		this._commandList = [];
	};

	var p = MovieClip.prototype = Object.create(DisplayObject.prototype);

	/**
	 * The current zero-based frame index
	 * @property {int} currentFrame
	 * @readOnly
	 */
	Object.defineProperty(p, 'currentFrame',
	{
		get: function()
		{
			return this._currentFrame;
		}
	});

	/**
	 * The total number of frames
	 * @property {int} totalFrame
	 * @readOnly
	 */
	Object.defineProperty(p, 'totalFrames',
	{
		get: function()
		{
			return this._totalFrames;
		}
	});

	p.getChildById = function(id)
	{
		var i;

		for (i = 0; i < this.children.length; i++)
		{
			if (this.children[i].id == id)
			{
				return this.children[i];
			}
		}

		return false;
	};

	p.getChildIndexById = function(id)
	{
		var i;

		for (i = 0; i < this.children.length; i++) 
		{
			if (this.children[i].id == id)
			{
				return i;
			}
		}
		return false;
	};

	p.removeChildById = function(id)
	{
		var i;

		for (i = 0; i < this.children.length; i++)
		{
			if (this.children[i].id == id)
			{
				this.children.splice(i, 1);
				return;
			}
		}
	};

	p.swapChildIndex = function(id, placeAfter)
	{
		var i,
			child;

		for (i = 0; i < this.children.length; i++)
		{
			if (this.children[i].id == id)
			{
				child = this.children.splice(i, 1);
				break;
			}
		}

		for (i = 0; i < this.children.length; i++)
		{
			if (this.children[i].id == placeAfter)
			{
				this.children.splice(i + 1, 0, child[0]);
				break;
			}
		}
	};

	p.addChildAt = function(child, placeAfter)
	{
		var i;

		if (parseInt(placeAfter) === 0)
		{
			this.children.unshift(child);
		}

		for (i = 0; i < this.children.length; i++)
		{
			if (this.children[i].id == placeAfter)
			{
				this.children.splice(i + 1, 0, child);
				break;
			}
		}
	};

	p.containsMask = function()
	{
		var i;

		for (i = 0; i < this.children.length; i++)
		{
			if (this.children[i].isMask)
			{
				return true;
			}
		}
		return false;
	};

	/**
	 * Remove all children
	 * @method removeAll
	 */
	p.removeAll = function()
	{
		this._currentFrame = 0;
		this._commandList.length = 0;

		// clone array so we don't throw off the loops
		var children = this.children.slice(0);

		for(var i = 0; i < children.length; i++)
		{
			var child = children[i];
			var command = new Commands.Remove(child.id);
			command.execute(this);
		}
		// Remove all children
		this.children.length = 0;
		GarbagePool.purge();
	};

	/**
	 * Clean up this object
	 * @method destroy
	 */
	p.destroy = function()
	{
		this.removeAll();

		this._timeline = null;
		this.children = null;
		this.mask = null;
		this.maskElement = null;
		this.maskTill = null;
		this.loops = true;
		this._commandList = null;

		DisplayObject.prototype.destroy.call(this);
	};

	/**
	 * Update the current
	 * @method update
	 */
	p.update = function(resourceManager)
	{
		var commandList = this._commandList,
			frame,
			found,
			child,
			cmdData,
			type;

		commandList.length = 0;

		//check to handle looping of movieclip
		if (this._currentFrame >= this._totalFrames) 
		{
			// Loop the animation from the beginning
			if (this.loops)
			{
				this.removeAll();
				this.update(resourceManager);
			}
			return;
		}

		//play movieclips
		for(var i = 0; i < this.children.length; i++)
		{
			child = this.children[i];
			if (child.update)
			{
				child.update(resourceManager);
			}
		}		

		for (i = 0; i < this._timeline.Frame.length; i++)
		{
			// console.log(this._timeline.Frame[i]);
			if (parseInt(this._timeline.Frame[i].num) == this._currentFrame)
			{
				frame = this._timeline.Frame[i];
				break;
			}
			else if (i >= this._timeline.Frame.length - 1)
			{
				// console.log("No frame actions here");
				this._currentFrame++;
				return;
			}
		}

		// console.log('frame', frame);
		if (!frame)
		{
			return;
		}

		var commands = frame.Command;

		for(var c = 0; c < commands.length; c++)
		{
			cmdData = commands[c];
			type = cmdData.cmdType;

			switch(type)
			{
				case "Place":
				{
					found = this.getChildById(cmdData.objectId);

					if (!found)
					{
						commandList.push(new Commands.Place(
							cmdData.charid,
							cmdData.objectId,
							cmdData.placeAfter,
							cmdData.transformMatrix,
							cmdData.bounds
						));
					}
					else
					{
						commandList.push(new Commands.Move(
							cmdData.objectId,
							cmdData.transformMatrix
						));
						commandList.push(new Commands.Update(
							cmdData.objectId,
							cmdData.placeAfter
						));
					}
					break;
				}
				case "Move":
				{
					commandList.push(new Commands.Move(
						cmdData.objectId,
						cmdData.transformMatrix
					));
					break;
				}
				case "Remove":
				{
					commandList.push(new Commands.Remove(
						cmdData.objectId
					));
					break;
				}
				case "UpdateZOrder":
				{
					commandList.push(new Commands.Update(
						cmdData.objectId, 
						cmdData.placeAfter
					));
					break;
				}
				case "UpdateVisibility":
				{
					commandList.push(new Commands.UpdateVisibility(
						cmdData.objectId, 
						cmdData.visibility
					));
					break;
				}
				case "UpdateColorTransform":
				{
					commandList.push(new Commands.UpdateColorTransform(
						cmdData.objectId,
						cmdData.colorMatrix
					));
					break;
				}
				case "UpdateMask":
				{
					commandList.push(new Commands.UpdateMask(
						cmdData.objectId, 
						cmdData.maskTill
					));
					break;
				}
			}
		}

		if (this.containsMask)
		{
			commandList.push(new Commands.ApplyMask());
		}
	
		for (i = 0; i < commandList.length ; i++)
		{
			if (commandList[i] !== undefined)
			{
				 commandList[i].execute(this, resourceManager);
			}
		}
		this._currentFrame++;
		GarbagePool.purge();
	};

	p.toString = function()
	{
		return '[MovieClip id="' + this.id+'"]';
	};
	
	namespace('snap').MovieClip = MovieClip;

}());
(function(undefined)
{
	var ResourceManager = include('snap.ResourceManager'),
		EventDispatcher = include('snap.EventDispatcher'),
		MovieClip = include('snap.MovieClip'),
		GarbagePool = include('snap.GarbagePool'),
		TimeUtils = include('snap.TimeUtils'),
		Snap = include('Snap');

	var Stage = function(config)
	{
		EventDispatcher.call(this);

		/**
		 * The time between frames
		 * @property {Number} _msPerFrame
		 * @private
		 */
		this._msPerFrame = 0;

		/**
		 * The framerate
		 * @property {int} fps
		 */
		this.fps = config.fps || 30;

		/**
		 * Instance of Snap.svg instace
		 * @property {Snap} snap
		 */
		this.snap = new Snap(config.width, config.height);

		// Update snap properties
		this.snap.attr({
			id: config.id,
			viewBox: '0 0 ' + config.width + ' ' + config.height
		});

		/**
		 * The timer for updating
		 * @property {int} timer
		 */
		this.timer = null;

		/**
		 * The resource manager
		 * @property {ResourceManager} resourceManager
		 */
		this.resourceManager = null;

		/**
		 * The last update time
		 * @property {int} startTime time in ms
		 */
		this.startTime = 0;
		
		/**
		 * The instance of the movieclip
		 * @property {MovieClip} stage
		 */
		this.main = null;

		// Function binding
		this.update = this.update.bind(this);

		if (config.url)
		{
			var request = new XMLHttpRequest();
			request.open("GET", config.url, true);
			request.setRequestHeader("Content-type", "application/json");
			request.onreadystatechange = function()
			{
				// Loading successfully
				if (request.readyState == 4 && request.status == 200)
				{
					var data = JSON.parse(request.responseText);
					this.resourceManager = new ResourceManager(data);

					// Create the main timeline
					var timeline = data.DOMDocument.Timeline;
					var maintimelineIndex = timeline.length - 1;
					var mainTimeline = timeline[maintimelineIndex];

					// Create the stage movieclip
					this.main = new MovieClip(this.snap, mainTimeline, this.id);

					// Start playing
					this.play();

					// Dispatch event
					this.trigger('ready');			
				}
			}
			.bind(this);
			request.send();
		}
	};

	// Reference to the prototype
	var p = Stage.prototype = Object.create(EventDispatcher.prototype);

	/**
	 * The frames per second
	 * @property {int} fps
	 */
	Object.defineProperty(p, 'fps',
	{
		set: function(fps)
		{
			this._fps = fps;
			this._msPerFrame = 1000 / fps;

			if (this.main)
			{
				var offset = this.main.currentFrame * this._msPerFrame;
				this.startTime = TimeUtils.now() - offset;
			}
		},
		get: function()
		{
			return this._fps;
		}
	});

	/**
	 * Play the animation
	 * @method play
	 */
	p.play = function()
	{
		this.playing = true;

		if (!this.timer)
		{
			this.fps = this._fps;// refresh the startTime
			this.timer = requestAnimationFrame(this.update);
		}
	};

	/**
	 * Pause the animation
	 * @method pause
	 */
	p.pause = function()
	{
		this.playing = false;

		if (this.timer) 
		{
			cancelAnimationFrame(this.timer);
			this.timer = null;
			this.startTime = 0;
		}	
	};

	/**
	 * Stop the animation
	 * @method stop
	 */
	p.stop = function()
	{
		this.pause();
		this.main.removeAll(true);
	};

	/**
	 * Set the number of loops
	 * @method setLoop
	 * @param {Boolean} loop
	 */
	p.setLoop = function(l)
	{
		this.main.loops = l;
	};

	/**
	 * Goto and stop on a frame
	 * @method gotoAndStop
	 */
	p.gotoAndStop = function(frame)
	{
		this.stop();

		// fast forward to the position
		// need to start from the beginning
		for(var i = 0; i < frame; i++)
		{
			this.update();
		}
	};

	/**
	 *
	 * @method gotoAndStop
	 */
	p.gotoAndPlay = function(frame)
	{
		this.gotoAndStop(frame);
		this.play();
	};

	/**
	 * The update loop
	 * @method update
	 */
	p.update = function()
	{
		var now = TimeUtils.now();
		var elapsed = now - this.startTime;
		var frame = Math.ceil(elapsed / this._msPerFrame);

		// Animation looped back to the beginning
		if (frame > this.main.totalFrames)
		{
			this.startTime = now;
		}
		// Update to the new frame if we changed from the last frame
		if (frame > this.main.currentFrame)
		{
		// 	console.log("frame", frame);
			this.main.update(this.resourceManager);
		}

		if (this.playing)
		{
			this.timer = requestAnimationFrame(this.update);
			this.trigger('update');
		}
	};

	/**
	 * Don't use after this
	 * @method destroy
	 */
	p.destroy = function()
	{
		this.stop();

		this.main.destroy();
		this.main = null;
		this.snap = null;

		this.resourceManager = null;
	};

	namespace('snap').Stage = Stage;

}());