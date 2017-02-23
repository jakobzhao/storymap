// Modified by Bo Zhao, zhao2@oregonstate.edu
// Originally obtained from http://atlefren.github.io/storymap/
// Updated on 2/22/2017 | version 2.1 | MIT License
(function ($) {

    $.fn.storymap = function(options) {

        var defaults = {
            selector: '[data-scene]',
            breakpointPos: '33.333%',
            legend: false,
            createMap: function () {
                var map = L.map('map', {zoomControl: false}).setView([44, -120], 7);
                L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpandmbXliNDBjZWd2M2x6bDk3c2ZtOTkifQ._QA7i5Mpkd_m30IGElHziw', {
                    maxZoom: 18,
                    attribution: '',
                    id: 'mapbox.light'
                }).addTo(map);
                return map;
            }
        };

        var settings = $.extend(defaults, options);

        if (typeof(L) === 'undefined') {
            throw new Error('Storymap requires Laeaflet');
        }

        function getDistanceToTop(elem, top) {
            var docViewTop = $(window).scrollTop();

            var elemTop = $(elem).offset().top;

            var dist = elemTop - docViewTop;

            var d = top - dist;

            if (d < 0) {
                return $(document).height();
            }
            return d;
        }

        function highlightTopPara(paragraphs, top) {

            var distances = $.map(paragraphs, function (element) {
                var dist = getDistanceToTop(element, top);
                return {el: $(element), distance: dist};
            });

            function findMin(pre, cur){
                if (pre.distance > cur.distance) {
                    return cur;
                } else {
                    return pre;
                }
            }

            var closest = distances.reduce(findMin);

            $.each(paragraphs, function (key, element) {
                var paragraph = $(element);
                if (paragraph[0] !== closest.el[0]) {
                    paragraph.trigger('notviewing');
                }
            });

            if (!closest.el.hasClass('viewing')) {
                closest.el.trigger('viewing');
            }
        }

        function watchHighlight(element, searchfor, top) {
            var paragraphs = element.find(searchfor);
            highlightTopPara(paragraphs, top);
            $(window).scroll(function () {
                highlightTopPara(paragraphs, top);
            });
        }

        var makeStoryMap = function (element, scenes, layers) {

            var topElem = $('<div class="breakpoint-current"></div>')
                .css('top', settings.breakpointPos);
            $('body').append(topElem);

            var top = topElem.offset().top - $(window).scrollTop();

            var searchfor = settings.selector;

            var paragraphs = element.find(searchfor);

            paragraphs.on('viewing', function () {
                $(this).addClass('viewing');
            });

            paragraphs.on('notviewing', function () {
                $(this).removeClass('viewing');
            });

            watchHighlight(element, searchfor, top);

            var downBtn = element.find('.arrow-down');

            downBtn.click(function () {
                window.scrollBy(0, $(window).height() / 3);
            });

            var map = settings.createMap();
            var currentLayerGroup = L.layerGroup().addTo(map);
            var legendControl = L.control({position: 'topright'});

            $.each(paragraphs, function (key, element) {
                var paragraph = $(element);
                if (paragraph[0].className == 'viewing') {
                    var scene = scenes[paragraph[0].attributes['data-scene'].value];
                    map.setView([scene.lat, scene.lng], scene.zoom);
                    var layernames = scene.layers;
                    var legendContent = "";
                    if(typeof layernames !== 'undefined') {
                        for (var i = 0; i < layernames.length; i++) {
                            //add new layers
                            currentLayerGroup.addLayer(layers[layernames[i]][0]);

                            //add new legends
                            if (layers[layernames[i]].length == 2) {
                                legendContent += layers[layernames[i]][1];
                            }
                        }

                    }

                    legendControl.onAdd = function () {
                        var div = new L.DomUtil.create('div', 'legend');
                        div.innerHTML = legendContent;
                        return div;
                    };

                    if (settings.legend == true && legendContent != "")
                    {
                        legendControl.addTo(map);
                    }

                }

            });

            function showMapView(key) {

                currentLayerGroup.clearLayers();

                if (settings.legend == true)
                {
                    legendControl.remove();
                }

                var scene = scenes[key];

                var layernames = scene.layers;
                var legendContent = "";
                if(typeof layernames !== 'undefined'){
                    for (var i=0; i < layernames.length; i++)
                    {
                        currentLayerGroup.addLayer(layers[layernames[i]][0]);

                        if (layers[layernames[i]].length == 2)  {
                            legendContent += layers[layernames[i]][1];
                        }
                    }
                }

                legendControl.onAdd = function () {
                    var div = new L.DomUtil.create('div', 'legend');
                    div.innerHTML = legendContent;
                    return div;
                };

                // the condition legendContent != "" will make sure the legend will only be added on when there is content in the legend.
                if (settings.legend == true && legendContent != "")
                {
                    legendControl.addTo(map);
                }


                // if you don't want to show a marker at the center of the map, you can simply comment the following line.
                // currentLayerGroup.addLayer(L.marker([scene.lat, scene.lon]));

                map.setView([scene.lat, scene.lng], scene.zoom, 1);
            }

            paragraphs.on('viewing', function () {
                showMapView($(this).data('scene'));
            });
        };

        makeStoryMap(this, settings.scenes, settings.layers);
        return this;
    }

}(jQuery));
