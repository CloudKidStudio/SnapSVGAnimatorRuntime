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