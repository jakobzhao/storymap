// Following https://github.com/Leaflet/Leaflet/blob/master/PLUGIN-GUIDE.md
(function (factory, root) {

    // define an AMD module that relies on 'leaflet'
    if (typeof define === 'function' && define.amd) {
        define(['leaflet', 'd3', 'topojson'], factory);
    // define a Common JS module that relies on 'leaflet'
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory(require('leaflet'), require('d3'), require('topojson'));
    }else {
        factory(root.L, root.d3 , root.topojson);
    }
}(function (L, d3, topojson) {

	L.Control.GlobeMiniMap = L.Control.extend({
		options: {
			position: 'bottomright',
			width: 82,
			height: 82,
			land: "#bbb",
			water: "rgba(0, 0, 0, 0.3)",
			marker: "#CC0000"
		},

		//layer is the map layer to be shown in the minimap
		initialize: function (options) {
			L.Util.setOptions(this, options);
			console.log(this.options);
		},

		onAdd: function (map) {
			console.log('onAdd()');

			this._mainMap = map;

			//Creating the container and stopping events from spilling through to the main map.
			this._container = L.DomUtil.create('div', 'leaflet-control-minimap');
			this._container.style.width = this.options.width + 'px';
			this._container.style.height = this.options.height + 'px';

			L.DomEvent.disableClickPropagation(this._container);
			L.DomEvent.on(this._container, 'mousewheel', L.DomEvent.stopPropagation);



			//Keep a record of this to prevent auto toggling when the user explicitly doesn't want it.
			this._userToggledDisplay = false;
			this._minimized = false;

			this._mainMap.on('moveend', this._onMainMapMoved, this);

			return this._container;
		},

		addTo: function (map) {
			console.log('addTo()');
			L.Control.prototype.addTo.call(this, map);
			this.initCanvas();

			return this;
		},

		initCanvas: function () {
			//marker icon
			//https://upload.wikimedia.org/wikipedia/commons/9/93/Map_marker_font_awesome.svg
			d3.select('.leaflet-control-minimap')
				.append('svg')
				.attr("width", this.options.width)
				.attr("height", this.options.height)
				.attr("style","position: absolute; left: 0; top: 0;")
				.append('path')
				.attr('d','m 768,896 q 0,106 -75,181 -75,75 -181,75 -106,0 -181,-75 -75,-75 -75,-181 0,-106 75,-181 75,-75 181,-75 106,0 181,75 75,75 75,181 z m 256,0 q 0,-109 -33,-179 L 627,-57 q -16,-33 -47.5,-52 -31.5,-19 -67.5,-19 -36,0 -67.5,19 Q 413,-90 398,-57 L 33,717 Q 0,787 0,896 q 0,212 150,362 150,150 362,150 212,0 362,-150 150,-150 150,-362 z')
				.attr('transform','scale(.01,-.01),translate(3600,-3900)')
				.attr('style','fill:' + this.options.marker);
			this.projection = d3.geo.orthographic()
				.scale(40)
				.translate([41, 41])
				.rotate([0, 0])
				.clipAngle(90);

		  var canvas = d3.select('.leaflet-control-minimap').append("canvas")
		    .attr("width", this.options.width)
		    .attr("height", this.options.height)

		  this.c = canvas.node().getContext("2d");

			this.path = d3.geo.path()
		    .projection(this.projection)
		    .context(this.c);

		  var that = this;
		  d3.json('./assets/world.geojson', function (world) {
			  that.globe = {type: "Sphere"},
	      that.land = topojson.feature(world, world.objects.land);
			});

		  //set to current view
			// this.transitionMap(this._mainMap.getCenter());
		},

		transitionMap: function (p) {
			console.log('transtionMap');
			var that = this;
			var c = that.c;
			var path = that.path;
		  d3.transition()
        .duration(1250)
        .each("start", function() {
        })
        .tween("rotate", function() {
          var r = d3.interpolate(that.projection.rotate(), [-p.lng, -p.lat]);
          return function(t) {
            that.projection.rotate(r(t));
            c.clearRect(0, 0, that.options.width, that.options.height);
            c.fillStyle = that.options.water, c.beginPath(), path(that.globe), c.fill();
            c.fillStyle = that.options.land, c.beginPath(), path(that.land), c.fill();
          };
        })
		},
	
		onRemove: function (map) {
			this._mainMap.off('moveend', this._onMainMapMoved, this);
			this._mainMap.off('move', this._onMainMapMoving, this);
		},
	
		_onMainMapMoved: function (e) {
			console.log('mainmapmoved');
			if (!this._miniMapMoving) {
				this._mainMapMoving = true;
			
				this.transitionMap(this._mainMap.getCenter());
	
			} else {
				this._miniMapMoving = false;
			}	
		}
	});

	L.control.globeminimap = function (layer, options) {
	return new L.Control.GlobeMiniMap(layer, options);
	};
	
	L.Map.mergeOptions({
		miniMapControl: false
	});
	
	L.Map.addInitHook(function () {
		if (this.options.miniMapControl) {
			this.miniMapControl = (new GlobeMiniMap()).addTo(this);
		}
	});
		
}, window)); 
