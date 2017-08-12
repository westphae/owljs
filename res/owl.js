// owl.js provides user-customizable plots of streaming time series data.

var panelWidth = 200;

var workspace = {
    ws: null,
    data: {},
    trash: [],
    lastDataTimestamp: 0,
    height: window.innerHeight,
    width: window.innerWidth,
};

workspace.owlEl = d3.select('body').append('svg')
    .attr("width", workspace.width)
    .attr("height", workspace.height);

workspace.panelEl = workspace.owlEl
    .append('g');

workspace.panelEl.append('line')
    .classed('sep', true)
    .attr('x1', panelWidth)
    .attr('x2', panelWidth)
    .attr('y1', 0)
    .attr('y2', workspace.height);

workspace.panelEl.append('text')
    .classed('title', true)
    .attr('x', 2)
    .attr('y', 40)
    .text('Owl');

workspace.connectedEl = workspace.panelEl.append('text')
    .attr('text-anchor', 'end')
    .classed('status disconnected', true)
    .attr('x', panelWidth - 20)
    .attr('y', 40);

workspace.legendEl = workspace.panelEl.append('g');

var owlFormat = d3.format('+5.3f');
var owlColors = d3.scaleOrdinal(d3.schemeCategory20);

function Series(name) {
    this.name = name;
    this.t = [];
    this.raw = [];
    this.color = owlColors(name);
    var leg = workspace.legendEl
        .selectAll('text')
        .data(workspace.legendEl.selectAll('text').data().concat(name))
        .enter()
        .append('text')
        .classed('legend ' + name, true)
        .style('fill', this.color)
        .attr('x', 3)
        .attr('y', function(d, i) { return 60+20*i; })
        .text(function(d) { return String(d); });
    var closer = leg.append('tspan')
        .classed('closer', true)
        .attr("x", panelWidth - 15)
        .text("×");
    this.legendEl = leg
        .append('tspan')
        .attr("text-anchor", "end")
        .attr("x", panelWidth - 20);
    this.update = function(t, newdata) {
        this.t.push(t);
        this.raw.push(newdata);
        this.legendEl.datum(newdata).text(owlFormat);
    };

    // Closure for events
    function close_this() {
        return function() {
            workspace.trash.push(name);
            leg.remove();
            workspace.legendEl
                .selectAll('text')
                .attr('y', function(d, i) { return 60+20*i; })
        }
    }
    closer.on('click', close_this())
}

workspace.reset = function() {
    workspace.data = {};
    workspace.lastDataTimestamp = 0;
    workspace.panelEl.selectAll('.legend').remove();
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
        workspace.connectedEl
            .classed('disconnected', false)
            .classed('connected', true)
            .text('connected');
        console.log('Websocket opened');
    };

    var data;
    var t0 = Date.now();
    workspace.ws.onmessage = function(e) {
        data = JSON.parse(e.data);
        workspace.lastDataTimestamp = (Date.now() - t0) / 1000;
        for (var key in data) {
            if (workspace.trash.indexOf(key) < 0) {
                try {
                    workspace.data[key].update(workspace.lastDataTimestamp, data[key])
                } catch (e) {
                    workspace.data[key] = new Series(key);
                    workspace.data[key].update(workspace.lastDataTimestamp, data[key])
                }
            }
        }
    };

    workspace.ws.onclose = function() {
        workspace.connectedEl
            .classed('disconnected', true)
            .classed('connected', false)
            .text('disconnected');
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
