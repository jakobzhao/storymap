L.ImageOverlay.WMS = L.ImageOverlay.extend({

  defaultWmsParams: {
    service: 'WMS',
    request: 'GetMap',
    version: '1.1.1',
    layers: '',
    styles: '',
    format: 'image/jpeg',
    transparent: false,
    tiled: false
  },

  initialize: function (url, options) {
    this._baseUrl = url;

    var wmsParams = L.Util.extend({}, this.defaultWmsParams);

    if (options.detectRetina && L.Browser.retina) {
      wmsParams.width = wmsParams.height = this.options.tileSize * 2;
    } else {
      wmsParams.width = wmsParams.height = this.options.tileSize;
    }

    for (var i in options) {
      // all keys that are not ImageOverlay options go to WMS params
      if (!this.options.hasOwnProperty(i)) {
        wmsParams[i] = options[i];
      }
    }

    this.wmsParams = wmsParams;

    L.Util.setOptions(this, options);
  },

  onAdd: function (map) {
    this._bounds = map.getBounds();
    this._map = map;

    var projectionKey = parseFloat(this.wmsParams.version) >= 1.3 ? 'crs' : 'srs';
    this.wmsParams[projectionKey] = map.options.crs.code;
    
    map.on("moveend", this._reset, this);

    L.ImageOverlay.prototype.onAdd.call(this, map);
  },

  _updateUrl: function () {    
    var map = this._map,
      bounds = this._bounds,
      zoom = map.getZoom(),
			crs = map.options.crs,

      topLeft = map.latLngToLayerPoint(bounds.getNorthWest()),
      mapSize = map.latLngToLayerPoint(bounds.getSouthEast()).subtract(topLeft),

			nw = crs.project(bounds.getNorthWest()),
			se = crs.project(bounds.getSouthEast()),

			bbox = [nw.x, se.y, se.x, nw.y].join(','),

      urlParams = { width: mapSize.x, height: mapSize.y, bbox: bbox },
      url = this._baseUrl + L.Util.getParamString(L.Util.extend({}, this.wmsParams, urlParams));

    this._url = url;
  },

  _updateImagePosition: function () {
    // The original reset function really just sets the position and size, so rename it for clarity.
    L.ImageOverlay.prototype._reset.call(this);
  },

  _reset: function () {
    this._bounds = this._map.getBounds();

    this._updateUrl();
    L.Util.extend(this._image, {
      src: this._url
    });
  },

  _onImageLoad: function () {
    this.fire('load');

    // Only update the image position after the image has loaded.
    // This the old image from visibly shifting before the new image loads.
    this._updateImagePosition();
  }
});

L.imageOverlay.wms = function (url, options) {
  return new L.ImageOverlay.WMS(url, options);
};