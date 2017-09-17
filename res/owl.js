// owl.js provides user-customizable plots of streaming time series data.

var panelWidth = 200,
    goldenRatio = 1.618;

// Workspace represents Owl as a whole: connection to server, legend, plot area, etc.
var workspace = {
    server: '192.168.86.100:8000/websocket',
    ws: null,
    data: {},
    t: [],
    trash: [],
    lastDataTimestamp: 0,
    width: window.innerWidth,
    height: window.innerHeight,
    plots: []
};

workspace.set_server = function(server) {
    workspace.server = server;
    workspace.close();
    workspace.connect();
};

workspace.owlEl = d3.select('body').append('svg')
    .attr('width', workspace.width)
    .attr('height', workspace.height);

workspace.panelEl = workspace.owlEl.append('g');

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

workspace.insertChart = function(i, j, name) {
    if (j >= workspace.plots.length) {
        j = workspace.plots.length;
        i = 0;
        workspace.plots.push([])
    }
    if (i > workspace.plots[j]) {
        i = workspace.plot[j];
    }
    var plotWidth,
        plotHeight = 30;
    workspace.plots[j].splice(i, 0, MakePlot(0, 0, 1));
    workspace.plots[j][i].add_y0_data(name);
    for (j=0; j < workspace.plots.length; j++) {
        nCol = workspace.plots[j].length;
        plotWidth = (workspace.width - (panelWidth + 30)) / nCol - 30;
        for (i=0; i < workspace.plots[j].length; i++) {
            workspace.plots[j][i].reshape(panelWidth + 30 + (plotWidth+30)*i, plotHeight, plotWidth);
        }
        plotHeight += plotWidth / goldenRatio + 30;
    }
    workspace.owlEl.attr('height', plotHeight);
};

workspace.reset = function() {
    workspace.data = {};
    for (j=0; j < workspace.plots.length; j++) {
        for (i=0; i < workspace.plots[j].length; i++) {
            workspace.plots[j][i].svg.remove();
        }
    }
    workspace.plots = [];
    workspace.lastDataTimestamp = 0;
    workspace.t = [];
    workspace.panelEl.selectAll('.legend').remove();
    owlColors.domain([]);
};

workspace.connect = function() {
    if (!window['WebSocket']) {
        alert('Your browser does not support websockets.');
        return
    }

    workspace.ws = new WebSocket('ws://' + workspace.server);

    workspace.ws.onopen = function(e) {
        workspace.reset();
        workspace.connectedEl
            .classed('disconnected', false)
            .classed('connected', true)
            .text('connected');
        console.log('Websocket opened');
    };

    var data,
        t0 = Date.now(),
        n = 0;
    workspace.ws.onmessage = function(e) {
        data = JSON.parse(e.data);
        workspace.lastDataTimestamp = (Date.now() - t0) / 1000;
        workspace.t.push(workspace.lastDataTimestamp);
        for (var key in data) {
            if (workspace.trash.indexOf(key) < 0) {
                if (!(key in workspace.data)) {
                    workspace.data[key] = new Series(key);
                    workspace.data[key].update(workspace.lastDataTimestamp, data[key]);
                    workspace.insertChart(n-3*Math.floor(n/3), Math.floor(n/3), key);
                    n++;
                } else {
                    workspace.data[key].update(workspace.lastDataTimestamp, data[key]);
                }
            }
        }
        for (var j=0; j < workspace.plots.length; j++) {
            for (var i=0; i < workspace.plots[j].length; i++) {
                workspace.plots[j][i].update();
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

workspace.close = function() {
    workspace.ws.close();
};


// Series object holds the data and references to its manifestations.
var owlFormat = d3.format('+8.5g');
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
        .attr('x', panelWidth - 15)
        .text('×');
    this.legendEl = leg
        .append('tspan')
        .attr('text-anchor', 'end')
        .attr('x', panelWidth - 20);
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
            delete workspace.data[name];
            workspace.legendEl
                .selectAll('text')
                .attr('y', function(d, i) { return 60+20*i; });
            workspace.plots[name].svg.remove();
        }
    }
    closer.on('click', close_this())
}


// Plot object represents a plot "widget."
function MakePlot(x, y, width) {
    var plot = {
        x: x,
        y: y,
        width: width,
        height: width / goldenRatio,
        y0vars: [],
        data: []
    };

    plot.xs = d3.scaleLinear()
        .domain([0, workspace.lastDataTimestamp])
        .range([0, plot.width]);
    plot.y0s = d3.scaleLinear()
        .range([plot.height, 0]);

    plot.line = function(name) {
        return d3.line()
            // .curve(d3.curveBasis)
            .x(function(d) { return plot.xs(d['T']); })
            .y(function(d) { return plot.y0s(d[name]); })
    };

    plot.svg = workspace.owlEl.append('g')
        .attr('transform', 'translate(' + plot.x + ',' + plot.y + ')');

    plot.legend = plot.svg.append('g');

    plot.xAxis = plot.svg.append('g')
        .classed('x axis', true)
        .attr('transform', 'translate(0,' + plot.y0s(0) + ')')
        .call(d3.axisBottom(plot.xs));

    plot.y0Axis = plot.svg.append('g')
        .classed('y axis', true)
        .call(d3.axisLeft(plot.y0s));

    plot.lines = plot.svg.append('g');

    plot.add_y0_data = function(name) {
        var domain = d3.extent(workspace.data[name].raw);
        if (plot.y0vars.length > 0) {
            var curdomain = plot.y0s.domain();
            domain = [curdomain[0] < domain[0] ? curdomain[0] : domain[0],
                curdomain[1] > domain[1] ? curdomain[1] : domain[1]];
            for (var i=0; i<workspace.t.length; i++) {
                plot.data[i][name] = workspace.data[name].raw[i]
            }
        } else {
            var data;
            for (var i=0; i<workspace.t.length; i++) {
                data = {'T': workspace.t[i]};
                data[name] = workspace.data[name].raw[i];
                plot.data.push(data)
            }
        }
        plot.y0vars.push(name);
        plot.y0s.domain(domain);
        plot.legend
            .selectAll('text')
            .data(plot.y0vars)
            .enter()
            .append('text')
            .classed('legend', true)
            .attr('text-anchor', 'start')
            .attr('x', function(d, i) { return 20*i + 5; })
            .attr('dy', 0)
            .style('fill', function(d) { return workspace.data[d].color; })
            .text(function(d) { return d; });

        if (workspace.data[name].raw.length > 1) {
            plot.lines
                .selectAll('.line')
                .data([plot.data])
                .enter()
                .append('path')
                .classed('line', true)
                .attr('d', plot.line(name))
                .style('stroke', workspace.data[name].color);
        }
    };

    plot.update = function() {
        plot.xs.domain([0, workspace.lastDataTimestamp]);
        plot.xAxis.call(d3.axisBottom(plot.xs));
        var total_domain = [0, 0];
        plot.y0vars.forEach(function(name) {
            var domain = d3.extent(workspace.data[name].raw);
            total_domain = [total_domain[0] < domain[0] ? total_domain[0] : domain[0],
                total_domain[1] > domain[1] ? total_domain[1] : domain[1]];
        });
        for (var i=plot.data.length; i<workspace.t.length; i++) {
            var data = {'T': workspace.t[i]};
            plot.y0vars.forEach(function(name) {
                data[name] = workspace.data[name].raw[i]
            });
            plot.data[i] = data;
        }
        plot.y0s.domain(total_domain);
        plot.y0Axis.call(d3.axisLeft(plot.y0s));

        plot.y0vars.forEach(function(name) {
            plot.lines
                .selectAll('.line')
                .data([plot.data])
                .enter()
                .append('path')
                .classed('line', true);
            plot.lines
                .selectAll('.line')
                .attr('d', plot.line(name))
                .style('stroke', workspace.data[name].color);
        });
    };

    plot.reshape = function(xx, yy, ww) {
        plot.x = xx;
        plot.y = yy;
        plot.width = ww;
        plot.height = ww / goldenRatio;
        plot.xs.range([0, plot.width]);
        plot.y0s.range([plot.height, 0]);
        plot.svg.attr('transform', 'translate(' + plot.x + ',' + plot.y + ')');
        plot.xAxis.attr('transform', 'translate(0,' + plot.height + ')')
            .call(d3.axisBottom(plot.xs));
        plot.y0Axis.call(d3.axisLeft(plot.y0s));
    };

    return plot;
}


// Run the system.
workspace.connect();

// If no websocket, try to connect every 2 seconds.
setInterval(function() {
    if (!workspace.ws || workspace.ws.readyState === WebSocket.CLOSED) { workspace.connect() }
}, 2000);
