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