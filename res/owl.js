// owl.js provides user-customizable plots of streaming time series data.

var workspace = {
    ws: null,
    data: {},
    lastDataTimestamp: 0,
    legendHeight: 60
};

workspace.owlEl = d3.select('body').append('svg')
    .attr("width", window.innerWidth)
    .attr("height", window.innerHeight);

workspace.legendEl = workspace.owlEl
    .append('g');

workspace.legendEl.append('text')
    .classed('title', true)
    .attr('x', 2)
    .attr('y', 40)
    .text('Owl');

var owlFormat = d3.format('+12.3g');
var owlColors = d3.scaleOrdinal(d3.schemeCategory20);

function Series(name) {
    this.name = name;
    this.t = [];
    this.raw = [];
    var leg = workspace.legendEl
        .append('g')
        .style('fill', owlColors(name));
    leg.append('text')
        .classed('legend ' + name, true)
        .attr('x', '2px')
        .attr('y', workspace.legendHeight + 20)
        .text(name);
    this.legendEl = leg.append('text')
        .classed('legend ' + name, true)
        .attr('x', '50px')
        .attr('y', workspace.legendHeight + 20);
    this.update = function(t, newdata) {
        this.t.push(t);
        this.raw.push(newdata);
        this.legendEl.data([newdata])
            .text(owlFormat);
    };
    workspace.legendHeight += 20
}

workspace.reset = function() {
    workspace.data = {};
    workspace.lastDataTimestamp = 0;
    workspace.legendHeight = 50;
    workspace.legendEl.selectAll('.legend').remove();
    owlColors.domain([]);
};

workspace.connect = function() {
    if (!window['WebSocket']) {
        alert('Your browser does not support websockets.');
        return
    }

    workspace.ws = new WebSocket('ws://localhost:8000/websocket');

    workspace.ws.onopen = function(e) {
        workspace.reset();
        console.log('Websocket opened');
    };

    var data;
    var t0 = Date.now();
    workspace.ws.onmessage = function(e) {
        data = JSON.parse(e.data);
        workspace.lastDataTimestamp = (Date.now() - t0) / 1000;
        for (var key in data) {
            try {
                workspace.data[key].update(workspace.lastDataTimestamp, data[key])
            } catch (e) {
                workspace.data[key] = new Series(key);
                workspace.data[key].update(workspace.lastDataTimestamp, data[key])
            }
        }
    };

    workspace.ws.onclose = function() {
        console.log('Websocket closed');
    };

    workspace.ws.onerror = function(e) {
        console.log('Websocket error: ' + e);
    };
};

// Run

workspace.connect();

// If no websocket, try to connect every 2 seconds.
setInterval(function() {
    if (!workspace.ws || workspace.ws.readyState === WebSocket.CLOSED) { workspace.connect() }
}, 2000);
