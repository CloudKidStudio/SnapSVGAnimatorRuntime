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