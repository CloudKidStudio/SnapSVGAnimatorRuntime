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