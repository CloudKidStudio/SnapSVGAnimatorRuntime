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