// Modified by Bo Zhao, zhao2@oregonstate.edu
// Originally obtained from http://atlefren.github.io/storymap/
// Updated on 2/22/2017 | version 2.1 | MIT License
(function ($) {

    $.fn.storymap = function(options) {

        var defaults = {
            selector: '[data-scene]',
            breakpointPos: '33.333%',
            legend: false,
            scale: false,
            navbar: false,
            createMap: function () {
                var map = L.map('map', {zoomControl: false}).setView([44, -120], 7);
                // L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpandmbXliNDBjZWd2M2x6bDk3c2ZtOTkifQ._QA7i5Mpkd_m30IGElHziw', {
                //     maxZoom: 18,
                //     attribution: '',
                //     id: 'mapbox.light'
                // }).addTo(map);
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

        function highlightTopPara(sections, top) {

            var distances = $.map(sections, function (element) {
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

            $.each(sections, function (key, element) {
                var section = $(element);
                if (section[0] !== closest.el[0]) {
                    section.trigger('notviewing');
                }
            });

            if (!closest.el.hasClass('viewing')) {
                closest.el.trigger('viewing');
            }
        }

        function watchHighlight(element, searchfor, top) {
            var sections = element.find(searchfor);
            highlightTopPara(sections, top);
            $(window).scroll(function () {
                highlightTopPara(sections, top);
            });
        }

        var makeStoryMap = function (element, scenes, layers) {

            var topElem = $('<div class="breakpoint-current"></div>')
                .css('top', settings.breakpointPos);
            $('body').append(topElem);

            var top = topElem.offset().top - $(window).scrollTop();

            var searchfor = settings.selector;

            var sections = element.find(searchfor);



            sections.on('viewing', function () {
                $(this).addClass('viewing');
                $(".arrow-down").css("left", "2%");


                if (scenes[$(this)[0].attributes['data-scene'].value].position == "fullpage") {
                    $(this).addClass('section-opacity');
                    $(this).find(".background-img-setting").addClass('fullpage')
                        .css("display", "block");
                    $(".arrow-down").css("left", "50%");
                } else {
                    console.log("no position parameter.")
                }

                // Change the arrow-down icon to the home icon when reaching the last scene.
                if ($(this)[0].attributes["data-scene"].value == $("section").last()[0].attributes["data-scene"].value) {
                    $(".arrow-down").removeClass("glyphicon-menu-down")
                        .addClass("glyphicon-home");

                } else {
                    $(".arrow-down").removeClass("glyphicon-home")
                        .addClass("glyphicon-menu-down");
                }

                // Bounce the arrow-down icon when the icon is on the front page.
                if ($(this)[0].attributes["data-scene"].value == $("section").first()[0].attributes["data-scene"].value) {
                    $(".arrow-down").addClass("animated");
                } else {
                    $(".arrow-down").removeClass("animated");
                }

            });

            sections.on('notviewing', function () {
                $(this).removeClass('viewing');

                if (scenes[$(this)[0].attributes['data-scene'].value].position == "fullpage") {
                    $(this).removeClass('section-opacity');
                    $(this).find(".background-img-setting").removeClass('fullpage')
                        .css("display", "none");
                }

            });

            watchHighlight(element, searchfor, top);

            if (!String.prototype.includes) {
                String.prototype.includes = function() {
                    'use strict';
                    return String.prototype.indexOf.apply(this, arguments) !== -1;
                };
            }


            // var downBtn = element.find('.arrow-down');

            $('.arrow-down').click(function () {
                if ($(".arrow-down")[0].className.includes("menu")) {
                    window.scrollBy(0, $(".viewing").offset().top -$(window).scrollTop() + $('.viewing').height());
                } else if ($(".arrow-down")[0].className.includes("home")) {
                    window.scrollTo(0, 0);
                }

            });


            // create the navigation bar.
            if (settings.navbar) {
                //$("#navbar").append('<li><a class="fa fa-compass" style="font-size:32px"></a></li>');
                $.each(sections, function (key, element) {
                    var section = $(element);
                    sceneName = section.data('scene');
                    scrollScript = "javascript:window.scrollBy(0, $('section[data-scene=\\'" + sceneName + "\\']').offset().top - $(window).scrollTop());";
                    if (key == 0) {
                        $(".navbar").append('<li><a class="fa fa-home" style="font-size:16px" href="' + scrollScript + '" ></a></li>');
                    } else {
                        $(".navbar").append('<li><a class="fa fa-circle" href="' + scrollScript + '" ></a></li>');
                    }
                });


                $( ".navbar" ).hover(function() {
                    $(this).fadeTo( 100, 0.8 );
                }, function() {
                    $(this).fadeTo( 500, 0);
                });
            }


            var map = settings.createMap();
            var currentLayerGroup = L.layerGroup().addTo(map);
            var legendControl = L.control({position: 'topright'}); // you can change the position of the legend Control.

            if (settings.scale) {
                L.control.scale({position: 'bottomright', metric: false}).addTo(map);
            }

            $.each(sections, function (key, element) {
                var section = $(element);
                if (section[0].className == 'viewing') {
                    var scene = scenes[section[0].attributes['data-scene'].value];
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

            } );

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

                map.setView([scene.lat, scene.lng], scene.zoom, 1);
            }

            sections.on('viewing', function () {
                showMapView($(this).data('scene'));
            });
        };

        makeStoryMap(this, settings.scenes, settings.layers);
        return this;
    }

}(jQuery));
