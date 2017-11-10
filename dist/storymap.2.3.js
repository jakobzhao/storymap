// Modified by Bo Zhao, zhao2@oregonstate.edu
// Originally obtained from http://atlefren.github.io/storymap/
// Updated on 10/22/2017 | version 2.3 | MIT License

(function ($) {

    $.fn.storymap = function (options) {

        var defaults = {
            selector: '[data-scene]',
            triggerpos: '33.333%',
            navbar: false,
            navwidget: false,
            legend: true,
            loader: true,
            flyto: false,
            scalebar: false,
            scrolldown: true,
            progressline: true,
            createMap: function () {
                var map = L.map($('.storymap-map')[0], {zoomControl: false}).setView([44, -120], 7);
                L.tileLayer('http://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}@2x.png').addTo(map);
                return map;
            }
        };

        var settings = $.extend(defaults, options);

        if (typeof(L) === 'undefined') {
            throw new Error('Storymap requires Leaflet.');
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
                return {
                    el: $(element),
                    distance: dist
                };
            });

            function findMin(pre, cur) {
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

                if (section.height() <= $(window).height() * 0.33) {
                    section.height($(window).height() * 0.33)
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


        //support video for IE 8 and 9.
        document.createElement('video');

        var makeStoryMap = function (element, scenes, layers) {

            $(element).addClass("storymap");
            var topElem = $('<div class="storymap-trigger"></div>')
                .css('top', settings.triggerpos);
            $('body').append(topElem);
            var top = topElem.offset().top - $(window).scrollTop();
            var searchfor = settings.selector;
            var sections = $(element).find(searchfor);
            var map = settings.createMap();


            var currentLayerGroup = L.layerGroup().addTo(map);
            var nav = $("nav");


            if (settings.baselayer) {
                // add an base map, which can be either OSM, mapbox, tilelayer, wmslayer or those designed by yourself.
                settings.baselayer.layer.addTo(map);
            }

            if (settings.legend) {
                $(".storymap").append("<div class='storymap-legend' />")
            }

            if (settings.scrolldown) {
                $(".storymap").append("<div class='zoomIn infinite glyphicon glyphicon-menu-down storymap-scroll-down' />")
            }

            if (settings.scalebar) {
                L.control.scale({
                    position: "bottomright",
                    metric: false
                }).addTo(map);
            }

            if (settings.progressline) {
                $(".storymap").append("<div class='storymap-progressline' />")

            }

            if (settings.navwidget) {
                $(".storymap").append("<div class='storymap-navwidget text-center' />")

            }

            if (settings.loader) {
                $(".storymap").append("<div class='glyphicon glyphicon-refresh storymap-loader' />")

            }


            $(".storymap-map .leaflet-control-attribution")
                .addClass("storymap-attribution")
                .html("<a href='https://github.com/jakobzhao/storymap'><img src='../../img/logo.png' width='18px' target='_blank' > storymap.js </a>");

            if (settings.credits) {
                $(".storymap-attribution").find("a").prepend(settings.credits + " | ");


            }

            if (settings.navbar && nav.length > 0) {

                $(".navbar-header").after("<div class='collapse navbar-collapse nav navbar-nav navbar-right storymap-navbar'>");


                $.each(sections, function (key, element) {
                    var section = $(element);
                    // if no name attribute for a specific scene, the name on the navigation bar will be the object name.
                    if (typeof(scenes[section.data('scene')].name) === "undefined") {
                        sceneName = section.data('scene');
                    } else {
                        sceneName = scenes[section.data('scene')].name.replace(" ", "&nbsp;");
                    }

                    scrollScript = "javascript:window.scrollBy(0, $('section[data-scene=\\'" + section.data('scene') + "\\']').offset().top - $(window).scrollTop() - $('.storymap-navbar').height() - 10);";

                    $(".storymap-navbar").append('<li><a title="' + sceneName + '" href="' + scrollScript + '" >' + sceneName + '</a></li>');


                });
            }


            $.each(sections, function (key, element) {
                var section = $(element);


                var path = section.data('background');
                if (typeof path !== 'undefined') {


                    if (path.indexOf("jpg") >= 0 || path.indexOf("jpeg") >= 0 || path.indexOf("png") >= 0 || path.indexOf("bmp") >= 0 || path.indexOf("gif") >= 0) {
                        $("head").append("<style> ." + section.data('scene') + "-bg-img { background: url(" + path + ") no-repeat center center fixed; -webkit-background-size: cover; -moz-background-size: cover;  -o-background-size: cover; background-size: cover; }</style>");

                        $(section).find(".fullscreen").addClass(section.data('scene') + "-bg-img");

                    } else if (path.indexOf("mp4") >= 0) {

                        $(section).find(".fullscreen").before('<video class="fullscreen" playsinline autoplay muted loop><source src=' + path + '  type="video/mp4"></video>')

                    } else {
                        console.log(path);
                    }
                }

            });


            if (!String.prototype.includes) {
                String.prototype.includes = function () {
                    'use strict';
                    return String.prototype.indexOf.apply(this, arguments) !== -1;
                };
            }

            // make nav bar on the top.
            if (nav.length !== 0) {

                var navbar_height = nav.height();

                var origin_main_top = nav.position().top;

                $(".storymap-story").css({
                    top: (navbar_height + origin_main_top).toString() + "px"
                });

            }


            $.each(layers, function (key, layer) {

                // layer = layer.layer;
                layer.layer.on('s')
                layer.layer.on('load', function () {
                    $(".storymap-loader").fadeTo(1000, 0);
                })

            });


            function showMapView(key) {

                currentLayerGroup.clearLayers();

                var scene = scenes[key];
                var layernames = scene.layers;
                var legendContent = "";

                if (typeof $("section[data-scene='" + key + "']").data("background") !== 'undefined') {

                    $(".storymap-loader").fadeTo(0, 0);

                } else if (typeof layernames !== 'undefined' && typeof $("section[data-scene='" + key + "']").data("background") === 'undefined') {

                    for (var i = 0; i < layernames.length; i++) {
                        $(".storymap-loader").fadeTo(0, 1);
                        currentLayerGroup.addLayer(layers[layernames[i]].layer);

                        if (typeof layers[layernames[i]].legend !== 'undefined') {
                            legendContent += layers[layernames[i]].legend;
                        }
                    }

                }


                // the condition legendContent != "" will make sure the legend will only be added on when there is some contents in the legend.
                if (settings.legend && legendContent !== "") {
                    $(".storymap-legend")
                        .html(legendContent)
                        .show();
                } else {
                    $(".storymap-legend").hide();

                }

                if (settings.flyto) {
                    map.flyTo([scene.lat, scene.lng], scene.zoom, 1)
                } else {
                    map.setView([scene.lat, scene.lng], scene.zoom, 1)

                }

                map.invalidateSize();

            }


            sections.on('viewing', function () {

                $(this).addClass('viewing');
                var scrollDown = $(".storymap-scroll-down")

                scrollDown.css("left", "2%");

                if (typeof $(this).data("background") !== 'undefined') {
                    $(this)
                        .addClass('section-opacity')
                        .css('width', "0px")
                        .css('padding', "0 0 0 0");

                    scrollDown.css("left", "50%");


                }

                // // Change the storymap-scroll-down icon to the home icon when reaching the last scene.
                if ($(this).data('scene') === sections.last().data('scene')) {
                    scrollDown
                        .removeClass("glyphicon-menu-down")
                        .addClass("glyphicon-home");
                } else {
                    scrollDown
                        .removeClass("glyphicon-home")
                        .addClass("glyphicon-menu-down");
                }

                // Bounce the storymap-scroll-down icon when the icon is on the front page.
                if ($(this).data('scene') === sections.first().data('scene') || $(this).data('scene') === sections.last().data('scene')) {
                    scrollDown
                        .addClass("animated");
                } else {
                    scrollDown
                        .removeClass("animated");
                }

                showMapView($(this).data('scene'));


            });


            sections.on('notviewing', function () {


                $(this).removeClass('viewing');

                if (typeof $(this).data("background") !== 'undefined') {
                    $(this)
                        .removeClass('section-opacity');
                }
            });

            watchHighlight(element, searchfor, top);
            window.scrollTo(0, 1);


            $('.storymap-scroll-down').click(function () {
                var viewing = $(".viewing");
                if (viewing.data("scene") !== $("section:last").data("scene")) {

                    if (nav.length !== 0) {
                        window.scrollBy(0, viewing.offset().top + viewing.height() - $(window).scrollTop() - $('.storymap-navbar').height() - 10);
                    } else {
                        window.scrollBy(0, viewing.offset().top + viewing.height() - $(window).scrollTop() - 10);
                    }
                } else {
                    window.scrollTo(0, 0);
                }
            });


            // create a progress line
            $(window).scroll(function () {
                var wintop = $(window).scrollTop(),
                    docheight = $(document).height(),
                    winheight = $(window).height();
                var scrolled = (wintop / (docheight - winheight)) * 100;

                $('.storymap-progressline').css('width', (scrolled + '%'));
            });


            // create the navigation widget to the left side of the browser's window.
            if (settings.navwidget) {
                $.each(sections, function (key, element) {
                    var section = $(element);
                    // if no name attribute for a specific scene, the name on the navigation bar will be the object name.
                    if (typeof(scenes[section.data('scene')].name) === "undefined") {
                        sceneName = section.data('scene');
                    } else {
                        sceneName = scenes[section.data('scene')].name.replace(" ", "&nbsp;");
                    }

                    //if there is a navbar.
                    if (nav.length !== 0) {
                        scrollScript = "javascript:window.scrollBy(0, $('section[data-scene=\\'" + section.data('scene') + "\\']').offset().top - $(window).scrollTop() - $('.storymap-navbar').height() - 10);";
                    } else {
                        scrollScript = "javascript:window.scrollBy(0, $('section[data-scene=\\'" + section.data('scene') + "\\']').offset().top  - $(window).scrollTop() - 10);";
                    }
                    // if key is equal to 0, meaning it is the first scene.
                    if (key === 0) {
                        $(".storymap-navwidget").append('<li><a class="glyphicon glyphicon-home" data-toggle="tooltip" title="' + sceneName + '" href="' + scrollScript + '" ></a></li>');
                    } else {
                        $(".storymap-navwidget").append('<li><a class="glyphicon glyphicon-one-fine-full-dot" data-toggle="tooltip" title="' + sceneName + '" href="' + scrollScript + '" ></a></li>');
                    }
                });

                $('[data-toggle="tooltip"]').tooltip({
                    placement: 'right',
                    html: true
                });

                $(".storymap-navwidget").hover(function () {
                    $(this).fadeTo(100, 0.8);
                }, function () {
                    $(this).fadeTo(300, 0);
                });
            }

        };

        makeStoryMap(this, settings.scenes, settings.layers);
        window.scrollTo(0, 0);
        return this;
    }

}(jQuery));