/*
 Copyright (c) 2016, BrightPoint Consulting, Inc.
 
 This source code is covered under the following license: http://vizuly2.io/commercial-license/
 
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
 THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// @version 2.1.220

//
// This is the base component for a vizuly2.bar chart.
//

//Include this versin of topoJson

vizuly2.viz.GeoPlot = function (parent) {
	
	
	var d3 = vizuly2.d3;
	
	var properties = {
		"margin": {
			"top": "10%",
			"bottom": "10%",
			"left": "10%",
			"right": "10%"
		},
		"width": 800,
		"height": 800,
		"duration": 500,
		"data": null,
		"featureLayers": [vizuly2.assets.WorldCountries],
		"plotValue": function (d) {
			return d.value
		},
		"plotLabel": function (d) {
			return d.label
		},
		"sourceCoordinates": function (d) {
			return d.location
		},
		"targetCoordinates": function (d) {
			return d.location
		},
		"plotScale": d3.scaleLinear(),
		"plotShape": "BAR",
		"arcSource": function (d) { return d.source },
		"arcTarget": function (d) { return d.target },
		"dataTipRenderer": dataTipRenderer
	};
	
	var styles = {
		'background-opacity': 1,
		'background-color-top': '#FFF',
		'background-color-bottom': '#CCC',
		'globe-stroke': '#000',
		'globe-stroke-opacity': .5,
		'shading-colors': ['#fff', '#ba9'],
		'shading-opacity': 1,
		'shadow-colors': ['#000', '#000'],
		'shadow-spread': 1,
		'highlight-colors': ['#fff', '#505962'],
		'ocean-colors': ['#fff', '#ABABAB'],
		'land-color': '#433',
		'graticule-stroke': '#777',
		'graticule-stroke-opacity': 0.25,
		'graticule-stroke-width': 1,
		'feature-stroke': function (d, i) {
			return '#000 '
		},
		'feature-stroke-opacity': function (d, i) {
			return .5
		},
		'feature-fill': function (d, i) {
			return '#777'
		},
		'feature-fill-opacity': function (d, i) {
			return 0.1
		},
		'feature-fill-over': function (d, i) {
			return '#FFF'
		},
		'feature-fill-opacity-over': function (d, i) {
			return .8
		},
		'plot-fill': function (d, i) {
			var axisColors = ['#bd0026', '#fecc5c', '#fd8d3c', '#f03b20', '#B02D5D', '#9B2C67', '#982B9A', '#692DA7', '#5725AA', '#4823AF', '#d7b5d8', '#dd1c77', '#5A0C7A', '#5A0C7A'];
			return axisColors[i % axisColors.length]
		},
		'plot-fill-opacity': function (d, i) {
			return .8
		},
		'plot-stroke': function (d, i) {
			var axisColors = ['#bd0026', '#fecc5c', '#fd8d3c', '#f03b20', '#B02D5D', '#9B2C67', '#982B9A', '#692DA7', '#5725AA', '#4823AF', '#d7b5d8', '#dd1c77', '#5A0C7A', '#5A0C7A'];
			return axisColors[i % axisColors.length]
		},
		'plot-stroke-width': function (d, i) {
			return (scope.plotShape === viz.SHAPE_CIRCLE) ? 1 : (this.size().measuredWidth * .005);
		},
		'plot-stroke-opacity': 1,
		'plot-fill-over': function (d, i) {
			return '#FFF';
		},
		'plot-fill-opacity-over': function (d, i) {
			return 1
		},
		'plot-stroke-over': function (d, i) {
			return (scope.plotShape === viz.SHAPE_CIRCLE) ? '#777' : '#FFF';
		},
		'plot-stroke-width-over': function (d, i) {
			return (scope.plotShape === viz.SHAPE_CIRCLE) ? 1 : (this.size().measuredWidth * .01);
		},
		'plot-stroke-opacity-over': 1
	}
	
	var events = ['click','mouseover','mouseout','feature_mouseover', 'feature_mouseout', 'feature_click'];
	
	// Create our viz and type it
	// This is the object that provides pseudo "protected" properties that the vizuly.viz function helps create
	var scope = {};
	scope.initialize = initialize;
	scope.properties = properties;
	scope.styles = styles;
	scope.events = events;
	
	var viz = vizuly2.core.component(parent, scope);
	viz.version = '2.1.220';
	
	var size;           // Holds the 'size' variable as defined in viz.util.size()
	
	var topojson = TopoJson();
	
	// These are all d3.selection objects we use to insert and update svg elements into
	var svg, g, background, plot, plotBackground, plotForeground, dataPlot, defs;
	var oceanFilter, globeShadingFilter, globeHighlightFilter, shadowFilter;
	var ocean, globeShading, globeHighlight, shadow, worldObjects, featureGroup, graticules;
	var continents = topojson.feature(vizuly2.assets.world110m, vizuly2.assets.world110m.objects.land);
	var projection = d3.geoOrthographic().clipAngle(90);
	var mockProjection = d3.geoOrthographic().clipAngle(90);
	var graticule = d3.geoGraticule();
	var featureLayers = [];
	var centerCoord;
	var zoom = d3.zoom()
	 .on("zoom", onZoom)
	 .filter(function () {
		 return !d3.event.button && (d3.event instanceof WheelEvent);
	 });
	
	var scale = 1;
	
	
	var m0, o0;
	
	var worldPath = d3.geoPath().projection(projection).pointRadius(1.5);
	
	// Here we set up all of our svg layout elements using a 'vz-XX' class namespace.  This routine is only called once
	// These are all place holder groups for the invidual data driven display elements.   We use these to do general
	// sizing and margin layout.  The all are referenced as d3.selections.
	function initialize() {
		
		svg = scope.selection.append("svg").attr("id", scope.id).style("overflow", "visible").attr("class", "vizuly");
		background = svg.append("rect").attr("class", "vz-background");
		defs = vizuly2.util.getDefs(viz);
		plot = svg.append('g').attr('class', 'vz-geo-plot');
		plot.call(zoom).on('mousemove.zoom', null);
		plotBackground = plot.append('g').attr('class', 'vz-geo-plot-background')
		dataPlot = plot.append('g').attr('class','vz-geo-plot-data')
		plotForeground = plot.append('g').attr('class', 'vz-geo-plot-foreground')
		graticules = plotForeground.append('path').attr('class', 'vz-geo-plot-graticules')
		svg.on('mousedown.move', onMouseDown).on('mousemove.move', onMouseMove);
		
		d3.select(window).on('mouseup', onMouseUp);
		
		shadowFilter = vizuly2.svg.gradient.radialBlend(viz, '50%', '50%', '#000', '#000', '50%', '100%', 1, 0);
		
		shadow = plotBackground.append("ellipse")
		 .attr("class", "vz-geo-drop-shadow")
		 .style("fill", "url(#" + shadowFilter.attr("id") + ")");
		
		oceanFilter = vizuly2.svg.gradient.radialBlend(viz, '75%', '25%', '#FFF', '#ABABAB', '5%', '100%');
		
		ocean = plotBackground.append("circle")
		 .attr("class", "vz-geo-ocean")
		 .style("fill", "url(#" + oceanFilter.attr("id") + ")");
		
		//	createTextureFilter();
		
		worldObjects = plotBackground.append("path")
		 .datum(continents)
		 .attr("class", "vz-geo-world-objects");
		
		featureGroup = plotBackground.append('g').attr('class', 'vz-geo-plot-features');
		
		//	worldObjects.attr('filter','url("#vzGeoTexture")');
		
		globeShadingFilter = vizuly2.svg.gradient.radialBlend(viz, '75%', '25%', '#ffd', '#ba9', '5%', '100%', 0.6, 0.2);
		
		globeShading = plotBackground.append("circle")
		 .attr("class", "vz-geo-globe-shading")
		 .style('pointer-events', 'none')
		 .style("fill", "url(#" + globeShadingFilter.attr("id") + ")");
		
		globeHighlightFilter = vizuly2.svg.gradient.radialBlend(viz, '55%', '45%', '#fff', '#505962', '30%', '100%', 0, 0.3);
		
		globeHighlight = plotBackground.append("circle")
		 .attr("class", "vz-geo-globe-highlight")
		 .style('pointer-events', 'none')
		 .style("fill", "url(#" + globeHighlightFilter.attr("id") + ")");
		
		//Remove any plots when we change the plot shape.
		viz.onChange('plotShape',function () { dataPlot.selectAll('.vz-data-plot').remove() })
		
		scope.dispatch.apply('initialized', viz);
	}
	
	function createTextureFilter() {
		/*
		 <filter id=”roughpaper” x=”0%” y=”0%” width=”100%” height=”100%”>
		 <feTurbulence type=”fractalNoise” baseFrequency=”0.04” numOctaves=”5” result=”noise”/>
		 <feDiffuseLighting in=”noise” lighting-color=”white” surfaceScale=”2” result=”diffLight”>
		 <feDistantLight azimuth=”45” elevation=”35”/>
		 </feDiffuseLighting>
		 </filter>
		 */
		var defs = vizuly2.util.getDefs(viz);
		var filter = defs.append('filter').attr('id', 'vzGeoTexture').attr('x', '0%').attr('y', '0%').attr('width', '100%').attr('height', '100%');
		
		filter.append('feTurbulence').attr('type', 'fractalNoise').attr('baseFrequency', 0.04).attr('numOctaves', 5).attr('result', 'noise');
		var diffuse = filter.append('feDiffuseLighting').attr('in', 'noise').attr('lighting-color', '#3f9142').attr('surfaceScale', 2).attr('result', 'diffLight');
		diffuse.append('feDistantLight').attr('azimuth', 45).attr('elevation', 35);
		
	}
	
	
	// The measure function performs any measurement or layout calcuations prior to making any updates to the SVG elements
	function measure() {
		
		// Call our validate routine and make sure all component properties have been set
		viz.validate();
		
		// Get our size based on height, width, and margin
		size = vizuly2.util.size(scope.margin, scope.width, scope.height, scope.parent);
		
		zoom.scaleExtent([1, 5]);
		
		projection.translate([size.width / 2, size.height / 2]).scale(size.width / 2 * scale);
		mockProjection.translate([size.width / 2, size.height / 2]);
		
		centerCoord = projection.invert([size.width / 2, size.height / 2]);
		
		featureLayers = [];
		scope.featureLayers.forEach(function (layer) {
			featureLayers.push(topojson.feature(vizuly2.assets.world110m, vizuly2.assets.world110m.objects.countries))
		});
		
		scope.plotScale
		 .domain([d3.min(scope.data, function (d) {
			 return scope.plotValue(d)
		 }), d3.max(scope.data, function (d) {
			 return scope.plotValue(d)
		 })]);
		
		graticule.step([10,10])
		graticules.datum(graticule());
		
		
		if (scope.plotShape == viz.SHAPE_CIRCLE) {
			scope.plotScale.range([2, size.measuredWidth / 20])
		}
		else if (scope.plotShape == viz.SHAPE_BAR) {
			scope.plotScale.range([size.width / 2 * scale, (size.width / 2 * scale) * 1.25 ])
		}
		
		scope.size = size;
		
		// Tell everyone we are done making our measurements
		scope.dispatch.apply('measured', viz);
		
	}
	
	// The update function is the primary function that is called when we want to render the visualiation based on
	// all of its set properties.  A developer can change propertys of the components and it will not show on the screen
	// until the update function is called
	function update() {
		
		// Call measure each time before we update to make sure all our our layout properties are set correctly
		measure();
		
		// Layout all of our primary SVG d3.elements.
		svg.attr("width", size.measuredWidth).attr("height", size.measuredHeight);
		background.attr("width", size.measuredWidth).attr("height", size.measuredHeight);
		plot.attr('transform', 'translate(' + size.left + ',' + size.top + ')')
		
		ocean.attr("cx", size.width / 2).attr("cy", size.height / 2)
		 .attr("r", projection.scale())
		
		globeShading.attr("cx", size.width / 2).attr("cy", size.height / 2)
		 .attr("r", projection.scale())
		
		globeHighlight.attr("cx", size.width / 2).attr("cy", size.height / 2)
		 .attr("r", projection.scale())
		
		shadow.attr("cx", size.width / 2 * .95).attr("cy", size.height / 2 * 1.05)
		 .attr("rx", projection.scale())
		 .attr("ry", projection.scale())
		
		graticules.attr('d', worldPath)
		 .style('pointer-events','none')
		 .style('fill','none')
		
		worldObjects.attr("d", worldPath);
		
		var featureGroups = featureGroup.selectAll(".vz-feature-layer").data(featureLayers);
		featureGroups = featureGroups.enter().append('g').attr('class', 'vz-feature-layer').merge(featureGroups)
		featureGroups.exit().remove();
		
		featureGroups.each(function (featureLayer) {
			var features = d3.select(this).selectAll(".vz-feature").data(featureLayer.features)
			features.exit().remove();
			features = features.enter()
			 .append('path')
			 .attr('class', 'vz-feature')
			 .on('mouseover', function (d, i) {
				 scope.dispatch.apply('feature_mouseover', viz, [this, d, i])
			 })
			 .on('mouseout', function (d, i) {
				 scope.dispatch.apply('feature_mouseout', viz, [this, d, i])
			 })
			 .on('click', function (d, i) {
				 scope.dispatch.apply('feature_click', viz, [this, d, i])
			 })
			 .merge(features);
			
			features.attr('d', worldPath)
		})
		
		
		if (scope.plotShape == viz.SHAPE_CIRCLE) {
			updateCirclePlots();
		}
		else if (scope.plotShape == viz.SHAPE_BAR) {
			updateBarPlots();
		}
		else if (scope.plotShape == viz.SHAPE_ARC) {
			// updateArcPlots();
		}
		
		scope.dispatch.apply('updated', viz);
		
	}
	
	/*
	function updateArcPlots() {
		
		mockProjection.scale((size.width / 2 * scale) * 1.25)
		
		var plots = dataPlot.selectAll('.vz-data-plot-arc').data(scope.data)
		
		plots.exit().remove();
		
		plots = plots.enter()
		 .append('path').attr('class', 'vz-data-plot-arc')
		 .on('mouseover', function (d, i) {
			 scope.dispatch.apply('mouseover', viz, [this, d, i])
		 })
		 .on('mouseout', function (d, i) {
			 scope.dispatch.apply('mouseout', viz, [this, d, i])
		 })
		 .on('click', function (d, i) {
			 scope.dispatch.apply('click', viz, [this, d, i])
		 })
		 .merge(plots);
		
		
		plots
		 .attr("d", function(d) { return swoosh(flying_arc(d)) })
		 .style("stroke","#0000FF")
		 .style("fill",'none')
		 .style("display", function (d) {
			 var sourceDistance = d3.geoDistance(scope.sourceCoordinates(d), centerCoord);
			 var targetDistance = d3.geoDistance(scope.targetCoordinates(d), centerCoord);
			 return (sourceDistance > 1.57 || targetDistance > 1.57) ? 'none' : 'inline';
		 })
		
	}
	
	var swoosh = d3.line()
	 .x(function(d) { return d[0] })
	 .y(function(d) { return d[1] })
	 .curve(d3.curveBasis)
	
	function location_along_arc(start, end, loc) {
		var interpolator = d3.geoInterpolate(start,end);
		return interpolator(loc)
	}
	
	function flying_arc(d) {
		var source =  scope.sourceCoordinates(d),
		 target = scope.targetCoordinates(d)
		
		var mid = location_along_arc(source, target, .5);
		var result = [ projection(source),
			mockProjection(mid),
			projection(target) ]
		return result;
	}
	*/
	
	function updateBarPlots() {
		var plots = dataPlot.selectAll('.vz-data-plot').data(scope.data)
		
		plots.exit().remove();
		
		plots = plots.enter()
		 .append('line').attr('class', 'vz-data-plot vz-bar-plot')
		 .on('mouseover', function (d, i) {
			 scope.dispatch.apply('mouseover', viz, [this, d, i])
		 })
		 .on('mouseout', function (d, i) {
			 scope.dispatch.apply('mouseout', viz, [this, d, i])
		 })
		 .on('click', function (d, i) {
			 scope.dispatch.apply('click', viz, [this, d, i])
		 })
		 .merge(plots);
		
		plots.filter(function (d) {
			 var location = scope.sourceCoordinates(d);
			 if (location) {
				 var point = projection(location);
				 d.x = point[0];
				 d.y = point[1];
				 
				 var mockScale = scope.plotScale(scope.plotValue(d));
				 mockProjection.scale(mockScale)
				 var point2 = mockProjection(location)
				 d.x1 = point2[0];
				 d.y1 = point2[1];
				 
				 d.vzLocation = location;
			 }
			 return location;
		 })
		 .attr("x1",function (d) { return d.x; })
		 .attr("y1",function (d) { return d.y; })
		 .attr("x2",function (d) { return d.x1; })
		 .attr("y2",function (d) { return d.y1; })
		 .style("stroke-linecap", "round")
		 .style("display", function (d) {
			 var d = d3.geoDistance(d.vzLocation, centerCoord);
			 return (d > 1.57) ? 'none' : 'inline';
		 })
		
	}
	
	function updateCirclePlots() {
		
		var plots = dataPlot.selectAll('.vz-data-plot').data(scope.data)
		
		plots.exit().remove();
		
		plots = plots.enter()
		 .append('circle').attr('class', 'vz-data-plot vz-circle-plot')
		 .attr('r', 5)
		 .on('mouseover', function (d, i) {
			 scope.dispatch.apply('mouseover', viz, [this, d, i])
		 })
		 .on('mouseout', function (d, i) {
			 scope.dispatch.apply('mouseout', viz, [this, d, i])
		 })
		 .on('click', function (d, i) {
			 scope.dispatch.apply('click', viz, [this, d, i])
		 })
		 .merge(plots);
		
		plots.filter(function (d) {
			 var location = scope.sourceCoordinates(d);
			 if (location) {
				 var point = projection(location);
				 d.x = point[0]
				 d.y = point[1]
				 d.vzLocation = location;
			 }
			 return location;
		 })
		 .attr('r', function (d) {
			 return Math.round(scope.plotScale(scope.plotValue(d)))
		 })
		 .attr('cx', function (d) {
			 return Math.round(d.x)
		 })
		 .attr('cy', function (d) {
			 return Math.round(d.y)
		 })
		 .style('fill', '#000')
		 .style("display", function (d) {
			 var d = d3.geoDistance(d.vzLocation, centerCoord);
			 return (d > 1.57) ? 'none' : 'inline';
		 })
		
		
	}
	
	
	function onMouseDown() {
		m0 = [d3.event.pageX, d3.event.pageY];
		o0 = projection.rotate();
		d3.event.preventDefault();
	}
	
	function onMouseMove() {
		if (m0) {
			var m1 = [d3.event.pageX, d3.event.pageY]
			 , o1 = [o0[0] + (m1[0] - m0[0]) / 6, o0[1] + (m0[1] - m1[1]) / 6];
			o1[1] = o1[1] > 30 ? 30 :
			 o1[1] < -30 ? -30 :
				o1[1];
			projection.rotate(o1);
			mockProjection.rotate(o1);
			//	console.log('rotation = ' + o1 + ' scale = ' + projection.scale())
			//sky.rotate(o1);
			update();
		}
	}
	
	function onMouseUp() {
		if (m0) {
			onMouseMove();
			m0 = null;
		}
	}
	
	function onZoom() {
		scale = d3.event.transform.k;
		console.log('scale = ' + scale);
		update();
	}
	
	/**
	 *  Triggers the render pipeline process to refresh the component on the screen.
	 *  @method vizuly2.viz.GeoPlot.update
	 */
	viz.update = function () {
		update();
		return viz;
	};
	
	viz.getCountryFeature = function (countryCode) {
		
		var country = getCountry(countryCode);
		
		function getCountry(alpha2) {
			var ret;
			for (var i = 0; i < vizuly2.assets.world110m.objects.countries.geometries.length; i++) {
				var geo = vizuly2.assets.world110m.objects.countries.geometries[i];
				if (geo.properties.alpha_2 === alpha2) {
					ret = geo;
					break;
				}
			}
			return ret;
		}
		
		return country;
		
	}
	
	viz.scale = function (_) {
		if (arguments.length < 1) {
			return scale;
		}
		scale = _;
		
		if (scope.initialized === true) {
			//Disable zoom event so we can reset transform
			var t = d3.zoomIdentity.translate(0, 0).scale(scale)
			zoom.on('zoom', null);
			plot.call(zoom.transform, t);
			zoom.on('zoom', onZoom);
		}
		return viz;
	}
	
	viz.rotation = function (_) {
		if (arguments.length < 1) {
			return projection.rotate();
		}
		projection.rotate(_);
		mockProjection.rotate(_);
		return viz;
	}
	
	viz.getCountryCentroid = function (countryCode) {
		
		var countryGeo = getCountry(countryCode);
		var centroid;
		if (countryGeo) {
			centroid = worldPath.centroid(topojson.feature(vizuly2.assets.world110m, countryGeo));
		}
		
		function getCountry(alpha2) {
			var ret;
			for (var i = 0; i < vizuly2.assets.world110m.objects.countries.geometries.length; i++) {
				var geo = vizuly2.assets.world110m.objects.countries.geometries[i];
				if (geo.properties.alpha_2 === alpha2) {
					ret = geo;
					break;
				}
			}
			return ret;
		}
		
		if (!centroid) {
			console.log("couldnt find centroid for " + countryCode)
		}
		return centroid;
	}
	
	viz.SHAPE_CIRCLE = "CIRCLE";
	viz.SHAPE_BAR = "BAR";
	viz.SHAPE_ARC = "ARC";
	
	// skins and styles
	var styleCallbacks = [
		{on: 'updated.styles', callback: applyStyles},
		{on: 'feature_mouseover.styles', callback: styles_featureOnMouseOver},
		{on: 'feature_mouseout.styles', callback: styles_featureOnMouseOut},
		{on: 'mouseover.styles', callback: styles_onMouseOver},
		{on: 'mouseout.styles', callback: styles_onMouseOut}
	];
	
	viz.applyCallbacks(styleCallbacks);
	
	
	function applyStyles() {
		
		// If we don't have a styles we want to exit - as there is nothing we can do.
		if (!scope.styles || scope.styles == null) return;
		
		var selection = scope.selection;
		
		var styles_backgroundGradient = vizuly2.svg.gradient.blend(viz, viz.getStyle('background-color-bottom'), viz.getStyle('background-color-top'));
		
		// Update the background
		selection.selectAll(".vz-background").style("fill", function () {
			 return "url(#" + styles_backgroundGradient.attr("id") + ")";
		 })
		 .style('opacity',viz.getStyle('background-opacity'));
		
		worldObjects.style('fill', function (d) {
			return viz.getStyle('land-color', arguments)
		})
		
		ocean.style('stroke', function (d) {
			 return viz.getStyle('globe-stroke',  arguments)
		 })
		 .style('stroke-opacity', function (d) {
			 return viz.getStyle('globe-stroke-opacity',  arguments)
		 })
		
		shadowFilter.selectAll('stop').attr('stop-color', function (d, i) {
			return viz.getStyle('shadow-colors', arguments)[i]
		})
		
		graticules
		 .style('stroke', function (d,i) { return viz.getStyle('graticule-stroke', arguments) })
		 .style('stroke-width', function (d,i) { return viz.getStyle('graticule-stroke-width', arguments) })
		 .style('stroke-opacity', function (d,i) { return viz.getStyle('graticule-stroke-opacity', arguments) })
		
		var shadowSpread = viz.getStyle('shadow-spread', viz)
		shadow.attr("rx", projection.scale() * shadowSpread)
		 .attr("ry", projection.scale() * shadowSpread)
		
		oceanFilter.selectAll('stop').attr('stop-color', function (d, i) {
			return viz.getStyle('ocean-colors', arguments)[i]
		})
		
		globeShadingFilter.selectAll('stop').attr('stop-color', function (d, i) {
			return viz.getStyle('shading-colors', arguments)[i]
		})
		
		globeShading.style('opacity', function (d) {
			return viz.getStyle('shading-opacity', arguments)
		})
		
		globeHighlightFilter.selectAll('stop').attr('stop-color', function (d, i) {
			return viz.getStyle('highlight-colors', arguments)[i]
		})
		
		featureGroup.selectAll('.vz-feature')
		 .style('stroke', function (d, i) {
			 return viz.getStyle('feature-stroke', arguments)
		 })
		 .style('stroke-opacity', function (d, i) {
			 return viz.getStyle('feature-stroke-opacity', arguments)
		 })
		 .style('fill', function (d, i) {
			 return viz.getStyle('feature-fill', arguments)
		 })
		 .style('fill-opacity', function (d, i) {
			 return viz.getStyle('feature-fill-opacity', arguments)
		 })
		
		dataPlot.selectAll('.vz-data-plot')
		 .style('fill', function (d, i) {
			 return viz.getStyle('plot-fill', arguments)
		 })
		 .style('fill-opacity', function (d, i) {
			 return viz.getStyle('plot-fill-opacity', arguments)
		 })
		 .style('stroke', function (d, i) {
			 return viz.getStyle('plot-stroke', arguments)
		 })
		 .style('stroke-width', function (d, i) {
			 return viz.getStyle('plot-stroke-width', arguments) + 'px'
		 })
		 .style('stroke-opacity', function (d, i) {
			 return viz.getStyle('plot-stroke-opacity', arguments)
		 })
		
		dataPlot.selectAll('.vz-data-plot-arc')
		 .style('fill', 'none')
		 .style('stroke', function (d, i) {
			 return viz.getStyle('plot-arc-stroke', arguments)
		 })
		 .style('stroke-width', function (d, i) {
			 return viz.getStyle('plot-arc-stroke-width', arguments) + 'px'
		 })
		 .style('stroke-opacity', function (d, i) {
			 return viz.getStyle('plot-arc-stroke-opacity', arguments)
		 })
		
	}
	
	function styles_featureOnMouseOver(e, d, i) {
		d3.select(e)
		 .style('fill', function (d, i) {
			 return viz.getStyle('feature-fill-over', arguments)
		 })
		 .style('fill-opacity', function (d, i) {
			 return viz.getStyle('feature-fill-opacity-over', arguments)
		 })
	}
	
	function styles_featureOnMouseOut(e, d, i) {
		scope.selection.selectAll('.vz-feature')
		 .style('fill', function (d, i) {
			 return viz.getStyle('feature-fill', arguments)
		 })
		 .style('fill-opacity', function (d, i) {
			 return viz.getStyle('feature-fill-opacity', arguments)
		 })
	}
	
	function styles_onMouseOver(e, d, i) {
		
		viz.removeDataTip();
		viz.showDataTip(e, d, i);
		
		d3.select(e)
		 .style('fill', function (d, i) {
			 return viz.getStyle('plot-fill-over', arguments)
		 })
		 .style('fill-opacity', function (d, i) {
			 return viz.getStyle('plot-fill-opacity-over', arguments)
		 })
		 .style('stroke', function (d, i) {
			 return viz.getStyle('plot-stroke-over', arguments)
		 })
		 .style('stroke-width', function (d, i) {
			 return viz.getStyle('plot-stroke-width-over', arguments)
		 })
		 .style('stroke-opacity', function (d, i) {
			 return viz.getStyle('plot-stroke-opacity-over', arguments)
		 })
		
	}
	
	function styles_onMouseOut(e, d, i) {
		viz.removeDataTip();
		scope.selection.selectAll('.vz-data-plot')
		 .style('fill', function (d, i) {
			 return viz.getStyle('plot-fill', arguments)
		 })
		 .style('fill-opacity', function (d, i) {
			 return viz.getStyle('plot-fill-opacity', arguments)
		 })
		 .style('stroke', function (d, i) {
			 return viz.getStyle('plot-stroke', arguments)
		 })
		 .style('stroke-width', function (d, i) {
			 return viz.getStyle('plot-stroke-width', arguments)
		 })
		 .style('stroke-opacity', function (d, i) {
			 return viz.getStyle('plot-stroke-opacity', arguments)
		 })
	}
	
	function dataTipRenderer(tip, e, d, i, j, x, y) {
		
		var html = '<div class="vz-tip-header1">HEADER1</div>' +
		 '<div class="vz-tip-header-rule"></div>' +
		 '<div class="vz-tip-header2"> HEADER2 </div>';
		
		var h1 = scope.plotLabel(d);
		var h2 = scope.plotValue(d);
		
		html = html.replace("HEADER1", h1);
		html = html.replace("HEADER2", h2);
		
		y = d3.select(e).node().getBoundingClientRect().top + window.pageYOffset;
		
		tip.style('height',null).html(html).style('display','block');
		
		return [(Number(x) + e.getBoundingClientRect().width)+10,y-10]
		
	}
	
	return viz;
}

//TOPOJSON LIBRARY: https://github.com/topojson
function TopoJson() {
	
	var n = {};
	
	function t(n) {
		if (!n)return h;
		var t, r, e = n.scale[0], o = n.scale[1], i = n.translate[0], u = n.translate[1];
		return function (n, f) {
			f || (t = r = 0), n[0] = (t += n[0]) * e + i, n[1] = (r += n[1]) * o + u
		}
	}
	
	function r(n) {
		if (!n)return h;
		var t, r, e = n.scale[0], o = n.scale[1], i = n.translate[0], u = n.translate[1];
		return function (n, f) {
			f || (t = r = 0);
			var c = Math.round((n[0] - i) / e), a = Math.round((n[1] - u) / o);
			n[0] = c - t, n[1] = a - r, t = c, r = a
		}
	}
	
	function e(n, t) {
		for (var r, e = n.length, o = e - t; o < --e;)r = n[o], n[o++] = n[e], n[e] = r
	}
	
	function o(n, t) {
		for (var r = 0, e = n.length; r < e;) {
			var o = r + e >>> 1;
			n[o] < t ? r = o + 1 : e = o
		}
		return r
	}
	
	function i(n, t) {
		var r = {type: "Feature", id: t.id, properties: t.properties || {}, geometry: u(n, t)};
		return null == t.id && delete r.id, r
	}
	
	function u(n, r) {
		function o(n, t) {
			t.length && t.pop();
			for (var r, o = l[n < 0 ? ~n : n], i = 0, u = o.length; i < u; ++i)t.push(r = o[i].slice()), s(r, i);
			n < 0 && e(t, u)
		}
		
		function i(n) {
			return n = n.slice(), s(n, 0), n
		}
		
		function u(n) {
			for (var t = [], r = 0, e = n.length; r < e; ++r)o(n[r], t);
			return t.length < 2 && t.push(t[0].slice()), t
		}
		
		function f(n) {
			for (var t = u(n); t.length < 4;)t.push(t[0].slice());
			return t
		}
		
		function c(n) {
			return n.map(f)
		}
		
		function a(n) {
			var t = n.type;
			return "GeometryCollection" === t ? {type: t, geometries: n.geometries.map(a)} : t in h ? {
				type: t,
				coordinates: h[t](n)
			} : null
		}
		
		var s = t(n.transform), l = n.arcs, h = {
			Point: function (n) {
				return i(n.coordinates)
			}, MultiPoint: function (n) {
				return n.coordinates.map(i)
			}, LineString: function (n) {
				return u(n.arcs)
			}, MultiLineString: function (n) {
				return n.arcs.map(u)
			}, Polygon: function (n) {
				return c(n.arcs)
			}, MultiPolygon: function (n) {
				return n.arcs.map(c)
			}
		};
		return a(r)
	}
	
	function f(n, t, r) {
		function e(n) {
			var t = n < 0 ? ~n : n;
			(a[t] || (a[t] = [])).push({i: n, g: c})
		}
		
		function o(n) {
			n.forEach(e)
		}
		
		function i(n) {
			n.forEach(o)
		}
		
		function u(n) {
			"GeometryCollection" === n.type ? n.geometries.forEach(u) : n.type in s && (c = n, s[n.type](n.arcs))
		}
		
		var f = [];
		if (arguments.length > 1) {
			var c, a = [], s = {
				LineString: o, MultiLineString: i, Polygon: i, MultiPolygon: function (n) {
					n.forEach(i)
				}
			};
			u(t), a.forEach(arguments.length < 3 ? function (n) {
				f.push(n[0].i)
			} : function (n) {
				r(n[0].g, n[n.length - 1].g) && f.push(n[0].i)
			})
		} else for (var l = 0, h = n.arcs.length; l < h; ++l)f.push(l);
		return {type: "MultiLineString", arcs: v(n, f)}
	}
	
	function c(n) {
		var t = n[0], r = n[1], e = n[2];
		return Math.abs((t[0] - e[0]) * (r[1] - t[1]) - (t[0] - r[0]) * (e[1] - t[1]))
	}
	
	function a(n) {
		for (var t, r = -1, e = n.length, o = n[e - 1], i = 0; ++r < e;)t = o, o = n[r], i += t[0] * o[1] - t[1] * o[0];
		return i / 2
	}
	
	function s(n, t) {
		function r(n) {
			n.forEach(function (t) {
				t.forEach(function (t) {
					(o[t = t < 0 ? ~t : t] || (o[t] = [])).push(n)
				})
			}), i.push(n)
		}
		
		function e(t) {
			return Math.abs(a(u(n, {type: "Polygon", arcs: [t]}).coordinates[0]))
		}
		
		var o = {}, i = [], f = [];
		return t.forEach(function (n) {
			"Polygon" === n.type ? r(n.arcs) : "MultiPolygon" === n.type && n.arcs.forEach(r)
		}), i.forEach(function (n) {
			if (!n._) {
				var t = [], r = [n];
				for (n._ = 1, f.push(t); n = r.pop();)t.push(n), n.forEach(function (n) {
					n.forEach(function (n) {
						o[n < 0 ? ~n : n].forEach(function (n) {
							n._ || (n._ = 1, r.push(n))
						})
					})
				})
			}
		}), i.forEach(function (n) {
			delete n._
		}), {
			type: "MultiPolygon", arcs: f.map(function (t) {
				var r, i = [];
				if (t.forEach(function (n) {
					n.forEach(function (n) {
						n.forEach(function (n) {
							o[n < 0 ? ~n : n].length < 2 && i.push(n)
						})
					})
				}), i = v(n, i), (r = i.length) > 1)for (var u, f, c = 1, a = e(i[0]); c < r; ++c)(u = e(i[c])) > a && (f = i[0], i[0] = i[c], i[c] = f, a = u);
				return i
			})
		}
	}
	
	function l(n, t) {
		return n[1][2] - t[1][2]
	}
	
	var h = function () {
	}, p = function (n, t) {
		return "GeometryCollection" === t.type ? {
			type: "FeatureCollection", features: t.geometries.map(function (t) {
				return i(n, t)
			})
		} : i(n, t)
	}, v = function (n, t) {
		function r(t) {
			var r, e = n.arcs[t < 0 ? ~t : t], o = e[0];
			return n.transform ? (r = [0, 0], e.forEach(function (n) {
				r[0] += n[0], r[1] += n[1]
			})) : r = e[e.length - 1], t < 0 ? [r, o] : [o, r]
		}
		
		function e(n, t) {
			for (var r in n) {
				var e = n[r];
				delete t[e.start], delete e.start, delete e.end, e.forEach(function (n) {
					o[n < 0 ? ~n : n] = 1
				}), f.push(e)
			}
		}
		
		var o = {}, i = {}, u = {}, f = [], c = -1;
		return t.forEach(function (r, e) {
			var o, i = n.arcs[r < 0 ? ~r : r];
			i.length < 3 && !i[1][0] && !i[1][1] && (o = t[++c], t[c] = r, t[e] = o)
		}), t.forEach(function (n) {
			var t, e, o = r(n), f = o[0], c = o[1];
			if (t = u[f])if (delete u[t.end], t.push(n), t.end = c, e = i[c]) {
				delete i[e.start];
				var a = e === t ? t : t.concat(e);
				i[a.start = t.start] = u[a.end = e.end] = a
			} else i[t.start] = u[t.end] = t; else if (t = i[c])if (delete i[t.start], t.unshift(n), t.start = f, e = u[f]) {
				delete u[e.end];
				var s = e === t ? t : e.concat(t);
				i[s.start = e.start] = u[s.end = t.end] = s
			} else i[t.start] = u[t.end] = t; else t = [n], i[t.start = f] = u[t.end = c] = t
		}), e(u, i), e(i, u), t.forEach(function (n) {
			o[n < 0 ? ~n : n] || f.push([n])
		}), f
	}, g = function (n) {
		return u(n, f.apply(this, arguments))
	}, d = function (n) {
		return u(n, s.apply(this, arguments))
	}, y = function (n) {
		function t(n, t) {
			n.forEach(function (n) {
				n < 0 && (n = ~n);
				var r = i[n];
				r ? r.push(t) : i[n] = [t]
			})
		}
		
		function r(n, r) {
			n.forEach(function (n) {
				t(n, r)
			})
		}
		
		function e(n, t) {
			"GeometryCollection" === n.type ? n.geometries.forEach(function (n) {
				e(n, t)
			}) : n.type in f && f[n.type](n.arcs, t)
		}
		
		var i = {}, u = n.map(function () {
			return []
		}), f = {
			LineString: t, MultiLineString: r, Polygon: r, MultiPolygon: function (n, t) {
				n.forEach(function (n) {
					r(n, t)
				})
			}
		};
		n.forEach(e);
		for (var c in i)for (var a = i[c], s = a.length, l = 0; l < s; ++l)for (var h = l + 1; h < s; ++h) {
			var p, v = a[l], g = a[h];
			(p = u[v])[c = o(p, g)] !== g && p.splice(c, 0, g), (p = u[g])[c = o(p, v)] !== v && p.splice(c, 0, v)
		}
		return u
	}, m = function () {
		function n(n, t) {
			for (; t > 0;) {
				var r = (t + 1 >> 1) - 1, o = e[r];
				if (l(n, o) >= 0)break;
				e[o._ = t] = o, e[n._ = t = r] = n
			}
		}
		
		function t(n, t) {
			for (; ;) {
				var r = t + 1 << 1, i = r - 1, u = t, f = e[u];
				if (i < o && l(e[i], f) < 0 && (f = e[u = i]), r < o && l(e[r], f) < 0 && (f = e[u = r]), u === t)break;
				e[f._ = t] = f, e[n._ = t = u] = n
			}
		}
		
		var r = {}, e = [], o = 0;
		return r.push = function (t) {
			return n(e[t._ = o] = t, o++), o
		}, r.pop = function () {
			if (!(o <= 0)) {
				var n, r = e[0];
				return --o > 0 && (n = e[o], t(e[n._ = 0] = n, 0)), r
			}
		}, r.remove = function (r) {
			var i, u = r._;
			if (e[u] === r)return u !== --o && (i = e[o], (l(i, r) < 0 ? n : t)(e[i._ = u] = i, u)), u
		}, r
	}, E = function (n, e) {
		function o(n) {
			f.remove(n), n[1][2] = e(n), f.push(n)
		}
		
		var i = t(n.transform), u = r(n.transform), f = m();
		return null == e && (e = c), n.arcs.forEach(function (n) {
			var t, r, c, a, s = [], l = 0;
			for (r = 0, c = n.length; r < c; ++r)a = n[r], i(n[r] = [a[0], a[1], 1 / 0], r);
			for (r = 1, c = n.length - 1; r < c; ++r)t = n.slice(r - 1, r + 2), t[1][2] = e(t), s.push(t), f.push(t);
			for (r = 0, c = s.length; r < c; ++r)t = s[r], t.previous = s[r - 1], t.next = s[r + 1];
			for (; t = f.pop();) {
				var h = t.previous, p = t.next;
				t[1][2] < l ? t[1][2] = l : l = t[1][2], h && (h.next = p, h[2] = t[2], o(h)), p && (p.previous = h, p[0] = t[0], o(p))
			}
			n.forEach(u)
		}), n
	};
	n.mesh = g, n.meshArcs = f, n.merge = d, n.mergeArcs = s, n.feature = p, n.neighbors = y, n.presimplify = E, Object.defineProperty(n, "__esModule", {value: !0})
	return n;
};

//WORLD GeoJSON, Continents and Countries.
vizuly2.assets.world110m = {
	"type": "Topology",
	"transform": {"scale": [0.03600360036003601, 0.017366249624962495], "translate": [-180, -90]},
	"objects": {
		"land": {
			"type": "MultiPolygon",
			"arcs": [[[0]], [[1]], [[2]], [[3]], [[4]], [[5]], [[6]], [[7, 8]], [[9, 10]], [[11]], [[12]], [[13]], [[14]], [[15]], [[16]], [[17]], [[18]], [[19]], [[20]], [[21]], [[22]], [[23]], [[24]], [[25]], [[26]], [[27]], [[28, 29]], [[30]], [[31]], [[32]], [[33]], [[34]], [[35]], [[36]], [[37]], [[38]], [[39]], [[40]], [[41, 42]], [[43]], [[44]], [[45]], [[46, 47, 48, 49]], [[50]], [[51]], [[52]], [[53]], [[54]], [[55]], [[56]], [[57]], [[58]], [[59]], [[60]], [[61, 62]], [[63]], [[64]], [[65]], [[66]], [[67]], [[68]], [[69]], [[70]], [[71]], [[72]], [[73]], [[74]], [[75, 76]], [[77]], [[78]], [[79]], [[80]], [[81]], [[82]], [[83]], [[84]], [[85]], [[86]], [[87]], [[88]], [[89, 90]], [[91]], [[92]], [[93]], [[94]], [[95]], [[96]], [[97]], [[98]], [[99]], [[100]], [[101]], [[102]], [[103]], [[104]], [[105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152]], [[153, 154]], [[155]], [[156]], [[157]], [[158]], [[159]], [[160]], [[161, 162, 163, 164]], [[165]], [[166]], [[167]], [[168]], [[169]], [[170]], [[171]], [[172]], [[173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277], [278, 279, 280, 281, 282]], [[283]], [[284]], [[285]], [[286]], [[287]], [[288]], [[289]], [[290]], [[291]], [[292]], [[293]], [[294]], [[295]], [[296]]]
		},
		"countries": {
			"type": "GeometryCollection",
			"geometries": [{
				"type": "Polygon",
				"id": -3,
				"arcs": [[-483, -462, 204, 654]],
				"properties": {"name": "Somaliland"}
			}, {
				"type": "Polygon",
				"id": -2,
				"arcs": [[-311, 571, 572, 573]],
				"properties": {"name": "Kosovo"}
			}, {
				"type": "Polygon",
				"id": -1,
				"arcs": [[452, 76]],
				"properties": {"name": "Northern Cyprus"}
			}, {
				"type": "Polygon",
				"id": 4,
				"arcs": [[297, 298, 299, 300, 301, 302]],
				"properties": {"name": "Afghanistan", "code": "004", "alpha": "AFG", "alpha_2": "AF", "alpha_3": "AFG"}
			}, {
				"type": "Polygon",
				"id": 8,
				"arcs": [[308, 248, 309, 310, 311]],
				"properties": {"name": "Albania", "code": "008", "alpha": "ALB", "alpha_2": "AL", "alpha_3": "ALB"}
			}, {
				"type": "MultiPolygon",
				"id": 10,
				"arcs": [[[0]], [[1]], [[2]], [[3]], [[4]], [[5]], [[6]], [[326]]],
				"properties": {"name": "Antarctica", "code": "010", "alpha": "ATA", "alpha_2": "AQ", "alpha_3": "ATA"}
			}, {
				"type": "Polygon",
				"id": 12,
				"arcs": [[465, 466, 467, 468, 233, 469, 470, 471]],
				"properties": {"name": "Algeria", "code": "012", "alpha": "DZA", "alpha_2": "DZ", "alpha_3": "DZA"}
			}, {
				"type": "MultiPolygon",
				"id": 24,
				"arcs": [[[303, 304, 211, 305]], [[213, 306, 307]]],
				"properties": {"name": "Angola", "code": "024", "alpha": "AGO", "alpha_2": "AO", "alpha_3": "AGO"}
			}, {
				"type": "MultiPolygon",
				"id": 31,
				"arcs": [[[335, -323]], [[282, 336, -326, 337, 338]]],
				"properties": {"name": "Azerbaijan", "code": "031", "alpha": "AZE", "alpha_2": "AZ", "alpha_3": "AZE"}
			}, {
				"type": "MultiPolygon",
				"id": 32,
				"arcs": [[[315, 10]], [[316, 317, 318, 131, 319, 320]]],
				"properties": {"name": "Argentina", "code": "032", "alpha": "ARG", "alpha_2": "AR", "alpha_3": "ARG"}
			}, {
				"type": "MultiPolygon",
				"id": 36,
				"arcs": [[[13]], [[23]]],
				"properties": {"name": "Australia", "code": "036", "alpha": "AUS", "alpha_2": "AU", "alpha_3": "AUS"}
			}, {
				"type": "Polygon",
				"id": 40,
				"arcs": [[328, 329, 330, 331, 332, 333, 334]],
				"properties": {"name": "Austria", "code": "040", "alpha": "AUT", "alpha_2": "AT", "alpha_3": "AUT"}
			}, {
				"type": "MultiPolygon",
				"id": 44,
				"arcs": [[[70]], [[72]], [[73]]],
				"properties": {"name": "Bahamas", "code": "044", "alpha": "BHS", "alpha_2": "BS", "alpha_3": "BHS"}
			}, {
				"type": "Polygon",
				"id": 50,
				"arcs": [[184, 355, 356]],
				"properties": {"name": "Bangladesh", "code": "050", "alpha": "BGD", "alpha_2": "BD", "alpha_3": "BGD"}
			}, {
				"type": "Polygon",
				"id": 51,
				"arcs": [[321, 322, 323, 324, 325]],
				"properties": {"name": "Armenia", "code": "051", "alpha": "ARM", "alpha_2": "AM", "alpha_3": "ARM"}
			}, {
				"type": "Polygon",
				"id": 56,
				"arcs": [[342, 343, 344, 258, 345]],
				"properties": {"name": "Belgium", "code": "056", "alpha": "BEL", "alpha_2": "BE", "alpha_3": "BEL"}
			}, {
				"type": "Polygon",
				"id": 64,
				"arcs": [[385, 386]],
				"properties": {"name": "Bhutan", "code": "064", "alpha": "BTN", "alpha_2": "BT", "alpha_3": "BTN"}
			}, {
				"type": "Polygon",
				"id": 68,
				"arcs": [[372, 373, 374, 375, -321]],
				"properties": {"name": "Bolivia, Plurinational State of"}
			}, {
				"type": "Polygon",
				"id": 70,
				"arcs": [[362, 363, 364]],
				"properties": {
					"name": "Bosnia and Herzegovina",
					"code": "070",
					"alpha": "BIH",
					"alpha_2": "BA",
					"alpha_3": "BIH"
				}
			}, {
				"type": "Polygon",
				"id": 72,
				"arcs": [[387, 388, 389, 390]],
				"properties": {"name": "Botswana", "code": "072", "alpha": "BWA", "alpha_2": "BW", "alpha_3": "BWA"}
			}, {
				"type": "Polygon",
				"id": 76,
				"arcs": [[376, -375, 377, 378, 379, 380, 381, 382, 129, 383, -318]],
				"properties": {"name": "Brazil", "code": "076", "alpha": "BRA", "alpha_2": "BR", "alpha_3": "BRA"}
			}, {
				"type": "Polygon",
				"id": 84,
				"arcs": [[118, 370, 371]],
				"properties": {"name": "Belize", "code": "084", "alpha": "BLZ", "alpha_2": "BZ", "alpha_3": "BLZ"}
			}, {
				"type": "MultiPolygon",
				"id": 90,
				"arcs": [[[24]], [[26]], [[27]], [[32]], [[33]]],
				"properties": {"name": "Solomon Islands", "code": "090", "alpha": "SLB", "alpha_2": "SB", "alpha_3": "SLB"}
			}, {
				"type": "Polygon",
				"id": 96,
				"arcs": [[384, 47]],
				"properties": {"name": "Brunei Darussalam", "code": "096", "alpha": "BRN", "alpha_2": "BN", "alpha_3": "BRN"}
			}, {
				"type": "Polygon",
				"id": 100,
				"arcs": [[245, 357, 358, 359, 360, 361]],
				"properties": {"name": "Bulgaria", "code": "100", "alpha": "BGR", "alpha_2": "BG", "alpha_3": "BGR"}
			}, {
				"type": "Polygon",
				"id": 104,
				"arcs": [[183, -357, -537, -417, -576, 603]],
				"properties": {"name": "Myanmar", "code": "104", "alpha": "MMR", "alpha_2": "MM", "alpha_3": "MMR"}
			}, {
				"type": "Polygon",
				"id": 108,
				"arcs": [[339, 340, 341]],
				"properties": {"name": "Burundi", "code": "108", "alpha": "BDI", "alpha_2": "BI", "alpha_3": "BDI"}
			}, {
				"type": "Polygon",
				"id": 112,
				"arcs": [[365, 366, 367, 368, 369]],
				"properties": {"name": "Belarus", "code": "112", "alpha": "BLR", "alpha_2": "BY", "alpha_3": "BLR"}
			}, {
				"type": "Polygon",
				"id": 116,
				"arcs": [[567, 568, 569, 179]],
				"properties": {"name": "Cambodia", "code": "116", "alpha": "KHM", "alpha_2": "KH", "alpha_3": "KHM"}
			}, {
				"type": "Polygon",
				"id": 120,
				"arcs": [[432, 217, 433, 434, 435, -397, 436, 437]],
				"properties": {"name": "Cameroon", "code": "120", "alpha": "CMR", "alpha_2": "CM", "alpha_3": "CMR"}
			}, {
				"type": "MultiPolygon",
				"id": 124,
				"arcs": [[[83]], [[84]], [[85]], [[86]], [[398]], [[95]], [[96]], [[98]], [[100]], [[102]], [[399, 146, 400, 148, 401, 150, 402, 152]], [[153, 403]], [[155]], [[156]], [[157]], [[158]], [[160]], [[161, 404, 163, 405]], [[166]], [[168]], [[169]], [[171]], [[172]], [[283]], [[284]], [[286]], [[287]], [[288]], [[294]], [[295]]],
				"properties": {"name": "Canada", "code": "124", "alpha": "CAN", "alpha_2": "CA", "alpha_3": "CAN"}
			}, {
				"type": "Polygon",
				"id": 140,
				"arcs": [[391, 392, 393, 394, 395, 396, 397]],
				"properties": {
					"name": "Central African Republic",
					"code": "140",
					"alpha": "CAF",
					"alpha_2": "CF",
					"alpha_3": "CAF"
				}
			}, {
				"type": "Polygon",
				"id": 144,
				"arcs": [[584]],
				"properties": {"name": "Sri Lanka", "code": "144", "alpha": "LKA", "alpha_2": "LK", "alpha_3": "LKA"}
			}, {
				"type": "Polygon",
				"id": 148,
				"arcs": [[-583, -647, -398, -436, -622]],
				"properties": {"name": "Chad", "code": "148", "alpha": "TCD", "alpha_2": "TD", "alpha_3": "TCD"}
			}, {
				"type": "MultiPolygon",
				"id": 152,
				"arcs": [[[409, 410, 411, -316]], [[-320, 132, 412, -373]]],
				"properties": {"name": "Chile", "code": "152", "alpha": "CHL", "alpha_2": "CL", "alpha_3": "CHL"}
			}, {
				"type": "MultiPolygon",
				"id": 156,
				"arcs": [[[63]], [[413, 177, 414, 415, 416, 417, -386, 418, 419, 420, 421, -300, 422, 423, 424, 425, 426, 427]]],
				"properties": {"name": "China", "code": "156", "alpha": "CHN", "alpha_2": "CN", "alpha_3": "CHN"}
			}, {
				"type": "Polygon",
				"id": 158,
				"arcs": [[663]],
				"properties": {
					"name": "Taiwan, Province of China",
					"code": "158",
					"alpha": "TWN",
					"alpha_2": "TW",
					"alpha_3": "TWN"
				}
			}, {
				"type": "Polygon",
				"id": 170,
				"arcs": [[135, 445, 124, 446, -379, 447, 448]],
				"properties": {"name": "Colombia", "code": "170", "alpha": "COL", "alpha_2": "CO", "alpha_3": "COL"}
			}, {
				"type": "Polygon",
				"id": 178,
				"arcs": [[214, 444, -437, -396, -442, -307]],
				"properties": {"name": "Congo", "code": "178", "alpha": "COG", "alpha_2": "CG", "alpha_3": "COG"}
			}, {
				"type": "Polygon",
				"id": 180,
				"arcs": [[438, -342, 439, 440, -306, 212, -308, 441, -395, 442, 443]],
				"properties": {"name": "Congo, the Democratic Republic of the"}
			}, {
				"type": "Polygon",
				"id": 188,
				"arcs": [[449, 122, 450, 137]],
				"properties": {"name": "Costa Rica", "code": "188", "alpha": "CRI", "alpha_2": "CR", "alpha_3": "CRI"}
			}, {
				"type": "Polygon",
				"id": 191,
				"arcs": [[-364, 523, 250, 524, 525, 526]],
				"properties": {"name": "Croatia", "code": "191", "alpha": "HRV", "alpha_2": "HR", "alpha_3": "HRV"}
			}, {
				"type": "Polygon",
				"id": 192,
				"arcs": [[451]],
				"properties": {"name": "Cuba", "code": "192", "alpha": "CUB", "alpha_2": "CU", "alpha_3": "CUB"}
			}, {
				"type": "Polygon",
				"id": 196,
				"arcs": [[-453, 75]],
				"properties": {"name": "Cyprus", "code": "196", "alpha": "CYP", "alpha_2": "CY", "alpha_3": "CYP"}
			}, {
				"type": "Polygon",
				"id": 203,
				"arcs": [[453, 454, 455, -333]],
				"properties": {"name": "Czech Republic", "code": "203", "alpha": "CZE", "alpha_2": "CZ", "alpha_3": "CZE"}
			}, {
				"type": "Polygon",
				"id": 204,
				"arcs": [[346, 347, 348, 219, 349]],
				"properties": {"name": "Benin", "code": "204", "alpha": "BEN", "alpha_2": "BJ", "alpha_3": "BEN"}
			}, {
				"type": "MultiPolygon",
				"id": 208,
				"arcs": [[[91]], [[-461, 261]]],
				"properties": {"name": "Denmark", "code": "208", "alpha": "DNK", "alpha_2": "DK", "alpha_3": "DNK"}
			}, {
				"type": "Polygon",
				"id": 214,
				"arcs": [[464, 61]],
				"properties": {"name": "Dominican Republic", "code": "214", "alpha": "DOM", "alpha_2": "DO", "alpha_3": "DOM"}
			}, {
				"type": "Polygon",
				"id": 218,
				"arcs": [[-449, 472, 134]],
				"properties": {"name": "Ecuador", "code": "218", "alpha": "ECU", "alpha_2": "EC", "alpha_3": "ECU"}
			}, {
				"type": "Polygon",
				"id": 222,
				"arcs": [[142, -519, -522, 140, 653]],
				"properties": {"name": "El Salvador", "code": "222", "alpha": "SLV", "alpha_2": "SV", "alpha_3": "SLV"}
			}, {
				"type": "Polygon",
				"id": 226,
				"arcs": [[-433, -498, 216]],
				"properties": {"name": "Equatorial Guinea", "code": "226", "alpha": "GNQ", "alpha_2": "GQ", "alpha_3": "GNQ"}
			}, {
				"type": "Polygon",
				"id": 231,
				"arcs": [[-463, 482, 483, 484, 485, 486, 487, -478]],
				"properties": {"name": "Ethiopia", "code": "231", "alpha": "ETH", "alpha_2": "ET", "alpha_3": "ETH"}
			}, {
				"type": "Polygon",
				"id": 232,
				"arcs": [[476, 202, -464, 477]],
				"properties": {"name": "Eritrea", "code": "232", "alpha": "ERI", "alpha_2": "ER", "alpha_3": "ERI"}
			}, {
				"type": "Polygon",
				"id": 233,
				"arcs": [[480, 481, 267]],
				"properties": {"name": "Estonia", "code": "233", "alpha": "EST", "alpha_2": "EE", "alpha_3": "EST"}
			}, {
				"type": "Polygon",
				"id": 238,
				"arcs": [[491]],
				"properties": {
					"name": "Falkland Islands (Malvinas)",
					"code": "238",
					"alpha": "FLK",
					"alpha_2": "FK",
					"alpha_3": "FLK"
				}
			}, {
				"type": "MultiPolygon",
				"id": 242,
				"arcs": [[[17]], [[18]], [[19]]],
				"properties": {"name": "Fiji", "code": "242", "alpha": "FJI", "alpha_2": "FJ", "alpha_3": "FJI"}
			}, {
				"type": "Polygon",
				"id": 246,
				"arcs": [[269, 488, 489, 490]],
				"properties": {"name": "Finland", "code": "246", "alpha": "FIN", "alpha_2": "FI", "alpha_3": "FIN"}
			}, {
				"type": "MultiPolygon",
				"id": 250,
				"arcs": [[[492, 493, 494, 128, -383]], [[81]], [[495, -458, -408, 496, 253, -479, 257, -345]]],
				"properties": {"name": "France", "code": "250", "alpha": "FRA", "alpha_2": "FR", "alpha_3": "FRA"}
			}, {
				"type": "Polygon",
				"id": 260,
				"arcs": [[327]],
				"properties": {
					"name": "French Southern Territories",
					"code": "260",
					"alpha": "ATF",
					"alpha_2": "TF",
					"alpha_3": "ATF"
				}
			}, {
				"type": "Polygon",
				"id": 262,
				"arcs": [[461, 462, 463, 203]],
				"properties": {"name": "Djibouti", "code": "262", "alpha": "DJI", "alpha_2": "DJ", "alpha_3": "DJI"}
			}, {
				"type": "Polygon",
				"id": 266,
				"arcs": [[497, -438, -445, 215]],
				"properties": {"name": "Gabon", "code": "266", "alpha": "GAB", "alpha_2": "GA", "alpha_3": "GAB"}
			}, {
				"type": "Polygon",
				"id": 268,
				"arcs": [[503, -338, -325, 504, 241]],
				"properties": {"name": "Georgia", "code": "268", "alpha": "GEO", "alpha_2": "GE", "alpha_3": "GEO"}
			}, {
				"type": "Polygon",
				"id": 270,
				"arcs": [[228, 511]],
				"properties": {"name": "Gambia", "code": "270", "alpha": "GMB", "alpha_2": "GM", "alpha_3": "GMB"}
			}, {
				"type": "Polygon",
				"id": 275,
				"arcs": [[-552, -556]],
				"properties": {"name": "Palestinian Territory, Occupied"}
			}, {
				"type": "Polygon",
				"id": 276,
				"arcs": [[456, -454, -332, -409, 457, 458, -343, 459, 260, 460, 262]],
				"properties": {"name": "Germany", "code": "276", "alpha": "DEU", "alpha_2": "DE", "alpha_3": "DEU"}
			}, {
				"type": "Polygon",
				"id": 288,
				"arcs": [[-432, -354, 505, 221]],
				"properties": {"name": "Ghana", "code": "288", "alpha": "GHA", "alpha_2": "GH", "alpha_3": "GHA"}
			}, {
				"type": "MultiPolygon",
				"id": 300,
				"arcs": [[[77]], [[247, -309, 513, -359, 514]]],
				"properties": {"name": "Greece", "code": "300", "alpha": "GRC", "alpha_2": "GR", "alpha_3": "GRC"}
			}, {
				"type": "Polygon",
				"id": 304,
				"arcs": [[515]],
				"properties": {"name": "Greenland", "code": "304", "alpha": "GRL", "alpha_2": "GL", "alpha_3": "GRL"}
			}, {
				"type": "Polygon",
				"id": 320,
				"arcs": [[516, -371, 119, 517, 518, 143]],
				"properties": {"name": "Guatemala", "code": "320", "alpha": "GTM", "alpha_2": "GT", "alpha_3": "GTM"}
			}, {
				"type": "Polygon",
				"id": 324,
				"arcs": [[506, 225, 507, 508, 509, -430, 510]],
				"properties": {"name": "Guinea", "code": "324", "alpha": "GIN", "alpha_2": "GN", "alpha_3": "GIN"}
			}, {
				"type": "Polygon",
				"id": 328,
				"arcs": [[519, -381, 520, 126]],
				"properties": {"name": "Guyana", "code": "328", "alpha": "GUY", "alpha_2": "GY", "alpha_3": "GUY"}
			}, {
				"type": "Polygon",
				"id": 332,
				"arcs": [[-465, 62]],
				"properties": {"name": "Haiti", "code": "332", "alpha": "HTI", "alpha_2": "HT", "alpha_3": "HTI"}
			}, {
				"type": "Polygon",
				"id": 340,
				"arcs": [[521, -518, 120, 522, 139]],
				"properties": {"name": "Honduras", "code": "340", "alpha": "HND", "alpha_2": "HN", "alpha_3": "HND"}
			}, {
				"type": "Polygon",
				"id": 348,
				"arcs": [[527, 528, 529, 530, -526, 531, -335]],
				"properties": {"name": "Hungary", "code": "348", "alpha": "HUN", "alpha_2": "HU", "alpha_3": "HUN"}
			}, {
				"type": "Polygon",
				"id": 352,
				"arcs": [[99]],
				"properties": {"name": "Iceland", "code": "352", "alpha": "ISL", "alpha_2": "IS", "alpha_3": "ISL"}
			}, {
				"type": "Polygon",
				"id": 356,
				"arcs": [[535, -419, -387, -418, 536, -356, 185, 537, -421]],
				"properties": {"name": "India", "code": "356", "alpha": "IND", "alpha_2": "IN", "alpha_3": "IND"}
			}, {
				"type": "MultiPolygon",
				"id": 360,
				"arcs": [[[25]], [[532, 29]], [[30]], [[31]], [[34]], [[35]], [[38]], [[39]], [[533, 42]], [[43]], [[44]], [[534, 49]], [[45]]],
				"properties": {"name": "Indonesia", "code": "360", "alpha": "IDN", "alpha_2": "ID", "alpha_3": "IDN"}
			}, {
				"type": "Polygon",
				"id": 364,
				"arcs": [[-302, 538, 187, 539, 540, -336, -322, -337, 278, 541]],
				"properties": {"name": "Iran, Islamic Republic of"}
			}, {
				"type": "Polygon",
				"id": 368,
				"arcs": [[188, 542, 543, 544, 545, 546, -540]],
				"properties": {"name": "Iraq", "code": "368", "alpha": "IRQ", "alpha_2": "IQ", "alpha_3": "IRQ"}
			}, {
				"type": "Polygon",
				"id": 372,
				"arcs": [[-499, 90]],
				"properties": {"name": "Ireland", "code": "372", "alpha": "IRL", "alpha_2": "IE", "alpha_3": "IRL"}
			}, {
				"type": "Polygon",
				"id": 376,
				"arcs": [[547, -476, 237, 548, 549, 550, 551]],
				"properties": {"name": "Israel", "code": "376", "alpha": "ISR", "alpha_2": "IL", "alpha_3": "ISR"}
			}, {
				"type": "MultiPolygon",
				"id": 380,
				"arcs": [[[78]], [[79]], [[552, 252, -497, -407, -330]]],
				"properties": {"name": "Italy", "code": "380", "alpha": "ITA", "alpha_2": "IT", "alpha_3": "ITA"}
			}, {
				"type": "Polygon",
				"id": 384,
				"arcs": [[428, 429, 430, -355, 431, 222]],
				"properties": {"name": "Côte d'Ivoire", "code": "384", "alpha": "CIV", "alpha_2": "CI", "alpha_3": "CIV"}
			}, {
				"type": "Polygon",
				"id": 388,
				"arcs": [[553]],
				"properties": {"name": "Jamaica", "code": "388", "alpha": "JAM", "alpha_2": "JM", "alpha_3": "JAM"}
			}, {
				"type": "MultiPolygon",
				"id": 392,
				"arcs": [[[74]], [[80]], [[82]]],
				"properties": {"name": "Japan", "code": "392", "alpha": "JPN", "alpha_2": "JP", "alpha_3": "JPN"}
			}, {
				"type": "Polygon",
				"id": 398,
				"arcs": [[557, 280, 558, -425, 559, 560]],
				"properties": {"name": "Kazakhstan", "code": "398", "alpha": "KAZ", "alpha_2": "KZ", "alpha_3": "KAZ"}
			}, {
				"type": "Polygon",
				"id": 400,
				"arcs": [[-545, 554, 199, -548, 555, -551, 556]],
				"properties": {"name": "Jordan", "code": "400", "alpha": "JOR", "alpha_2": "JO", "alpha_3": "JOR"}
			}, {
				"type": "Polygon",
				"id": 404,
				"arcs": [[206, 561, 562, 563, -485, 564]],
				"properties": {"name": "Kenya", "code": "404", "alpha": "KEN", "alpha_2": "KE", "alpha_3": "KEN"}
			}, {
				"type": "Polygon",
				"id": 408,
				"arcs": [[-571, 176, -414, 631, 174]],
				"properties": {"name": "Korea, Democratic People's Republic of"}
			}, {
				"type": "Polygon",
				"id": 410,
				"arcs": [[570, 175]],
				"properties": {"name": "Korea, Republic of"}
			}, {
				"type": "Polygon",
				"id": 414,
				"arcs": [[574, -543, 189]],
				"properties": {"name": "Kuwait", "code": "414", "alpha": "KWT", "alpha_2": "KW", "alpha_3": "KWT"}
			}, {
				"type": "Polygon",
				"id": 417,
				"arcs": [[-424, 565, 566, -560]],
				"properties": {"name": "Kyrgyzstan", "code": "417", "alpha": "KGZ", "alpha_2": "KG", "alpha_3": "KGZ"}
			}, {
				"type": "Polygon",
				"id": 418,
				"arcs": [[575, -416, 576, -569, 577]],
				"properties": {
					"name": "Lao People's Democratic Republic",
					"code": "418",
					"alpha": "LAO",
					"alpha_2": "LA",
					"alpha_3": "LAO"
				}
			}, {
				"type": "Polygon",
				"id": 422,
				"arcs": [[238, 578, -549]],
				"properties": {"name": "Lebanon", "code": "422", "alpha": "LBN", "alpha_2": "LB", "alpha_3": "LBN"}
			}, {
				"type": "Polygon",
				"id": 426,
				"arcs": [[585]],
				"properties": {"name": "Lesotho", "code": "426", "alpha": "LSO", "alpha_2": "LS", "alpha_3": "LSO"}
			}, {
				"type": "Polygon",
				"id": 428,
				"arcs": [[-482, 589, -366, -587, 266]],
				"properties": {"name": "Latvia", "code": "428", "alpha": "LVA", "alpha_2": "LV", "alpha_3": "LVA"}
			}, {
				"type": "Polygon",
				"id": 430,
				"arcs": [[579, -511, -429, 223]],
				"properties": {"name": "Liberia", "code": "430", "alpha": "LBR", "alpha_2": "LR", "alpha_3": "LBR"}
			}, {
				"type": "Polygon",
				"id": 434,
				"arcs": [[-471, 580, 235, -475, 581, 582, 583]],
				"properties": {"name": "Libya", "code": "434", "alpha": "LBY", "alpha_2": "LY", "alpha_3": "LBY"}
			}, {
				"type": "Polygon",
				"id": 440,
				"arcs": [[265, 586, -370, 587, 588]],
				"properties": {"name": "Lithuania", "code": "440", "alpha": "LTU", "alpha_2": "LT", "alpha_3": "LTU"}
			}, {
				"type": "Polygon",
				"id": 442,
				"arcs": [[-496, -344, -459]],
				"properties": {"name": "Luxembourg", "code": "442", "alpha": "LUX", "alpha_2": "LU", "alpha_3": "LUX"}
			}, {
				"type": "Polygon",
				"id": 450,
				"arcs": [[596]],
				"properties": {"name": "Madagascar", "code": "450", "alpha": "MDG", "alpha_2": "MG", "alpha_3": "MDG"}
			}, {
				"type": "Polygon",
				"id": 454,
				"arcs": [[615, 616, -612]],
				"properties": {"name": "Malawi", "code": "454", "alpha": "MWI", "alpha_2": "MW", "alpha_3": "MWI"}
			}, {
				"type": "MultiPolygon",
				"id": 458,
				"arcs": [[[181, 617]], [[-535, 46, -385, 48]]],
				"properties": {"name": "Malaysia", "code": "458", "alpha": "MYS", "alpha_2": "MY", "alpha_3": "MYS"}
			}, {
				"type": "Polygon",
				"id": 466,
				"arcs": [[-466, 600, -351, -431, -510, 601, 602]],
				"properties": {"name": "Mali", "code": "466", "alpha": "MLI", "alpha_2": "ML", "alpha_3": "MLI"}
			}, {
				"type": "Polygon",
				"id": 478,
				"arcs": [[230, 613, -467, -603, 614]],
				"properties": {"name": "Mauritania", "code": "478", "alpha": "MRT", "alpha_2": "MR", "alpha_3": "MRT"}
			}, {
				"type": "Polygon",
				"id": 484,
				"arcs": [[-372, -517, 144, 597, 598]],
				"properties": {"name": "Mexico", "code": "484", "alpha": "MEX", "alpha_2": "MX", "alpha_3": "MEX"}
			}, {
				"type": "Polygon",
				"id": 496,
				"arcs": [[-427, 605]],
				"properties": {"name": "Mongolia", "code": "496", "alpha": "MNG", "alpha_2": "MN", "alpha_3": "MNG"}
			}, {
				"type": "Polygon",
				"id": 498,
				"arcs": [[594, 595]],
				"properties": {"name": "Moldova, Republic of"}
			}, {
				"type": "Polygon",
				"id": 499,
				"arcs": [[249, -524, -363, 604, -572, -310]],
				"properties": {"name": "Montenegro", "code": "499", "alpha": "MNE", "alpha_2": "ME", "alpha_3": "MNE"}
			}, {
				"type": "Polygon",
				"id": 504,
				"arcs": [[-469, 590, 591, 592, 593]],
				"properties": {"name": "Morocco", "code": "504", "alpha": "MAR", "alpha_2": "MA", "alpha_3": "MAR"}
			}, {
				"type": "Polygon",
				"id": 508,
				"arcs": [[208, 606, 607, 608, 609, 610, 611, 612]],
				"properties": {"name": "Mozambique", "code": "508", "alpha": "MOZ", "alpha_2": "MZ", "alpha_3": "MOZ"}
			}, {
				"type": "MultiPolygon",
				"id": 512,
				"arcs": [[[625, 626, -314, 196]], [[-313, 194]]],
				"properties": {"name": "Oman", "code": "512", "alpha": "OMN", "alpha_2": "OM", "alpha_3": "OMN"}
			}, {
				"type": "Polygon",
				"id": 516,
				"arcs": [[-305, 618, -389, 619, 210]],
				"properties": {"name": "Namibia", "code": "516", "alpha": "NAM", "alpha_2": "NA", "alpha_3": "NAM"}
			}, {
				"type": "Polygon",
				"id": 524,
				"arcs": [[-420, -536]],
				"properties": {"name": "Nepal", "code": "524", "alpha": "NPL", "alpha_2": "NP", "alpha_3": "NPL"}
			}, {
				"type": "Polygon",
				"id": 528,
				"arcs": [[-460, -346, 259]],
				"properties": {"name": "Netherlands", "code": "528", "alpha": "NLD", "alpha_2": "NL", "alpha_3": "NLD"}
			}, {
				"type": "Polygon",
				"id": 540,
				"arcs": [[620]],
				"properties": {"name": "New Caledonia", "code": "540", "alpha": "NCL", "alpha_2": "NC", "alpha_3": "NCL"}
			}, {
				"type": "MultiPolygon",
				"id": 548,
				"arcs": [[[20]], [[21]]],
				"properties": {"name": "Vanuatu", "code": "548", "alpha": "VUT", "alpha_2": "VU", "alpha_3": "VUT"}
			}, {
				"type": "MultiPolygon",
				"id": 554,
				"arcs": [[[14]], [[15]]],
				"properties": {"name": "New Zealand", "code": "554", "alpha": "NZL", "alpha_2": "NZ", "alpha_3": "NZL"}
			}, {
				"type": "Polygon",
				"id": 558,
				"arcs": [[-523, 121, -450, 138]],
				"properties": {"name": "Nicaragua", "code": "558", "alpha": "NIC", "alpha_2": "NI", "alpha_3": "NIC"}
			}, {
				"type": "Polygon",
				"id": 562,
				"arcs": [[-601, -472, -584, 621, -435, 622, -348, -352]],
				"properties": {"name": "Niger", "code": "562", "alpha": "NER", "alpha_2": "NE", "alpha_3": "NER"}
			}, {
				"type": "Polygon",
				"id": 566,
				"arcs": [[-349, -623, -434, 218]],
				"properties": {"name": "Nigeria", "code": "566", "alpha": "NGA", "alpha_2": "NG", "alpha_3": "NGA"}
			}, {
				"type": "MultiPolygon",
				"id": 578,
				"arcs": [[[623, -490, 624, 271]], [[285]], [[290]], [[291]]],
				"properties": {"name": "Norway", "code": "578", "alpha": "NOR", "alpha_2": "NO", "alpha_3": "NOR"}
			}, {
				"type": "Polygon",
				"id": 586,
				"arcs": [[-538, 186, -539, -301, -422]],
				"properties": {"name": "Pakistan", "code": "586", "alpha": "PAK", "alpha_2": "PK", "alpha_3": "PAK"}
			}, {
				"type": "Polygon",
				"id": 591,
				"arcs": [[-451, 123, -446, 136]],
				"properties": {"name": "Panama", "code": "591", "alpha": "PAN", "alpha_2": "PA", "alpha_3": "PAN"}
			}, {
				"type": "MultiPolygon",
				"id": 598,
				"arcs": [[[36]], [[37]], [[-534, 41]], [[40]]],
				"properties": {"name": "Papua New Guinea", "code": "598", "alpha": "PNG", "alpha_2": "PG", "alpha_3": "PNG"}
			}, {
				"type": "Polygon",
				"id": 600,
				"arcs": [[-377, -317, -376]],
				"properties": {"name": "Paraguay", "code": "600", "alpha": "PRY", "alpha_2": "PY", "alpha_3": "PRY"}
			}, {
				"type": "Polygon",
				"id": 604,
				"arcs": [[133, -473, -448, -378, -374, -413]],
				"properties": {"name": "Peru", "code": "604", "alpha": "PER", "alpha_2": "PE", "alpha_3": "PER"}
			}, {
				"type": "MultiPolygon",
				"id": 608,
				"arcs": [[[50]], [[53]], [[54]], [[55]], [[56]], [[57]], [[58]]],
				"properties": {"name": "Philippines", "code": "608", "alpha": "PHL", "alpha_2": "PH", "alpha_3": "PHL"}
			}, {
				"type": "Polygon",
				"id": 616,
				"arcs": [[263, 627, -588, -369, 628, 629, -455, -457]],
				"properties": {"name": "Poland", "code": "616", "alpha": "POL", "alpha_2": "PL", "alpha_3": "POL"}
			}, {
				"type": "Polygon",
				"id": 620,
				"arcs": [[255, -480]],
				"properties": {"name": "Portugal", "code": "620", "alpha": "PRT", "alpha_2": "PT", "alpha_3": "PRT"}
			}, {
				"type": "Polygon",
				"id": 624,
				"arcs": [[512, -508, 226]],
				"properties": {"name": "Guinea-Bissau", "code": "624", "alpha": "GNB", "alpha_2": "GW", "alpha_3": "GNB"}
			}, {
				"type": "Polygon",
				"id": 626,
				"arcs": [[-533, 28]],
				"properties": {"name": "Timor-Leste", "code": "626", "alpha": "TLS", "alpha_2": "TL", "alpha_3": "TLS"}
			}, {
				"type": "Polygon",
				"id": 630,
				"arcs": [[630]],
				"properties": {"name": "Puerto Rico", "code": "630", "alpha": "PRI", "alpha_2": "PR", "alpha_3": "PRI"}
			}, {
				"type": "Polygon",
				"id": 634,
				"arcs": [[632, 191]],
				"properties": {"name": "Qatar", "code": "634", "alpha": "QAT", "alpha_2": "QA", "alpha_3": "QAT"}
			}, {
				"type": "Polygon",
				"id": 642,
				"arcs": [[-595, 633, 244, -362, 634, -530, 635]],
				"properties": {"name": "Romania", "code": "642", "alpha": "ROU", "alpha_2": "RO", "alpha_3": "ROU"}
			}, {
				"type": "MultiPolygon",
				"id": 643,
				"arcs": [[[88]], [[264, -589, -628]], [[101]], [[103]], [[104]], [[159]], [[165]], [[167]], [[170]], [[173, -632, -428, -606, -426, -559, 281, -339, -504, 242, 636, -367, -590, -481, 268, -491, -624, 637, 638, 639, 640, 274, 641, 276, 642]], [[289]], [[292]], [[293]]],
				"properties": {"name": "Russian Federation", "code": "643", "alpha": "RUS", "alpha_2": "RU", "alpha_3": "RUS"}
			}, {
				"type": "Polygon",
				"id": 646,
				"arcs": [[-340, -439, 643, 644]],
				"properties": {"name": "Rwanda", "code": "646", "alpha": "RWA", "alpha_2": "RW", "alpha_3": "RWA"}
			}, {
				"type": "Polygon",
				"id": 682,
				"arcs": [[-555, -544, -575, 190, -633, 192, -315, -627, 645, 198]],
				"properties": {"name": "Saudi Arabia", "code": "682", "alpha": "SAU", "alpha_2": "SA", "alpha_3": "SAU"}
			}, {
				"type": "Polygon",
				"id": 686,
				"arcs": [[-615, -602, -509, -513, 227, -512, 229]],
				"properties": {"name": "Senegal", "code": "686", "alpha": "SEN", "alpha_2": "SN", "alpha_3": "SEN"}
			}, {
				"type": "Polygon",
				"id": 688,
				"arcs": [[-361, -600, -573, -605, -365, -527, -531, -635]],
				"properties": {"name": "Serbia", "code": "688", "alpha": "SRB", "alpha_2": "RS", "alpha_3": "SRB"}
			}, {
				"type": "Polygon",
				"id": 694,
				"arcs": [[-507, -580, 224]],
				"properties": {"name": "Sierra Leone", "code": "694", "alpha": "SLE", "alpha_2": "SL", "alpha_3": "SLE"}
			}, {
				"type": "Polygon",
				"id": 703,
				"arcs": [[657, -528, -334, -456, -630]],
				"properties": {"name": "Slovakia", "code": "703", "alpha": "SVK", "alpha_2": "SK", "alpha_3": "SVK"}
			}, {
				"type": "Polygon",
				"id": 704,
				"arcs": [[-570, -577, -415, 178]],
				"properties": {"name": "Viet Nam", "code": "704", "alpha": "VNM", "alpha_2": "VN", "alpha_3": "VNM"}
			}, {
				"type": "Polygon",
				"id": 705,
				"arcs": [[-532, -525, 251, -553, -329]],
				"properties": {"name": "Slovenia", "code": "705", "alpha": "SVN", "alpha_2": "SI", "alpha_3": "SVN"}
			}, {
				"type": "Polygon",
				"id": 706,
				"arcs": [[-565, -484, -655, 205]],
				"properties": {"name": "Somalia", "code": "706", "alpha": "SOM", "alpha_2": "SO", "alpha_3": "SOM"}
			}, {
				"type": "Polygon",
				"id": 710,
				"arcs": [[-620, -388, 674, -609, -659, -607, 209], [-586]],
				"properties": {"name": "South Africa", "code": "710", "alpha": "ZAF", "alpha_2": "ZA", "alpha_3": "ZAF"}
			}, {
				"type": "Polygon",
				"id": 716,
				"arcs": [[-391, -676, -610, -675]],
				"properties": {"name": "Zimbabwe", "code": "716", "alpha": "ZWE", "alpha_2": "ZW", "alpha_3": "ZWE"}
			}, {
				"type": "Polygon",
				"id": 724,
				"arcs": [[478, 254, 479, 256]],
				"properties": {"name": "Spain", "code": "724", "alpha": "ESP", "alpha_2": "ES", "alpha_3": "ESP"}
			}, {
				"type": "Polygon",
				"id": 728,
				"arcs": [[-564, 650, -443, -394, 651, -649, 652, -486]],
				"properties": {"name": "South Sudan", "code": "728", "alpha": "SSD", "alpha_2": "SS", "alpha_3": "SSD"}
			}, {
				"type": "Polygon",
				"id": 729,
				"arcs": [[646, -582, -474, 201, -477, -488, 647, 648, 649, -392]],
				"properties": {"name": "Sudan", "code": "729", "alpha": "SDN", "alpha_2": "SD", "alpha_3": "SDN"}
			}, {
				"type": "Polygon",
				"id": 732,
				"arcs": [[-468, -614, 231, -591]],
				"properties": {"name": "Western Sahara", "code": "732", "alpha": "ESH", "alpha_2": "EH", "alpha_3": "ESH"}
			}, {
				"type": "Polygon",
				"id": 740,
				"arcs": [[-495, 655, 656, -382, -520, 127]],
				"properties": {"name": "Suriname", "code": "740", "alpha": "SUR", "alpha_2": "SR", "alpha_3": "SUR"}
			}, {
				"type": "Polygon",
				"id": 748,
				"arcs": [[-608, 658]],
				"properties": {"name": "Swaziland", "code": "748", "alpha": "SWZ", "alpha_2": "SZ", "alpha_3": "SWZ"}
			}, {
				"type": "Polygon",
				"id": 752,
				"arcs": [[-625, -489, 270]],
				"properties": {"name": "Sweden", "code": "752", "alpha": "SWE", "alpha_2": "SE", "alpha_3": "SWE"}
			}, {
				"type": "Polygon",
				"id": 756,
				"arcs": [[406, 407, 408, -331]],
				"properties": {"name": "Switzerland", "code": "756", "alpha": "CHE", "alpha_2": "CH", "alpha_3": "CHE"}
			}, {
				"type": "Polygon",
				"id": 760,
				"arcs": [[-550, -579, 239, 659, -546, -557]],
				"properties": {"name": "Syrian Arab Republic", "code": "760", "alpha": "SYR", "alpha_2": "SY", "alpha_3": "SYR"}
			}, {
				"type": "Polygon",
				"id": 762,
				"arcs": [[-423, -299, 660, -566]],
				"properties": {"name": "Tajikistan", "code": "762", "alpha": "TJK", "alpha_2": "TJ", "alpha_3": "TJK"}
			}, {
				"type": "Polygon",
				"id": 764,
				"arcs": [[-618, 182, -604, -578, -568, 180]],
				"properties": {"name": "Thailand", "code": "764", "alpha": "THA", "alpha_2": "TH", "alpha_3": "THA"}
			}, {
				"type": "Polygon",
				"id": 768,
				"arcs": [[-353, -350, 220, -506]],
				"properties": {"name": "Togo", "code": "768", "alpha": "TGO", "alpha_2": "TG", "alpha_3": "TGO"}
			}, {
				"type": "Polygon",
				"id": 780,
				"arcs": [[662]],
				"properties": {"name": "Trinidad and Tobago", "code": "780", "alpha": "TTO", "alpha_2": "TT", "alpha_3": "TTO"}
			}, {
				"type": "Polygon",
				"id": 784,
				"arcs": [[312, 195, 313, 314, 193]],
				"properties": {"name": "United Arab Emirates", "code": "784", "alpha": "ARE", "alpha_2": "AE", "alpha_3": "ARE"}
			}, {
				"type": "Polygon",
				"id": 788,
				"arcs": [[234, -581, -470]],
				"properties": {"name": "Tunisia", "code": "788", "alpha": "TUN", "alpha_2": "TN", "alpha_3": "TUN"}
			}, {
				"type": "MultiPolygon",
				"id": 792,
				"arcs": [[[-505, -324, -541, -547, -660, 240]], [[-515, -358, 246]]],
				"properties": {"name": "Turkey", "code": "792", "alpha": "TUR", "alpha_2": "TR", "alpha_3": "TUR"}
			}, {
				"type": "Polygon",
				"id": 795,
				"arcs": [[279, -558, 661, -303, -542]],
				"properties": {"name": "Turkmenistan", "code": "795", "alpha": "TKM", "alpha_2": "TM", "alpha_3": "TKM"}
			}, {
				"type": "Polygon",
				"id": 800,
				"arcs": [[-644, -444, -651, -563, -666]],
				"properties": {"name": "Uganda", "code": "800", "alpha": "UGA", "alpha_2": "UG", "alpha_3": "UGA"}
			}, {
				"type": "Polygon",
				"id": 804,
				"arcs": [[243, -634, -596, -636, -529, -658, -629, -368, -637]],
				"properties": {"name": "Ukraine", "code": "804", "alpha": "UKR", "alpha_2": "UA", "alpha_3": "UKR"}
			}, {
				"type": "Polygon",
				"id": 807,
				"arcs": [[599, -360, -514, -312, -574]],
				"properties": {"name": "Macedonia, the former Yugoslav Republic of"}
			}, {
				"type": "Polygon",
				"id": 818,
				"arcs": [[473, 474, 236, 475, 200]],
				"properties": {"name": "Egypt", "code": "818", "alpha": "EGY", "alpha_2": "EG", "alpha_3": "EGY"}
			}, {
				"type": "MultiPolygon",
				"id": 826,
				"arcs": [[[498, 89]], [[499, 500, 501, 502]]],
				"properties": {"name": "United Kingdom"}
			}, {
				"type": "Polygon",
				"id": 834,
				"arcs": [[207, -613, -617, 664, -440, -341, -645, 665, -562]],
				"properties": {
					"name": "Tanzania, United Republic of",
					"code": "834",
					"alpha": "TZA",
					"alpha_2": "TZ",
					"alpha_3": "TZA"
				}
			}, {
				"type": "MultiPolygon",
				"id": 840,
				"arcs": [[[64]], [[65]], [[66]], [[67]], [[68]], [[105, 666, 107, 667, 109, 668, 111, 669, 113, 670, 115, -598, 671, 672, 673, -400]], [[92]], [[94]], [[97]], [[-401, 147]]],
				"properties": {"name": "United States"}
			}, {
				"type": "Polygon",
				"id": 854,
				"arcs": [[350, 351, -347, 352, 353, 354]],
				"properties": {"name": "Burkina Faso", "code": "854", "alpha": "BFA", "alpha_2": "BF", "alpha_3": "BFA"}
			}, {
				"type": "Polygon",
				"id": 858,
				"arcs": [[130, -319, -384]],
				"properties": {"name": "Uruguay", "code": "858", "alpha": "URY", "alpha_2": "UY", "alpha_3": "URY"}
			}, {
				"type": "Polygon",
				"id": 860,
				"arcs": [[-561, -567, -661, -298, -662]],
				"properties": {"name": "Uzbekistan", "code": "860", "alpha": "UZB", "alpha_2": "UZ", "alpha_3": "UZB"}
			}, {
				"type": "Polygon",
				"id": 862,
				"arcs": [[-521, -380, -447, 125]],
				"properties": {"name": "Venezuela, Bolivarian Republic of"}
			}, {
				"type": "Polygon",
				"id": 887,
				"arcs": [[-646, -626, 197]],
				"properties": {"name": "Yemen", "code": "887", "alpha": "YEM", "alpha_2": "YE", "alpha_3": "YEM"}
			}, {
				"type": "Polygon",
				"id": 894,
				"arcs": [[-611, 675, -390, -619, -304, -441, -665, -616]],
				"properties": {"name": "Zambia", "code": "894", "alpha": "ZMB", "alpha_2": "ZM", "alpha_3": "ZMB"}
			}]
		}
	},
	"arcs": [[[3344, 573], [-8, -29], [-8, -26], [-58, 8], [-62, -4], [-35, 19], [0, 3], [-15, 17], [62, -3], [60, -5], [21, 23], [15, 21], [28, -24]], [[577, 604], [-53, -8], [-37, 21], [-16, 20], [-1, 3], [-18, 16], [17, 22], [51, -9], [28, -18], [21, -21], [8, -26]], [[3745, 688], [34, -25], [12, -35], [3, -25], [1, -29], [-43, -18], [-45, -15], [-52, -13], [-58, -12], [-66, 4], [-36, 19], [4, 24], [60, 15], [24, 20], [17, 24], [13, 22], [16, 20], [18, 24], [15, 0], [41, 12], [42, -12]], [[1632, 950], [36, -9], [33, 10], [-15, -21], [-26, -14], [-39, 4], [-28, 21], [6, 19], [33, -10]], [[1512, 951], [42, -23], [-16, 2], [-36, 6], [-38, 16], [20, 12], [28, -13]], [[2250, 1040], [30, -8], [31, 7], [16, -33], [-22, 4], [-33, -2], [-35, 2], [-37, -3], [-29, 11], [-14, 24], [17, 10], [36, -8], [40, -4]], [[3098, 1096], [3, -26], [-5, -22], [-7, -22], [-33, -8], [-31, -11], [-37, 1], [14, 23], [-33, -8], [-31, -8], [-21, 17], [-1, 23], [30, 23], [19, 7], [32, -2], [8, 29], [2, 21], [-1, 47], [16, 27], [26, 9], [14, -22], [7, -21], [12, -26], [9, -25], [8, -26]], [[108, 339], [4, 0], [3, -1], [41, -24], [35, 24], [6, 3], [82, 11], [26, -14], [13, -7], [42, -19], [79, -15], [62, -18], [108, -13], [80, 16], [118, -12], [66, -18], [74, 17], [77, 16], [6, 27], [-109, 2], [-90, 14], [-23, 23], [-75, 12], [5, 26], [10, 24], [11, 21], [-6, 24], [-46, 16], [-21, 20], [-43, 18], [67, -4], [64, 10], [41, -20], [49, 17], [46, 22], [22, 19], [-10, 24], [-35, 15], [-41, 17], [-57, 4], [-50, 8], [-54, 5], [-18, 22], [-36, 18], [-22, 20], [-9, 65], [14, -5], [25, -18], [46, 5], [44, 8], [23, -25], [44, 6], [37, 13], [35, 15], [31, 20], [42, 5], [-1, 22], [-10, 21], [8, 20], [36, 10], [16, -19], [43, 12], [32, 14], [40, 1], [37, 6], [38, 14], [30, 12], [33, 12], [22, -3], [19, -5], [42, 8], [37, -10], [38, 1], [36, 8], [38, -5], [41, -6], [39, 2], [40, -1], [41, -1], [38, 2], [29, 17], [33, 9], [35, -12], [33, 10], [30, 20], [18, -18], [10, -20], [18, -19], [29, 17], [33, -22], [37, -7], [33, -15], [39, 3], [35, 10], [42, -2], [37, -8], [39, -10], [14, 25], [-18, 19], [-13, 20], [-36, 5], [-16, 21], [-6, 22], [-10, 42], [21, -7], [37, -4], [36, 4], [32, -9], [29, -17], [12, -21], [37, -3], [36, 8], [38, 11], [35, 7], [28, -14], [37, 5], [24, 44], [22, -26], [32, -10], [35, 5], [23, -22], [36, -2], [34, -7], [33, -13], [22, 22], [11, 20], [28, -22], [38, 5], [28, -12], [19, -19], [37, 5], [29, 13], [28, 14], [34, 8], [39, 7], [35, 8], [28, 12], [16, 18], [6, 25], [-3, 24], [-9, 22], [-9, 23], [-9, 23], [-7, 20], [-2, 22], [3, 23], [13, 21], [11, 24], [4, 23], [-5, 25], [-4, 22], [14, 26], [15, 17], [18, 21], [19, 18], [23, 17], [10, 25], [16, 16], [17, 15], [27, 3], [17, 18], [20, 11], [23, 7], [20, 15], [16, 18], [21, 7], [17, -15], [-11, -19], [-28, -17], [-12, -13], [-21, 9], [-22, -5], [-20, -14], [-20, -14], [-13, -17], [-4, -23], [2, -21], [13, -19], [-19, -14], [-27, -5], [-15, -19], [-16, -18], [-17, -25], [-5, -21], [10, -24], [15, -18], [22, -13], [22, -18], [11, -23], [6, -21], [8, -23], [13, -19], [8, -22], [4, -53], [8, -21], [3, -23], [8, -22], [-3, -31], [-16, -23], [-16, -20], [-37, -7], [-13, -21], [-16, -19], [-42, -21], [-37, -9], [-35, -13], [-38, -12], [-22, -24], [-45, -2], [-49, 2], [-44, -4], [-46, 0], [8, -23], [43, -10], [31, -16], [17, -20], [-31, -18], [-48, 5], [-39, -14], [-2, -24], [-1, -23], [33, -19], [6, -21], [35, -22], [59, -9], [50, -15], [39, -18], [51, -19], [69, -9], [68, -15], [47, -17], [52, -19], [27, -28], [14, -21], [34, 20], [45, 17], [49, 18], [57, 15], [50, 16], [69, 1], [68, -8], [56, -14], [18, 25], [39, 17], [70, 1], [55, 13], [52, 12], [58, 8], [61, 10], [43, 15], [-20, 20], [-12, 20], [0, 22], [-53, -2], [-57, -9], [-55, 0], [-8, 21], [4, 43], [13, 12], [40, 14], [46, 13], [34, 17], [34, 17], [25, 23], [38, 10], [37, 8], [19, 4], [43, 3], [41, 8], [34, 11], [34, 13], [31, 14], [38, 18], [25, 19], [26, 17], [8, 23], [-29, 13], [9, 24], [19, 18], [29, 11], [30, 14], [29, 18], [21, 22], [14, 27], [20, 16], [33, -3], [14, -19], [33, -3], [1, 22], [14, 22], [30, -5], [7, -22], [33, -3], [36, 10], [35, 7], [32, -3], [12, -24], [30, 19], [28, 10], [32, 8], [31, 8], [28, 14], [31, 9], [24, 12], [17, 20], [21, -14], [29, 8], [20, -28], [15, -20], [32, 11], [13, 23], [28, 16], [36, -4], [11, -21], [23, 21], [30, 7], [33, 2], [29, -1], [31, -6], [30, -4], [13, -19], [18, -17], [30, 10], [33, 2], [32, 0], [31, 2], [27, 7], [30, 7], [24, 16], [26, 10], [29, 6], [21, 16], [15, 31], [16, 19], [29, -9], [10, -20], [24, -13], [29, 4], [20, -20], [20, -15], [29, 14], [10, 24], [25, 11], [28, 19], [28, 8], [32, 11], [22, 12], [23, 14], [22, 12], [26, -6], [25, 20], [18, 16], [26, -2], [23, 14], [5, 20], [24, 16], [22, 11], [28, 9], [26, 5], [24, -3], [26, -6], [23, -16], [2, -25], [25, -19], [17, -16], [33, -6], [18, -16], [23, -16], [27, -3], [22, 11], [24, 24], [26, -13], [27, -7], [26, -6], [28, -5], [27, 0], [23, -60], [-1, -14], [-3, -26], [-27, -15], [-22, -21], [4, -23], [31, 1], [-3, -22], [-15, -22], [-13, -24], [22, -18], [32, -5], [32, 10], [15, 22], [9, 22], [15, 18], [18, 17], [7, 20], [15, 28], [17, 6], [32, 2], [27, 7], [29, 9], [13, 23], [8, 21], [19, 22], [28, 14], [23, 11], [15, 20], [16, 10], [20, 9], [28, -6], [25, 6], [27, 7], [31, -4], [20, 16], [14, 38], [10, -15], [13, -27], [24, -12], [26, -4], [27, 6], [28, -4], [26, -1], [18, 5], [23, -3], [21, -12], [25, 8], [30, 0], [26, 7], [29, -7], [18, 19], [14, 19], [19, 16], [35, 43], [18, -8], [21, -16], [19, -20], [35, -35], [27, -1], [26, 0], [30, 6], [30, 8], [23, 16], [19, 17], [31, 2], [20, 13], [22, -12], [14, -18], [20, -18], [30, 2], [19, -14], [34, -15], [34, -6], [29, 5], [22, 18], [18, 18], [25, 5], [25, -8], [29, -6], [26, 9], [25, 0], [25, -6], [26, -5], [25, 10], [29, 9], [29, 2], [31, 0], [26, 6], [25, 4], [8, 29], [1, 23], [17, -15], [5, -26], [9, -24], [12, -19], [23, -10], [32, 3], [36, 1], [25, 3], [36, 0], [27, 2], [36, -3], [31, -4], [20, -18], [-6, -22], [18, -17], [30, -13], [31, -15], [36, -10], [37, -9], [29, -9], [31, -1], [18, 19], [25, -16], [21, -18], [24, -13], [34, -6], [32, -7], [14, -22], [31, -14], [22, -20], [31, -9], [32, 1], [30, -3], [33, 1], [33, -5], [31, -8], [29, -13], [29, -12], [19, -17], [-3, -22], [-15, -20], [-12, -26], [-10, -21], [-13, -23], [-36, -9], [-17, -21], [-36, -12], [-12, -23], [-19, -21], [-20, -18], [-12, -24], [-7, -21], [-3, -26], [1, -22], [16, -22], [6, -22], [13, -20], [51, -8], [11, -25], [-50, -9], [-42, -12], [-53, -2], [-23, -33], [-5, -27], [-12, -22], [-15, -21], [37, -19], [14, -24], [24, -21], [34, -20], [39, -18], [41, -18], [64, -18], [14, -28], [80, -12], [6, -5], [20, -17], [77, 15], [64, -18], [48, -14], [-9998, -1], [25, 34], [50, -18], [3, 2]], [[79, 321], [8, 5], [9, 6], [8, 5], [4, 2]], [[3139, 2021], [-9, -23], [-24, -18], [-30, 6], [-20, 17], [-29, 9], [-35, 32], [-28, 31], [-39, 64], [23, -12], [39, -38], [37, -21], [14, 27], [9, 39], [26, 24], [20, -7]], [[3093, 2151], [10, -27], [14, -43], [36, -34], [39, -15], [-12, -29], [-27, -2], [-14, 20]], [[3373, 2239], [22, -25], [-8, -21], [-38, -17], [-12, 20], [-24, -26], [-14, 26], [33, 35], [24, -15], [17, 23]], [[6951, 2320], [-43, -4], [0, 30], [4, 24], [2, 12], [18, -18], [26, -7], [1, -11], [-8, -26]], [[9037, 2833], [27, -20], [15, 8], [22, 11], [17, -4], [2, -68], [-10, -20], [-3, -46], [-9, 15], [-20, -40], [-5, 3], [-18, 2], [-17, 50], [-3, 38], [-16, 50], [0, 26], [18, -5]], [[9805, 2826], [6, -24], [20, 23], [8, -24], [0, -24], [-11, -27], [-18, -42], [-14, -24], [10, -27], [-21, -1], [-24, -22], [-7, -37], [-16, -59], [-22, -25], [-14, -17], [-25, 1], [-18, 19], [-31, 4], [-4, 22], [15, 42], [35, 57], [18, 11], [20, 22], [23, 30], [17, 30], [12, 43], [11, 14], [4, 33], [19, 26], [7, -24]], [[9849, 3100], [20, -61], [1, 40], [12, -16], [4, -44], [23, -18], [18, -5], [16, 22], [14, -7], [-6, -51], [-9, -33], [-21, 1], [-7, -18], [2, -24], [-4, -11], [-10, -31], [-14, -40], [-22, -23], [-4, 16], [-12, 8], [16, 47], [-9, 32], [-30, 23], [1, 21], [20, 20], [4, 44], [-1, 37], [-11, 39], [1, 10], [-14, 24], [-21, 51], [-12, 41], [10, 4], [15, -32], [22, -15], [8, -51]], [[9641, 3906], [-11, -14], [-15, 16], [-20, 26], [-18, 30], [-18, 41], [-4, 19], [12, -1], [15, -19], [13, -20], [9, -16], [22, -36], [15, -26]], [[9953, 4183], [10, -16], [-5, -30], [-17, -8], [-15, 7], [-3, 25], [11, 20], [12, -7], [7, 9]], [[9981, 4214], [-18, -12], [-3, 22], [13, 12], [9, 3], [17, 18], [0, -28], [-18, -15]], [[2, 4232], [-2, -3], [0, 28], [5, 2], [-3, -27]], [[9661, 4234], [-9, -8], [-10, 25], [1, 16], [18, -33]], [[9640, 4322], [5, -46], [-8, 7], [-5, -3], [-4, 16], [-1, 44], [13, -18]], [[6389, 4401], [5, -69], [7, -27], [-3, -27], [-5, -17], [-9, 33], [-5, -17], [5, -42], [-3, -25], [-7, -13], [-2, -49], [-11, -67], [-14, -79], [-17, -109], [-10, -80], [-13, -67], [-23, -14], [-24, -24], [-16, 14], [-22, 21], [-7, 30], [-2, 51], [-10, 46], [-3, 42], [5, 41], [13, 10], [0, 19], [13, 44], [3, 37], [-6, 27], [-6, 36], [-2, 53], [10, 33], [4, 36], [13, 2], [16, 12], [10, 11], [12, 0], [16, 33], [23, 36], [8, 29], [-3, 24], [11, -7], [16, 40], [0, 35], [9, 26], [10, -25], [7, -25], [7, -38]], [[8986, 4389], [10, -45], [18, 22], [9, -24], [14, -23], [-3, -25], [6, -50], [4, -29], [7, -7], [8, -49], [-3, -30], [9, -39], [30, -30], [20, -27], [18, -25], [-3, -14], [16, -36], [10, -63], [11, 13], [12, -25], [6, 9], [5, -61], [20, -35], [13, -22], [22, -47], [7, -46], [1, -33], [-2, -36], [13, -49], [-1, -51], [-5, -26], [-8, -52], [1, -33], [-5, -41], [-13, -52], [-20, -29], [-10, -44], [-10, -29], [-8, -49], [-11, -29], [-7, -43], [-3, -40], [1, -18], [-16, -20], [-31, -2], [-25, -24], [-13, -22], [-17, -25], [-23, 26], [-17, 10], [4, 30], [-15, -11], [-24, -42], [-24, 16], [-16, 9], [-16, 4], [-27, 17], [-18, 35], [-5, 44], [-6, 29], [-14, 23], [-27, 7], [9, 28], [-6, 43], [-14, -40], [-25, -10], [15, 31], [4, 34], [11, 28], [-2, 42], [-23, -49], [-17, -19], [-11, -46], [-22, 24], [1, 30], [-17, 42], [-15, 21], [5, 14], [-35, 35], [-20, 1], [-26, 28], [-50, -5], [-36, -21], [-32, -19], [-26, 4], [-30, -30], [-24, -13], [-5, -30], [-10, -24], [-24, -1], [-17, -5], [-25, 10], [-20, -6], [-19, -2], [-16, -31], [-9, 2], [-14, -16], [-13, -18], [-20, 2], [-19, 0], [-29, 37], [-15, 11], [0, 33], [14, 8], [5, 13], [-1, 20], [3, 41], [-3, 34], [-14, 58], [-5, 33], [1, 33], [-11, 37], [-1, 17], [-12, 23], [-3, 45], [-16, 46], [-4, 24], [12, -25], [-9, 54], [14, -17], [8, -22], [-1, 29], [-13, 45], [-3, 19], [-6, 17], [3, 33], [5, 14], [4, 29], [-3, 34], [12, 41], [2, -44], [11, 40], [23, 19], [13, 25], [22, 21], [12, 4], [8, -7], [22, 22], [17, 6], [4, 13], [7, 5], [16, -1], [29, 17], [15, 25], [7, 31], [16, 29], [2, 23], [0, 31], [20, 49], [11, -49], [12, 11], [-10, 27], [9, 28], [12, -12], [4, 44], [15, 28], [7, 23], [13, 9], [1, 17], [12, -7], [1, 14], [12, 9], [13, 7], [21, -26], [15, -34], [18, -1], [17, -5], [-6, 32], [14, 46], [12, 15], [-4, 14], [12, 33], [17, 20], [14, -6], [23, 10], [0, 30], [-21, 19], [15, 8], [19, -14], [14, -24], [24, -14], [8, 5], [17, -17], [16, 16], [11, -5], [6, 11], [13, -28], [-8, -31], [-10, -23], [-10, -2], [4, -23], [-9, -29], [-9, -28], [2, -17], [22, -31], [21, -19], [14, -20], [20, -34], [8, 0], [15, -15], [4, -17], [26, -20], [19, 20], [5, 31], [6, 25], [3, 32], [9, 46], [-4, 27], [2, 17], [-3, 33], [3, 44], [6, 11], [-5, 19], [7, 31], [5, 32], [1, 16], [10, 22], [8, -29], [2, -36], [7, -7], [1, -24], [10, -29], [2, -33], [-1, -21]], [[9502, 4578], [8, -19], [-20, 0], [-10, 35], [16, -14], [6, -2]], [[8352, 4592], [-12, -1], [-37, 41], [26, 11], [15, -18], [10, -17], [-2, -16]], [[9467, 4613], [-11, -1], [-17, 6], [-6, 9], [2, 23], [18, -9], [9, -12], [5, -16]], [[9490, 4629], [-5, -10], [-20, 49], [-6, 35], [10, 0], [10, -46], [11, -28]], [[8470, 4670], [3, 13], [24, 13], [20, 2], [8, 8], [11, -8], [-10, -15], [-29, -25], [-24, -17]], [[8473, 4641], [-18, -43], [-24, -13], [-3, 7], [3, 20], [12, 35], [27, 23]], [[8274, 4716], [10, -16], [17, 5], [7, -24], [-32, -12], [-20, -8], [-15, 1], [10, 33], [15, 0], [8, 21]], [[8413, 4716], [-4, -32], [-42, -16], [-37, 7], [0, 21], [22, 12], [17, -18], [19, 5], [25, 21]], [[9440, 4702], [1, -12], [-22, 25], [-15, 20], [-11, 20], [4, 5], [13, -13], [23, -27], [7, -18]], [[9375, 4759], [-6, -3], [-12, 13], [-11, 23], [1, 10], [17, -24], [11, -19]], [[8016, 4792], [53, -6], [6, 24], [52, -28], [10, -37], [42, -11], [34, -34], [-32, -22], [-31, 23], [-25, -1], [-28, 4], [-26, 10], [-33, 22], [-20, 6], [-12, -7], [-50, 23], [-5, 25], [-25, 4], [19, 55], [33, -3], [23, -22], [11, -5], [4, -20]], [[8741, 4824], [-14, -39], [-3, 43], [5, 21], [6, 19], [6, -16], [0, -28]], [[9329, 4789], [-8, -6], [-12, 23], [-12, 36], [-6, 44], [3, 6], [3, -18], [9, -13], [13, -36], [13, -20], [-3, -16]], [[9220, 4867], [-14, -5], [-5, -16], [-15, -14], [-14, -14], [-15, 0], [-23, 17], [-15, 16], [2, 18], [25, -9], [15, 5], [4, 28], [4, 1], [3, -31], [16, 5], [8, 20], [15, 20], [-3, 34], [17, 1], [5, -9], [0, -32], [-10, -35]], [[8533, 4983], [-10, -19], [-19, 10], [-6, 25], [28, 3], [7, -19]], [[8623, 5004], [10, -44], [-24, 24], [-23, 4], [-15, -3], [-20, 2], [7, 31], [34, 3], [31, -17]], [[9252, 4923], [-8, -15], [-5, 33], [-7, 23], [-12, 19], [-16, 24], [-20, 17], [7, 14], [15, -16], [10, -13], [11, -14], [12, -24], [10, -18], [3, -30]], [[8915, 5032], [48, -39], [52, -33], [19, -30], [15, -29], [5, -34], [46, -35], [7, -31], [-26, -6], [6, -38], [25, -38], [18, -61], [16, 2], [-1, -26], [21, -10], [-8, -11], [30, -24], [-4, -16], [-18, -4], [-7, 14], [-24, 7], [-28, 9], [-21, 36], [-16, 32], [-15, 50], [-36, 26], [-23, -17], [-17, -19], [3, -42], [-21, -20], [-16, 10], [-29, 2]], [[8916, 4657], [-25, 47], [-28, 12], [-7, -17], [-35, -1], [12, 46], [18, 16], [-8, 63], [-13, 48], [-54, 49], [-23, 5], [-42, 53], [-8, -28], [-10, -5], [-7, 21], [0, 25], [-21, 29], [30, 20], [20, -1], [-3, 15], [-40, 1], [-11, 34], [-25, 10], [-12, 29], [38, 14], [14, 19], [44, -24], [5, -21], [8, -93], [28, -35], [24, 61], [31, 35], [25, 0], [24, -20], [20, -21], [30, -11]], [[8478, 5264], [-23, -57], [-21, -11], [-26, 11], [-47, -3], [-24, -8], [-4, -44], [25, -51], [15, 26], [52, 20], [-2, -27], [-13, 8], [-12, -33], [-24, -23], [26, -73], [-5, -20], [25, -67], [0, -38], [-15, -16], [-11, 20], [14, 47], [-28, -22], [-7, 16], [4, 22], [-20, 34], [2, 56], [-19, -18], [3, -67], [1, -82], [-18, -9], [-12, 17], [8, 53], [-4, 56], [-12, 0], [-8, 40], [11, 37], [4, 46], [14, 87], [6, 24], [24, 42], [21, -17], [35, -8], [32, 3], [28, 42], [5, -13]], [[8573, 5247], [-1, -50], [-14, 5], [-5, -35], [12, -30], [-8, -7], [-11, 37], [-8, 73], [5, 46], [9, 21], [2, -31], [17, -5], [2, -24]], [[7938, 4845], [-31, -1], [-23, 48], [-36, 47], [-12, 35], [-21, 47], [-13, 43], [-22, 81], [-24, 48], [-8, 49], [-10, 45], [-25, 36], [-15, 49], [-21, 33], [-29, 63], [-2, 30], [18, -3], [43, -11], [24, -56], [22, -39], [15, -24], [26, -62], [29, -1], [23, -39], [16, -49], [21, -26], [-11, -47], [16, -20], [10, -2], [5, -40], [9, -32], [21, -5], [13, -36], [-7, -72], [-1, -89]], [[8045, 5298], [20, -20], [22, 11], [5, 48], [12, 11], [33, 13], [20, 45], [14, 37]], [[8171, 5443], [11, 21], [24, 32]], [[8206, 5496], [21, 40], [14, 45], [11, 0], [15, -29], [1, -25], [18, -16], [23, -18], [-2, -22], [-18, -3], [5, -28], [-21, -20]], [[8273, 5420], [-16, -52], [21, -54], [-5, -27], [31, -53], [-33, -7], [-9, -39], [1, -52], [-27, -40], [0, -57], [-11, -88], [-4, 20], [-32, -26], [-11, 36], [-19, 3], [-14, 18], [-33, -20], [-10, 28], [-19, -4], [-23, 7], [-4, 77], [-14, 16], [-13, 50], [-4, 50], [3, 53], [17, 39]], [[8509, 5667], [3, -39], [2, -32], [-10, -53], [-10, 59], [-13, -29], [9, -43], [-8, -27], [-33, 34], [-8, 41], [9, 28], [-18, 27], [-8, -24], [-14, 2], [-20, -32], [-5, 17], [11, 49], [18, 16], [15, 22], [10, -27], [21, 16], [4, 26], [20, 1], [-2, 45], [23, -27], [2, -29], [2, -21]], [[7255, 5539], [-24, -13], [-14, 45], [-4, 83], [12, 94], [19, -32], [13, -41], [14, -60], [-5, -60], [-11, -16]], [[3307, 5764], [-24, -6], [-5, 5], [8, 16], [0, 23], [16, 7], [6, -2], [-1, -43]], [[8443, 5774], [-10, -19], [-9, -36], [-9, -18], [-17, 40], [6, 16], [7, 16], [3, 36], [15, 3], [-4, -39], [20, 56], [-2, -55]], [[8290, 5718], [-36, -54], [13, 40], [20, 36], [17, 39], [14, 58], [5, -47], [-18, -32], [-15, -40]], [[8384, 5867], [17, -18], [18, 0], [-1, -24], [-13, -25], [-17, -17], [-1, 27], [2, 29], [-5, 28]], [[8485, 5882], [8, -64], [-22, 15], [1, -19], [7, -36], [-14, -12], [-1, 40], [-8, 3], [-4, 35], [16, -5], [-1, 22], [-16, 44], [26, -1], [8, -22]], [[8374, 5935], [-7, -50], [-12, 29], [-14, 43], [24, -2], [9, -20]], [[8369, 6247], [17, -16], [8, 15], [3, -15], [-5, -23], [10, -42], [-7, -48], [-17, -19], [-4, -46], [6, -46], [15, -6], [12, 7], [35, -32], [-3, -32], [9, -14], [-3, -26], [-21, 28], [-11, 30], [-7, -21], [-17, 35], [-26, -9], [-14, 13], [2, 24], [9, 14], [-9, 14], [-3, -21], [-14, 33], [-4, 25], [-1, 55], [11, -19], [3, 90], [9, 53], [17, -1]], [[3177, 6232], [-7, -15], [-21, 0], [-16, -2], [-2, 25], [4, 8], [23, 0], [14, -5], [5, -11]], [[2863, 6211], [-8, -10], [-16, 9], [-16, 21], [4, 14], [11, 4], [7, -2], [18, -5], [15, -14], [5, -16], [-20, -1]], [[3007, 6317], [4, 10], [21, 0], [17, -15], [7, 1], [5, -20], [15, 1], [-1, -17], [13, -2], [13, -21], [-10, -24], [-13, 13], [-13, -3], [-9, 3], [-5, -10], [-11, -4], [-4, 14], [-9, -8], [-11, -40], [-7, 9], [-2, 17]], [[3007, 6221], [-18, 10], [-13, -4], [-17, 4], [-13, -11], [-15, 18], [2, 19], [26, -8], [21, -5], [10, 13], [-13, 25], [0, 22], [-17, 9], [6, 16], [17, -3], [24, -9]], [[8064, 6258], [-24, -28], [-23, 18], [-1, 49], [14, 26], [30, 16], [16, -1], [6, -22], [-12, -25], [-6, -33]], [[679, 6281], [-4, -10], [-7, 8], [1, 17], [-5, 21], [1, 6], [5, 9], [-2, 12], [2, 5], [2, -1], [11, -10], [5, -5], [4, -7], [7, -21], [0, -3], [-11, -12], [-9, -9]], [[664, 6371], [-9, -4], [-5, 12], [-3, 4], [-1, 4], [3, 5], [10, -6], [7, -8], [-2, -7]], [[645, 6401], [-1, -6], [-15, 2], [2, 7], [14, -3]], [[620, 6410], [-1, -4], [-2, 1], [-10, 2], [-3, 13], [-2, 3], [8, 7], [2, -3], [8, -19]], [[573, 6448], [-3, -6], [-9, 11], [1, 4], [4, 5], [7, -1], [0, -13]], [[2786, 6493], [11, -21], [26, 6], [10, -13], [23, -36], [18, -26], [9, 1], [16, -12], [-2, -16], [21, -2], [21, -24], [-4, -13], [-18, -8], [-19, -3], [-19, 5], [-40, -6], [19, 32], [-11, 15], [-18, 4], [-10, 17], [-6, 33], [-16, -3], [-26, 16], [-8, 12], [-37, 9], [-9, 11], [10, 14], [-27, 3], [-20, -30], [-12, 0], [-4, -14], [-13, -7], [-12, 6], [14, 18], [7, 20], [12, 13], [14, 11], [21, 6], [7, 6], [24, -4], [22, -1], [26, -19]], [[2845, 6550], [-6, -3], [-7, 33], [-11, 17], [6, 37], [9, -3], [9, -47], [0, -34]], [[8365, 6494], [-12, -47], [-15, 49], [-3, 42], [16, 57], [23, 44], [12, -18], [-5, -34], [-16, -93]], [[2838, 6713], [-31, -10], [-2, 22], [13, 4], [19, -2], [1, -14]], [[2860, 6713], [-4, -41], [-6, 8], [1, 30], [-13, 22], [0, 7], [22, -26]], [[8739, 7148], [3, -19], [-16, -35], [-11, 18], [-14, -13], [-8, -34], [-18, 17], [1, 27], [15, 34], [16, -6], [11, 24], [21, -13]], [[5943, 7201], [0, -5], [-28, -23], [-14, 7], [-6, 23], [13, 2]], [[5908, 7205], [2, 1], [4, 14], [20, -1], [25, 17], [-18, -24], [2, -11]], [[5657, 7238], [15, -19], [22, 3], [21, -4], [-1, -10], [15, 7], [-3, -17], [-40, -5], [0, 9], [-34, 11], [5, 25]], [[5430, 7383], [-10, -45], [4, -18], [-6, -29], [-21, 21], [-14, 7], [-39, 29], [4, 29], [33, -5], [28, 6], [21, 5]], [[5255, 7555], [16, -41], [-3, -76], [-13, 4], [-11, -20], [-11, 16], [-1, 69], [-6, 33], [15, -3], [14, 18]], [[8915, 7321], [-11, -46], [5, -29], [-14, -41], [-36, -27], [-49, -3], [-39, -66], [-19, 22], [-1, 43], [-48, -13], [-33, -27], [-33, -1], [28, -42], [-18, -98], [-18, -24], [-14, 22], [7, 52], [-17, 17], [-12, 39], [27, 18], [14, 36], [28, 30], [20, 39], [56, 17], [29, -11], [30, 102], [18, -27], [41, 57], [16, 23], [17, 70], [-5, 65], [12, 36], [30, 11], [15, -80], [-1, -47], [-26, -58], [1, -59]], [[5265, 7609], [-10, -44], [-12, 11], [-7, 39], [6, 22], [18, 22], [5, -50]], [[8996, 7726], [20, -13], [19, 25], [6, -65], [-41, -16], [-24, -57], [-44, 40], [-15, -63], [-31, -1], [-4, 57], [14, 44], [30, 3], [8, 80], [8, 45], [33, -60], [21, -19]], [[3231, 7862], [20, -7], [26, 1], [-14, -23], [-10, -4], [-36, 24], [-7, 20], [11, 17], [10, -28]], [[3282, 8010], [-13, -1], [-36, 18], [-26, 27], [10, 5], [36, -15], [29, -24], [0, -10]], [[1569, 7975], [-14, -8], [-46, 26], [-8, 21], [-25, 20], [-5, 16], [-29, 11], [-11, 31], [3, 13], [29, -12], [17, -9], [26, -6], [10, -20], [13, -27], [28, -24], [12, -32]], [[3440, 8101], [-19, -51], [19, 20], [18, -13], [-9, -20], [24, -15], [13, 14], [28, -18], [-9, -42], [20, 10], [3, -31], [9, -36], [-12, -50], [-13, -3], [-18, 11], [6, 47], [-8, 8], [-32, -50], [-16, 2], [19, 27], [-26, 14], [-30, -4], [-54, 2], [-4, 17], [17, 20], [-12, 16], [23, 35], [29, 91], [17, 33], [24, 20], [13, -2], [-5, -16], [-15, -36]], [[1313, 8294], [27, 4], [-9, -65], [25, -46], [-12, 0], [-16, 26], [-11, 27], [-14, 18], [-5, 25], [2, 18], [13, -7]], [[8989, 8104], [28, -102], [-41, 19], [-17, -83], [27, -59], [-1, -40], [-21, 34], [-18, -44], [-6, 48], [4, 56], [-4, 62], [7, 44], [1, 77], [-16, 57], [2, 78], [26, 27], [-11, 26], [12, 9], [7, -39], [10, -55], [-1, -57], [12, -58]], [[4789, 8357], [23, 2], [30, -36], [-15, -39]], [[4827, 8284], [4, -41], [-21, -52], [-49, -34], [-39, 9], [22, 60], [-14, 59], [38, 45], [21, 27]], [[5351, 8384], [-16, -46], [-29, 32], [-4, 24], [41, 19], [8, -29]], [[749, 8471], [-27, -22], [-15, 15], [-4, 27], [25, 20], [15, 9], [19, -4], [11, -18], [-24, -27]], [[4916, 8558], [-30, -62], [28, 8], [31, 0], [-8, -47], [-25, -52], [29, -4], [27, -74], [19, -9], [17, -65], [8, -23], [34, -11], [-4, -37], [-14, -17], [11, -30], [-25, -30], [-37, 1], [-47, -16], [-13, 11], [-18, -27], [-26, 7], [-20, -22], [-14, 11], [40, 61], [25, 12], [-43, 10], [-8, 23], [29, 18], [-15, 31], [5, 37], [41, -5], [4, 34], [-19, 36], [-34, 10], [-6, 16], [10, 25], [-9, 16], [-15, -27], [-2, 55], [-14, 30], [10, 59], [22, 47], [22, -5], [34, 5]], [[400, 8632], [-17, -9], [-18, 11], [-17, 15], [27, 10], [22, -5], [3, -22]], [[2797, 8761], [-10, -30], [-13, 5], [-7, 17], [1, 4], [11, 17], [11, -1], [7, -12]], [[2724, 8793], [-32, -32], [-20, 2], [-6, 15], [21, 27], [38, -1], [-1, -11]], [[229, 8855], [17, -11], [18, 6], [22, -15], [28, -8], [-3, -6], [-21, -13], [-21, 13], [-10, 10], [-25, -3], [-6, 5], [1, 22]], [[2634, 8963], [5, -26], [14, 9], [16, -15], [31, -20], [31, -18], [3, -27], [20, 5], [20, -20], [-25, -18], [-43, 14], [-15, 26], [-28, -31], [-39, -29], [-10, 33], [-38, -5], [25, 28], [3, 46], [10, 52], [20, -4]], [[4596, 9009], [-6, -38], [31, -39], [-36, -44], [-80, -39], [-24, -11], [-37, 9], [-77, 18], [27, 25], [-60, 29], [49, 11], [-1, 17], [-59, 13], [19, 38], [42, 8], [43, -39], [43, 31], [35, -16], [45, 31], [46, -4]], [[2892, 9049], [-31, -3], [-7, 28], [12, 32], [25, 8], [22, -16], [0, -24], [-3, -8], [-18, -17]], [[138, 9016], [19, -14], [-7, 42], [76, -9], [54, -54], [-27, -25], [-46, -6], [-1, -56], [-11, -12], [-26, 2], [-21, 20], [-37, 16], [-6, 25], [-28, 10], [-32, -8], [-15, 20], [6, 22], [-33, -14], [12, -27], [-15, -24], [0, 229], [68, -44], [72, -57], [-2, -36]], [[2342, 9161], [-17, -20], [-37, 18], [-23, -7], [-38, 26], [25, 18], [19, 25], [29, -16], [17, -11], [8, -11], [17, -22]], [[9999, 9261], [-31, -3], [-5, 18], [36, 24], [0, -39]], [[36, 9264], [-36, -3], [0, 39], [3, 2], [24, 0], [40, -16], [-3, -8], [-28, -14]], [[3134, 7781], [5, -19], [-30, -28], [-28, -20], [-29, -17]], [[3052, 7697], [-16, -37], [-4, -10]], [[3032, 7650], [0, -30], [9, -31], [12, -1], [-3, 21], [8, -13], [-2, -16], [-19, -10], [-13, 1], [-21, -10], [-12, -3], [-16, -2], [-23, -17]], [[2952, 7539], [41, 11], [8, -11]], [[3001, 7539], [-39, -17], [-18, -1], [1, 8], [-8, -16], [8, -3], [-6, -41], [-21, -45], [-2, 15], [-6, 3], [-9, 14], [6, -31], [7, -10], [0, -22], [-9, -22], [-15, -46], [-3, 2], [9, 39]], [[2896, 7366], [-14, 23], [-4, 47]], [[2878, 7436], [-5, -25], [6, -36], [-18, 9], [19, -19], [1, -54], [8, -4], [3, -20], [4, -58], [-18, -43], [-29, -17], [-18, -34], [-14, -3], [-14, -21], [-4, -20], [-30, -37], [-16, -27], [-13, -35], [-4, -41], [5, -39], [9, -50], [12, -41], [0, -24], [13, -67], [0, -39], [-2, -22], [-7, -36], [-8, -7], [-14, 7], [-4, 25], [-10, 14], [-15, 49], [-13, 44], [-4, 23], [5, 38], [-7, 32], [-22, 48], [-11, 9], [-28, -26], [-5, 2], [-13, 27], [-18, 14], [-31, -7], [-25, 7], [-21, -4]], [[2522, 6928], [-12, -8], [6, -17]], [[2516, 6903], [-1, -23], [6, -11], [-5, -8], [-11, 9], [-10, -11], [-20, 1], [-21, 31], [-24, -7], [-20, 13], [-18, -4], [-23, -13], [-25, -43], [-28, -25]], [[2316, 6812], [-15, -27], [-6, -26]], [[2295, 6759], [-1, -40], [2, -28], [5, -19]], [[2301, 6672], [0, -1], [-11, -50]], [[2290, 6621], [-5, -41], [-2, -78], [-2, -28], [4, -31], [9, -28], [6, -45], [18, -43], [6, -33], [11, -28], [30, -15], [11, -24], [25, 16], [21, 6], [21, 10], [17, 10], [18, 23], [6, 34], [3, 48], [5, 17], [18, 15], [30, 14], [24, -2], [17, 5], [7, -13], [-1, -27], [-15, -35], [-7, -35], [5, -10], [-4, -25], [-7, -45], [-7, 15], [-6, -1]], [[2546, 6247], [1, -8], [5, 0], [-1, -16], [-4, -25], [2, -9], [-3, -21], [2, -5], [-3, -29], [-6, -15], [-5, -2], [-5, -20]], [[2529, 6097], [9, -11], [2, 9], [9, -7]], [[2549, 6088], [2, -3], [7, 10], [7, 1], [3, -4], [4, 2], [13, -5], [13, 2], [9, 6], [3, 7], [9, -3], [7, -4], [7, 1], [6, 5], [12, -8], [5, -1], [8, -11], [8, -13], [10, -9], [8, -16]], [[2690, 6045], [-3, -5], [-1, -13], [3, -21], [-7, -20], [-3, -23], [-1, -25], [2, -15], [1, -26], [-5, -6], [-2, -24], [2, -15], [-6, -15], [1, -16], [4, -9]], [[2675, 5812], [8, -31], [10, -24], [13, -24]], [[2706, 5733], [10, -21], [0, -12], [11, -3], [2, 5], [8, -14], [14, 4], [12, 15], [16, 11], [10, 17], [15, -3], [-1, -6], [16, -2], [12, -10], [9, -17], [11, -16]], [[2851, 5681], [14, -2], [21, 41], [11, 6], [0, 19], [6, 48], [15, 27], [18, 1], [2, 12], [22, -5], [22, 30], [11, 12], [13, 28], [10, -3], [7, -16], [-5, -19]], [[3018, 5860], [-1, -14], [-16, -6], [9, -26], [-1, -30], [-12, -34], [11, -46], [12, 4], [6, 42], [-9, 20], [-1, 44], [34, 23], [-3, 27], [9, 18], [10, -40], [20, -1], [18, -32], [1, -19], [25, -1], [30, 6], [15, -26], [22, -7], [15, 18], [1, 15], [34, 3], [33, 1], [-23, -17], [9, -27], [22, -5], [21, -28], [5, -46], [14, 1], [11, -13]], [[3339, 5664], [18, -21], [18, -38], [0, -30], [11, -1], [15, -28], [11, -20]], [[3412, 5526], [33, -12], [3, 11], [22, 4], [30, -16]], [[3500, 5513], [10, -6], [20, -14], [30, -48], [4, -24]], [[3564, 5421], [10, 3], [7, -32], [15, -101], [15, -9], [1, -40], [-21, -47], [8, -18], [50, -9], [1, -57], [21, 37], [35, -20], [46, -35], [13, -34], [-4, -32], [32, 18], [54, -31], [42, 3], [41, -48], [35, -65], [22, -16], [23, -3], [10, -18], [10, -73], [4, -35], [-11, -95], [-14, -38], [-39, -80], [-18, -65], [-20, -50], [-7, -1], [-8, -42], [2, -108], [-8, -89], [-3, -38], [-8, -23], [-5, -77], [-29, -75], [-4, -59], [-23, -25], [-6, -35], [-30, 0], [-44, -22], [-20, -25], [-31, -17], [-32, -46], [-24, -57], [-4, -43], [5, -32], [-6, -58], [-6, -28], [-19, -32], [-31, -101], [-25, -46], [-18, -27], [-13, -55], [-18, -33]], [[3517, 3237], [-12, -36], [-32, -32], [-20, 12], [-15, -6], [-26, 24], [-19, -1], [-17, 31]], [[3376, 3229], [-2, -30], [36, -49], [-4, -40], [17, -25], [-1, -28], [-27, -74], [-41, -31], [-56, -12], [-30, 6], [5, -34], [-5, -43], [5, -29], [-17, -21], [-28, -8], [-27, 21], [-11, -15], [4, -57], [19, -17], [15, 18], [8, -30], [-25, -18], [-22, -36], [-5, -58], [-6, -30], [-26, -1], [-22, -29], [-8, -43], [27, -42], [27, -12], [-10, -52], [-33, -32], [-18, -68], [-25, -22], [-11, -27], [9, -60], [18, -34], [-12, 3]], [[3094, 2170], [-24, 1], [-14, -14], [-25, -21], [-4, -54], [-12, -1], [-31, 18], [-32, 41], [-35, 33], [-8, 36], [8, 34], [-14, 38], [-4, 98], [12, 56], [29, 44], [-42, 17], [26, 51], [10, 95], [31, -20], [14, 119], [-18, 16], [-9, -72], [-18, 8], [9, 82], [10, 107], [12, 39], [-8, 57], [-2, 64], [12, 2], [17, 93], [19, 92], [12, 86], [-7, 86], [9, 48], [-4, 71], [17, 70], [5, 112], [9, 119], [8, 129], [-2, 94], [-6, 81]], [[3044, 4125], [-27, 33], [-3, 24], [-55, 58], [-50, 63], [-21, 35], [-12, 48], [5, 17], [-24, 75], [-27, 106], [-26, 115], [-12, 26], [-8, 43], [-22, 37], [-20, 24], [9, 25], [-13, 55], [8, 41], [23, 36]], [[2769, 4986], [14, 43], [-6, 25], [-10, -27], [-17, 26], [6, 16], [-5, 52], [10, 9], [5, 36], [10, 37], [-2, 23], [16, 13], [19, 22]], [[2809, 5261], [-4, 18], [10, 5], [-1, 29], [7, 20], [13, 4], [12, 36], [11, 31], [-10, 13], [5, 34], [-6, 52], [5, 16], [-4, 48], [-11, 31]], [[2836, 5598], [-9, 17], [-6, 31], [6, 15], [-7, 4], [-5, 19], [-14, 16], [-12, -4], [-5, -20], [-12, -14], [-6, -2], [-2, -12], [13, -31], [-8, -8], [-4, -8], [-13, -3], [-4, 34], [-4, -10], [-9, 4], [-6, 23], [-11, 4], [-7, 6], [-12, 0], [-1, -12], [-3, 9]], [[2695, 5656], [-15, 12], [-6, 12], [3, 10], [-1, 13], [-8, 14], [-11, 11], [-9, 8], [-2, 17], [-7, 10], [2, -17], [-6, -14], [-6, 16], [-9, 6], [-4, 12], [0, 17], [4, 18], [-8, 8], [6, 11]], [[2618, 5820], [-9, 19], [-13, 23], [-6, 19], [-12, 18], [-14, 26], [3, 9], [5, -8], [2, 4]], [[2574, 5930], [-5, 18], [-8, 5]], [[2561, 5953], [-4, -14], [-16, 1]], [[2541, 5940], [-10, 5], [-11, 12]], [[2520, 5957], [-16, 4], [-7, 12]], [[2497, 5973], [-15, 10], [-17, 1], [-13, 11], [-15, 24]], [[2437, 6019], [-31, 62], [-14, 19], [-23, 15], [-16, -4], [-22, -22], [-14, -6], [-19, 16], [-21, 10], [-26, 27], [-21, 8], [-32, 27], [-23, 27], [-7, 16], [-15, 3], [-29, 18], [-11, 27], [-30, 32], [-14, 37], [-7, 28], [10, 5], [-3, 17], [6, 15], [0, 20], [-9, 25], [-3, 23], [-9, 29], [-24, 58], [-28, 45], [-14, 35], [-24, 24], [-5, 14], [4, 36], [-14, 13], [-16, 28], [-7, 40], [-15, 5], [-16, 30], [-13, 28], [-1, 18], [-15, 44], [-10, 44], [0, 22], [-20, 23], [-9, -3], [-16, 16], [-4, -23], [4, -28], [3, -43], [9, -24], [21, -40], [5, -13], [4, -4], [4, -20], [4, 1], [6, -37], [8, -15], [6, -20], [18, -30], [9, -53], [8, -25], [8, -27], [2, -31], [13, -2], [11, -26], [10, -26], [-1, -10], [-11, -21], [-5, 0], [-7, 35], [-19, 33], [-20, 28], [-14, 14], [1, 43], [-4, 31], [-13, 18], [-19, 25], [-4, -7], [-7, 15], [-17, 14], [-17, 33], [2, 5], [12, -4], [10, 22], [1, 26], [-21, 41], [-17, 16], [-10, 36], [-10, 38], [-13, 46], [-11, 51]], [[1746, 7055], [-5, 30], [-18, 33], [-13, 7], [-3, 16], [-15, 3], [-10, 16], [-26, 6], [-7, 9], [-4, 31], [-27, 58], [-23, 80], [1, 14], [-12, 19], [-22, 48], [-3, 47], [-15, 31], [6, 48], [-1, 49], [-9, 45], [11, 54], [7, 104], [-5, 78], [-9, 49], [-8, 27], [3, 11], [40, -20], [15, -54], [7, 15], [-4, 47], [-10, 48]], [[1587, 8004], [-4, 0], [-53, 56], [-20, 25], [-51, 24], [-15, 51], [4, 35], [-36, 25], [-4, 46], [-34, 42], [-1, 30]], [[1373, 8338], [-15, 21], [-24, 19], [-8, 50], [-36, 46], [-15, 55], [-27, 4], [-44, 1], [-32, 17], [-58, 59], [-26, 11], [-49, 21], [-38, -5], [-55, 26], [-33, 25], [-31, -12], [6, -40], [-16, -4], [-32, -12], [-24, -19], [-31, -13], [-4, 34], [13, 57], [29, 17], [-8, 15], [-35, -32], [-19, -39], [-40, -40], [20, -28], [-26, -42], [-30, -24], [-27, -17], [-7, -26], [-44, -30], [-8, -27], [-33, -24], [-19, 4], [-26, -16], [-28, -20], [-23, -19], [-48, -16], [-4, 9], [30, 27], [27, 18], [30, 32], [34, 6], [14, 24], [39, 34], [6, 12], [20, 20], [5, 44], [14, 34], [-32, -18], [-9, 10], [-15, -21], [-18, 29], [-7, -20], [-11, 28], [-28, -23], [-17, 0], [-2, 35], [5, 21], [-18, 20], [-36, -11], [-23, 27], [-19, 14], [-1, 33], [-21, 24], [11, 33], [22, 33], [10, 29], [23, 4], [19, -9], [22, 28], [20, -5], [22, 18], [-6, 26], [-15, 10], [20, 23], [-17, -1], [-29, -13], [-9, -12], [-22, 12], [-39, -6], [-40, 14], [-12, 23], [-35, 33], [39, 25], [62, 28], [23, 0], [-4, -29], [58, 2], [-22, 36], [-34, 22], [-20, 29], [-27, 24], [-38, 18], [16, 30], [49, 2], [35, 27], [7, 28], [28, 27], [27, 7], [53, 25], [25, -4], [43, 31], [42, -12], [20, -26], [12, 11], [47, -3], [-1, -14], [42, -9], [29, 5], [58, -18], [53, -5], [22, -8], [37, 10], [42, -18], [30, -8]], [[1083, 9196], [52, -14], [44, -27], [29, -6], [24, 24], [34, 18], [41, -7], [41, 26], [46, 14], [19, -24], [21, 14], [6, 27]], [[1440, 9241], [19, -6], [47, -52]], [[1506, 9183], [37, 39], [4, -44], [34, 10], [10, 16], [34, -3], [43, -24], [65, -21], [38, -10], [27, 4], [37, -29], [-39, -29], [51, -12], [75, 6], [23, 11], [30, -35], [30, 29], [-28, 25], [18, 19], [33, 3], [23, 6], [22, -14], [28, -31], [31, 4], [49, -26], [43, 9], [41, -1], [-3, 36], [24, 10], [43, -20], [0, -54], [18, 46], [22, -2], [13, 58], [-30, 36], [-32, 23], [2, 64], [33, 41], [36, -9], [28, -25], [38, -65]], [[2457, 9224], [-25, -28], [52, -12]], [[2484, 9184], [0, -59], [37, 45], [33, -37], [-8, -43], [27, -39], [29, 42], [20, 50], [2, 63], [39, -4], [41, -9], [37, -28], [2, -29], [-21, -31], [20, -31], [-4, -28], [-54, -40], [-39, -9], [-28, 18], [-9, -29], [-26, -49], [-8, -25], [-33, -39], [-39, -4], [-22, -24], [-2, -38], [-32, -7], [-34, -46], [-31, -65], [-10, -46], [-2, -67], [41, -9], [12, -54], [13, -44], [39, 12], [52, -25], [28, -22], [20, -27], [34, -16], [30, -25], [46, -3], [30, -5], [-5, -50], [9, -58], [20, -65], [41, -54], [22, 18], [15, 60], [-15, 91], [-19, 30], [44, 27], [32, 40], [15, 40], [-2, 39], [-19, 49], [-34, 43], [33, 60], [-12, 53], [-9, 90], [19, 13], [48, -16], [28, -5], [23, 15], [26, -20], [34, -33], [9, -23], [49, -4], [-1, -48], [10, -73], [25, -9], [20, -34], [40, 32], [27, 63], [18, 27], [22, -51], [36, -74], [31, -69], [-11, -36], [36, -32], [25, -33], [45, -15], [18, -18], [11, -49], [21, -8], [11, -22], [2, -64], [-20, -22], [-20, -20], [-45, -21], [-35, -47], [-47, -9], [-60, 12], [-41, 0], [-29, -4], [-23, -41], [-36, -26], [-40, -76], [-32, -53], [24, 10], [44, 75], [59, 48], [41, 6], [25, -28], [-27, -39], [9, -62], [9, -43], [36, -29], [46, 8], [28, 65], [2, -42], [18, -21], [-34, -38], [-62, -34], [-27, -23], [-31, -42], [-22, 5], [-1, 48], [49, 48], [-45, -2], [-31, -7]], [[1852, 9128], [-15, 28], [-38, 15], [-25, -6], [-34, 45], [18, 7], [43, 9], [39, -2], [37, 10], [-54, 13], [-59, -4], [-40, 1], [-14, 21], [64, 23], [-43, -1], [-48, 16], [23, 43], [19, 23], [75, 35], [28, -11], [-14, -27], [62, 17], [39, -29], [31, 29], [25, -19], [23, -56], [14, 24], [-20, 59], [25, 8], [27, -9], [31, -23], [18, -56], [8, -41], [47, -29], [50, -27], [-3, -25], [-45, -5], [17, -22], [-9, -21], [-50, 9], [-48, 16], [-32, -4], [-52, -19]], [[1972, 9143], [-83, -11], [-37, -4]], [[2097, 9410], [-25, -38], [-43, 40], [9, 8], [37, 2], [22, -12]], [[2879, 9391], [2, -15], [-29, 1], [-30, 1], [-31, -7], [-8, 3], [-30, 31], [1, 20], [13, 4], [64, -6], [48, -32]], [[2595, 9395], [22, -36], [25, 46], [71, 24], [47, -60], [-4, -37], [55, 16], [26, 23], [62, -29], [38, -27], [4, -26], [51, 13], [29, -36], [67, -23], [25, -23], [26, -54], [-51, -27], [65, -38], [44, -12], [40, -53], [44, -4], [-9, -40], [-48, -67], [-35, 24], [-43, 56], [-36, -7], [-4, -33], [30, -34], [37, -26], [12, -16], [18, -57], [-10, -41], [-35, 16], [-69, 46], [39, -50], [29, -35], [4, -20], [-75, 23], [-60, 34], [-33, 28], [9, 16], [-41, 29], [-41, 28], [1, -16], [-80, -10], [-24, 20], [18, 43], [53, 1], [57, 7], [-10, 21], [10, 28], [36, 56], [-8, 26], [-10, 20], [-43, 28], [-56, 19], [18, 15], [-30, 36], [-24, 3], [-22, 19], [-15, -17], [-50, -7], [-101, 13], [-59, 17], [-45, 8], [-23, 21], [29, 26], [-40, 0], [-8, 58], [21, 52], [28, 23], [72, 16], [-20, -37]], [[2212, 9434], [33, -12], [49, 7], [7, -16], [-25, -28], [42, -25], [-5, -52], [-46, -22], [-27, 5], [-19, 22], [-69, 44], [1, 19], [56, -7], [-30, 37], [33, 28]], [[8988, 9398], [-43, -1], [-56, 7], [-5, 3], [26, 23], [35, 5], [39, -22], [4, -15]], [[2410, 9372], [-29, -43], [-32, 3], [-17, 50], [0, 29], [15, 24], [27, 16], [58, -2], [53, -14], [-41, -51], [-34, -12]], [[1580, 9265], [-15, 25], [-64, 30]], [[1501, 9320], [10, 19], [21, 48]], [[1532, 9387], [25, 38], [-28, 35], [94, 9], [40, -12], [71, -3], [27, -17], [30, -24], [-35, -15], [-68, -40], [-35, -40]], [[1653, 9318], [0, -25], [-73, -28]], [[9186, 9506], [-33, -23], [-44, 5], [-52, 23], [7, 18], [52, -8], [70, -15]], [[2399, 9500], [-15, -23], [-41, 5], [-33, 15], [15, 25], [40, 16], [24, -20], [10, -18]], [[9029, 9533], [-22, -43], [-102, 2], [-47, -14], [-55, 38], [15, 39], [37, 11], [73, -2], [101, -31]], [[2263, 9600], [21, -27], [1, -30], [-12, -42], [-46, -6], [-30, 9], [1, 34], [-46, -5], [-2, 45], [30, -2], [42, 19], [39, -3], [2, 8]], [[1993, 9570], [11, -21], [25, 10], [29, -2], [5, -29], [-17, -27], [-94, -9], [-70, -25], [-42, -1], [-4, 19], [58, 25], [-126, -7], [-38, 10], [37, 57], [27, 16], [78, -20], [49, -34], [49, -4], [-40, 55], [25, 21], [29, -7], [9, -27]], [[6597, 9254], [-16, -5], [-91, 8], [-7, 25], [-51, 16], [-4, 31], [29, 12], [-1, 32], [55, 49], [-26, 7], [67, 50], [-8, 26], [62, 31], [92, 37], [92, 11], [48, 21], [54, 7], [19, -22], [-18, -18], [-99, -29], [-85, -27], [-86, -55], [-41, -56], [-44, -56], [6, -48], [53, -47]], [[2369, 9621], [31, -18], [55, 0], [24, -19], [-7, -21], [32, -13], [18, -14], [37, -3], [41, -5], [44, 13], [57, 5], [45, -4], [29, -22], [7, -24], [-18, -15], [-41, -12], [-36, 7], [-79, -9], [-57, -1], [-45, 7], [-74, 18], [-10, 32], [-3, 29], [-28, 25], [-57, 7], [-33, 18], [11, 23], [57, -4]], [[1772, 9653], [-4, -44], [-22, -20], [-26, -3], [-51, -25], [-45, -8], [-37, 12], [47, 43], [57, 37], [42, 0], [39, 8]], [[8162, 9520], [-31, -17], [-73, -32], [-20, -18], [34, -8], [41, -14], [25, 11], [14, -37], [12, 15], [45, 9], [89, -10], [7, -27], [116, -8], [1, 44], [59, -10], [45, 0], [45, -30], [12, -37], [-16, -24], [35, -46], [44, -23], [26, 61], [45, -26], [47, 15], [54, -18], [20, 17], [46, -9], [-20, 54], [37, 25], [250, -38], [24, -34], [73, -44], [112, 11], [55, -9], [23, -24], [-3, -42], [34, -17], [37, 12], [50, 2], [52, -12], [53, 7], [48, -51], [34, 18], [-22, 37], [12, 25], [89, -16], [58, 4], [80, -28], [39, -25], [0, -229], [-1, -1], [-35, -25], [-36, 4], [25, -30], [16, -48], [13, -15], [3, -24], [-7, -15], [-52, 12], [-77, -43], [-25, -7], [-43, -40], [-40, -36], [-10, -26], [-40, 40], [-72, -45], [-13, 21], [-27, -25], [-37, 8], [-9, -37], [-33, -56], [1, -23], [32, -13], [-4, -84], [-26, -2], [-12, -49], [12, -24], [-49, -30], [-9, -65], [-42, -15], [-8, -58], [-40, -54], [-10, 40], [-12, 84], [-16, 128], [14, 80], [23, 34], [1, 27], [44, 13], [49, 72], [48, 60], [50, 46], [22, 81], [-33, -5], [-17, -47], [-71, -64], [-22, 71], [-72, -19], [-70, -97], [23, -35], [-62, -15], [-43, -6], [2, 41], [-43, 9], [-34, -28], [-85, 10], [-91, -17], [-90, -113], [-107, -136], [44, -7], [14, -36], [27, -13], [17, 29], [31, -4], [40, -63], [1, -49], [-22, -58], [-2, -68], [-13, -92], [-42, -84], [-9, -39], [-38, -68], [-37, -66], [-18, -34], [-37, -34], [-18, -1], [-17, 28], [-37, -42], [-5, -19]], [[8631, 7613], [-10, 4], [-12, -20], [-8, -20], [1, -41], [-15, -13], [-5, -10], [-10, -17], [-19, -9], [-12, -16], [-1, -25], [-3, -6], [11, -9], [16, -26]], [[8564, 7405], [24, -68], [7, -37], [0, -66], [-10, -32], [-26, -11], [-22, -24], [-25, -5], [-3, 32], [5, 43], [-12, 60], [21, 9], [-19, 50]], [[8504, 7356], [-14, 11], [-3, -11], [-8, -5], [-1, 11], [-8, 5], [-7, 9], [7, 26], [7, 6], [-2, 11], [7, 31], [-2, 9], [-16, 7], [-14, 15]], [[8450, 7481], [-38, -17], [-21, -26], [-30, -16], [15, 26], [-6, 23], [22, 39], [-14, 30], [-25, -21], [-31, -40], [-17, -37], [-27, -3], [-15, -26], [15, -39], [23, -10], [1, -26], [22, -16], [31, 41], [25, -23], [17, -1], [5, -30], [-39, -17], [-13, -31], [-27, -29], [-15, -40], [30, -31], [11, -57], [17, -53], [19, -44], [0, -43], [-18, -16], [7, -30], [16, -18], [-4, -47], [-7, -46], [-16, -5], [-20, -62], [-23, -76], [-25, -69], [-39, -53], [-38, -48], [-31, -7], [-17, -25], [-10, 18], [-16, -28], [-39, -29], [-29, -9], [-9, -61], [-16, -3], [-7, 42], [6, 22], [-37, 18], [-13, -9]], [[8000, 6423], [-37, -49], [-23, -55], [-6, -40], [21, -60], [26, -76], [25, -35], [17, -46], [13, -107], [-4, -101], [-23, -38], [-32, -37], [-23, -48], [-34, -54], [-10, 37], [7, 39], [-20, 33]], [[7897, 5786], [-23, 8], [-12, 30], [-14, 60]], [[7848, 5884], [-25, 26], [-23, -1], [4, 45], [-25, 0], [-2, -63], [-15, -84], [-9, -51], [2, -42], [18, -2], [11, -52], [5, -50], [16, -33], [17, -7], [14, -30]], [[7836, 5540], [6, -5], [17, -35], [11, -38], [2, -39], [-3, -26], [3, -20], [2, -34], [10, -16], [10, -51], [0, -20], [-20, -3], [-26, 42], [-33, 46], [-3, 29], [-16, 39], [-4, 47], [-10, 32], [3, 42], [-6, 24]], [[7779, 5554], [-11, 22], [-5, 29], [-15, 32], [-13, 28], [-5, -34], [-5, 32], [3, 36], [8, 55]], [[7736, 5754], [-2, 43], [8, 44], [-9, 34], [2, 63], [-11, 29], [-9, 69], [-5, 73], [-12, 48], [-19, -29], [-31, -41], [-16, 5], [-17, 13], [10, 72], [-6, 54], [-22, 66], [3, 21], [-16, 7], [-19, 47]], [[7565, 6372], [-8, 30], [-2, 30], [-5, 27], [-12, 34], [-25, 2], [2, -24], [-9, -32], [-11, 12], [-5, -10], [-7, 6], [-11, 5]], [[7472, 6452], [-4, -21], [-19, 1], [-34, -12], [1, -44], [-14, -34], [-40, -38], [-32, -68], [-20, -36], [-28, -38], [0, -27], [-14, -14], [-25, -20], [-13, -4], [-8, -43], [5, -75], [2, -48], [-12, -55], [0, -98], [-14, -2], [-13, -44], [8, -19], [-25, -17], [-9, -39], [-11, -16], [-27, 53], [-12, 81], [-11, 58], [-10, 27], [-15, 56], [-7, 72], [-4, 36], [-26, 79], [-11, 111], [-8, 74], [0, 70], [-6, 54], [-40, -35], [-20, 7], [-36, 70], [13, 21], [-8, 22], [-32, 49]], [[6893, 6546], [-21, 15], [-8, 41], [-21, 44], [-52, -11], [-45, -1], [-39, -8]], [[6707, 6626], [-52, 17], [-30, 14], [-32, 7], [-12, 71], [-13, 10], [-21, -10], [-28, -28], [-34, 19], [-28, 44], [-27, 17], [-19, 54], [-20, 77], [-15, -9], [-18, 19], [-10, -23]], [[6348, 6905], [-17, 3]], [[6331, 6908], [6, -25], [-2, -13], [9, -44]], [[6344, 6826], [11, -50], [13, -13], [5, -20], [19, -24], [2, -24], [-3, -19], [3, -19], [8, -17], [4, -18], [4, -15]], [[6410, 6607], [-2, 42], [8, 31], [7, 6], [9, -18], [0, -34], [-6, -34]], [[6426, 6600], [6, -22]], [[6432, 6578], [5, 3], [1, -16], [21, 9], [23, -1], [17, -2], [19, 39], [21, 37], [17, 35]], [[6556, 6682], [8, 20], [4, -5], [-3, -24], [-3, -10]], [[6562, 6663], [3, -46]], [[6565, 6617], [13, -39], [15, -21], [21, -8], [16, -10], [13, -33], [7, -19], [10, -7], [0, -13], [-10, -35], [-4, -16], [-12, -18], [-10, -40], [-13, 3], [-6, -13], [-4, -30], [3, -38], [-3, -7], [-12, 0], [-18, -21], [-2, -29], [-7, -12], [-17, 1], [-11, -15], [0, -23], [-13, -16], [-16, 5], [-18, -19], [-13, -3]], [[6474, 6141], [-20, -16], [-5, -25], [-1, -20], [-28, -24], [-44, -27], [-25, -41], [-12, -3], [-8, 4], [-17, -24], [-17, -11], [-24, -3], [-7, -4], [-6, -15], [-7, -4], [-4, -15], [-14, 2], [-9, -8], [-19, 3], [-7, 33], [0, 32], [-4, 17], [-6, 42], [-8, 24], [6, 3], [-3, 26], [3, 11], [-1, 25]], [[6187, 6123], [-3, 25], [-9, 17], [-2, 23], [-14, 21], [-15, 48], [-8, 47], [-19, 40], [-13, 9], [-18, 55], [-3, 40], [1, 34], [-16, 64], [-13, 22], [-15, 12], [-9, 33], [1, 13], [-7, 30], [-8, 13], [-11, 43], [-17, 46], [-14, 40], [-14, 0], [4, 31], [1, 20], [4, 23]], [[5970, 6872], [-1, 9]], [[5969, 6881], [-8, -23], [-6, -44], [-7, -30], [-7, -10], [-9, 19], [-13, 25], [-19, 83], [-3, -5], [11, -61], [17, -58], [21, -90], [11, -31], [8, -33], [25, -63], [-5, -10], [1, -38], [32, -51], [5, -12]], [[6023, 6449], [9, -57], [-6, -10], [4, -59], [10, -69], [11, -14], [15, -22]], [[6066, 6218], [16, -66], [8, -53], [15, -28], [38, -55], [15, -32], [15, -34], [9, -19], [14, -18]], [[6196, 5913], [6, -18], [-1, -23], [-16, -14], [12, -16]], [[6197, 5842], [9, -11], [6, -23], [12, -25], [14, 0], [26, 15], [31, 7], [24, 18], [14, 3], [10, 11], [16, 2]], [[6359, 5839], [8, 1], [13, 9], [15, 6], [13, 19], [11, 0], [0, -16], [-2, -33], [0, -30], [-6, -21], [-8, -62], [-13, -65], [-17, -73], [-24, -85], [-24, -64], [-33, -79], [-27, -46], [-42, -57], [-26, -44], [-30, -70], [-7, -30], [-6, -14]], [[6154, 5085], [-19, -23], [-7, -24], [-11, -4], [-4, -41], [-9, -23], [-5, -38], [-11, -19]], [[6088, 4913], [-13, -71], [2, -33], [17, -21], [1, -15], [-7, -35], [1, -17], [-2, -28], [10, -36], [12, -57], [10, -12]], [[6119, 4588], [4, -26], [-1, -57], [4, -51], [1, -90], [5, -28], [-9, -41], [-11, -40], [-17, -36], [-26, -22], [-31, -28], [-31, -62], [-11, -10], [-19, -41], [-12, -13], [-2, -41], [13, -44], [5, -34], [1, -17], [5, 3], [-1, -57], [-5, -26], [7, -10], [-4, -24], [-12, -21], [-23, -19], [-33, -31], [-12, -21], [2, -25], [7, -4], [-2, -30]], [[5911, 3642], [-7, -42], [-3, -48], [-8, -26], [-19, -29], [-5, -8], [-12, -29], [-7, -30], [-16, -41], [-32, -60], [-19, -34], [-21, -26], [-29, -23], [-14, -3], [-4, -16], [-17, 9], [-14, -11], [-30, 11], [-17, -7], [-11, 3], [-29, -23], [-23, -9], [-18, -22], [-12, -1], [-12, 21], [-9, 1], [-12, 25], [-2, -8], [-3, 16], [0, 34], [-9, 38], [9, 11], [-1, 44], [-18, 54], [-14, 48], [0, 1], [-20, 74]], [[5453, 3536], [-21, 44], [-11, 42], [-6, 56], [-7, 42], [-9, 88], [0, 69], [-4, 32], [-11, 23], [-14, 48], [-15, 69], [-6, 36], [-22, 56], [-2, 45]], [[5325, 4186], [-3, 36], [4, 51], [10, 52], [1, 25], [9, 52], [7, 23], [16, 38], [9, 26], [3, 42], [-2, 33], [-8, 21], [-8, 35], [-6, 34], [1, 12], [9, 23], [-9, 56], [-5, 38], [-14, 37], [2, 11]], [[5341, 4831], [-4, 18]], [[5337, 4849], [-7, 43]], [[5330, 4892], [-23, 61]], [[5307, 4953], [-28, 58], [-19, 47], [-17, 60], [1, 19], [6, 19], [7, 41], [6, 43]], [[5263, 5240], [-6, 9], [10, 64]], [[5267, 5313], [4, 46], [-11, 38], [-12, 10], [-6, 26], [-7, 8], [0, 16]], [[5235, 5457], [-29, -21], [-10, 3], [-11, -13], [-22, 1], [-15, 36], [-9, 42], [-20, 38], [-21, -1], [-24, 0]], [[5074, 5542], [-23, -6]], [[5051, 5536], [-23, -13]], [[5028, 5523], [-43, -33], [-16, -20], [-25, -17], [-24, 17]], [[4920, 5470], [-13, -1], [-19, 11], [-18, 0], [-33, -10], [-19, -17], [-28, -21], [-5, 1]], [[4785, 5433], [-7, 0], [-29, 27], [-25, 44], [-24, 32], [-19, 37]], [[4681, 5573], [-7, 4], [-20, 23], [-15, 31], [-5, 21], [-3, 43]], [[4631, 5695], [-12, 34], [-11, 22], [-7, 8], [-7, 11], [-3, 26], [-4, 12], [-8, 10]], [[4579, 5818], [-15, 24], [-12, 4], [-6, 16], [0, 9], [-8, 12], [-2, 12]], [[4536, 5895], [-5, 44]], [[4531, 5939], [4, 26]], [[4535, 5965], [-12, 45], [-14, 20], [13, 11], [13, 40], [7, 30]], [[4542, 6111], [-3, 31], [8, 28], [4, 55], [-4, 57], [-3, 28], [3, 29], [-7, 27], [-15, 25]], [[4525, 6391], [1, 25]], [[4526, 6416], [2, 26], [10, 16], [9, 30], [-1, 19], [9, 41], [16, 37], [9, 9], [7, 34], [1, 30], [10, 36], [18, 21], [18, 59], [15, 22], [25, 7], [22, 39], [14, 16], [23, 48], [-7, 71], [11, 50], [4, 30], [18, 39], [27, 26], [21, 24], [19, 60], [8, 35], [21, 0], [16, -25], [27, 4], [29, -12], [12, -1]], [[4939, 7207], [26, 32], [30, 10], [18, 23], [27, 18], [47, 10], [46, 5], [14, -9], [26, 23], [30, 0], [11, -13], [19, 3]], [[5233, 7309], [30, 24], [20, -7], [-1, -29], [23, 21], [2, -11], [-14, -28], [0, -27], [10, -14], [-4, -50], [-18, -29], [5, -32], [15, -1], [7, -27], [10, -9]], [[5318, 7090], [33, -20], [11, 5], [24, -9], [36, -26], [13, -51], [25, -11], [40, -25], [29, -28], [14, 15], [13, 26], [-6, 44], [8, 28], [20, 27], [19, 8], [38, -12], [9, -25], [11, -1], [9, -9], [27, -7], [7, -19]], [[5698, 7000], [37, 1], [27, -15], [27, -17], [13, -9], [21, 18], [12, 16], [24, 5], [20, -7], [8, -29], [6, 19], [22, -14], [22, -3], [14, 15]], [[5951, 6980], [8, 19], [-2, 3], [7, 27], [6, 43], [4, 15], [1, 0]], [[5975, 7087], [10, 47], [13, 41], [1, 2]], [[5999, 7177], [-3, 44], [7, 24]], [[6003, 7245], [-10, 26], [10, 21], [-17, -4], [-23, 13], [-19, -33], [-42, -7], [-23, 31], [-29, 2], [-7, -24], [-19, -7], [-27, 31], [-30, -1], [-17, 57], [-20, 32], [14, 45], [-18, 27], [31, 55], [42, 3], [12, 44], [53, -8], [33, 37], [33, 17], [46, 1], [48, -41], [40, -22], [32, 9], [24, -5], [33, 30]], [[6153, 7574], [4, 24], [-7, 40], [-16, 21], [-15, 6], [-10, 18]], [[6109, 7683], [-36, 49], [-31, 21], [-24, 34], [20, 9], [23, 49], [-16, 22], [41, 24], [0, 13], [-25, -10]], [[6061, 7894], [-23, -4], [-18, -19], [-26, -3], [-24, -21], [2, -36], [13, -14], [29, 3], [-6, -20], [-30, -10], [-38, -34], [-15, 12], [6, 27], [-31, 17], [5, 11], [27, 19], [-8, 13], [-43, 15], [-2, 21], [-26, -7], [-10, -31], [-22, -43]], [[5821, 7790], [1, -15], [-14, -12], [-8, 5], [-8, -69]], [[5792, 7699], [-14, -24], [-10, -41], [9, -33]], [[5777, 7601], [3, -22], [24, -19], [-5, -14], [-33, -3], [-12, -18], [-23, -31], [-9, 27], [1, 12]], [[5723, 7533], [-17, 1], [-15, 6], [-33, -15], [19, -33], [-14, -9], [-16, 0], [-14, 30], [-6, -13], [7, -34], [14, -27], [-11, -13], [16, -27], [13, -16], [1, -33], [-26, 16], [8, -30], [-17, -6], [10, -51], [-18, 0], [-23, 25], [-11, 46], [-4, 38], [-11, 26], [-14, 33], [-2, 17]], [[5559, 7464], [-5, 4], [-1, 12], [-15, 20], [-2, 27], [2, 39], [4, 18], [-5, 9]], [[5537, 7593], [-6, 5], [-8, 19], [-12, 11]], [[5511, 7628], [-26, 21], [-16, 21], [-25, 17], [-24, 43], [6, 4], [-13, 24], [0, 20], [-18, 9], [-8, -25], [-9, 19], [1, 20], [1, 1]], [[5380, 7802], [6, 5]], [[5386, 7807], [-22, 9], [-23, -21], [2, -28], [-3, -17], [9, -29], [26, -29], [14, -48], [31, -46], [21, 0], [7, -13], [-8, -11], [25, -21], [21, -17], [23, -30], [3, -11], [-5, -21], [-15, 27], [-24, 10], [-12, -37], [20, -22], [-3, -30], [-12, -3], [-15, -50], [-11, -4], [0, 17], [5, 31], [6, 13], [-10, 33], [-9, 29], [-11, 7], [-9, 25], [-17, 11], [-12, 23], [-21, 3], [-22, 26], [-25, 38], [-19, 33], [-9, 57], [-14, 7], [-22, 19], [-13, -8], [-16, -27], [-11, -4]], [[5206, 7698], [-26, -33], [-54, 16], [-41, -19], [-3, -34]], [[5082, 7628], [1, -34], [-26, -38], [-35, -12], [-3, -20], [-17, -32], [-11, -46], [11, -33], [-16, -26], [-6, -37], [-21, -12], [-20, -44], [-35, -1], [-26, 1], [-18, -20], [-10, -22], [-14, 5], [-10, 19], [-8, 33], [-26, 9]], [[4792, 7318], [-11, -15], [-15, 8], [-14, -6], [4, 45], [-3, 35], [-12, 6], [-7, 22], [3, 37], [11, 21], [2, 23], [5, 35], [0, 24], [-6, 21], [-1, 20]], [[4748, 7594], [1, 41], [-11, 25], [39, 41], [34, -10], [38, 0], [29, -10], [23, 3], [45, -2]], [[4946, 7682], [15, 35], [5, 115], [-29, 60], [-20, 29], [-43, 22], [-3, 42], [36, 13], [47, -15], [-9, 65], [27, -24], [64, 44], [9, 48], [24, 11]], [[5069, 8127], [22, 12]], [[5091, 8139], [14, 15], [25, 85], [38, 24], [23, -1]], [[5191, 8262], [5, 12], [23, 3], [6, -13], [18, 29], [-6, 21], [-1, 33]], [[5236, 8347], [-11, 32], [-1, 59], [4, 15], [8, 18], [25, 3], [10, 16], [22, 16], [-1, -29], [-8, -19], [3, -16], [15, -9], [-7, -22], [-8, 7], [-20, -42], [8, -28]], [[5275, 8348], [0, -22], [28, -14], [0, -20], [28, 11], [16, 16], [31, -23], [13, -19]], [[5391, 8277], [19, 17], [43, 27], [35, 19], [28, -9], [2, -14], [27, -1]], [[5545, 8316], [6, 25], [39, 19]], [[5590, 8360], [-6, 48]], [[5584, 8408], [1, 44], [13, 36], [27, 20], [22, -43], [22, 1], [5, 44]], [[5674, 8510], [4, 34], [-11, -7], [-17, 20], [-3, 33], [35, 16], [35, 9], [31, -10], [28, 2]], [[5776, 8607], [32, 32], [-29, 27]], [[5779, 8666], [-51, -5], [-49, -21], [-45, -12], [-16, 32], [-27, 18], [6, 57], [-13, 52], [13, 34], [25, 36], [64, 62], [18, 12], [-2, 25], [-39, 27]], [[5663, 8983], [-48, -16], [-27, -41], [5, -35], [-45, -46], [-53, -50], [-21, -81], [20, -40], [27, -32], [-26, -65], [-29, -14], [-10, -96], [-16, -54], [-34, 5], [-15, -45], [-33, -3], [-8, 54], [-24, 66], [-21, 81]], [[5305, 8571], [-18, 35], [-55, -66], [-37, -14], [-39, 30], [-10, 62], [-8, 132], [25, 37], [74, 49], [54, 59], [51, 81], [67, 111], [47, 43], [76, 72], [61, 25], [45, -3], [43, 48], [50, -2], [50, 11], [87, -42], [-36, -16], [31, -36]], [[5863, 9187], [28, 20], [46, -34], [76, -14], [105, -65], [21, -28], [2, -38], [-31, -30], [-45, -16], [-124, 44], [-20, -7], [45, -42], [4, -86], [35, -17], [22, -15], [4, 28]], [[6031, 8887], [-18, 25], [19, 21]], [[6032, 8933], [67, -36], [23, 14], [-19, 42], [65, 57], [26, -3], [26, -21], [16, 40], [-23, 34], [13, 35], [-20, 35], [78, -18], [15, -32], [-35, -7], [0, -32], [22, -20], [43, 12], [7, 37], [58, 28], [97, 49], [21, -3], [-27, -35], [34, -6], [20, 20], [52, 1], [41, 24], [32, -34], [31, 38], [-29, 33], [15, 19], [82, -17], [38, -18], [101, -66], [18, 30]], [[6920, 9133], [-28, 30], [-1, 13]], [[6891, 9176], [-33, 5], [9, 28], [-15, 45], [-1, 18], [52, 52], [18, 53], [21, 11], [73, -15], [6, -32], [-26, -47], [17, -18], [9, -41], [-7, -79], [31, -35], [-12, -38], [-54, -82], [32, -9], [11, 21], [30, 15], [8, 28], [24, 28], [-17, 33], [13, 38], [-30, 4], [-7, 32], [22, 58], [-36, 47], [50, 39], [-6, 41], [14, 1], [14, -32], [-11, -55], [30, -11], [-13, 42], [47, 22], [57, 3], [52, -32], [-25, 48], [-3, 61], [48, 11], [67, -2], [60, 7], [-22, 31], [32, 37], [32, 2], [54, 29], [73, 7], [10, 16], [73, 5], [22, -13], [63, 31], [51, -1], [7, 25], [27, 24], [65, 24], [48, -19], [-38, -14], [63, -9], [8, -28], [25, 14], [81, -1], [63, -28]], [[8147, 9571], [22, -21], [-7, -30]], [[6357, 7389], [9, -43], [26, -12], [19, -29], [40, -10], [43, 16], [3, 13]], [[6497, 7324], [-5, 41], [4, 60], [-22, 19], [7, 40], [-18, 3], [6, 49], [26, -14], [24, 18], [-20, 35], [-8, 33], [-22, -15], [-3, -42], [-9, 37]], [[6457, 7588], [-1, 14], [7, 24], [-6, 20], [-32, 20], [-12, 51], [-16, 15], [-1, 19], [27, -6], [1, 42], [24, 10], [24, -9], [5, 56], [-5, 36], [-28, -3], [-23, 14], [-32, -25], [-26, -12]], [[6363, 7854], [-13, -34], [-27, -10], [-27, -59], [25, -55], [-3, -39], [30, -68]], [[6348, 7589], [15, -30], [14, -41], [13, -2], [9, -16], [-23, -5], [-5, -44], [-5, -20], [-10, -14], [1, -28]], [[2393, 9646], [-13, -2], [-52, 4], [-8, 16], [56, -1], [20, -11], [-3, -6]], [[1939, 9656], [-52, -17], [-41, 19], [22, 18], [41, 6], [39, -9], [-9, -17]], [[5686, 9665], [-62, -24], [-49, 14], [19, 15], [-17, 18], [58, 12], [11, -22], [40, -13]], [[1953, 9708], [-34, -11], [-46, 0], [1, 8], [28, 17], [15, -2], [36, -12]], [[2337, 9677], [-41, -12], [-22, 13], [-12, 22], [-3, 24], [36, -3], [17, -3], [33, -20], [-8, -21]], [[2220, 9692], [11, -24], [-46, 7], [-45, 18], [-62, 2], [27, 17], [-34, 14], [-2, 22], [54, -7], [76, -21], [21, -28]], [[7917, 9691], [-156, -22], [51, 75], [22, 7], [21, -4], [71, -32], [-9, -24]], [[5506, 9771], [91, -43], [-70, -22], [-15, -43], [-24, -10], [-14, -48], [-33, -2], [-60, 35], [25, 20], [-41, 17], [-54, 48], [-22, 46], [76, 20], [15, -20], [40, 1], [10, 20], [41, 2], [35, -21]], [[5706, 9812], [54, -20], [-41, -31], [-80, -7], [-82, 10], [-5, 16], [-40, 1], [-31, 26], [86, 16], [40, -14], [29, 17], [70, -14]], [[6419, 9820], [-37, -7], [-25, -5], [-4, -9], [-32, -10], [-30, 14], [15, 18], [-61, 2], [54, 10], [42, 1], [6, -16], [16, 14], [26, 10], [41, -13], [-11, -9]], [[7775, 9724], [-61, -7], [-77, 17], [-46, 22], [-22, 41], [-37, 11], [72, 40], [60, 13], [54, -29], [64, -56], [-7, -52]], [[2582, 9769], [34, -19], [-39, -17], [-51, -43], [-49, -4], [-58, 7], [-29, 24], [0, 21], [22, 15], [-51, -1], [-31, 20], [-17, 26], [19, 25], [19, 18], [29, 4], [-12, 13], [64, 3], [36, -31], [47, -12], [45, -11], [22, -38]], [[3096, 9967], [75, -4], [59, -7], [51, -16], [-1, -15], [-68, -25], [-67, -12], [-25, -13], [60, 0], [-65, -35], [-46, -16], [-47, -47], [-57, -9], [-18, -12], [-84, -6], [38, -8], [-19, -10], [23, -28], [-26, -20], [-43, -16], [-14, -23], [-38, -17], [4, -13], [47, 2], [1, -14], [-75, -34], [-72, 15], [-82, -9], [-41, 7], [-53, 3], [-3, 28], [51, 13], [-13, 42], [17, 4], [74, -25], [-38, 37], [-45, 11], [22, 22], [50, 14], [7, 20], [-39, 22], [-12, 30], [76, -2], [22, -7], [44, 21], [-63, 7], [-97, -4], [-49, 20], [-23, 23], [-33, 17], [-6, 20], [41, 11], [33, 2], [54, 9], [41, 21], [35, -3], [30, -16], [21, 31], [36, 10], [50, 6], [85, 2], [15, -6], [80, 10], [60, -4], [60, -4]], [[4246, 9991], [174, -45], [-51, -23], [-107, -2], [-149, -6], [14, -10], [98, 6], [84, -19], [54, 17], [23, -21], [-31, -33], [71, 21], [135, 23], [83, -11], [16, -25], [-113, -41], [-16, -13], [-89, -10], [65, -3], [-33, -42], [-22, -37], [1, -64], [33, -38], [-43, -2], [-46, -19], [51, -30], [7, -49], [-30, -5], [36, -50], [-62, -4], [32, -23], [-9, -21], [-39, -9], [-39, 0], [35, -39], [1, -25], [-55, 23], [-15, -15], [38, -14], [36, -36], [11, -46], [-50, -11], [-21, 22], [-34, 33], [9, -39], [-32, -30], [73, -3], [38, -3], [-74, -50], [-76, -45], [-81, -20], [-31, 0], [-28, -23], [-39, -60], [-60, -41], [-19, -2], [-37, -14], [-40, -14], [-24, -35], [0, -41], [-14, -38], [-45, -46], [11, -45], [-13, -47], [-14, -56], [-39, -4], [-41, 47], [-56, 0], [-26, 32], [-19, 56], [-48, 72], [-14, 37], [-4, 52], [-38, 53], [10, 43], [-19, 20], [27, 67], [42, 22], [11, 24], [6, 45], [-32, -21], [-15, -8], [-25, -8], [-34, 18], [-2, 39], [11, 31], [26, 1], [57, -15], [-48, 36], [-25, 20], [-28, -8], [-23, 14], [31, 54], [-17, 21], [-22, 40], [-33, 61], [-36, 22], [1, 24], [-75, 34], [-59, 4], [-74, -2], [-68, -4], [-32, 18], [-48, 36], [73, 18], [56, 4], [-119, 14], [-63, 24], [4, 22], [105, 28], [102, 28], [11, 21], [-75, 20], [24, 23], [96, 41], [40, 6], [-11, 26], [66, 15], [85, 9], [85, 0], [31, -18], [73, 32], [67, -21], [39, -5], [57, -19], [-66, 31], [4, 25], [93, 34], [98, -2], [35, 21], [98, 6], [222, -8]], [[6847, 7333], [15, 0], [21, -12]], [[6883, 7321], [8, -7], [21, 18], [9, -11], [9, 27], [16, -2], [5, 9], [3, 23], [12, 20], [15, -13], [-3, -18], [8, -2], [-3, -49], [11, -19], [10, 13], [12, 5], [18, 26], [19, -4], [29, 0]], [[7082, 7337], [5, -17]], [[7087, 7320], [-17, -6], [-14, -11], [-32, -7], [-29, -12], [-17, -25], [7, -24], [3, -29], [-14, -24], [1, -22], [-7, -21], [-27, 2], [11, -38], [-17, -15], [-12, -34], [1, -35], [-11, -16], [-10, 5], [-21, -7], [-3, -17], [-21, 1], [-15, -33], [-1, -49], [-36, -24], [-20, 5], [-5, -13], [-17, 8], [-28, -9], [-46, 30]], [[6690, 6900], [25, 52], [-2, 37], [-21, 10], [-3, 36], [-9, 46], [12, 32], [-12, 8], [8, 42], [11, 72]], [[6699, 7235], [28, -22], [21, 8], [6, 26], [22, 8], [16, 18], [5, 46], [24, 11], [4, 21], [13, -16], [9, -2]], [[5663, 4553], [3, -18], [-3, -28], [5, -27], [-4, -22], [2, -19], [-58, 0], [-1, -183], [19, -47], [18, -36]], [[5644, 4173], [-51, -24], [-67, 9], [-20, 27], [-112, -2], [-5, -4], [-16, 26], [-18, 1], [-17, -9], [-13, -11]], [[5341, 4831], [12, 7], [8, -1], [10, 7], [81, 0], [7, -43], [8, -35], [7, -19], [10, -30], [19, 5], [9, 8], [15, -8], [4, 14], [7, 34], [18, 2], [1, 10], [14, 0], [-2, -20], [33, 0], [1, -36], [6, -22], [-4, -35], [2, -35], [9, -22], [-2, -68], [7, 5], [12, -1], [18, 8], [12, -3]], [[5330, 4892], [11, 25], [9, 9], [10, -19]], [[5360, 4907], [-10, -12], [-5, -15], [-1, -25], [-7, -6]], [[5583, 7534], [-1, -15], [-9, -9], [-1, -18], [-13, -28]], [[5537, 7593], [-2, 19], [12, 28], [2, -11], [7, 5]], [[5556, 7634], [6, -15], [7, -6], [2, -21]], [[5571, 7592], [-4, -19], [4, -25], [12, -14]], [[6556, 6682], [6, -19]], [[6565, 6617], [-14, 0], [-2, -38], [5, -8], [-13, -11], [0, -23], [-8, -24], [-1, -23]], [[6532, 6490], [-5, -13], [-84, 29], [-10, 59], [-1, 13]], [[3139, 2021], [-17, 1], [-29, 0], [0, 129]], [[3258, 3901], [51, -94], [23, -9], [34, -42], [28, -23], [4, -25], [-27, -88], [28, -16], [31, -8], [22, 9], [25, 44], [5, 51]], [[3482, 3700], [14, 11], [13, -33], [0, -46], [-23, -32], [-19, -24], [-31, -55], [-38, -79]], [[3398, 3442], [-6, -46], [-8, -59], [0, -58], [-6, -12], [-2, -38]], [[3094, 2170], [-25, 9], [-67, 8], [-12, 34], [1, 43], [-19, -4], [-10, 21], [-2, 61], [21, 25], [9, 37], [-3, 29], [14, 49], [11, 76], [-3, 34], [12, 11], [-3, 22], [-13, 11], [9, 25], [-12, 21], [-7, 67], [11, 12], [-4, 70], [6, 59], [7, 51], [17, 21], [-8, 56], [0, 53], [21, 38], [-1, 48], [16, 56], [0, 53], [-7, 10], [-13, 100], [17, 59], [-3, 56], [10, 52], [18, 54], [20, 36], [-8, 23], [6, 18], [-1, 96], [30, 29], [9, 59], [-3, 15]], [[3135, 3873], [23, 52], [37, -14], [16, -42], [11, 47], [31, -3], [5, -12]], [[6291, 7414], [-10, -1]], [[6281, 7413], [-12, 33], [0, 9], [-12, 0], [-8, 15], [-6, -1]], [[6243, 7469], [-11, 17], [-20, 14], [2, 28], [-4, 20]], [[6210, 7548], [38, 9]], [[6248, 7557], [6, -15], [10, -10], [-5, -14], [15, -20], [-8, -18], [12, -16], [12, -10], [1, -40]], [[3371, 1488], [-12, -13], [-21, 9], [-22, -5], [-20, -14], [-20, -14], [-13, -17], [-4, -23], [2, -21], [13, -19], [-19, -14], [-27, -5], [-15, -19], [-16, -18], [-17, -25], [-5, -21], [10, -24], [15, -18], [22, -13], [22, -18], [11, -23], [6, -21], [8, -23], [13, -19], [8, -22], [4, -53], [8, -21], [3, -23], [8, -22], [-3, -31], [-16, -23], [-16, -20], [-37, -7], [-13, -21], [-16, -19], [-42, -21], [-37, -9], [-35, -13], [-38, -12], [-22, -24], [-45, -2], [-49, 2], [-44, -4], [-46, 0], [8, -23], [43, -10], [31, -16], [17, -20], [-31, -18], [-48, 5], [-39, -14], [-2, -24], [-1, -23], [33, -19], [6, -21], [35, -22], [59, -9], [50, -15], [39, -18], [51, -19], [69, -9], [68, -15], [47, -17], [52, -19], [27, -28], [14, -21], [34, 20], [45, 17], [49, 18], [57, 15], [50, 16], [69, 1], [68, -8], [56, -14], [18, 25], [39, 17], [70, 1], [55, 13], [52, 12], [58, 8], [61, 10], [43, 15], [-20, 20], [-12, 20], [0, 22], [-53, -2], [-57, -9], [-55, 0], [-8, 21], [4, 43], [13, 12], [40, 14], [46, 13], [34, 17], [34, 17], [25, 23], [38, 10], [37, 8], [19, 4], [43, 3], [41, 8], [34, 11], [34, 13], [31, 14], [38, 18], [25, 19], [26, 17], [8, 23], [-29, 13], [9, 24], [19, 18], [29, 11], [30, 14], [29, 18], [21, 22], [14, 27], [20, 16], [33, -3], [14, -19], [33, -3], [1, 22], [14, 22], [30, -5], [7, -22], [33, -3], [36, 10], [35, 7], [32, -3], [12, -24], [30, 19], [28, 10], [32, 8], [31, 8], [28, 14], [31, 9], [24, 12], [17, 20], [21, -14], [29, 8], [20, -28], [15, -20], [32, 11], [13, 23], [28, 16], [36, -4], [11, -21], [23, 21], [30, 7], [33, 2], [29, -1], [31, -6], [30, -4], [13, -19], [18, -17], [30, 10], [33, 2], [32, 0], [31, 2], [27, 7], [30, 7], [24, 16], [26, 10], [29, 6], [21, 16], [15, 31], [16, 19], [29, -9], [10, -20], [24, -13], [29, 4], [20, -20], [20, -15], [29, 14], [10, 24], [25, 11], [28, 19], [28, 8], [32, 11], [22, 12], [23, 14], [22, 12], [26, -6], [25, 20], [18, 16], [26, -2], [23, 14], [5, 20], [24, 16], [22, 11], [28, 9], [26, 5], [24, -3], [26, -6], [23, -16], [2, -25], [25, -19], [17, -16], [33, -6], [18, -16], [23, -16], [27, -3], [22, 11], [24, 24], [26, -13], [27, -7], [26, -6], [28, -5], [27, 0], [23, -60], [-1, -14], [-3, -26], [-27, -15], [-22, -21], [4, -23], [31, 1], [-3, -22], [-15, -22], [-13, -24], [22, -18], [32, -5], [32, 10], [15, 22], [9, 22], [15, 18], [18, 17], [7, 20], [15, 28], [17, 6], [32, 2], [27, 7], [29, 9], [13, 23], [8, 21], [19, 22], [28, 14], [23, 11], [15, 20], [16, 10], [20, 9], [28, -6], [25, 6], [27, 7], [31, -4], [20, 16], [14, 38], [10, -15], [13, -27], [24, -12], [26, -4], [27, 6], [28, -4], [26, -1], [18, 5], [23, -3], [21, -12], [25, 8], [30, 0], [26, 7], [29, -7], [18, 19], [14, 19], [19, 16], [35, 43], [18, -8], [21, -16], [19, -20], [35, -35], [27, -1], [26, 0], [30, 6], [30, 8], [23, 16], [19, 17], [31, 2], [20, 13], [22, -12], [14, -18], [20, -18], [30, 2], [19, -14], [34, -15], [34, -6], [29, 5], [22, 18], [18, 18], [25, 5], [25, -8], [29, -6], [26, 9], [25, 0], [25, -6], [26, -5], [25, 10], [29, 9], [29, 2], [31, 0], [26, 6], [25, 4], [8, 29], [1, 23], [17, -15], [5, -26], [9, -24], [12, -19], [23, -10], [32, 3], [36, 1], [25, 3], [36, 0], [27, 2], [36, -3], [31, -4], [20, -18], [-6, -22], [18, -17], [30, -13], [31, -15], [36, -10], [37, -9], [29, -9], [31, -1], [18, 19], [25, -16], [21, -18], [24, -13], [34, -6], [32, -7], [14, -22], [31, -14], [22, -20], [31, -9], [32, 1], [30, -3], [33, 1], [33, -5], [31, -8], [29, -13], [29, -12], [19, -17], [-3, -22], [-15, -20], [-12, -26], [-10, -21], [-13, -23], [-36, -9], [-17, -21], [-36, -12], [-12, -23], [-19, -21], [-20, -18], [-12, -24], [-7, -21], [-3, -26], [1, -22], [16, -22], [6, -22], [13, -20], [51, -8], [11, -25], [-50, -9], [-42, -12], [-53, -2], [-23, -33], [-5, -27], [-12, -22], [-15, -21], [37, -19], [14, -24], [24, -21], [34, -20], [39, -18], [41, -18], [64, -18], [14, -28], [80, -12], [6, -5], [20, -17], [77, 15], [64, -18], [48, -14], [-9998, -1], [25, 34], [50, -18], [3, 2], [29, 18], [4, 0], [3, -1], [41, -24], [35, 24], [6, 3], [82, 11], [26, -14], [13, -7], [42, -19], [79, -15], [62, -18], [108, -13], [80, 16], [118, -12], [66, -18], [74, 17], [77, 16], [6, 27], [-109, 2], [-90, 14], [-23, 23], [-75, 12], [5, 26], [10, 24], [11, 21], [-6, 24], [-46, 16], [-21, 20], [-43, 18], [67, -4], [64, 10], [41, -20], [49, 17], [46, 22], [22, 19], [-10, 24], [-35, 15], [-41, 17], [-57, 4], [-50, 8], [-54, 5], [-18, 22], [-36, 18], [-22, 20], [-9, 65], [14, -5], [25, -18], [46, 5], [44, 8], [23, -25], [44, 6], [37, 13], [35, 15], [31, 20], [42, 5], [-1, 22], [-10, 21], [8, 20], [36, 10], [16, -19], [43, 12], [32, 14], [40, 1], [37, 6], [38, 14], [30, 12], [33, 12], [22, -3], [19, -5], [42, 8], [37, -10], [38, 1], [36, 8], [38, -5], [41, -6], [39, 2], [40, -1], [41, -1], [38, 2], [29, 17], [33, 9], [35, -12], [33, 10], [30, 20], [18, -18], [10, -20], [18, -19], [29, 17], [33, -22], [37, -7], [33, -15], [39, 3], [35, 10], [42, -2], [37, -8], [39, -10], [14, 25], [-18, 19], [-13, 20], [-36, 5], [-16, 21], [-6, 22], [-10, 42], [21, -7], [37, -4], [36, 4], [32, -9], [29, -17], [12, -21], [37, -3], [36, 8], [38, 11], [35, 7], [28, -14], [37, 5], [24, 44], [22, -26], [32, -10], [35, 5], [23, -22], [36, -2], [34, -7], [33, -13], [22, 22], [11, 20], [28, -22], [38, 5], [28, -12], [19, -19], [37, 5], [29, 13], [28, 14], [34, 8], [39, 7], [35, 8], [28, 12], [16, 18], [6, 25], [-3, 24], [-9, 22], [-9, 23], [-9, 23], [-7, 20], [-2, 22], [3, 23], [13, 21], [11, 24], [4, 23], [-5, 25], [-4, 22], [14, 26], [15, 17], [18, 21], [19, 18], [23, 17], [10, 25], [16, 16], [17, 15], [27, 3], [17, 18], [20, 11], [23, 7], [20, 15], [16, 18], [21, 7], [17, -15], [-11, -19], [-28, -17]], [[6914, 2382], [18, -18], [26, -7], [1, -11], [-8, -26], [-43, -4], [0, 30], [4, 24], [2, 12]], [[5449, 7880], [-5, -10], [-25, -1], [-14, -13], [-23, 4]], [[5382, 7860], [-39, 15], [-6, 20], [-28, -10], [-3, -11], [-17, 8]], [[5289, 7882], [-14, 2], [-13, 10], [5, 14], [-2, 11]], [[5265, 7919], [9, 3], [14, -16], [4, 15], [24, -2], [20, 10], [14, -2], [8, -12], [3, 10], [-4, 38], [10, 7], [10, 26]], [[5377, 7996], [20, -18], [16, 23], [10, 5], [21, -18], [13, 3], [13, -11]], [[5470, 7980], [-2, -7], [3, -20]], [[5471, 7953], [-2, -23], [-16, -1], [5, -12], [-9, -37]], [[6281, 7413], [-19, 7], [-14, 27], [-5, 22]], [[6357, 7389], [-7, -3], [-18, 30], [10, 28], [-8, 17], [-11, -4], [-32, -43]], [[6248, 7557], [7, 10], [21, -17], [15, -3], [3, 6], [-13, 31], [7, 8]], [[6288, 7592], [8, -2], [19, -34], [12, -4], [5, 14], [16, 23]], [[5805, 5018], [17, -4], [9, 33], [14, -4]], [[5845, 5043], [2, -23], [6, -13], [0, -18], [-7, -13], [-11, -30], [-10, -20], [-11, -3]], [[5814, 4923], [-2, 69], [-7, 26]], [[5170, 8107], [-3, -39]], [[5167, 8068], [-7, -2], [-3, -32]], [[5157, 8034], [-25, 26], [-14, -4], [-19, 27], [-13, 23], [-13, 1], [-4, 20]], [[5091, 8139], [20, -5], [26, 12], [18, -25], [15, -14]], [[5024, 5815], [10, 7], [5, 25], [14, 5], [6, 18]], [[5059, 5870], [9, 16], [10, 1], [21, -34]], [[5099, 5853], [-1, -19], [6, -34], [-5, -23], [3, -16], [-14, -35], [-8, -18], [-5, -36], [0, -37], [-1, -93]], [[5051, 5536], [-7, 39], [1, 133], [-5, 11], [-1, 29], [-10, 20], [-9, 17], [4, 30]], [[4849, 5779], [-2, 34], [8, 24], [-1, 19], [22, 48], [4, 40], [8, 14], [13, -8], [12, 12], [4, 15], [21, 25], [5, 18], [26, 24], [16, 8], [7, -11], [17, 1]], [[5009, 6042], [-2, -28], [4, -27], [16, -37], [0, -28], [32, -13], [0, -39]], [[5024, 5815], [-24, 1]], [[5000, 5816], [-13, 5], [-9, -9], [-12, 4], [-49, -3], [0, -32], [3, -44]], [[4920, 5737], [-19, 15], [-13, -2], [-9, -15], [-13, 13], [-5, 19], [-12, 12]], [[7472, 6452], [-4, 47], [-10, 44], [5, 34], [-17, 16], [6, 21], [17, 21], [-20, 31], [10, 39], [22, -25], [13, -3], [3, -40], [26, -8], [26, 1], [16, -10], [-13, -49], [-12, -3], [-9, -33], [15, -29], [5, 36], [7, 1], [15, -92]], [[7573, 6451], [-1, -41], [-9, 9], [2, -47]], [[5777, 7601], [-24, 8], [-29, -19]], [[5724, 7590], [0, -28], [-25, -6], [-20, 20], [-22, -15], [-20, 1]], [[5637, 7562], [-2, 38], [-14, 19]], [[5621, 7619], [4, 8], [-3, 7], [5, 18], [10, 18], [-13, 25], [-3, 21], [7, 13]], [[5628, 7729], [8, -24], [11, 5], [21, -9], [41, -3], [14, 14], [33, 14], [20, -21], [16, -6]], [[5533, 7688], [-5, -5], [-9, -13], [-4, -32]], [[5515, 7638], [-25, 22], [-11, 24], [-10, 12], [-13, 22], [-6, 18], [-14, 27], [6, 24], [10, -14], [6, 12], [13, 2], [24, -10], [19, 1], [13, -13]], [[5527, 7765], [10, 0], [-7, -25], [13, -22], [-4, -27], [-6, -3]], [[5735, 8384], [17, 10], [30, 22]], [[5782, 8416], [29, -14], [4, -14], [14, 6], [28, -13], [2, -27], [-6, -16], [18, -38], [11, -10], [-2, -10], [19, -11], [8, -15], [-11, -12], [-22, 2], [-5, -6], [6, -19], [7, -37]], [[5882, 8182], [-24, -3], [-9, -13], [-1, -29], [-11, 6], [-25, -3], [-8, 13], [-10, -10], [-11, 9], [-21, 1], [-31, 14], [-29, 4], [-21, -1], [-15, -16], [-14, -2]], [[5652, 8152], [0, 26], [-9, 26], [17, 12], [0, 23], [-8, 22], [-1, 25]], [[5651, 8286], [27, 0], [30, 22], [7, 32], [22, 19], [-2, 25]], [[2529, 6097], [-8, 0], [2, 65], [0, 45]], [[2523, 6207], [0, 9], [3, 3], [5, -7], [10, 34], [5, 1]], [[3135, 3873], [-20, -8], [-11, 79], [-15, 65], [9, 56], [-15, 24], [-3, 41], [-14, 40]], [[3066, 4170], [18, 62], [-12, 48], [6, 20], [-5, 21], [11, 29], [0, 49], [2, 40], [6, 20], [-24, 92]], [[3068, 4551], [20, -5], [15, 2], [6, 17], [24, 23], [15, 22], [36, 10], [-3, -43], [4, -22], [-3, -39], [31, -52], [31, -9], [11, -22], [18, -11], [12, -17], [17, 1], [17, -17], [1, -34], [5, -16], [1, -25], [-9, -1], [11, -67], [53, -3], [-4, -33], [3, -23], [15, -16], [7, -36], [-5, -45], [-8, -25], [3, -33], [-9, -12]], [[3383, 4020], [0, 18], [-26, 29], [-26, 1], [-48, -17], [-13, -50], [-1, -31], [-11, -69]], [[3482, 3700], [5, 33], [4, 34], [0, 32], [-10, 10], [-10, -9], [-11, 2], [-3, 23], [-3, 52], [-5, 18], [-19, 15], [-11, -11], [-29, 11], [2, 78], [-9, 32]], [[3068, 4551], [-16, -10], [-12, 7], [1, 87], [-22, -33], [-25, 1], [-10, 31], [-19, 3], [6, 25], [-15, 35], [-12, 52], [7, 10], [0, 25], [17, 16], [-3, 31], [7, 20], [2, 27], [32, 39], [23, 12], [4, 8], [25, -3]], [[3058, 4934], [12, 158], [1, 25], [-5, 33], [-12, 21], [0, 42], [16, 10], [6, -6], [0, 22], [-16, 6], [0, 36], [54, -2], [9, 20], [8, -18], [5, -34], [6, 7]], [[3142, 5254], [15, -30], [21, 3], [6, 18], [20, 13], [12, 10], [3, 24], [20, 17], [-2, 12], [-23, 5], [-4, 36], [1, 39], [-12, 15], [5, 5], [21, -8], [22, -14], [8, 14], [20, 9], [31, 21], [10, 22], [-4, 16]], [[3312, 5481], [15, 3], [6, -13], [-4, -26], [10, -8], [6, -27], [-7, -20], [-5, -49], [7, -29], [2, -27], [17, -27], [14, -3], [3, 11], [9, 3], [12, 10], [9, 15], [16, -5], [7, 2]], [[3429, 5291], [15, -4], [2, 11], [-4, 12], [2, 17], [12, -6], [13, 6], [16, -12]], [[3485, 5315], [12, -12], [8, 16], [7, -3], [3, -16], [14, 4], [10, 22], [9, 43], [16, 52]], [[3517, 3237], [-8, 33], [12, 27], [-16, 40], [-22, 31], [-28, 37], [-11, -1], [-28, 44], [-18, -6]], [[8206, 5496], [-2, -29], [-1, -36], [-13, 1], [-6, -19], [-13, 30]], [[7466, 6754], [18, 43], [15, 14], [20, -13], [15, -1], [12, -16]], [[7546, 6781], [11, -18], [-2, -36], [-22, -1], [-24, 4], [-17, -9], [-26, 21], [0, 12]], [[5816, 3910], [-39, -43], [-25, -43], [-9, -38], [-8, -22], [-15, -4], [-5, -28], [-3, -18], [-18, -13], [-23, 3], [-13, 16], [-12, 7], [-13, -13], [-7, -28], [-13, -17], [-14, -26], [-20, -6], [-6, 20], [3, 35], [-17, 55], [-7, 9]], [[5552, 3756], [0, 168], [27, 2], [1, 205], [20, 2], [43, 20], [11, -24], [18, 23], [8, 0], [16, 13]], [[5696, 4165], [5, -4]], [[5701, 4161], [10, -46], [6, -11], [9, -33], [31, -63], [12, -6], [0, -21], [8, -36], [22, -9], [17, -26]], [[5634, 5824], [3, -25], [16, -36], [0, -24], [-4, -24], [2, -17], [9, -17]], [[5660, 5681], [21, -25]], [[5681, 5656], [16, -23], [0, -19], [19, -30], [11, -25], [7, -35], [21, -22], [4, -19]], [[5759, 5483], [-9, -6], [-18, 2], [-21, 6], [-10, -5], [-4, -14], [-9, -2], [-11, 12], [-31, -29], [-13, 6], [-3, -4], [-9, -35], [-20, 11], [-21, 6], [-17, 21], [-23, 20], [-15, -19], [-11, -29], [-2, -40]], [[5512, 5384], [-18, 3], [-19, 10], [-17, -31], [-14, -53]], [[5444, 5313], [-3, 16], [-1, 26], [-13, 19], [-10, 30], [-3, 20], [-13, 30], [2, 18], [-2, 24], [2, 45], [6, 10], [14, 58]], [[5423, 5609], [23, 5], [5, 14], [5, -1], [7, -13], [35, 22], [12, 23], [14, 20], [-2, 20], [7, 6], [27, -4], [26, 27], [20, 62], [14, 24], [18, 10]], [[1300, 8301], [13, -7], [27, 4], [-9, -65], [25, -46], [-12, 0], [-16, 26], [-11, 27], [-14, 18], [-5, 25], [2, 18]], [[3134, 7781], [-18, 33], [0, 78], [-12, 17], [-19, -10], [-9, 15], [-21, -43], [-9, -45], [-10, -26], [-11, -9], [-9, -3], [-3, -14], [-51, 0], [-42, -1], [-13, -10], [-29, -42], [-4, -4], [-9, -23], [-25, 0], [-27, 0], [-13, -9], [4, -11], [3, -18], [-1, -6], [-36, -28], [-28, -10], [-33, -30], [-7, 0], [-9, 9], [-3, 8], [0, 6], [6, 20], [14, 32], [8, 34], [-6, 50], [-6, 52], [-29, 27], [4, 10], [-4, 8], [-8, 0], [-6, 9], [-1, 13], [-5, -6], [-8, 2], [2, 6], [-7, 5], [-2, 16], [-22, 18], [-22, 19], [-28, 22], [-26, 21], [-25, -16], [-9, 0], [-34, 14], [-22, -7], [-27, 18], [-29, 9], [-19, 4], [-9, 9], [-5, 32], [-9, 0], [0, -22], [-58, 0], [-95, 0], [-94, 0], [-83, 0], [-84, 0], [-82, 0], [-84, 0], [-28, 0], [-82, 0], [-79, 0]], [[1373, 8338], [16, 27], [-1, 37], [-47, 36], [-29, 66], [-17, 41], [-25, 26], [-19, 24], [-15, 30], [-28, -19], [-27, -32], [-24, 38], [-20, 25], [-27, 16], [-27, 2], [0, 327], [0, 214]], [[1440, 9241], [19, -7], [47, -51]], [[2457, 9224], [-25, -29], [52, -11]], [[1972, 9143], [-71, -9], [-49, -6]], [[1501, 9320], [12, 25], [19, 42]], [[1653, 9318], [0, -26], [-73, -27]], [[5289, 7882], [-2, -23], [-12, -10], [-21, 7], [-6, -23], [-13, -2], [-5, 9], [-16, -19], [-13, -3], [-12, 12]], [[5189, 7830], [-9, 26], [-14, -9], [1, 26], [20, 32], [-1, 15], [13, -6], [7, 10]], [[5206, 7924], [24, 0], [6, 12], [29, -17]], [[3139, 2021], [-9, -23], [-24, -18]], [[3106, 1980], [-13, 2], [-17, 4]], [[3076, 1986], [-20, 17], [-29, 9], [-35, 32], [-28, 31], [-39, 64], [23, -12], [39, -38], [37, -21], [14, 27], [9, 39], [26, 24], [20, -7]], [[3044, 4125], [15, 15], [7, 30]], [[8628, 7623], [-18, 34], [-11, -32], [-43, -25], [4, -30], [-24, 2], [-13, 18], [-19, -41], [-31, -31], [-23, -37]], [[8000, 6423], [-28, 15], [-13, 23], [4, 34], [-25, 10], [-13, 22], [-24, -31], [-27, -7], [-22, 1], [-15, -14]], [[7837, 6476], [-15, -9], [5, -66], [-15, 2], [-3, 13]], [[7809, 6416], [-1, 24], [-20, -17], [-12, 11], [-21, 22], [9, 47], [-18, 12], [-7, 53], [-29, -10], [3, 68], [27, 48], [1, 48], [-1, 44], [-12, 14], [-9, 34], [-17, -5]], [[7702, 6809], [-30, 9], [10, 24], [-13, 36], [-20, -24], [-23, 14], [-32, -37], [-26, -43], [-22, -7]], [[7466, 6754], [-3, 45], [-16, -12]], [[7447, 6787], [-33, 6], [-31, 13], [-23, 25], [-21, 12], [-10, 27], [-15, 9], [-28, 37], [-23, 18], [-11, -14]], [[7252, 6920], [-39, 40], [-27, 37], [-8, 63], [20, -8], [1, 30], [-11, 29], [3, 47], [-30, 68]], [[7161, 7226], [-46, 23], [-8, 44], [-20, 27]], [[7082, 7337], [-5, 33], [1, 22], [-16, 13], [-10, -6], [-7, 54]], [[7045, 7453], [8, 13], [-4, 13], [27, 27], [19, 12], [30, -8], [10, 37], [36, 7], [10, 22], [43, 32], [4, 13]], [[7228, 7621], [-2, 32], [19, 15], [-25, 100], [55, 23], [14, 13], [20, 103], [55, -19], [16, 26], [1, 58], [23, 6], [21, 38]], [[7425, 8016], [11, 5]], [[7436, 8021], [8, -41], [23, -30], [40, -22], [19, -46], [-11, -67], [10, -25], [33, -10], [37, -8], [34, -36], [17, -6], [13, -54], [16, -34], [31, 2], [57, -13], [37, 8], [27, -9], [41, -35], [34, 0], [12, -18], [33, 31], [45, 20], [41, 2], [33, 21], [20, 30], [19, 20], [-4, 19], [-9, 22], [14, 37], [16, -5], [28, -12], [28, 31], [42, 22], [21, 38], [19, 17], [41, 7], [22, -6], [3, 20], [-25, 40], [-23, 19], [-21, -21], [-28, 9], [-15, -8], [-7, 24], [19, 57], [14, 44]], [[8240, 8055], [33, -22], [39, 36], [0, 26], [25, 61], [16, 18], [-1, 32], [-15, 14], [23, 28], [34, 11], [37, 1], [42, -17], [24, -21], [17, -58], [11, -25], [9, -35], [11, -57], [48, -18], [33, -41], [11, -54], [42, 0], [24, 23], [46, 16], [-14, -51], [-11, -21], [-10, -63], [-18, -57], [-34, 11], [-24, -21], [8, -49], [-4, -68], [-15, -2], [1, -29]], [[4785, 5433], [2, 48], [3, 7], [-1, 23], [-12, 24], [-9, 4], [-8, 15], [6, 26], [-3, 28], [2, 17]], [[4765, 5625], [4, 0], [2, 25], [-3, 11], [3, 8], [10, 7], [-6, 46], [-7, 24], [2, 19], [6, 5]], [[4776, 5770], [4, 5], [7, -9], [22, 0], [5, 17], [5, -2], [8, 7], [4, -25], [6, 8], [12, 8]], [[4920, 5737], [8, -82], [-12, -48], [-7, -65], [12, -50], [-1, -22]], [[5312, 5312], [-45, 1]], [[5235, 5457], [7, 41], [13, 55], [8, 1], [17, 33], [11, 1], [15, -23], [19, 19], [3, 24], [6, 23], [4, 29], [15, 24], [6, 40], [6, 13], [4, 30], [7, 37], [23, 44], [2, 19], [3, 11], [-11, 23]], [[5393, 5901], [1, 18], [8, 3]], [[5402, 5922], [11, -36], [2, -39], [-1, -38], [15, -52], [-16, 0], [-8, -4], [-12, 6], [-6, -27], [16, -34], [12, -10], [4, -23], [9, -40], [-5, -16]], [[5444, 5313], [-2, -32], [-22, 14], [-23, 15], [-35, 3]], [[5362, 5313], [-3, 3], [-17, -8], [-17, 8], [-13, -4]], [[5821, 5105], [-8, -16], [-1, -35], [-4, -4], [-3, -32]], [[5814, 4923], [5, -53], [-3, -30], [6, -33], [16, -33], [15, -72]], [[5853, 4702], [-11, 6], [-37, -10], [-8, -7], [-8, -37], [6, -25], [-5, -68], [-3, -58], [8, -10], [19, -23], [8, 11], [2, -62], [-21, 0], [-12, 32], [-10, 24], [-21, 8], [-7, 31], [-16, -19], [-23, 8], [-9, 26], [-18, 6], [-13, -2], [-1, 18], [-10, 2]], [[5360, 4907], [7, -6], [10, 22], [15, -1], [2, -16], [10, -10], [16, 36], [17, 28], [7, 18], [-1, 48], [12, 56], [12, 29], [19, 28], [3, 19], [1, 21], [4, 20], [-1, 32], [3, 51], [6, 36], [8, 31], [2, 35]], [[5759, 5483], [17, -47], [13, -7], [7, 10], [13, -4], [15, 12], [7, -25], [24, -38]], [[5855, 5384], [-1, -67], [11, -8], [-9, -21], [-11, -15], [-10, -30], [-6, -27], [-2, -46], [-6, -22], [0, -43]], [[5307, 4953], [21, 32], [-10, 38], [9, 14], [19, 7], [2, 26], [15, -28], [25, -2], [8, 27], [4, 38], [-3, 45], [-14, 34], [13, 67], [-7, 11], [-21, -4], [-8, 29], [2, 26]], [[2836, 5598], [3, 28], [9, -4], [6, 17], [-7, 34], [4, 8]], [[3018, 5860], [-18, -10], [-7, -28], [-11, -17], [-8, -21], [-3, -41], [-8, -34], [14, -4], [4, -26], [6, -13], [2, -23], [-3, -22], [1, -12], [7, -4], [6, -20], [36, 5], [16, -7], [20, -50], [11, 6], [20, -3], [16, 7], [10, -10], [-5, -31], [-7, -19], [-2, -42], [6, -38], [8, -17], [1, -13], [-14, -29], [10, -12], [7, -20], [9, -58]], [[3058, 4934], [-14, 31], [-8, 1], [17, 59], [-21, 27], [-17, -5], [-10, 10], [-15, -15], [-21, 7], [-16, 60], [-13, 15], [-9, 27], [-18, 28], [-7, -6]], [[2906, 5173], [-12, 14], [-14, 19], [-8, -9], [-23, 8], [-7, 25], [-5, -1], [-28, 32]], [[2618, 5820], [5, 8], [18, -15], [6, 7], [9, -5], [5, -12], [8, -3], [6, 12]], [[2706, 5733], [-10, -5], [0, -24], [5, -8], [-4, -7], [1, -10], [-2, -12], [-1, -11]], [[2714, 6517], [24, -4], [22, -1], [26, -19], [11, -21], [26, 6], [10, -13], [23, -36], [18, -26], [9, 1], [16, -12], [-2, -16], [21, -2], [21, -24], [-4, -13], [-18, -8], [-19, -3], [-19, 5], [-40, -6], [19, 32], [-11, 15], [-18, 4], [-10, 17], [-6, 33], [-16, -3], [-26, 16], [-8, 12], [-37, 9], [-9, 11], [10, 14], [-27, 3], [-20, -30], [-12, 0], [-4, -14], [-13, -7], [-12, 6], [14, 18], [7, 20], [12, 13], [14, 11], [21, 6], [7, 6]], [[5943, 7201], [-3, 2], [-6, -5], [-4, 2], [-1, -3], [-1, 6], [-2, 4], [-5, 0], [-8, -5], [-5, 3]], [[5377, 7996], [-16, 25], [-14, 14], [-3, 24], [-5, 17], [20, 13], [10, 14], [20, 11], [7, 11], [8, -6], [12, 6]], [[5416, 8125], [13, -19], [21, -5], [-2, -16], [15, -11], [5, 14], [19, -6], [2, -18], [21, -4], [13, -28]], [[5523, 8032], [-9, 0], [-4, -10], [-6, -3], [-2, -13], [-5, -3], [-1, -5], [-10, -6], [-12, 1], [-4, -13]], [[5391, 8277], [7, -29], [-8, -15], [10, -21], [7, -31], [-2, -19], [11, -37]], [[5206, 7924], [4, 41], [14, 40], [-40, 10], [-13, 15]], [[5171, 8030], [1, 25], [-5, 13]], [[5170, 8107], [-5, 61], [17, 0], [7, 21], [7, 53], [-5, 20]], [[5236, 8347], [21, -8], [18, 9]], [[6197, 5842], [-10, -31]], [[6187, 5811], [-6, 10], [-7, -4], [-15, 1], [-1, 18], [-2, 16], [10, 27], [9, 25]], [[6175, 5904], [12, -5], [9, 14]], [[3007, 6221], [1, 16], [-7, 17], [6, 10], [3, 22], [-3, 31]], [[5118, 6285], [-31, -6], [-1, 37], [-12, 9], [-18, 17], [-6, 27], [-94, 125], [-94, 126]], [[4862, 6620], [-104, 139]], [[4758, 6759], [0, 12], [0, 4]], [[4758, 6775], [0, 68], [45, 42], [28, 9], [22, 15], [11, 29], [32, 23], [2, 43], [16, 5], [12, 21], [37, 10], [5, 22], [-8, 12], [-9, 61], [-2, 35], [-10, 37]], [[5233, 7309], [-6, -29], [5, -55], [-7, -47], [-17, -33], [2, -43], [23, -34], [0, -14], [18, -23], [11, -104]], [[5262, 6927], [9, -51], [2, -26], [-5, -47], [2, -27], [-4, -31], [3, -36], [-11, -24], [16, -42], [1, -25], [10, -32], [13, 10], [22, -26], [12, -36]], [[5332, 6534], [-95, -110], [-80, -113], [-39, -26]], [[2906, 5173], [3, -44], [-8, -37], [-31, -60], [-33, -23], [-17, -50], [-5, -39], [-16, -24], [-12, 29], [-11, 7], [-11, -5], [-1, 21], [8, 14], [-3, 24]], [[6023, 6449], [-110, 0], [-108, 0], [-112, 0]], [[5693, 6449], [0, 212], [0, 205], [-8, 46], [7, 36], [-4, 24], [10, 28]], [[5951, 6980], [18, -99]], [[6011, 6012], [-3, 23], [12, 85], [3, 38], [8, 18], [21, 9], [14, 33]], [[6175, 5904], [-9, 19], [-12, 34], [-12, 18], [-7, 20], [-24, 23], [-19, 1], [-7, 12], [-16, -14], [-17, 26], [-9, -43], [-32, 12]], [[4946, 7682], [11, -22], [51, -26], [10, 12], [32, -26], [32, 8]], [[4792, 7318], [-2, 19], [10, 22], [4, 15], [-10, 18], [8, 37], [-11, 35], [12, 5], [1, 27], [4, 8], [1, 45], [13, 16], [-8, 29], [-16, 2], [-5, -8], [-17, 0], [-7, 29], [-11, -9], [-10, -14]], [[5776, 8607], [4, -10], [-19, -33], [8, -54], [-12, -18]], [[5757, 8492], [-23, 0], [-24, 21], [-12, 7], [-24, -10]], [[6187, 5811], [-6, -20], [10, -32], [11, -28], [10, -20], [91, -69], [23, 1]], [[6326, 5643], [-78, -173], [-36, -3], [-25, -40], [-18, -1], [-7, -18]], [[6162, 5408], [-19, 0], [-12, 19], [-25, -24], [-8, -24], [-19, 5], [-6, 6], [-6, -1], [-9, 0], [-35, 49], [-20, 0], [-9, 19], [0, 32], [-15, 10]], [[5979, 5499], [-16, 63], [-13, 13], [-5, 23], [-14, 28], [-17, 4], [10, 33], [15, 1], [4, 18]], [[5943, 5682], [-1, 52]], [[5942, 5734], [9, 60], [13, 16], [2, 24], [12, 44], [17, 28], [11, 57], [5, 49]], [[5663, 8983], [-9, 22], [-1, 89], [-44, 39], [-37, 28]], [[5572, 9161], [17, 16], [31, -31], [36, 3], [30, -14], [27, 25], [13, 43], [43, 19], [36, -23], [-12, -40]], [[5793, 9159], [-4, -40], [43, -39], [-26, -43], [32, -66], [-18, -49], [25, -43], [-12, -37], [41, -40], [-10, -29], [-26, -34], [-59, -73]], [[3299, 2196], [33, 35], [24, -15], [17, 23], [22, -25], [-8, -21], [-38, -17], [-12, 20], [-24, -26], [-14, 26]], [[3485, 5315], [7, 25], [2, 26]], [[3494, 5366], [5, 25], [-11, 34]], [[3488, 5425], [-2, 39], [14, 49]], [[5157, 8034], [6, -5], [8, 1]], [[5189, 7830], [-1, -16], [8, -22], [-10, -17], [8, -45], [15, -7], [-3, -25]], [[5263, 5240], [9, 3], [40, 0], [0, 69]], [[4827, 8284], [-21, 12], [-17, -1], [5, 31], [-5, 31]], [[4968, 8327], [19, -9], [17, -65], [8, -23], [34, -11], [-4, -37], [-14, -17], [11, -30], [-25, -30], [-37, 1], [-47, -16], [-13, 11], [-18, -27], [-26, 7], [-20, -22], [-14, 11], [40, 61], [25, 12], [-43, 10], [-8, 23], [29, 18], [-15, 31], [5, 37], [41, -5], [4, 34]], [[4917, 8291], [-18, 35], [-1, 1]], [[4898, 8327], [-34, 10], [-6, 16], [10, 25], [-9, 16], [-15, -27], [-2, 55], [-14, 30], [10, 59], [22, 47], [22, -5], [34, 5], [-30, -62], [28, 8], [31, 0], [-8, -47], [-25, -52], [29, -4]], [[4941, 8401], [2, -6], [25, -68]], [[6109, 7683], [3, 7], [24, -10], [41, -9], [37, -28], [5, -11], [17, 9], [26, -12], [8, -23], [18, -14]], [[6210, 7548], [-27, 28], [-30, -2]], [[5000, 5816], [-2, -17], [11, -30], [0, -42], [3, -45], [7, -21], [-6, -52], [2, -29], [7, -36], [6, -21]], [[4715, 5666], [-8, -3], [1, 21], [-5, 15], [1, 17], [-6, 24], [-8, 20], [-22, 1], [-6, -11], [-8, -2], [-5, -12], [-3, -16], [-15, -25]], [[4579, 5818], [12, 28], [9, -1], [7, 9], [6, 0], [4, 8], [-2, 19], [3, 6], [0, 20]], [[4618, 5907], [14, -1], [20, -14], [6, 1], [2, 7], [15, -5], [4, 3]], [[4679, 5898], [2, -21], [4, 0], [7, 8], [5, -2], [8, -14], [12, -5], [7, 12], [9, 8], [7, 8], [5, -1], [7, -13], [3, -16], [11, -24], [-5, -15], [-1, -19], [5, 6], [4, -7], [-2, -17], [9, -16]], [[4765, 5625], [-8, 1], [-6, -23], [-8, 0], [-5, 12], [2, 24], [-12, 35], [-7, -7], [-6, -1]], [[4535, 5965], [30, 1], [6, 14], [9, 1], [11, -14], [9, 0], [9, 9], [5, -16], [-12, -13], [-12, 1], [-12, 12], [-10, -13], [-5, -1], [-6, -8], [-26, 1]], [[4536, 5895], [14, 10], [10, -2], [7, 6], [51, -2]], [[5583, 7534], [18, 5], [11, 12], [15, -1], [4, 10], [6, 2]], [[5724, 7590], [14, -15], [-9, -36], [-6, -6]], [[3700, 9940], [93, 34], [98, -2], [35, 21], [98, 6], [222, -8], [174, -45], [-51, -23], [-107, -2], [-149, -6], [14, -10], [98, 6], [84, -19], [54, 17], [23, -21], [-31, -33], [71, 21], [135, 23], [83, -11], [16, -25], [-113, -41], [-16, -13], [-89, -10], [65, -3], [-33, -42], [-22, -37], [1, -64], [33, -38], [-43, -2], [-46, -19], [51, -30], [7, -49], [-30, -5], [36, -50], [-62, -4], [32, -23], [-9, -21], [-39, -9], [-39, 0], [35, -39], [1, -25], [-55, 23], [-15, -15], [38, -14], [36, -36], [11, -46], [-50, -11], [-21, 22], [-34, 33], [9, -39], [-32, -30], [73, -3], [38, -3], [-74, -50], [-76, -45], [-81, -20], [-31, 0], [-28, -23], [-39, -60], [-60, -41], [-19, -2], [-37, -14], [-40, -14], [-24, -35], [0, -41], [-14, -38], [-45, -46], [11, -45], [-13, -47], [-14, -56], [-39, -4], [-41, 47], [-56, 0], [-26, 32], [-19, 56], [-48, 72], [-14, 37], [-4, 52], [-38, 53], [10, 43], [-19, 20], [27, 67], [42, 22], [11, 24], [6, 45], [-32, -21], [-15, -8], [-25, -8], [-34, 18], [-2, 39], [11, 31], [26, 1], [57, -15], [-48, 36], [-25, 20], [-28, -8], [-23, 14], [31, 54], [-17, 21], [-22, 40], [-33, 61], [-36, 22], [1, 24], [-75, 34], [-59, 4], [-74, -2], [-68, -4], [-32, 18], [-48, 36], [73, 18], [56, 4], [-119, 14], [-63, 24], [4, 22], [105, 28], [102, 28], [11, 21], [-75, 20], [24, 23], [96, 41], [40, 6], [-11, 26], [66, 15], [85, 9], [85, 0], [31, -18], [73, 32], [67, -21], [39, -5], [57, -19], [-66, 31], [4, 25]], [[2437, 6019], [1, 17], [3, 13], [-4, 11], [14, 47], [35, 0], [1, 20], [-4, 3], [-4, 13], [-10, 13], [-10, 19], [12, 1], [0, 32], [26, 0], [26, -1]], [[2549, 6088], [-13, -22], [-13, -16], [-2, -12], [2, -11], [-6, -14]], [[2517, 6013], [-6, -4], [1, -7], [-5, -6], [-10, -15], [0, -8]], [[3412, 5526], [-5, -52], [-17, -15], [2, -13], [-5, -30], [12, -42], [9, 0], [4, -33], [17, -50]], [[3312, 5481], [-19, 44], [8, 16], [-1, 27], [17, 9], [7, 11], [-9, 21], [2, 21], [22, 34]], [[2561, 5953], [1, 23], [-3, 6], [-6, 4], [-12, -7], [-1, 8], [-9, 9], [-6, 12], [-8, 5]], [[2690, 6045], [-10, 2], [-4, -8], [-9, -8], [-7, 0], [-7, -7], [-5, 3], [-5, 8], [-3, -1], [-3, -14], [-3, 0], [0, -11], [-10, -16], [-5, -7], [-3, -7], [-8, 11], [-6, -15], [-6, 0], [-7, -1], [1, -28], [-4, -1], [-4, -13], [-8, -2]], [[5515, 7638], [-4, -10]], [[5380, 7802], [19, -2], [5, 10], [10, -10], [11, -1], [0, 16], [9, 6], [3, 23], [22, 16]], [[5459, 7860], [9, -7], [21, -25], [23, -11], [10, 9]], [[5522, 7826], [7, -23], [9, -16], [-11, -22]], [[5471, 7953], [14, -15], [10, -6], [23, 7], [3, 12], [11, 1], [13, 9], [3, -3], [13, 7], [7, 13], [9, 4], [30, -18], [5, 6]], [[5612, 7970], [16, -15], [2, -16]], [[5630, 7939], [-17, -12], [-13, -39], [-17, -39], [-22, -11]], [[5561, 7838], [-18, 3], [-21, -15]], [[5459, 7860], [-5, 19], [-5, 1]], [[8470, 4670], [3, -11], [0, -18]], [[8915, 5032], [1, -187], [0, -188]], [[8045, 5298], [5, -39], [19, -33], [17, 12], [18, -4], [16, 29], [14, 5], [26, -16], [23, 12], [14, 80], [11, 20], [9, 66], [32, 0], [24, -10]], [[7252, 6920], [-18, -26], [-11, -54], [27, -22], [27, -28], [36, -32], [38, -8], [16, -29], [21, -6], [34, -13], [23, 1], [3, 23], [-4, 36], [3, 25]], [[7702, 6809], [2, -21], [-9, -11], [2, -35], [-20, 10], [-36, -40], [1, -33], [-15, -48], [-2, -28], [-12, -48], [-22, 13], [-1, -59], [-6, -20], [3, -24], [-14, -14]], [[6893, 6546], [18, 39], [61, -1], [-5, 50], [-16, 29], [-3, 44], [-18, 26], [30, 61], [33, -5], [29, 61], [17, 58], [27, 58], [0, 41], [23, 33], [-22, 29], [-10, 39], [-10, 50], [14, 25], [42, -14], [31, 8], [27, 49]], [[6690, 6900], [14, -31], [11, -34], [26, -26], [1, -50], [13, -10], [3, -26], [-40, -30], [-11, -67]], [[6348, 6905], [-15, 31], [-1, 30], [-9, 0], [5, 42], [-14, 44], [-34, 31], [-20, 55], [7, 45], [14, 20], [-2, 33], [-18, 18], [-18, 68]], [[6243, 7322], [-16, 46], [6, 18], [-9, 66], [19, 17]], [[6497, 7324], [24, 11], [20, 33], [18, -2], [13, 11], [19, -5], [31, -29], [22, -7], [32, -51], [21, -2], [2, -48]], [[6331, 6908], [-18, 5], [-21, -55]], [[6292, 6858], [-51, 4], [-79, 116], [-41, 40], [-33, 16]], [[6088, 7034], [-12, 70]], [[6076, 7104], [62, 60], [10, 70], [-2, 42], [15, 14], [14, 36]], [[6175, 7326], [12, 9], [32, -8], [10, -14], [14, 9]], [[5982, 6995], [1, -22], [-14, -92]], [[5975, 7087], [9, 0], [2, 10], [8, 1]], [[5994, 7098], [0, -23], [-3, -9], [0, -1]], [[5991, 7065], [-5, -18]], [[5986, 7047], [-10, 8], [-6, -38], [7, -7], [-7, -7], [-1, -16], [13, 8]], [[5382, 7860], [-3, -28], [7, -25]], [[2845, 6247], [18, -5], [15, -14], [5, -16], [-20, -1], [-8, -10], [-16, 9], [-16, 21], [4, 14], [11, 4], [7, -2]], [[6088, 7034], [-6, -9], [-55, -29], [27, -57], [-9, -10], [-4, -19], [-22, -8], [-6, -21], [-12, -18], [-31, 9]], [[5982, 6995], [4, 17], [0, 35]], [[5991, 7065], [31, -22], [54, 61]], [[6554, 7561], [-15, -3], [-19, 45], [-19, 16], [-31, -12], [-13, -19]], [[6363, 7854], [-14, 9], [2, 30], [-17, 38], [-21, -1], [-23, 39], [16, 43], [-8, 12], [22, 63], [28, -33], [4, 42], [57, 63], [43, 1], [62, -40], [33, -23], [29, 24], [44, 1], [36, -29], [8, 17], [39, -3], [7, 27], [-45, 40], [26, 28], [-5, 16], [27, 15], [-20, 39], [12, 20], [104, 20], [14, 14], [69, 21], [25, 24], [50, -12], [9, -60], [29, 14], [36, -20], [-3, -31], [27, 3], [70, 55], [-11, -18], [36, -45], [62, -146], [15, 30], [38, -33], [40, 15], [15, -11], [14, -33], [19, -11], [12, -25], [36, 8], [14, -35]], [[7228, 7621], [-17, 8], [-14, 21], [-41, 6], [-46, 1], [-10, -6], [-40, 24], [-16, -12], [-4, -34], [-46, 20], [-18, -8], [-6, -25]], [[6970, 7616], [-16, -11], [-37, -40], [-12, -41], [-10, -1], [-8, 28], [-35, 2], [-6, 47], [-13, 0], [2, 58], [-33, 42], [-48, -5], [-33, -8], [-26, 52], [-23, 22], [-43, 41], [-5, 5], [-72, -34], [2, -212]], [[6088, 4913], [-40, 57], [-2, 34], [-101, 117], [-4, 6]], [[5941, 5127], [-1, 61], [8, 24], [14, 38], [10, 42], [-12, 66], [-3, 29], [-14, 40]], [[5943, 5427], [18, 34], [18, 38]], [[6162, 5408], [-25, -66], [1, -209], [16, -48]], [[7045, 7453], [-52, -9], [-34, 18], [-31, -4], [3, 33], [30, -9], [10, 17]], [[6971, 7499], [22, -5], [35, 41], [-33, 30], [-20, -14], [-20, 22], [23, 37], [-8, 6]], [[7848, 5884], [-6, 69], [18, 48], [35, 11], [26, -8]], [[7921, 6004], [23, -23], [13, 40], [25, -21]], [[7982, 6000], [6, -39], [-3, -69], [-47, -44], [12, -35], [-29, -4], [-24, -23]], [[8504, 7356], [1, 5], [13, -2], [10, 26], [20, 3], [12, 3], [4, 14]], [[5556, 7634], [6, 13]], [[5562, 7647], [6, 4], [4, 20], [5, 3], [4, -8], [5, -4], [4, -9], [4, -3], [6, -11], [4, 1], [-3, -14], [-4, -7], [1, -4]], [[5598, 7615], [-6, -3], [-16, -9], [-2, -11], [-3, 0]], [[6344, 6826], [-20, -1], [-7, 27], [-25, 6]], [[7780, 6358], [6, 21], [23, 37]], [[7837, 6476], [16, -46], [12, -52], [35, -1], [10, -50], [-17, -15], [-8, -21], [33, -34], [23, -68], [18, -51], [21, -40], [7, -41], [-5, -57]], [[7921, 6004], [9, 26], [2, 49], [-23, 50], [-1, 57], [-22, 46], [-21, 4], [-5, -20], [-16, -1], [-9, 10], [-29, -35], [-1, 52], [7, 61], [-19, 2], [-1, 35], [-12, 18]], [[5999, 7177], [12, -3], [5, -23], [-15, -21], [-7, -32]], [[4681, 5573], [7, 18], [1, 17], [13, 31], [13, 27]], [[5262, 6927], [14, 14], [2, 24], [-3, 24], [19, 22], [9, 18], [14, 17], [1, 44]], [[5693, 6449], [0, -115], [-32, 0], [0, -25]], [[5661, 6309], [-111, 111], [-110, 110], [-29, -32]], [[5411, 6498], [-19, -21], [-16, 32], [-44, 25]], [[7271, 5615], [-5, -60], [-11, -16], [-24, -13], [-14, 45], [-4, 83], [12, 94], [19, -32], [13, -41], [14, -60]], [[5804, 3515], [10, -18], [-9, -28], [-5, -19], [-15, -9], [-5, -18], [-10, -6], [-21, 45], [15, 36], [15, 23], [13, 11], [12, -17]], [[5584, 8408], [32, 18], [46, -4], [28, 6], [3, -12], [15, -4], [27, -28]], [[5651, 8286], [-6, 18], [-15, 6]], [[5630, 8310], [-2, 15], [3, 16], [-12, 9], [-29, 10]], [[5757, 8492], [13, -14], [3, -28], [9, -34]], [[4758, 6775], [-4, 0], [1, -31], [-17, -2], [-9, -13], [-13, 0], [-10, 7], [-23, -6], [-9, -45], [-9, -4], [-13, -73], [-39, -62], [-9, -79], [-11, -26], [-4, -21], [-62, -5], [-1, 1]], [[4526, 6416], [2, 26], [10, 16], [9, 30], [-1, 19], [9, 41], [16, 37], [9, 9], [7, 34], [1, 30], [10, 36], [18, 21], [18, 59]], [[4634, 6774], [1, 0], [14, 22]], [[4649, 6796], [25, 7], [22, 39], [14, 16], [23, 48], [-7, 71], [11, 50], [4, 30], [18, 39], [27, 26], [21, 24], [19, 60], [8, 35], [21, 0], [16, -25], [27, 4], [29, -12], [12, -1]], [[5783, 7801], [-5, 27], [3, 24], [-1, 25], [-16, 35], [-9, 24], [-8, 17], [-9, 6]], [[5738, 7959], [7, 8], [18, 6], [21, -18], [11, -2], [13, -16], [-2, -19], [10, -10], [4, -24], [10, -14], [-2, -9], [5, -6], [-7, -4], [-17, 2], [-3, 8], [-5, -5], [2, -10], [-8, -19], [-5, -19], [-7, -7]], [[6375, 4464], [7, -25], [7, -38], [5, -69], [7, -27], [-3, -27], [-5, -17], [-9, 33], [-5, -17], [5, -42], [-3, -25], [-7, -13], [-2, -49], [-11, -67], [-14, -79], [-17, -109], [-10, -80], [-13, -67], [-23, -14], [-24, -24], [-16, 14], [-22, 21], [-7, 30], [-2, 51], [-10, 46], [-3, 42], [5, 41], [13, 10], [0, 19], [13, 44], [3, 37], [-6, 27], [-6, 36], [-2, 53], [10, 33], [4, 36], [13, 2], [16, 12], [10, 11], [12, 0], [16, 33], [23, 36], [8, 29], [-3, 24], [11, -7], [16, 40], [0, 35], [9, 26], [10, -25]], [[1746, 7055], [31, 5], [36, 6], [-3, -11], [42, -28], [63, -41], [56, 1], [22, 0], [0, 24], [48, -1], [10, -20], [14, -18], [17, -25], [9, -31], [7, -31], [14, -18], [23, -17], [18, 46], [22, 1], [20, -23], [14, -40], [9, -33], [17, -33], [6, -41], [8, -27], [21, -17], [20, -13], [11, 2]], [[2301, 6672], [-11, -51], [-5, -41], [-2, -78], [-2, -28], [4, -31], [9, -28], [6, -45], [18, -43], [6, -33], [11, -28], [30, -15], [11, -24], [25, 16], [21, 6], [21, 10], [17, 10], [18, 23], [6, 34], [3, 48], [5, 17], [18, 15], [30, 14], [24, -2], [17, 5], [7, -13], [-1, -27], [-15, -35], [-7, -35], [5, -10], [-4, -25], [-7, -45], [-7, 15], [-6, -1]], [[5598, 7615], [10, 3], [13, 1]], [[5118, 6285], [0, -133], [-16, -38], [-2, -36], [-25, -9], [-38, -5], [-10, -20], [-18, -2]], [[4679, 5898], [1, 18], [-2, 23], [-10, 16], [-6, 33], [-1, 36]], [[4661, 6024], [9, 10], [5, 34], [9, 1], [19, -16], [16, 12], [11, -4], [4, 13], [111, 1], [6, 40], [-4, 7], [-14, 249], [-13, 248], [42, 1]], [[7780, 6358], [-16, -14], [-16, -25], [-20, -2], [-13, -62], [-11, -11], [13, -50], [18, -42], [11, -38], [-10, -51], [-10, -10], [7, -29], [18, -46], [4, -32], [-1, -27], [11, -52], [-15, -54], [-14, -59]], [[5533, 7688], [7, -10], [4, -8], [9, -6], [11, -12], [-2, -5]], [[7436, 8021], [30, 10], [53, 49], [42, 27], [24, -17], [29, -1], [19, -27], [27, -2], [40, -15], [27, 40], [-11, 34], [29, 60], [31, -24], [25, -7], [33, -14], [5, -43], [40, -25], [26, 11], [35, 7], [28, -7], [27, -28], [17, -29], [26, 0], [35, -9], [25, 14], [37, 10], [40, 40], [17, -6], [15, -19], [33, 5]], [[5911, 3642], [-21, 1]], [[5890, 3643], [-3, 25], [-4, 26]], [[5883, 3694], [-2, 21], [5, 64], [-7, 41], [-14, 81]], [[5865, 3901], [30, 65], [7, 42], [4, 5], [3, 34], [-4, 17], [1, 43], [5, 40], [0, 73], [-14, 18], [-13, 4], [-6, 14], [-13, 13], [-23, -1], [-2, 21]], [[5840, 4289], [-3, 41], [85, 47]], [[5922, 4377], [16, -27], [7, 5], [11, -14], [2, -24], [-6, -26], [2, -41], [18, -36], [9, 40], [12, 13], [-3, 74], [-11, 41], [-10, 19], [-10, -1], [-8, 75], [8, 44]], [[5959, 4519], [21, 4], [33, -16], [7, 7], [20, 2], [10, 17], [16, -1], [31, 22], [22, 34]], [[4525, 6391], [6, 19], [109, 0], [-5, 83], [6, 30], [26, 5], [0, 147], [91, -3], [0, 87]], [[4661, 6024], [-18, 39], [-17, 43], [-19, 15], [-13, 17], [-15, -1], [-14, -12], [-14, 5], [-9, -19]], [[5922, 4377], [-15, 15], [8, 54], [9, 20], [-5, 48], [5, 46], [5, 16], [-7, 49], [-13, 25]], [[5909, 4650], [27, -10], [6, -16], [9, -27], [8, -78]], [[7779, 5554], [5, 10], [22, -25], [3, -29], [18, 7], [9, 23]], [[5644, 4173], [23, 13], [18, -3], [11, -13], [0, -5]], [[5552, 3756], [0, -213], [-25, -29], [-15, -5], [-18, 11], [-12, 5], [-5, 24], [-11, 16], [-13, -29]], [[9604, 3968], [22, -36], [15, -26], [-11, -14], [-15, 16], [-20, 26], [-18, 30], [-18, 41], [-4, 19], [12, -1], [15, -19], [13, -20], [9, -16]], [[5411, 6498], [7, -89], [11, -15], [0, -18], [12, -20], [-6, -25], [-11, -117], [-1, -75], [-36, -54], [-12, -76], [12, -21], [0, -37], [17, -1], [-2, -28]], [[5393, 5901], [-5, -1], [-19, 63], [-7, 2], [-21, -32], [-22, 16], [-15, 4], [-8, -8], [-16, 2], [-16, -25], [-15, -1], [-33, 29], [-13, -14], [-15, 1], [-10, 22], [-28, 21], [-30, -6], [-7, -13], [-4, -33], [-8, -23], [-2, -52]], [[5863, 9187], [-47, -23], [-23, -5]], [[5572, 9161], [-17, -2], [-4, -38], [-52, 9], [-8, -32], [-26, 0], [-19, -41], [-27, -63], [-43, -81], [10, -20], [-10, -23], [-28, 1], [-18, -54], [2, -76], [18, -30], [-9, -67], [-23, -40], [-13, -33]], [[6474, 6141], [-9, 40], [-22, 95]], [[6443, 6276], [84, 58], [18, 115], [-13, 41]], [[5545, 8316], [34, -7], [51, 1]], [[5652, 8152], [14, -50], [-3, -16], [-13, -7], [-26, -48], [8, -26], [-6, 3]], [[5626, 8008], [-27, 23], [-20, -9], [-13, 6], [-16, -12], [-14, 20], [-12, -7], [-1, 3]], [[3158, 6248], [14, -5], [5, -11], [-7, -15], [-21, 0], [-16, -2], [-2, 25], [4, 8], [23, 0]], [[8628, 7623], [3, -10]], [[6426, 6600], [-7, -4], [-9, 11]], [[5783, 7801], [13, -10], [13, 9], [12, -10]], [[5628, 7729], [-5, 10], [7, 10], [-7, 7], [-9, -13], [-16, 17], [-2, 24], [-17, 13], [-3, 18], [-15, 23]], [[5630, 7939], [12, 12], [17, -6], [18, 0], [13, -14], [9, 9], [21, 5], [7, 14], [11, 0]], [[6061, 7894], [1, 26], [14, 16], [27, 4], [4, 19], [-6, 32], [11, 30], [0, 17], [-41, 19], [-16, -1], [-17, 27], [-22, -9], [-35, 20], [1, 12], [-10, 25], [-22, 2], [-3, 18], [7, 12], [-18, 33], [-28, -6], [-9, 3], [-7, -13], [-10, 2]], [[5863, 9187], [28, 20], [46, -34], [76, -14], [105, -65], [21, -28], [2, -38], [-31, -30], [-45, -16], [-124, 44], [-20, -7], [45, -42]], [[5966, 8977], [2, -27], [2, -59]], [[5970, 8891], [35, -17], [22, -15], [4, 28]], [[6031, 8887], [-17, 24], [18, 22]], [[6920, 9133], [-28, 31], [-1, 12]], [[8147, 9571], [22, -22], [-7, -29]], [[5821, 5105], [6, -6], [17, 18]], [[5844, 5117], [11, -33], [-2, -34], [-8, -7]], [[6443, 6276], [-80, -22], [-26, -26], [-20, -60], [-13, -10], [-7, 19], [-10, -3], [-27, 6], [-5, 6], [-32, -1], [-8, -6], [-11, 15], [-7, -28], [2, -24], [-12, -19]], [[5634, 5824], [0, 14], [-10, 16], [0, 34], [-6, 22], [-10, -3], [3, 21], [7, 24], [-3, 24], [9, 17], [-6, 14], [8, 36], [13, 42], [23, -4], [-1, 228]], [[5942, 5734], [0, -7]], [[5942, 5727], [-4, 1], [1, 29], [-3, 20], [-15, 22], [-3, 42], [3, 42], [-13, 4], [-1, -13], [-17, -3], [7, -16], [2, -35], [-15, -32], [-14, -41], [-14, -6], [-24, 34], [-10, -12], [-3, -17], [-14, -11], [-1, -12], [-28, 0], [-4, 12], [-20, 2], [-10, -10], [-8, 5], [-14, 34], [-5, 15], [-20, -7], [-7, -27], [-7, -52], [-10, -10], [-9, -7]], [[5662, 5678], [-2, 3]], [[5943, 5427], [-17, -27], [-19, 0], [-22, -13], [-18, 13], [-12, -16]], [[5681, 5656], [-19, 22]], [[5942, 5727], [1, -45]], [[2541, 5940], [-10, 6], [-11, 11]], [[6359, 5839], [-1, -1], [0, -24], [0, -58], [0, -30], [-12, -35], [-20, -48]], [[3488, 5425], [11, -35], [-5, -24]], [[3494, 5366], [-2, -27], [-7, -24]], [[5626, 8008], [-8, -15], [-6, -23]], [[5890, 3643], [-6, -26], [-16, -6], [-17, 31], [0, 20], [8, 22], [2, 16], [8, 4], [14, -10]], [[6003, 7245], [7, 12], [8, 13], [1, 32], [10, -11], [30, 16], [15, -11], [23, 0], [32, 22], [15, -1], [31, 9]], [[6883, 7321], [16, 58], [-6, 43], [-21, 14], [7, 25], [24, -3], [13, 32], [9, 37], [37, 14], [-6, -27], [4, -16], [11, 1]], [[6554, 7561], [31, 0], [-5, 29], [24, 20], [23, 34], [38, -31], [3, -46], [10, -11], [30, 2], [10, -10], [13, -60], [32, -39], [18, -27], [29, -29], [37, -24], [0, -36]], [[3286, 5802], [16, 7], [6, -2], [-1, -43], [-24, -6], [-5, 5], [8, 16], [0, 23]], [[8381, 6587], [-16, -93], [-12, -47], [-15, 49], [-3, 42], [16, 57], [23, 44], [12, -18], [-5, -34]], [[5909, 4650], [-16, 18], [-18, 9], [-11, 10], [-11, 15]], [[5844, 5117], [10, 7], [30, -1], [57, 4]], [[3052, 7697], [-15, -34], [-5, -13]], [[2952, 7539], [40, 11], [9, -11]], [[2896, 7366], [-14, 22], [-4, 48]], [[2522, 6928], [-11, -9], [5, -16]], [[2316, 6812], [-15, -28], [-6, -25]], [[1746, 7055], [-5, 30], [-18, 33], [-13, 7], [-3, 16], [-15, 3], [-10, 16], [-26, 6], [-7, 9], [-4, 31], [-27, 58], [-23, 80], [1, 14], [-12, 19], [-22, 48], [-3, 47], [-15, 31], [6, 48], [-1, 49], [-9, 45], [11, 54]], [[1551, 7699], [3, 52], [4, 52]], [[1558, 7803], [-5, 78], [-9, 49], [-8, 27], [3, 11], [40, -20], [15, -54], [7, 15], [-4, 47], [-10, 48]], [[5816, 3910], [12, -1], [13, -9], [10, 6], [14, -5]], [[5840, 4289], [-21, -8], [-16, -23], [-3, -20], [-10, -4], [-24, -48], [-16, -37], [-9, -1], [-9, 6], [-31, 7]]]
}

// End