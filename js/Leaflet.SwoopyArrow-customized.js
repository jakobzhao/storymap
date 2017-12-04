(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('leaflet')) :
        typeof define === 'function' && define.amd ? define(['leaflet'], factory) :
            (factory(global.L));
}(this, (function (L$1) { 'use strict';

    L$1 = L$1 && L$1.hasOwnProperty('default') ? L$1['default'] : L$1;

    /*
     * Leaflet.curve v0.1.0 - a plugin for Leaflet mapping library. https://github.com/elfalem/Leaflet.curve
     * (c) elfalem 2015
     */
    /*
     * note that SVG (x, y) corresponds to (long, lat)
     */

    L.Curve = L.Path.extend({
        options: {
        },

        initialize: function(path, options){
            L.setOptions(this, options);
            this._initialUpdate = true;
            this._setPath(path);
        },

        getPath: function(){
            return this._coords;
        },

        setPath: function(path){
            this._setPath(path);
            return this.redraw();
        },

        getBounds: function() {
            return this._bounds;
        },

        _setPath: function(path){
            this._coords = path;
            this._bounds = this._computeBounds();
        },

        _computeBounds: function(){
            var bound = new L.LatLngBounds();
            var lastPoint;
            var lastCommand;
            var coord;
            for(var i = 0; i < this._coords.length; i++){
                coord = this._coords[i];
                if(typeof coord == 'string' || coord instanceof String){
                    lastCommand = coord;
                }else if(lastCommand == 'H'){
                    bound.extend([lastPoint.lat,coord[0]]);
                    lastPoint = new L.latLng(lastPoint.lat,coord[0]);
                }else if(lastCommand == 'V'){
                    bound.extend([coord[0], lastPoint.lng]);
                    lastPoint = new L.latLng(coord[0], lastPoint.lng);
                }else if(lastCommand == 'C'){
                    var controlPoint1 = new L.latLng(coord[0], coord[1]);
                    coord = this._coords[++i];
                    var controlPoint2 = new L.latLng(coord[0], coord[1]);
                    coord = this._coords[++i];
                    var endPoint = new L.latLng(coord[0], coord[1]);

                    bound.extend(controlPoint1);
                    bound.extend(controlPoint2);
                    bound.extend(endPoint);

                    endPoint.controlPoint1 = controlPoint1;
                    endPoint.controlPoint2 = controlPoint2;
                    lastPoint = endPoint;
                }else if(lastCommand == 'S'){
                    var controlPoint2 = new L.latLng(coord[0], coord[1]);
                    coord = this._coords[++i];
                    var endPoint = new L.latLng(coord[0], coord[1]);

                    var controlPoint1 = lastPoint;
                    if(lastPoint.controlPoint2){
                        var diffLat = lastPoint.lat - lastPoint.controlPoint2.lat;
                        var diffLng = lastPoint.lng - lastPoint.controlPoint2.lng;
                        controlPoint1 = new L.latLng(lastPoint.lat + diffLat, lastPoint.lng + diffLng);
                    }

                    bound.extend(controlPoint1);
                    bound.extend(controlPoint2);
                    bound.extend(endPoint);

                    endPoint.controlPoint1 = controlPoint1;
                    endPoint.controlPoint2 = controlPoint2;
                    lastPoint = endPoint;
                }else if(lastCommand == 'Q'){
                    var controlPoint = new L.latLng(coord[0], coord[1]);
                    coord = this._coords[++i];
                    var endPoint = new L.latLng(coord[0], coord[1]);

                    bound.extend(controlPoint);
                    bound.extend(endPoint);

                    endPoint.controlPoint = controlPoint;
                    lastPoint = endPoint;
                }else if(lastCommand == 'T'){
                    var endPoint = new L.latLng(coord[0], coord[1]);

                    var controlPoint = lastPoint;
                    if(lastPoint.controlPoint){
                        var diffLat = lastPoint.lat - lastPoint.controlPoint.lat;
                        var diffLng = lastPoint.lng - lastPoint.controlPoint.lng;
                        controlPoint = new L.latLng(lastPoint.lat + diffLat, lastPoint.lng + diffLng);
                    }

                    bound.extend(controlPoint);
                    bound.extend(endPoint);

                    endPoint.controlPoint = controlPoint;
                    lastPoint = endPoint;
                }else{
                    bound.extend(coord);
                    lastPoint = new L.latLng(coord[0], coord[1]);
                }
            }
            return bound;
        },

        //TODO: use a centroid algorithm instead
        getCenter: function () {
            return this._bounds.getCenter();
        },

        _update: function(){
            if (!this._map) { return; }

            this._updatePath();
        },

        _updatePath: function() {
            this._renderer._updatecurve(this);
        },

        _project: function() {
            var coord, lastCoord, curCommand, curPoint;

            this._points = [];

            for(var i = 0; i < this._coords.length; i++){
                coord = this._coords[i];
                if(typeof coord == 'string' || coord instanceof String){
                    this._points.push(coord);
                    curCommand = coord;
                }else {
                    switch(coord.length){
                        case 2:
                            curPoint = this._map.latLngToLayerPoint(coord);
                            lastCoord = coord;
                            break;
                        case 1:
                            if(curCommand == 'H'){
                                curPoint = this._map.latLngToLayerPoint([lastCoord[0], coord[0]]);
                                lastCoord = [lastCoord[0], coord[0]];
                            }else{
                                curPoint = this._map.latLngToLayerPoint([coord[0], lastCoord[1]]);
                                lastCoord = [coord[0], lastCoord[1]];
                            }
                            break;
                    }
                    this._points.push(curPoint);
                }
            }
        }
    });

    L.curve = function (path, options){
        return new L.Curve(path, options);
    };

    L.SVG.include({
        _updatecurve: function(layer){
            this._setPath(layer, this._curvePointsToPath(layer._points));

            if(layer.options.animate){
                var path = layer._path;
                var length = path.getTotalLength();

                if(!layer.options.dashArray){
                    path.style.strokeDasharray = length + ' ' + length;
                }

                if(layer._initialUpdate){
                    path.animate([
                        {strokeDashoffset: length},
                        {strokeDashoffset: 0}
                    ], layer.options.animate);
                    layer._initialUpdate = false;
                }
            }
        },

        _curvePointsToPath: function(points){
            var point, curCommand, str = '';
            for(var i = 0; i < points.length; i++){
                point = points[i];
                if(typeof point == 'string' || point instanceof String){
                    curCommand = point;
                    str += curCommand;
                }else{
                    switch(curCommand){
                        case 'H':
                            str += point.x + ' ';
                            break;
                        case 'V':
                            str += point.y + ' ';
                            break;
                        default:
                            str += point.x + ',' + point.y + ' ';
                            break;
                    }
                }
            }
            return str || 'M0 0';
        }
    });

    /**
     * Wraps a GeoJSON {@link Geometry} in a GeoJSON {@link Feature}.
     *
     * @name feature
     * @param {Geometry} geometry input geometry
     * @param {Object} [properties={}] an Object of key-value pairs to add as properties
     * @param {Array<number>} [bbox] BBox [west, south, east, north]
     * @param {string|number} [id] Identifier
     * @returns {Feature} a GeoJSON Feature
     * @example
     * var geometry = {
 *   "type": "Point",
 *   "coordinates": [110, 50]
 * };
     *
     * var feature = turf.feature(geometry);
     *
     * //=feature
     */
    function feature(geometry, properties, bbox, id) {
        if (geometry === undefined) throw new Error('geometry is required');
        if (properties && properties.constructor !== Object) throw new Error('properties must be an Object');

        var feat = {
            type: 'Feature',
            properties: properties || {},
            geometry: geometry
        };
        if (bbox) {
            if (bbox.length !== 4) throw new Error('bbox must be an Array of 4 numbers');
            feat.bbox = bbox;
        }
        if (id) feat.id = id;
        return feat;
    }

    /**
     * Creates a GeoJSON {@link Geometry} from a Geometry string type & coordinates.
     * For GeometryCollection type use `helpers.geometryCollection`
     *
     * @name geometry
     * @param {string} type Geometry Type
     * @param {Array<number>} coordinates Coordinates
     * @param {Array<number>} [bbox] BBox [west, south, east, north]
     * @returns {Geometry} a GeoJSON Geometry
     * @example
     * var type = 'Point';
     * var coordinates = [110, 50];
     *
     * var geometry = turf.geometry(type, coordinates);
     *
     * //=geometry
     */
    function geometry(type, coordinates, bbox) {
        // Validation
        if (!type) throw new Error('type is required');
        if (!coordinates) throw new Error('coordinates is required');
        if (!Array.isArray(coordinates)) throw new Error('coordinates must be an Array');

        var geom;
        switch (type) {
            case 'Point': geom = point(coordinates).geometry; break;
            case 'LineString': geom = lineString(coordinates).geometry; break;
            case 'Polygon': geom = polygon(coordinates).geometry; break;
            case 'MultiPoint': geom = multiPoint(coordinates).geometry; break;
            case 'MultiLineString': geom = multiLineString(coordinates).geometry; break;
            case 'MultiPolygon': geom = multiPolygon(coordinates).geometry; break;
            default: throw new Error(type + ' is invalid');
        }
        if (bbox) {
            if (bbox.length !== 4) throw new Error('bbox must be an Array of 4 numbers');
            geom.bbox = bbox;
        }
        return geom;
    }

    /**
     * Takes coordinates and properties (optional) and returns a new {@link Point} feature.
     *
     * @name point
     * @param {Array<number>} coordinates longitude, latitude position (each in decimal degrees)
     * @param {Object} [properties={}] an Object of key-value pairs to add as properties
     * @param {Array<number>} [bbox] BBox [west, south, east, north]
     * @param {string|number} [id] Identifier
     * @returns {Feature<Point>} a Point feature
     * @example
     * var point = turf.point([-75.343, 39.984]);
     *
     * //=point
     */
    function point(coordinates, properties, bbox, id) {
        if (!coordinates) throw new Error('No coordinates passed');
        if (coordinates.length === undefined) throw new Error('Coordinates must be an array');
        if (coordinates.length < 2) throw new Error('Coordinates must be at least 2 numbers long');
        if (typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number') throw new Error('Coordinates must contain numbers');

        return feature({
            type: 'Point',
            coordinates: coordinates
        }, properties, bbox, id);
    }

    /**
     * Takes an array of LinearRings and optionally an {@link Object} with properties and returns a {@link Polygon} feature.
     *
     * @name polygon
     * @param {Array<Array<Array<number>>>} coordinates an array of LinearRings
     * @param {Object} [properties={}] an Object of key-value pairs to add as properties
     * @param {Array<number>} [bbox] BBox [west, south, east, north]
     * @param {string|number} [id] Identifier
     * @returns {Feature<Polygon>} a Polygon feature
     * @throws {Error} throw an error if a LinearRing of the polygon has too few positions
     * or if a LinearRing of the Polygon does not have matching Positions at the beginning & end.
     * @example
     * var polygon = turf.polygon([[
     *   [-2.275543, 53.464547],
     *   [-2.275543, 53.489271],
     *   [-2.215118, 53.489271],
     *   [-2.215118, 53.464547],
     *   [-2.275543, 53.464547]
     * ]], { name: 'poly1', population: 400});
     *
     * //=polygon
     */
    function polygon(coordinates, properties, bbox, id) {
        if (!coordinates) throw new Error('No coordinates passed');

        for (var i = 0; i < coordinates.length; i++) {
            var ring = coordinates[i];
            if (ring.length < 4) {
                throw new Error('Each LinearRing of a Polygon must have 4 or more Positions.');
            }
            for (var j = 0; j < ring[ring.length - 1].length; j++) {
                if (ring[ring.length - 1][j] !== ring[0][j]) {
                    throw new Error('First and last Position are not equivalent.');
                }
            }
        }

        return feature({
            type: 'Polygon',
            coordinates: coordinates
        }, properties, bbox, id);
    }

    /**
     * Creates a {@link LineString} based on a
     * coordinate array. Properties can be added optionally.
     *
     * @name lineString
     * @param {Array<Array<number>>} coordinates an array of Positions
     * @param {Object} [properties={}] an Object of key-value pairs to add as properties
     * @param {Array<number>} [bbox] BBox [west, south, east, north]
     * @param {string|number} [id] Identifier
     * @returns {Feature<LineString>} a LineString feature
     * @throws {Error} if no coordinates are passed
     * @example
     * var linestring1 = turf.lineString([
     *   [-21.964416, 64.148203],
     *   [-21.956176, 64.141316],
     *   [-21.93901, 64.135924],
     *   [-21.927337, 64.136673]
     * ]);
     * var linestring2 = turf.lineString([
     *   [-21.929054, 64.127985],
     *   [-21.912918, 64.134726],
     *   [-21.916007, 64.141016],
     *   [-21.930084, 64.14446]
     * ], {name: 'line 1', distance: 145});
     *
     * //=linestring1
     *
     * //=linestring2
     */
    function lineString(coordinates, properties, bbox, id) {
        if (!coordinates) throw new Error('No coordinates passed');
        if (coordinates.length < 2) throw new Error('Coordinates must be an array of two or more positions');

        return feature({
            type: 'LineString',
            coordinates: coordinates
        }, properties, bbox, id);
    }

    /**
     * Takes one or more {@link Feature|Features} and creates a {@link FeatureCollection}.
     *
     * @name featureCollection
     * @param {Feature[]} features input features
     * @param {Array<number>} [bbox] BBox [west, south, east, north]
     * @returns {FeatureCollection} a FeatureCollection of input features
     * @example
     * var features = [
     *  turf.point([-75.343, 39.984], {name: 'Location A'}),
     *  turf.point([-75.833, 39.284], {name: 'Location B'}),
     *  turf.point([-75.534, 39.123], {name: 'Location C'})
     * ];
     *
     * var collection = turf.featureCollection(features);
     *
     * //=collection
     */
    function featureCollection(features, bbox) {
        if (!features) throw new Error('No features passed');
        if (!Array.isArray(features)) throw new Error('features must be an Array');

        var fc = {
            type: 'FeatureCollection',
            features: features
        };
        if (bbox) fc.bbox = bbox;
        return fc;
    }

    /**
     * Creates a {@link Feature<MultiLineString>} based on a
     * coordinate array. Properties can be added optionally.
     *
     * @name multiLineString
     * @param {Array<Array<Array<number>>>} coordinates an array of LineStrings
     * @param {Object} [properties={}] an Object of key-value pairs to add as properties
     * @param {Array<number>} [bbox] BBox [west, south, east, north]
     * @param {string|number} [id] Identifier
     * @returns {Feature<MultiLineString>} a MultiLineString feature
     * @throws {Error} if no coordinates are passed
     * @example
     * var multiLine = turf.multiLineString([[[0,0],[10,10]]]);
     *
     * //=multiLine
     */
    function multiLineString(coordinates, properties, bbox, id) {
        if (!coordinates) throw new Error('No coordinates passed');

        return feature({
            type: 'MultiLineString',
            coordinates: coordinates
        }, properties, bbox, id);
    }

    /**
     * Creates a {@link Feature<MultiPoint>} based on a
     * coordinate array. Properties can be added optionally.
     *
     * @name multiPoint
     * @param {Array<Array<number>>} coordinates an array of Positions
     * @param {Object} [properties={}] an Object of key-value pairs to add as properties
     * @param {Array<number>} [bbox] BBox [west, south, east, north]
     * @param {string|number} [id] Identifier
     * @returns {Feature<MultiPoint>} a MultiPoint feature
     * @throws {Error} if no coordinates are passed
     * @example
     * var multiPt = turf.multiPoint([[0,0],[10,10]]);
     *
     * //=multiPt
     */
    function multiPoint(coordinates, properties, bbox, id) {
        if (!coordinates) throw new Error('No coordinates passed');

        return feature({
            type: 'MultiPoint',
            coordinates: coordinates
        }, properties, bbox, id);
    }

    /**
     * Creates a {@link Feature<MultiPolygon>} based on a
     * coordinate array. Properties can be added optionally.
     *
     * @name multiPolygon
     * @param {Array<Array<Array<Array<number>>>>} coordinates an array of Polygons
     * @param {Object} [properties={}] an Object of key-value pairs to add as properties
     * @param {Array<number>} [bbox] BBox [west, south, east, north]
     * @param {string|number} [id] Identifier
     * @returns {Feature<MultiPolygon>} a multipolygon feature
     * @throws {Error} if no coordinates are passed
     * @example
     * var multiPoly = turf.multiPolygon([[[[0,0],[0,10],[10,10],[10,0],[0,0]]]]);
     *
     * //=multiPoly
     *
     */
    function multiPolygon(coordinates, properties, bbox, id) {
        if (!coordinates) throw new Error('No coordinates passed');

        return feature({
            type: 'MultiPolygon',
            coordinates: coordinates
        }, properties, bbox, id);
    }

    /**
     * Creates a {@link Feature<GeometryCollection>} based on a
     * coordinate array. Properties can be added optionally.
     *
     * @name geometryCollection
     * @param {Array<Geometry>} geometries an array of GeoJSON Geometries
     * @param {Object} [properties={}] an Object of key-value pairs to add as properties
     * @param {Array<number>} [bbox] BBox [west, south, east, north]
     * @param {string|number} [id] Identifier
     * @returns {Feature<GeometryCollection>} a GeoJSON GeometryCollection Feature
     * @example
     * var pt = {
 *     "type": "Point",
 *       "coordinates": [100, 0]
 *     };
     * var line = {
 *     "type": "LineString",
 *     "coordinates": [ [101, 0], [102, 1] ]
 *   };
     * var collection = turf.geometryCollection([pt, line]);
     *
     * //=collection
     */
    function geometryCollection(geometries, properties, bbox, id) {
        if (!geometries) throw new Error('geometries is required');
        if (!Array.isArray(geometries)) throw new Error('geometries must be an Array');

        return feature({
            type: 'GeometryCollection',
            geometries: geometries
        }, properties, bbox, id);
    }

// https://en.wikipedia.org/wiki/Great-circle_distance#Radius_for_spherical_Earth
    var factors = {
        miles: 3960,
        nauticalmiles: 3441.145,
        degrees: 57.2957795,
        radians: 1,
        inches: 250905600,
        yards: 6969600,
        meters: 6373000,
        metres: 6373000,
        centimeters: 6.373e+8,
        centimetres: 6.373e+8,
        kilometers: 6373,
        kilometres: 6373,
        feet: 20908792.65
    };

    var areaFactors = {
        kilometers: 0.000001,
        kilometres: 0.000001,
        meters: 1,
        metres: 1,
        centimetres: 10000,
        millimeter: 1000000,
        acres: 0.000247105,
        miles: 3.86e-7,
        yards: 1.195990046,
        feet: 10.763910417,
        inches: 1550.003100006
    };
    /**
     * Round number to precision
     *
     * @param {number} num Number
     * @param {number} [precision=0] Precision
     * @returns {number} rounded number
     * @example
     * turf.round(120.4321)
     * //=120
     *
     * turf.round(120.4321, 2)
     * //=120.43
     */
    function round(num, precision) {
        if (num === undefined || num === null || isNaN(num)) throw new Error('num is required');
        if (precision && !(precision >= 0)) throw new Error('precision must be a positive number');
        var multiplier = Math.pow(10, precision || 0);
        return Math.round(num * multiplier) / multiplier;
    }

    /**
     * Convert a distance measurement (assuming a spherical Earth) from radians to a more friendly unit.
     * Valid units: miles, nauticalmiles, inches, yards, meters, metres, kilometers, centimeters, feet
     *
     * @name radiansToDistance
     * @param {number} radians in radians across the sphere
     * @param {string} [units=kilometers] can be degrees, radians, miles, or kilometers inches, yards, metres, meters, kilometres, kilometers.
     * @returns {number} distance
     */
    function radiansToDistance(radians, units) {
        if (radians === undefined || radians === null) throw new Error('radians is required');

        var factor = factors[units || 'kilometers'];
        if (!factor) throw new Error('units is invalid');
        return radians * factor;
    }

    /**
     * Convert a distance measurement (assuming a spherical Earth) from a real-world unit into radians
     * Valid units: miles, nauticalmiles, inches, yards, meters, metres, kilometers, centimeters, feet
     *
     * @name distanceToRadians
     * @param {number} distance in real units
     * @param {string} [units=kilometers] can be degrees, radians, miles, or kilometers inches, yards, metres, meters, kilometres, kilometers.
     * @returns {number} radians
     */
    function distanceToRadians(distance, units) {
        if (distance === undefined || distance === null) throw new Error('distance is required');

        var factor = factors[units || 'kilometers'];
        if (!factor) throw new Error('units is invalid');
        return distance / factor;
    }

    /**
     * Convert a distance measurement (assuming a spherical Earth) from a real-world unit into degrees
     * Valid units: miles, nauticalmiles, inches, yards, meters, metres, centimeters, kilometres, feet
     *
     * @name distanceToDegrees
     * @param {number} distance in real units
     * @param {string} [units=kilometers] can be degrees, radians, miles, or kilometers inches, yards, metres, meters, kilometres, kilometers.
     * @returns {number} degrees
     */
    function distanceToDegrees(distance, units) {
        return radians2degrees(distanceToRadians(distance, units));
    }

    /**
     * Converts any bearing angle from the north line direction (positive clockwise)
     * and returns an angle between 0-360 degrees (positive clockwise), 0 being the north line
     *
     * @name bearingToAngle
     * @param {number} bearing angle, between -180 and +180 degrees
     * @returns {number} angle between 0 and 360 degrees
     */
    function bearingToAngle(bearing) {
        if (bearing === null || bearing === undefined) throw new Error('bearing is required');

        var angle = bearing % 360;
        if (angle < 0) angle += 360;
        return angle;
    }

    /**
     * Converts an angle in radians to degrees
     *
     * @name radians2degrees
     * @param {number} radians angle in radians
     * @returns {number} degrees between 0 and 360 degrees
     */
    function radians2degrees(radians) {
        if (radians === null || radians === undefined) throw new Error('radians is required');

        var degrees = radians % (2 * Math.PI);
        return degrees * 180 / Math.PI;
    }

    /**
     * Converts an angle in degrees to radians
     *
     * @name degrees2radians
     * @param {number} degrees angle between 0 and 360 degrees
     * @returns {number} angle in radians
     */
    function degrees2radians(degrees) {
        if (degrees === null || degrees === undefined) throw new Error('degrees is required');

        var radians = degrees % 360;
        return radians * Math.PI / 180;
    }


    /**
     * Converts a distance to the requested unit.
     * Valid units: miles, nauticalmiles, inches, yards, meters, metres, kilometers, centimeters, feet
     *
     * @param {number} distance to be converted
     * @param {string} originalUnit of the distance
     * @param {string} [finalUnit=kilometers] returned unit
     * @returns {number} the converted distance
     */
    function convertDistance(distance, originalUnit, finalUnit) {
        if (distance === null || distance === undefined) throw new Error('distance is required');
        if (!(distance >= 0)) throw new Error('distance must be a positive number');

        var convertedDistance = radiansToDistance(distanceToRadians(distance, originalUnit), finalUnit || 'kilometers');
        return convertedDistance;
    }

    /**
     * Converts a area to the requested unit.
     * Valid units: kilometers, kilometres, meters, metres, centimetres, millimeter, acre, mile, yard, foot, inch
     * @param {number} area to be converted
     * @param {string} [originalUnit=meters] of the distance
     * @param {string} [finalUnit=kilometers] returned unit
     * @returns {number} the converted distance
     */
    function convertArea(area, originalUnit, finalUnit) {
        if (area === null || area === undefined) throw new Error('area is required');
        if (!(area >= 0)) throw new Error('area must be a positive number');

        var startFactor = areaFactors[originalUnit || 'meters'];
        if (!startFactor) throw new Error('invalid original units');

        var finalFactor = areaFactors[finalUnit || 'kilometers'];
        if (!finalFactor) throw new Error('invalid final units');

        return (area / startFactor) * finalFactor;
    }

    var helpers = {
        feature: feature,
        geometry: geometry,
        featureCollection: featureCollection,
        geometryCollection: geometryCollection,
        point: point,
        multiPoint: multiPoint,
        lineString: lineString,
        multiLineString: multiLineString,
        polygon: polygon,
        multiPolygon: multiPolygon,
        radiansToDistance: radiansToDistance,
        distanceToRadians: distanceToRadians,
        distanceToDegrees: distanceToDegrees,
        radians2degrees: radians2degrees,
        degrees2radians: degrees2radians,
        bearingToAngle: bearingToAngle,
        convertDistance: convertDistance,
        convertArea: convertArea,
        round: round
    };

    /**
     * Callback for coordEach
     *
     * @callback coordEachCallback
     * @param {Array<number>} currentCoord The current coordinate being processed.
     * @param {number} coordIndex The current index of the coordinate being processed.
     * Starts at index 0.
     * @param {number} featureIndex The current index of the feature being processed.
     * @param {number} featureSubIndex The current subIndex of the feature being processed.
     */

    /**
     * Iterate over coordinates in any GeoJSON object, similar to Array.forEach()
     *
     * @name coordEach
     * @param {FeatureCollection|Geometry|Feature} geojson any GeoJSON object
     * @param {Function} callback a method that takes (currentCoord, coordIndex, featureIndex, featureSubIndex)
     * @param {boolean} [excludeWrapCoord=false] whether or not to include the final coordinate of LinearRings that wraps the ring in its iteration.
     * @example
     * var features = turf.featureCollection([
     *   turf.point([26, 37], {"foo": "bar"}),
     *   turf.point([36, 53], {"hello": "world"})
     * ]);
     *
     * turf.coordEach(features, function (currentCoord, coordIndex, featureIndex, featureSubIndex) {
 *   //=currentCoord
 *   //=coordIndex
 *   //=featureIndex
 *   //=featureSubIndex
 * });
     */
    function coordEach$1(geojson, callback, excludeWrapCoord) {
        // Handles null Geometry -- Skips this GeoJSON
        if (geojson === null) return;
        var featureIndex, geometryIndex, j, k, l, geometry, stopG, coords,
            geometryMaybeCollection,
            wrapShrink = 0,
            coordIndex = 0,
            isGeometryCollection,
            type = geojson.type,
            isFeatureCollection = type === 'FeatureCollection',
            isFeature = type === 'Feature',
            stop = isFeatureCollection ? geojson.features.length : 1;

        // This logic may look a little weird. The reason why it is that way
        // is because it's trying to be fast. GeoJSON supports multiple kinds
        // of objects at its root: FeatureCollection, Features, Geometries.
        // This function has the responsibility of handling all of them, and that
        // means that some of the `for` loops you see below actually just don't apply
        // to certain inputs. For instance, if you give this just a
        // Point geometry, then both loops are short-circuited and all we do
        // is gradually rename the input until it's called 'geometry'.
        //
        // This also aims to allocate as few resources as possible: just a
        // few numbers and booleans, rather than any temporary arrays as would
        // be required with the normalization approach.
        for (featureIndex = 0; featureIndex < stop; featureIndex++) {
            var featureSubIndex = 0;

            geometryMaybeCollection = (isFeatureCollection ? geojson.features[featureIndex].geometry :
                (isFeature ? geojson.geometry : geojson));
            isGeometryCollection = (geometryMaybeCollection) ? geometryMaybeCollection.type === 'GeometryCollection' : false;
            stopG = isGeometryCollection ? geometryMaybeCollection.geometries.length : 1;

            for (geometryIndex = 0; geometryIndex < stopG; geometryIndex++) {
                geometry = isGeometryCollection ?
                    geometryMaybeCollection.geometries[geometryIndex] : geometryMaybeCollection;

                // Handles null Geometry -- Skips this geometry
                if (geometry === null) continue;
                coords = geometry.coordinates;
                var geomType = geometry.type;

                wrapShrink = (excludeWrapCoord && (geomType === 'Polygon' || geomType === 'MultiPolygon')) ? 1 : 0;

                switch (geomType) {
                    case null:
                        break;
                    case 'Point':
                        callback(coords, coordIndex, featureIndex, featureSubIndex);
                        coordIndex++;
                        featureSubIndex++;
                        break;
                    case 'LineString':
                    case 'MultiPoint':
                        for (j = 0; j < coords.length; j++) {
                            callback(coords[j], coordIndex, featureIndex, featureSubIndex);
                            coordIndex++;
                            featureSubIndex++;
                        }
                        break;
                    case 'Polygon':
                    case 'MultiLineString':
                        for (j = 0; j < coords.length; j++)
                            for (k = 0; k < coords[j].length - wrapShrink; k++) {
                                callback(coords[j][k], coordIndex, featureIndex, featureSubIndex);
                                coordIndex++;
                                featureSubIndex++;
                            }
                        break;
                    case 'MultiPolygon':
                        for (j = 0; j < coords.length; j++)
                            for (k = 0; k < coords[j].length; k++)
                                for (l = 0; l < coords[j][k].length - wrapShrink; l++) {
                                    callback(coords[j][k][l], coordIndex, featureIndex, featureSubIndex);
                                    coordIndex++;
                                    featureSubIndex++;
                                }
                        break;
                    case 'GeometryCollection':
                        for (j = 0; j < geometry.geometries.length; j++)
                            coordEach$1(geometry.geometries[j], callback, excludeWrapCoord);
                        break;
                    default: throw new Error('Unknown Geometry Type');
                }
            }
        }
    }

    /**
     * Callback for coordReduce
     *
     * The first time the callback function is called, the values provided as arguments depend
     * on whether the reduce method has an initialValue argument.
     *
     * If an initialValue is provided to the reduce method:
     *  - The previousValue argument is initialValue.
     *  - The currentValue argument is the value of the first element present in the array.
     *
     * If an initialValue is not provided:
     *  - The previousValue argument is the value of the first element present in the array.
     *  - The currentValue argument is the value of the second element present in the array.
     *
     * @callback coordReduceCallback
     * @param {*} previousValue The accumulated value previously returned in the last invocation
     * of the callback, or initialValue, if supplied.
     * @param {Array<number>} currentCoord The current coordinate being processed.
     * @param {number} coordIndex The current index of the coordinate being processed.
     * Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
     * @param {number} featureIndex The current index of the feature being processed.
     * @param {number} featureSubIndex The current subIndex of the feature being processed.
     */

    /**
     * Reduce coordinates in any GeoJSON object, similar to Array.reduce()
     *
     * @name coordReduce
     * @param {FeatureCollection|Geometry|Feature} geojson any GeoJSON object
     * @param {Function} callback a method that takes (previousValue, currentCoord, coordIndex)
     * @param {*} [initialValue] Value to use as the first argument to the first call of the callback.
     * @param {boolean} [excludeWrapCoord=false] whether or not to include the final coordinate of LinearRings that wraps the ring in its iteration.
     * @returns {*} The value that results from the reduction.
     * @example
     * var features = turf.featureCollection([
     *   turf.point([26, 37], {"foo": "bar"}),
     *   turf.point([36, 53], {"hello": "world"})
     * ]);
     *
     * turf.coordReduce(features, function (previousValue, currentCoord, coordIndex, featureIndex, featureSubIndex) {
 *   //=previousValue
 *   //=currentCoord
 *   //=coordIndex
 *   //=featureIndex
 *   //=featureSubIndex
 *   return currentCoord;
 * });
     */
    function coordReduce(geojson, callback, initialValue, excludeWrapCoord) {
        var previousValue = initialValue;
        coordEach$1(geojson, function (currentCoord, coordIndex, featureIndex, featureSubIndex) {
            if (coordIndex === 0 && initialValue === undefined) previousValue = currentCoord;
            else previousValue = callback(previousValue, currentCoord, coordIndex, featureIndex, featureSubIndex);
        }, excludeWrapCoord);
        return previousValue;
    }

    /**
     * Callback for propEach
     *
     * @callback propEachCallback
     * @param {Object} currentProperties The current properties being processed.
     * @param {number} featureIndex The index of the current element being processed in the
     * array.Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
     */

    /**
     * Iterate over properties in any GeoJSON object, similar to Array.forEach()
     *
     * @name propEach
     * @param {FeatureCollection|Feature} geojson any GeoJSON object
     * @param {Function} callback a method that takes (currentProperties, featureIndex)
     * @example
     * var features = turf.featureCollection([
     *     turf.point([26, 37], {foo: 'bar'}),
     *     turf.point([36, 53], {hello: 'world'})
     * ]);
     *
     * turf.propEach(features, function (currentProperties, featureIndex) {
 *   //=currentProperties
 *   //=featureIndex
 * });
     */
    function propEach(geojson, callback) {
        var i;
        switch (geojson.type) {
            case 'FeatureCollection':
                for (i = 0; i < geojson.features.length; i++) {
                    callback(geojson.features[i].properties, i);
                }
                break;
            case 'Feature':
                callback(geojson.properties, 0);
                break;
        }
    }


    /**
     * Callback for propReduce
     *
     * The first time the callback function is called, the values provided as arguments depend
     * on whether the reduce method has an initialValue argument.
     *
     * If an initialValue is provided to the reduce method:
     *  - The previousValue argument is initialValue.
     *  - The currentValue argument is the value of the first element present in the array.
     *
     * If an initialValue is not provided:
     *  - The previousValue argument is the value of the first element present in the array.
     *  - The currentValue argument is the value of the second element present in the array.
     *
     * @callback propReduceCallback
     * @param {*} previousValue The accumulated value previously returned in the last invocation
     * of the callback, or initialValue, if supplied.
     * @param {*} currentProperties The current properties being processed.
     * @param {number} featureIndex The index of the current element being processed in the
     * array.Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
     */

    /**
     * Reduce properties in any GeoJSON object into a single value,
     * similar to how Array.reduce works. However, in this case we lazily run
     * the reduction, so an array of all properties is unnecessary.
     *
     * @name propReduce
     * @param {FeatureCollection|Feature} geojson any GeoJSON object
     * @param {Function} callback a method that takes (previousValue, currentProperties, featureIndex)
     * @param {*} [initialValue] Value to use as the first argument to the first call of the callback.
     * @returns {*} The value that results from the reduction.
     * @example
     * var features = turf.featureCollection([
     *     turf.point([26, 37], {foo: 'bar'}),
     *     turf.point([36, 53], {hello: 'world'})
     * ]);
     *
     * turf.propReduce(features, function (previousValue, currentProperties, featureIndex) {
 *   //=previousValue
 *   //=currentProperties
 *   //=featureIndex
 *   return currentProperties
 * });
     */
    function propReduce(geojson, callback, initialValue) {
        var previousValue = initialValue;
        propEach(geojson, function (currentProperties, featureIndex) {
            if (featureIndex === 0 && initialValue === undefined) previousValue = currentProperties;
            else previousValue = callback(previousValue, currentProperties, featureIndex);
        });
        return previousValue;
    }

    /**
     * Callback for featureEach
     *
     * @callback featureEachCallback
     * @param {Feature<any>} currentFeature The current feature being processed.
     * @param {number} featureIndex The index of the current element being processed in the
     * array.Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
     */

    /**
     * Iterate over features in any GeoJSON object, similar to
     * Array.forEach.
     *
     * @name featureEach
     * @param {Geometry|FeatureCollection|Feature} geojson any GeoJSON object
     * @param {Function} callback a method that takes (currentFeature, featureIndex)
     * @example
     * var features = turf.featureCollection([
     *   turf.point([26, 37], {foo: 'bar'}),
     *   turf.point([36, 53], {hello: 'world'})
     * ]);
     *
     * turf.featureEach(features, function (currentFeature, featureIndex) {
 *   //=currentFeature
 *   //=featureIndex
 * });
     */
    function featureEach(geojson, callback) {
        if (geojson.type === 'Feature') {
            callback(geojson, 0);
        } else if (geojson.type === 'FeatureCollection') {
            for (var i = 0; i < geojson.features.length; i++) {
                callback(geojson.features[i], i);
            }
        }
    }

    /**
     * Callback for featureReduce
     *
     * The first time the callback function is called, the values provided as arguments depend
     * on whether the reduce method has an initialValue argument.
     *
     * If an initialValue is provided to the reduce method:
     *  - The previousValue argument is initialValue.
     *  - The currentValue argument is the value of the first element present in the array.
     *
     * If an initialValue is not provided:
     *  - The previousValue argument is the value of the first element present in the array.
     *  - The currentValue argument is the value of the second element present in the array.
     *
     * @callback featureReduceCallback
     * @param {*} previousValue The accumulated value previously returned in the last invocation
     * of the callback, or initialValue, if supplied.
     * @param {Feature} currentFeature The current Feature being processed.
     * @param {number} featureIndex The index of the current element being processed in the
     * array.Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
     */

    /**
     * Reduce features in any GeoJSON object, similar to Array.reduce().
     *
     * @name featureReduce
     * @param {Geometry|FeatureCollection|Feature} geojson any GeoJSON object
     * @param {Function} callback a method that takes (previousValue, currentFeature, featureIndex)
     * @param {*} [initialValue] Value to use as the first argument to the first call of the callback.
     * @returns {*} The value that results from the reduction.
     * @example
     * var features = turf.featureCollection([
     *   turf.point([26, 37], {"foo": "bar"}),
     *   turf.point([36, 53], {"hello": "world"})
     * ]);
     *
     * turf.featureReduce(features, function (previousValue, currentFeature, featureIndex) {
 *   //=previousValue
 *   //=currentFeature
 *   //=featureIndex
 *   return currentFeature
 * });
     */
    function featureReduce(geojson, callback, initialValue) {
        var previousValue = initialValue;
        featureEach(geojson, function (currentFeature, featureIndex) {
            if (featureIndex === 0 && initialValue === undefined) previousValue = currentFeature;
            else previousValue = callback(previousValue, currentFeature, featureIndex);
        });
        return previousValue;
    }

    /**
     * Get all coordinates from any GeoJSON object.
     *
     * @name coordAll
     * @param {Geometry|FeatureCollection|Feature} geojson any GeoJSON object
     * @returns {Array<Array<number>>} coordinate position array
     * @example
     * var features = turf.featureCollection([
     *   turf.point([26, 37], {foo: 'bar'}),
     *   turf.point([36, 53], {hello: 'world'})
     * ]);
     *
     * var coords = turf.coordAll(features);
     * //= [[26, 37], [36, 53]]
     */
    function coordAll(geojson) {
        var coords = [];
        coordEach$1(geojson, function (coord) {
            coords.push(coord);
        });
        return coords;
    }

    /**
     * Callback for geomEach
     *
     * @callback geomEachCallback
     * @param {Geometry} currentGeometry The current geometry being processed.
     * @param {number} currentIndex The index of the current element being processed in the
     * array. Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
     * @param {number} currentProperties The current feature properties being processed.
     */

    /**
     * Iterate over each geometry in any GeoJSON object, similar to Array.forEach()
     *
     * @name geomEach
     * @param {Geometry|FeatureCollection|Feature} geojson any GeoJSON object
     * @param {Function} callback a method that takes (currentGeometry, featureIndex, currentProperties)
     * @example
     * var features = turf.featureCollection([
     *     turf.point([26, 37], {foo: 'bar'}),
     *     turf.point([36, 53], {hello: 'world'})
     * ]);
     *
     * turf.geomEach(features, function (currentGeometry, featureIndex, currentProperties) {
 *   //=currentGeometry
 *   //=featureIndex
 *   //=currentProperties
 * });
     */
    function geomEach(geojson, callback) {
        var i, j, g, geometry, stopG,
            geometryMaybeCollection,
            isGeometryCollection,
            geometryProperties,
            featureIndex = 0,
            isFeatureCollection = geojson.type === 'FeatureCollection',
            isFeature = geojson.type === 'Feature',
            stop = isFeatureCollection ? geojson.features.length : 1;

        // This logic may look a little weird. The reason why it is that way
        // is because it's trying to be fast. GeoJSON supports multiple kinds
        // of objects at its root: FeatureCollection, Features, Geometries.
        // This function has the responsibility of handling all of them, and that
        // means that some of the `for` loops you see below actually just don't apply
        // to certain inputs. For instance, if you give this just a
        // Point geometry, then both loops are short-circuited and all we do
        // is gradually rename the input until it's called 'geometry'.
        //
        // This also aims to allocate as few resources as possible: just a
        // few numbers and booleans, rather than any temporary arrays as would
        // be required with the normalization approach.
        for (i = 0; i < stop; i++) {

            geometryMaybeCollection = (isFeatureCollection ? geojson.features[i].geometry :
                (isFeature ? geojson.geometry : geojson));
            geometryProperties = (isFeatureCollection ? geojson.features[i].properties :
                (isFeature ? geojson.properties : {}));
            isGeometryCollection = (geometryMaybeCollection) ? geometryMaybeCollection.type === 'GeometryCollection' : false;
            stopG = isGeometryCollection ? geometryMaybeCollection.geometries.length : 1;

            for (g = 0; g < stopG; g++) {
                geometry = isGeometryCollection ?
                    geometryMaybeCollection.geometries[g] : geometryMaybeCollection;

                // Handle null Geometry
                if (geometry === null) {
                    callback(null, featureIndex, geometryProperties);
                    featureIndex++;
                    continue;
                }
                switch (geometry.type) {
                    case 'Point':
                    case 'LineString':
                    case 'MultiPoint':
                    case 'Polygon':
                    case 'MultiLineString':
                    case 'MultiPolygon': {
                        callback(geometry, featureIndex, geometryProperties);
                        featureIndex++;
                        break;
                    }
                    case 'GeometryCollection': {
                        for (j = 0; j < geometry.geometries.length; j++) {
                            callback(geometry.geometries[j], featureIndex, geometryProperties);
                            featureIndex++;
                        }
                        break;
                    }
                    default: throw new Error('Unknown Geometry Type');
                }
            }
        }
    }

    /**
     * Callback for geomReduce
     *
     * The first time the callback function is called, the values provided as arguments depend
     * on whether the reduce method has an initialValue argument.
     *
     * If an initialValue is provided to the reduce method:
     *  - The previousValue argument is initialValue.
     *  - The currentValue argument is the value of the first element present in the array.
     *
     * If an initialValue is not provided:
     *  - The previousValue argument is the value of the first element present in the array.
     *  - The currentValue argument is the value of the second element present in the array.
     *
     * @callback geomReduceCallback
     * @param {*} previousValue The accumulated value previously returned in the last invocation
     * of the callback, or initialValue, if supplied.
     * @param {Geometry} currentGeometry The current Feature being processed.
     * @param {number} currentIndex The index of the current element being processed in the
     * array.Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
     * @param {Object} currentProperties The current feature properties being processed.
     */

    /**
     * Reduce geometry in any GeoJSON object, similar to Array.reduce().
     *
     * @name geomReduce
     * @param {Geometry|FeatureCollection|Feature} geojson any GeoJSON object
     * @param {Function} callback a method that takes (previousValue, currentGeometry, featureIndex, currentProperties)
     * @param {*} [initialValue] Value to use as the first argument to the first call of the callback.
     * @returns {*} The value that results from the reduction.
     * @example
     * var features = turf.featureCollection([
     *     turf.point([26, 37], {foo: 'bar'}),
     *     turf.point([36, 53], {hello: 'world'})
     * ]);
     *
     * turf.geomReduce(features, function (previousValue, currentGeometry, featureIndex, currentProperties) {
 *   //=previousValue
 *   //=currentGeometry
 *   //=featureIndex
 *   //=currentProperties
 *   return currentGeometry
 * });
     */
    function geomReduce(geojson, callback, initialValue) {
        var previousValue = initialValue;
        geomEach(geojson, function (currentGeometry, currentIndex, currentProperties) {
            if (currentIndex === 0 && initialValue === undefined) previousValue = currentGeometry;
            else previousValue = callback(previousValue, currentGeometry, currentIndex, currentProperties);
        });
        return previousValue;
    }

    /**
     * Callback for flattenEach
     *
     * @callback flattenEachCallback
     * @param {Feature} currentFeature The current flattened feature being processed.
     * @param {number} featureIndex The index of the current element being processed in the
     * array. Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
     * @param {number} featureSubIndex The subindex of the current element being processed in the
     * array. Starts at index 0 and increases if the flattened feature was a multi-geometry.
     */

    /**
     * Iterate over flattened features in any GeoJSON object, similar to
     * Array.forEach.
     *
     * @name flattenEach
     * @param {Geometry|FeatureCollection|Feature} geojson any GeoJSON object
     * @param {Function} callback a method that takes (currentFeature, featureIndex, featureSubIndex)
     * @example
     * var features = turf.featureCollection([
     *     turf.point([26, 37], {foo: 'bar'}),
     *     turf.multiPoint([[40, 30], [36, 53]], {hello: 'world'})
     * ]);
     *
     * turf.flattenEach(features, function (currentFeature, featureIndex, featureSubIndex) {
 *   //=currentFeature
 *   //=featureIndex
 *   //=featureSubIndex
 * });
     */
    function flattenEach(geojson, callback) {
        geomEach(geojson, function (geometry, featureIndex, properties) {
            // Callback for single geometry
            var type = (geometry === null) ? null : geometry.type;
            switch (type) {
                case null:
                case 'Point':
                case 'LineString':
                case 'Polygon':
                    callback(feature$1(geometry, properties), featureIndex, 0);
                    return;
            }

            var geomType;

            // Callback for multi-geometry
            switch (type) {
                case 'MultiPoint':
                    geomType = 'Point';
                    break;
                case 'MultiLineString':
                    geomType = 'LineString';
                    break;
                case 'MultiPolygon':
                    geomType = 'Polygon';
                    break;
            }

            geometry.coordinates.forEach(function (coordinate, featureSubIndex) {
                var geom = {
                    type: geomType,
                    coordinates: coordinate
                };
                callback(feature$1(geom, properties), featureIndex, featureSubIndex);
            });

        });
    }

    /**
     * Callback for flattenReduce
     *
     * The first time the callback function is called, the values provided as arguments depend
     * on whether the reduce method has an initialValue argument.
     *
     * If an initialValue is provided to the reduce method:
     *  - The previousValue argument is initialValue.
     *  - The currentValue argument is the value of the first element present in the array.
     *
     * If an initialValue is not provided:
     *  - The previousValue argument is the value of the first element present in the array.
     *  - The currentValue argument is the value of the second element present in the array.
     *
     * @callback flattenReduceCallback
     * @param {*} previousValue The accumulated value previously returned in the last invocation
     * of the callback, or initialValue, if supplied.
     * @param {Feature} currentFeature The current Feature being processed.
     * @param {number} featureIndex The index of the current element being processed in the
     * array.Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
     * @param {number} featureSubIndex The subindex of the current element being processed in the
     * array. Starts at index 0 and increases if the flattened feature was a multi-geometry.
     */

    /**
     * Reduce flattened features in any GeoJSON object, similar to Array.reduce().
     *
     * @name flattenReduce
     * @param {Geometry|FeatureCollection|Feature} geojson any GeoJSON object
     * @param {Function} callback a method that takes (previousValue, currentFeature, featureIndex, featureSubIndex)
     * @param {*} [initialValue] Value to use as the first argument to the first call of the callback.
     * @returns {*} The value that results from the reduction.
     * @example
     * var features = turf.featureCollection([
     *     turf.point([26, 37], {foo: 'bar'}),
     *     turf.multiPoint([[40, 30], [36, 53]], {hello: 'world'})
     * ]);
     *
     * turf.flattenReduce(features, function (previousValue, currentFeature, featureIndex, featureSubIndex) {
 *   //=previousValue
 *   //=currentFeature
 *   //=featureIndex
 *   //=featureSubIndex
 *   return currentFeature
 * });
     */
    function flattenReduce(geojson, callback, initialValue) {
        var previousValue = initialValue;
        flattenEach(geojson, function (currentFeature, featureIndex, featureSubIndex) {
            if (featureIndex === 0 && featureSubIndex === 0 && initialValue === undefined) previousValue = currentFeature;
            else previousValue = callback(previousValue, currentFeature, featureIndex, featureSubIndex);
        });
        return previousValue;
    }

    /**
     * Callback for segmentEach
     *
     * @callback segmentEachCallback
     * @param {Feature<LineString>} currentSegment The current segment being processed.
     * @param {number} featureIndex The index of the current element being processed in the array, starts at index 0.
     * @param {number} featureSubIndex The subindex of the current element being processed in the
     * array. Starts at index 0 and increases for each iterating line segment.
     * @returns {void}
     */

    /**
     * Iterate over 2-vertex line segment in any GeoJSON object, similar to Array.forEach()
     * (Multi)Point geometries do not contain segments therefore they are ignored during this operation.
     *
     * @param {FeatureCollection|Feature|Geometry} geojson any GeoJSON
     * @param {Function} callback a method that takes (currentSegment, featureIndex, featureSubIndex)
     * @returns {void}
     * @example
     * var polygon = turf.polygon([[[-50, 5], [-40, -10], [-50, -10], [-40, 5], [-50, 5]]]);
     *
     * // Iterate over GeoJSON by 2-vertex segments
     * turf.segmentEach(polygon, function (currentSegment, featureIndex, featureSubIndex) {
 *   //= currentSegment
 *   //= featureIndex
 *   //= featureSubIndex
 * });
     *
     * // Calculate the total number of segments
     * var total = 0;
     * var initialValue = 0;
     * turf.segmentEach(polygon, function () {
 *     total++;
 * }, initialValue);
     */
    function segmentEach(geojson, callback) {
        flattenEach(geojson, function (feature, featureIndex) {
            var featureSubIndex = 0;
            // Exclude null Geometries
            if (!feature.geometry) return;
            // (Multi)Point geometries do not contain segments therefore they are ignored during this operation.
            var type = feature.geometry.type;
            if (type === 'Point' || type === 'MultiPoint') return;

            // Generate 2-vertex line segments
            coordReduce(feature, function (previousCoords, currentCoord) {
                var currentSegment = lineString$1([previousCoords, currentCoord], feature.properties);
                callback(currentSegment, featureIndex, featureSubIndex);
                featureSubIndex++;
                return currentCoord;
            });
        });
    }

    /**
     * Callback for segmentReduce
     *
     * The first time the callback function is called, the values provided as arguments depend
     * on whether the reduce method has an initialValue argument.
     *
     * If an initialValue is provided to the reduce method:
     *  - The previousValue argument is initialValue.
     *  - The currentValue argument is the value of the first element present in the array.
     *
     * If an initialValue is not provided:
     *  - The previousValue argument is the value of the first element present in the array.
     *  - The currentValue argument is the value of the second element present in the array.
     *
     * @callback segmentReduceCallback
     * @param {*} [previousValue] The accumulated value previously returned in the last invocation
     * of the callback, or initialValue, if supplied.
     * @param {Feature<LineString>} [currentSegment] The current segment being processed.
     * @param {number} [currentIndex] The index of the current element being processed in the
     * array. Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
     * @param {number} [currentSubIndex] The subindex of the current element being processed in the
     * array. Starts at index 0 and increases for each iterating line segment.
     */

    /**
     * Reduce 2-vertex line segment in any GeoJSON object, similar to Array.reduce()
     * (Multi)Point geometries do not contain segments therefore they are ignored during this operation.
     *
     * @param {FeatureCollection|Feature|Geometry} geojson any GeoJSON
     * @param {Function} callback a method that takes (previousValue, currentSegment, currentIndex)
     * @param {*} [initialValue] Value to use as the first argument to the first call of the callback.
     * @returns {void}
     * @example
     * var polygon = turf.polygon([[[-50, 5], [-40, -10], [-50, -10], [-40, 5], [-50, 5]]]);
     *
     * // Iterate over GeoJSON by 2-vertex segments
     * turf.segmentReduce(polygon, function (previousSegment, currentSegment, currentIndex, currentSubIndex) {
 *   //= previousSegment
 *   //= currentSegment
 *   //= currentIndex
 *   //= currentSubIndex
 *   return currentSegment
 * });
     *
     * // Calculate the total number of segments
     * var initialValue = 0
     * var total = turf.segmentReduce(polygon, function (previousValue) {
 *     previousValue++;
 *     return previousValue;
 * }, initialValue);
     */
    function segmentReduce(geojson, callback, initialValue) {
        var previousValue = initialValue;
        segmentEach(geojson, function (currentSegment, currentIndex, currentSubIndex) {
            if (currentIndex === 0 && initialValue === undefined) previousValue = currentSegment;
            else previousValue = callback(previousValue, currentSegment, currentIndex, currentSubIndex);
        });
        return previousValue;
    }

    /**
     * Create Feature
     *
     * @private
     * @param {Geometry} geometry GeoJSON Geometry
     * @param {Object} properties Properties
     * @returns {Feature} GeoJSON Feature
     */
    function feature$1(geometry, properties) {
        if (geometry === undefined) throw new Error('No geometry passed');

        return {
            type: 'Feature',
            properties: properties || {},
            geometry: geometry
        };
    }

    /**
     * Create LineString
     *
     * @private
     * @param {Array<Array<number>>} coordinates Line Coordinates
     * @param {Object} properties Properties
     * @returns {Feature<LineString>} GeoJSON LineString Feature
     */
    function lineString$1(coordinates, properties) {
        if (!coordinates) throw new Error('No coordinates passed');
        if (coordinates.length < 2) throw new Error('Coordinates must be an array of two or more positions');

        return {
            type: 'Feature',
            properties: properties || {},
            geometry: {
                type: 'LineString',
                coordinates: coordinates
            }
        };
    }

    var meta = {
        coordEach: coordEach$1,
        coordReduce: coordReduce,
        propEach: propEach,
        propReduce: propReduce,
        featureEach: featureEach,
        featureReduce: featureReduce,
        coordAll: coordAll,
        geomEach: geomEach,
        geomReduce: geomReduce,
        flattenEach: flattenEach,
        flattenReduce: flattenReduce,
        segmentEach: segmentEach,
        segmentReduce: segmentReduce
    };

    var coordEach = meta.coordEach;

    /**
     * Takes a set of features, calculates the bbox of all input features, and returns a bounding box.
     *
     * @name bbox
     * @param {FeatureCollection|Feature<any>} geojson input features
     * @returns {Array<number>} bbox extent in [minX, minY, maxX, maxY] order
     * @example
     * var line = turf.lineString([[-74, 40], [-78, 42], [-82, 35]]);
     * var bbox = turf.bbox(line);
     * var bboxPolygon = turf.bboxPolygon(bbox);
     *
     * //addToMap
     * var addToMap = [line, bboxPolygon]
     */
    var bbox = function (geojson) {
        var bbox = [Infinity, Infinity, -Infinity, -Infinity];
        coordEach(geojson, function (coord) {
            if (bbox[0] > coord[0]) bbox[0] = coord[0];
            if (bbox[1] > coord[1]) bbox[1] = coord[1];
            if (bbox[2] < coord[0]) bbox[2] = coord[0];
            if (bbox[3] < coord[1]) bbox[3] = coord[1];
        });
        return bbox;
    };

    var point$1 = helpers.point;

    /**
     * Takes a {@link Feature} or {@link FeatureCollection} and returns the absolute center point of all features.
     *
     * @name center
     * @param {GeoJSON} geojson GeoJSON to be centered
     * @param {Object} [properties] an Object that is used as the {@link Feature}'s properties
     * @returns {Feature<Point>} a Point feature at the absolute center point of all input features
     * @example
     * var features = turf.featureCollection([
     *   turf.point( [-97.522259, 35.4691]),
     *   turf.point( [-97.502754, 35.463455]),
     *   turf.point( [-97.508269, 35.463245])
     * ]);
     *
     * var center = turf.center(features);
     *
     * //addToMap
     * var addToMap = [features, center]
     * center.properties['marker-size'] = 'large';
     * center.properties['marker-color'] = '#000';
     */
    var center = function (geojson, properties) {
        var ext = bbox(geojson);
        var x = (ext[0] + ext[2]) / 2;
        var y = (ext[1] + ext[3]) / 2;
        return point$1([x, y], properties);
    };

    var id = 0;

    L$1.SwoopyArrow = L$1.Layer.extend({
        fromLatlng: [],
        toLatlng: [],
        options: {
            color: '#222',
            weight: 1,
            opacity: 1,
            factor: 0.5,
            arrowFilled: false,
            minZoom: 0,
            maxZoom: 22,
            text: '',
            fontSize: 12,
            fontColor: '#222',
            textClassName: '',
            iconAnchor: [0, 0],
            iconSize: [50, 20]
        },

        initialize: function initialize(fromLatlng, toLatlng, options) {
            L$1.Util.setOptions(this, options);

            this._currentPathVisible = true;
            this._fromLatlng = L$1.latLng(fromLatlng);
            this._toLatlng = L$1.latLng(toLatlng);
            this._factor = this.options.factor;
            this._text = this.options.text;
            this._fontSize = this.options.fontSize;
            this._color = this.options.color;
            this._textClassName = this.options.textClassName;
            this._opacity = this.options.opacity;
            this._minZoom = this.options.minZoom;
            this._maxZoom = this.options.maxZoom;
            this._iconAnchor = this.options.iconAnchor;
            this._iconSize = this.options.iconSize;
            this._weight = this.options.weight;
            this._arrowFilled = this.options.arrowFilled;

            this._initSVG();
        },

        _initSVG: function _initSVG() {
            this._svg = L$1.SVG.create('svg');
            this._currentId = id++;
            this._arrow = this._createArrow();
            this._svg.appendChild(this._arrow);
        },

        onAdd: function onAdd(map) {
            this._map = map;
            this.getPane().appendChild(this._svg);

            this._drawSwoopyArrows();

            this.update(this._map);
        },

        getEvents: function getEvents() {
            return {
                zoom: this.update,
                viewreset: this.update
            };
        },

        _drawSwoopyArrows: function _drawSwoopyArrows() {
            var swoopyPath = this._createPath();
            this._currentPath = swoopyPath._path;

            var swoopyLabel = this._createLabel();
            this._currentMarker = L$1.marker([this._fromLatlng.lat, this._fromLatlng.lng], { icon: swoopyLabel }).addTo(this._map);
        },

        _createArrow: function _createArrow() {
            this._container = this._container || L$1.SVG.create('defs');
            var marker = L$1.SVG.create('marker');
            var path = L$1.SVG.create('path');

            marker.classList.add('swoopyArrow__marker');
            marker.setAttribute('id', 'swoopyarrow__arrowhead' + this._currentId);
            marker.setAttribute('markerWidth', '12');
            marker.setAttribute('markerHeight', '12');
            // marker.setAttribute('viewBox', '-10 -10 20 20');
            marker.setAttribute('orient', 'auto');
            marker.setAttribute('refX', '1');
            marker.setAttribute('refY', '4');
            marker.setAttribute('fill', this._color);
            marker.setAttribute('opacity', this._opacity);

            path.setAttribute('stroke', "none");
            path.setAttribute('d', 'M 1 1 7 4 1 7 Z');

            marker.appendChild(path);
            this._container.appendChild(marker);

            return this._container;
        },

        _createPath: function _createPath() {
            var controlLatlng = this._getControlPoint(L$1.latLng(this._fromLatlng), L$1.latLng(this._toLatlng), this.options.factor);
            var pathOne = L$1.curve(['M', [this._fromLatlng.lat, this._fromLatlng.lng], 'Q', [controlLatlng.lat, controlLatlng.lng], [this._toLatlng.lat, this._toLatlng.lng]], {
                animate: false,
                color: this._color,
                fill: false,
                opacity: this._opacity,
                weight: this._weight,
                className: 'swoopyarrow__path'
            }).addTo(this._map);

            pathOne._path.setAttribute('id', 'swoopyarrow__path' + this._currentId);
            pathOne._path.setAttribute('marker-end', 'url(#swoopyarrow__arrowhead' + this._currentId + ')');
            pathOne._path.setAttribute('stroke-linecap', 'butt');

            return pathOne;
        },

        _rotatePoint: function _rotatePoint(origin, point, angle) {
            var radians = angle * Math.PI / 180.0;

            return {
                x: Math.cos(radians) * (point.x - origin.x) - Math.sin(radians) * (point.y - origin.y) + origin.x,
                y: Math.sin(radians) * (point.x - origin.x) + Math.cos(radians) * (point.y - origin.y) + origin.y
            };
        },

        _getControlPoint: function _getControlPoint(start, end, factor) {
            var features = helpers.featureCollection([helpers.point([start.lat, start.lng]), helpers.point([end.lat, end.lng])]);

            var center$$1 = center(features);

            // get pixel coordinates for start, end and center
            var startPx = this._map.latLngToContainerPoint(start);
            var centerPx = this._map.latLngToContainerPoint(L$1.latLng(center$$1.geometry.coordinates[0], center$$1.geometry.coordinates[1]));
            var rotatedPx = this._rotatePoint(centerPx, startPx, 90);

            var distance = Math.sqrt(Math.pow(startPx.x - centerPx.x, 2) + Math.pow(startPx.y - centerPx.y, 2));
            var angle = Math.atan2(rotatedPx.y - centerPx.y, rotatedPx.x - centerPx.x);
            var offset = factor * distance - distance;

            var sin = Math.sin(angle) * offset;
            var cos = Math.cos(angle) * offset;

            var controlPoint = L$1.point(rotatedPx.x + cos, rotatedPx.y + sin);

            return this._map.containerPointToLatLng(controlPoint);
        },

        _createLabel: function _createLabel() {
            return L$1.divIcon({
                className: this._textClassName,
                html: '<span id="marker-label' + this._currentId + '" style="font-size: ' + this._fontSize + 'px">' + this._text + '</span>',
                iconAnchor: this._iconAnchor,
                iconSize: this._iconSize
            });
        },

        update: function update(map) {
            this._checkZoomLevel();

            var arrowHead = this._svg.getElementById('swoopyarrow__arrowhead' + this._currentId);
            arrowHead.setAttribute('markerWidth', '' + 2.5 * this._map.getZoom());
            arrowHead.setAttribute('markerHeight', '' + 2.5 * this._map.getZoom());

            return this;
        },

        _checkZoomLevel: function _checkZoomLevel() {
            var currentZoomLevel = this._map.getZoom();

            if (!this._currentPathVisible) {
                this._currentPath.setAttribute('opacity', this._opacity);
                this._currentMarker.setOpacity(this._opacity);
            }

            if (currentZoomLevel < this._minZoom || currentZoomLevel > this._maxZoom) {
                this._currentPath.setAttribute('opacity', 0);
                this._currentMarker.setOpacity(0);

                this._currentPathVisible = false;
            }
        },

        onRemove: function onRemove(map) {
            this._map = map;
            this._currentPath.remove();
            this._map.removeLayer(this._currentMarker);
        }
    });

    L$1.swoopyArrow = function (fromLatlng, toLatlng, options) {
        return new L$1.SwoopyArrow(fromLatlng, toLatlng, options);
    };

})));
//# sourceMappingURL=Leaflet.SwoopyArrow.js.map