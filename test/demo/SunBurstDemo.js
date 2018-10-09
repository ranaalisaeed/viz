// html element that holds the chart
var viz_container;

var styles = {
	'background-color-top': '#0000FF',
	'background-color-bottom': '#0000FF',
	'stroke': '#0000FF',
	'stroke-opacity': 0.25,
	'fill': '#0000FF',
	'fill-over': {'fill-over': '#FFFF00', 'fill': '#FFFF00'},
	'label-color': '#0000FF',
	'label-font-size': 16,
	'header-font-size': 20
};



var axiisStyles = {
 'stroke': function (d, i) {
		var colors = ['#bd0026', '#fecc5c', '#fd8d3c', '#f03b20', '#B02D5D', '#9B2C67', '#982B9A', '#692DA7', '#5725AA', '#4823AF', '#d7b5d8', '#dd1c77', '#5A0C7A', '#5A0C7A']
		var c = d3.rgb(colors[(d.data.rootIndex ? d.data.rootIndex : 0) % colors.length]);
		return c.darker((d.depth) / (4 * .75))
	},
	'stroke-opacity': 0.9,
	 'fill': function (d, i) {
		var colors = ['#bd0026', '#fecc5c', '#fd8d3c', '#f03b20', '#B02D5D', '#9B2C67', '#982B9A', '#692DA7', '#5725AA', '#4823AF', '#d7b5d8', '#dd1c77', '#5A0C7A', '#5A0C7A']
		var c = d3.rgb(colors[(d.data.rootIndex ? d.data.rootIndex : 0) % colors.length]);
		return c.darker((d.depth - 1) / 4)
	},
	'fill-over': function (d, i) {
		var colors = ['#bd0026', '#fecc5c', '#fd8d3c', '#f03b20', '#B02D5D', '#9B2C67', '#982B9A', '#692DA7', '#5725AA', '#4823AF', '#d7b5d8', '#dd1c77', '#5A0C7A', '#5A0C7A']
		var c = d3.rgb(colors[(d.data.rootIndex ? d.data.rootIndex : 0) % colors.length]);
		return c.brighter((d.depth) / 4)
	},
	'label-color': function (d,i) {
		var colors = ['#bd0026', '#fecc5c', '#fd8d3c', '#f03b20', '#B02D5D', '#9B2C67', '#982B9A', '#692DA7', '#5725AA', '#4823AF', '#d7b5d8', '#dd1c77', '#5A0C7A', '#5A0C7A']
		var c = d3.rgb(colors[(d.data.rootIndex ? d.data.rootIndex : 0) % colors.length]);
		return vizuly2.core.util.colorBrightness(c) > 128 ? '#333' : '#DDD';
	}
}

var iceStyles = {
	'background-color-bottom': '#B9D7E3',
	'label-color': function (d,i) {
		var colors = ['#e8f5fb', '#B9D7E3', '#77c2e9', '#1c99db', '#1882ba', '#115c83', '#0d4563']
		var c = d3.rgb(colors[(d.data.rootIndex ? d.data.rootIndex : 0) % colors.length]);
		return vizuly2.core.util.colorBrightness(c) > 128 ? '#333' : '#DDD';
	},
	'stroke': function (d, i) {
		var colors = ['#e8f5fb', '#B9D7E3', '#77c2e9', '#1c99db', '#1882ba', '#115c83', '#0d4563']
		var c = d3.rgb(colors[(d.data.rootIndex ? d.data.rootIndex : 0) % colors.length]);
		return c.darker((d.depth) / (4 * .75))
	},
	'stroke-opacity': 0.9,
	'fill': function (d, i) {
		var colors = ['#e8f5fb', '#B9D7E3', '#77c2e9', '#1c99db', '#1882ba', '#115c83', '#0d4563']
		var c = d3.rgb(colors[(d.data.rootIndex ? d.data.rootIndex : 0) % colors.length]);
		return c.darker((d.depth - 1) / 4)
	},
	'fill-over': function (d, i) {
		var colors = ['#e8f5fb', '#B9D7E3', '#77c2e9', '#1c99db', '#1882ba', '#115c83', '#0d4563']
		var c = d3.rgb(colors[(d.data.rootIndex ? d.data.rootIndex : 0) % colors.length]);
		return c.brighter((d.depth) / 4)
	}
}

var roseStyles = {
	'background-color-bottom': '#faeaf1',
	'label-color': function (d,i) {
		var colors = ['#e8f5fb', '#B9D7E3', '#77c2e9', '#1c99db', '#1882ba', '#115c83', '#0d4563']
		var c = d3.rgb(colors[(d.data.rootIndex ? d.data.rootIndex : 0) % colors.length]);
		return vizuly2.core.util.colorBrightness(c) > 128 ? '#333' : '#DDD';
	},
	'stroke': function (d, i) {
		var colors = ['#faeaf1', '#efb6cf', '#e382ad', '#d02f77', '#b12865', '#7d1c47', '#5e1536']
		var c = d3.rgb(colors[(d.data.rootIndex ? d.data.rootIndex : 0) % colors.length]);
		return c.darker((d.depth) / (4 * .75))
	},
	'stroke-opacity': 0.9,
	'fill': function (d, i) {
		var colors = ['#faeaf1', '#efb6cf', '#e382ad', '#d02f77', '#b12865', '#7d1c47', '#5e1536']
		var c = d3.rgb(colors[(d.data.rootIndex ? d.data.rootIndex : 0) % colors.length]);
		return c.darker((d.depth - 1) / 4)
	},
	'fill-over': function (d, i) {
		var colors = ['#faeaf1', '#efb6cf', '#e382ad', '#d02f77', '#b12865', '#7d1c47', '#5e1536']
		var c = d3.rgb(colors[(d.data.rootIndex ? d.data.rootIndex : 0) % colors.length]);
		return c.brighter((d.depth) / 4)
	}
}


var umberStyles = {
	'background-color-bottom': '#feeeec',
	'label-color': function (d,i) {
		var colors = ['#feeeec', '#fac2bc', '#f6968c', '#f0503f', '#cc4426', '#903026', '#6c241c']
		var c = d3.rgb(colors[(d.data.rootIndex ? d.data.rootIndex : 0) % colors.length]);
		return vizuly2.core.util.colorBrightness(c) > 128 ? '#333' : '#DDD';
	},
	'stroke': function (d, i) {
		var colors = ['#feeeec', '#fac2bc', '#f6968c', '#f0503f', '#cc4426', '#903026', '#6c241c']
		var c = d3.rgb(colors[(d.data.rootIndex ? d.data.rootIndex : 0) % colors.length]);
		return c.darker((d.depth) / (4 * .75))
	},
	'stroke-opacity': 0.9,
	'fill': function (d, i) {
		var colors = ['#feeeec', '#fac2bc', '#f6968c', '#f0503f', '#cc4426', '#903026', '#6c241c']
		var c = d3.rgb(colors[(d.data.rootIndex ? d.data.rootIndex : 0) % colors.length]);
		return c.darker((d.depth - 1) / 4)
	},
	'fill-over': function (d, i) {
		var colors = ['#feeeec', '#fac2bc', '#f6968c', '#f0503f', '#cc4426', '#903026', '#6c241c']
		var c = d3.rgb(colors[(d.data.rootIndex ? d.data.rootIndex : 0) % colors.length]);
		return c.brighter((d.depth) / 4)
	}
}


var evergreenStyles = {
	'background-color-bottom': '#f1f9ee',
	'label-color': function (d,i) {
		var colors = ['#f1f9ee', '#cfeac5', '#adda9b', '#77c258', '#65a54b', '#477435', '#365728']
		var c = d3.rgb(colors[(d.data.rootIndex ? d.data.rootIndex : 0) % colors.length]);
		return vizuly2.core.util.colorBrightness(c) > 128 ? '#333' : '#DDD';
	},
	'stroke': function (d, i) {
		if (d == viz.data()) return "#FFF";
		var colors = ['#f1f9ee', '#cfeac5', '#adda9b', '#77c258', '#65a54b', '#477435', '#365728']
		var c = d3.rgb(colors[(d.data.rootIndex ? d.data.rootIndex : 0) % colors.length]);
		return c.darker((d.depth) / (4 * .75))
	},
	'stroke-opacity': 0.9,
	'fill': function (d, i) {
		if (d == viz.data()) return "#FFF";
		var colors = ['#f1f9ee', '#cfeac5', '#adda9b', '#77c258', '#65a54b', '#477435', '#365728']
		var c = d3.rgb(colors[(d.data.rootIndex ? d.data.rootIndex : 0) % colors.length]);
		return c.darker((d.depth - 1) / 4)
	},
	'fill-over': function (d, i) {
		if (d == viz.data()) return "#FFF";
		var colors = ['#f1f9ee', '#cfeac5', '#adda9b', '#77c258', '#65a54b', '#477435', '#365728']
		var c = d3.rgb(colors[(d.data.rootIndex ? d.data.rootIndex : 0) % colors.length]);
		return c.brighter((d.depth) / 4)
	}
}


//This changes the size of the component by adjusting the radius and width/height;
function changeSize(val) {
	var s = String(val).split(",");
	d3.select('#viz_container').style('width', s[0] + 'px').style('height', s[1] + 'px');
	viz.update();
}

function changeStyles(val) {
	var styles = this[val];
	viz.clearStyles();
	viz.applyStyles(styles)
	viz.update();
}


//This sets the same value for each radial progress
function changeData(val) {
	valueField = valueFields[Number(val)];
	viz.update();
}

function runDemo() {
	
	demoOptions = [
		{
			'name': 'Display',
			'values': [
				{'label': '1000px - 1000px', 'value': '1000,1000'},
				{'label': '800px - 800px', 'value': '800,800'},
				{'label': '375px - 667px', 'value': '375,667'},
				{'label': '320px - 568px', 'value': '320,568'}
			],
			'callback': changeSize
		},
		{
			'name': 'Theme',
			'values': [
				{'label': 'Axiis', 'value': 'axiisStyles', selected: true},
				{'label': 'Ice', 'value': 'iceStyles'},
				{'label': 'Rose', 'value': 'roseStyles'},
				{'label': 'Umber', 'value': 'umberStyles'},
				{'label': 'Evergreen', 'value': 'evergreenStyles'}
			],
			'callback': changeStyles
		},
		{
			'name': 'Data',
			'values': [
				{'label': 'Federal', 'value': '0', 'selected': true},
				{'label': 'State', 'value': '1'},
				{'label': 'Local', 'value': '2'}
			],
			'callback': changeData
		},
	]
	
	createDemoMenu(demoOptions, 600, 600, 'vizuly - sunburst', styles);
	
	changeSize('600,600');

	
}

