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