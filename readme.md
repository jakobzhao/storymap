# Storymap

Storymap is a jQuery-plugin to create a map that follows your text. Annotate each paragraph and place a map alongside it. Then you can zoom/pan/add marker etc to the map as the reader reads through the text.

## Demo

See demos at
- [Major Cities of Oregon](http://cdn.rawgit.com/jakobzhao/storymap/master/index.html)
- [Story Map Template](http://cdn.rawgit.com/jakobzhao/storymap/master/dist/template.html)

## Requirements

Storymap expects some (rather common) js libs to be available:

- jQuery (as it is a jQuery plugin)
- Leaflet (because we need a map)
- Bootstrap 3 (the markups are based Bootstrap 3)

## Usage

Should be rather simple. Setup a html page like the one in index.html, include dependencies and do a 

    el.storymap({markers: dict_with_data});

on the element you wish to add a storymap to. By default, the plugin looks for elements that has a "data-place" attribute, sets the breakpoint 33% from the top of the page. This can be overridden by setting some options, like this:

    el.storymap({
        markers: dict_with_data,
        selector: '[data-place]', //jquery for selectors to trigger an event
        breakpointPos: '33.333%', //position of the breakpoint
        createMap: function () { //function that creates a map
            // create a map in the "map" div, set the view to a given place and zoom
            var map = L.map('map').setView([65, 18], 5);            
            // add an OpenStreetMap tile layer            
            L.tileLayer(
                'http://{s}.tile.osm.org/{z}/{x}/{y}.png',
                {attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'}
            ).addTo(map);
            return map;
        }
    });

## Known issues
Maps may disappear on smart phones.

## License

This storymap plugin is originally obtained from [Atlefren's stormap](https://github.com/atlefren/storymap), and updated by [Bo Zhao](http://ceoas.oregonstate.edu/profile/zhao/). It is currently under the MIT license.