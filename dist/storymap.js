// Modified by Bo Zhao, zhao2@oregonstate.edu
// Originally obtained from http://atlefren.github.io/storymap/
// Updated on 5/14/2017 | version 2.22 | MIT License

(function ($) {

    $.fn.storymap = function (options) {

        var defaults = {
            selector: '[data-scene]',
            breakpointPos: '33.333%',
            legend: false,
            scale: false,
            navwidget: false,
            createMap: function () {
                var map = L.map('map', {
                    zoomControl: false
                }).setView([44, -120], 7);
                L.tileLayer('http://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}@2x.png');
                return map;
            }
        };

        var settings = $.extend(defaults, options);

        if (typeof(L) === 'undefined') {
            throw new Error('Storymap requires Laeaflet.');
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

            var topElem = $('<div class="breakpoint-current"></div>')
                .css('top', settings.breakpointPos);
            $('body').append(topElem);

            var top = topElem.offset().top - $(window).scrollTop();
            var searchfor = settings.selector;
            var sections = $(element).find(searchfor);


            var map = settings.createMap();
            var currentLayerGroup = L.layerGroup().addTo(map);
            var legendControl = L.control({
                position: 'topright'
            }); // you can change the position of the legend Control.

            if (settings.scale) {
                L.control.scale({
                    position: 'bottomright',
                    metric: false
                }).addTo(map);
            }

            if (!String.prototype.includes) {
                String.prototype.includes = function () {
                    'use strict';
                    return String.prototype.indexOf.apply(this, arguments) !== -1;
                };
            }

            // make nav bar on the top.
            if ($(".navbar").length !== 0) {

                var navbar_height = $(".navbar").height();

                var origin_main_top = $(".main").position().top;

                $(".main").css({
                    top: (navbar_height + origin_main_top).toString() + "px"
                });

            }


            $.each(layers, function (key, layer) {

                layer = layer[0];
                layer.on('load', function () {
                    $(".loader").fadeTo(500, 0);
                })

            });


            function showMapView(key) {

                currentLayerGroup.clearLayers();

                if (settings.legend === true) {
                    legendControl.remove();
                }

                var scene = scenes[key];
                var layernames = scene.layers;
                var legendContent = "";

                if (typeof layernames !== 'undefined' && scene.position !== "fullpage") {

                    for (var i = 0; i < layernames.length; i++) {
                        $(".loader").fadeTo(0, 1);
                        currentLayerGroup.addLayer(layers[layernames[i]][0]);

                        if (layers[layernames[i]].length === 2) {
                            legendContent += layers[layernames[i]][1];
                        }
                    }
                }

                if (scene.position == "fullpage") {

                    $(".loader").fadeTo(0, 0);
                }

                legendControl.onAdd = function () {
                    var div = new L.DomUtil.create('div', 'legend');
                    div.innerHTML = legendContent;
                    return div;
                };

                // the condition legendContent != "" will make sure the legend will only be added on when there is some contents in the legend.
                if (settings.legend === true && legendContent !== "") {
                    legendControl.addTo(map);
                    if ($(".navbar").length !== 0) {
                        navbar_height = $(".navbar").height();
                        origin_legend_top = $(".legend").position().top;
                        $(".legend").css({
                            top: (navbar_height + origin_legend_top).toString() + "px"
                        });
                    }
                }

                map.setView([scene.lat, scene.lng], scene.zoom, 1);

            }


            sections.on('viewing', function () {


                $(this).addClass('viewing');

                $(".arrow-down").css("left", "2%");

                if (scenes[$(this).data('scene')].position === "fullpage") {
                    $(this).addClass('section-opacity')
                        .css('width', "0px")
                        .css('padding', "0 0 0 0");
                    $(this).find(".background-fullscreen-setting")
                        .addClass('fullpage')
                        .css("display", "block");
                    $(".arrow-down").css("left", "50%");
                }

                // // Change the arrow-down icon to the home icon when reaching the last scene.
                if ($(this).data('scene') === sections.last().data('scene')) {
                    $(".arrow-down").removeClass("glyphicon-menu-down")
                        .addClass("glyphicon-home");

                } else {
                    $(".arrow-down").removeClass("glyphicon-home")
                        .addClass("glyphicon-menu-down");
                }

                // Bounce the arrow-down icon when the icon is on the front page.
                if ($(this).data('scene') === sections.first().data('scene') || $(this).data('scene') === sections.last().data('scene')) {
                    $(".arrow-down").addClass("animated");
                } else {
                    $(".arrow-down").removeClass("animated");
                }

                showMapView($(this).data('scene'));

            });


            sections.on('notviewing', function () {

                $(this).removeClass('viewing');

                if (scenes[$(this).data('scene')].position === "fullpage") {
                    $(this).removeClass('section-opacity');
                    $(this).find(".background-fullscreen-setting")
                        .removeClass('fullpage')
                        .css("display", "none");
                }
            });

            watchHighlight(element, searchfor, top);
            window.scrollTo(0, 1);


            $('.arrow-down').click(function () {

                if ($(".arrow-down")[0].className.includes("glyphicon-menu-down")) {

                    //if there is a navbar.
                    if ($(".navbar").length !== 0) {
                        window.scrollBy(0, $(".viewing").offset().top + $('.viewing').height() - $(window).scrollTop() - $('.navbar').height() - 10);
                    } else {
                        window.scrollBy(0, $(".viewing").offset().top + $('.viewing').height() - $(window).scrollTop() - 10);
                    }
                } else if ($(".arrow-down")[0].className.includes("glyphicon-home")) {
                    window.scrollTo(0, 0);
                }
            });


            // create a progress line
            $(window).scroll(function () {
                var wintop = $(window).scrollTop(),
                    docheight = $(document).height(),
                    winheight = $(window).height();
                var scrolled = (wintop / (docheight - winheight)) * 100;

                $('.progress-line').css('width', (scrolled + '%'));
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
                    if ($(".navbar").length !== 0) {
                        scrollScript = "javascript:window.scrollBy(0, $('section[data-scene=\\'" + section.data('scene') + "\\']').offset().top - $(window).scrollTop() - $('.navbar').height() - 10);";
                    } else {
                        scrollScript = "javascript:window.scrollBy(0, $('section[data-scene=\\'" + section.data('scene') + "\\']').offset().top  - $(window).scrollTop() - 10);";
                    }
                    // if key is equal to 0, meaning it is the first scene.
                    if (key == 0) {
                        $(".navwidget").append('<li><a class="glyphicon glyphicon-home" data-toggle="tooltip" style="font-size:16px" title="' + sceneName + '" href="' + scrollScript + '" ></a></li>');
                    } else {
                        $(".navwidget").append('<li><a class="glyphicon glyphicon-one-fine-full-dot" data-toggle="tooltip" title="' + sceneName + '" href="' + scrollScript + '" ></a></li>');
                    }
                });

                $('[data-toggle="tooltip"]').tooltip({
                    placement: 'right',
                    html: true
                });

                $(".navwidget").hover(function () {
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