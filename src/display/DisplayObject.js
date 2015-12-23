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