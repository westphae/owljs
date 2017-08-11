// owl.js provides user-customizable plots of streaming time series data.

var workspace = {
    data: {},
    ws: null,
    lastDataTimestamp: 0,
    reset: function() {
        data = {};
    }
};

var workspaceEl = document.getElementById('workspace');

function Series(name) {
    this.name = name;
    this.t = [];
    this.raw = [];
    this.legendEl = null;
    this.update = function(t, newdata) {
        this.t.push(t);
        this.raw.push(newdata);
        // this.legendEl.innerText = newdata;
        workspaceEl.innerText += this.name + ": " + newdata + " at time " + t + "\n";
    }
}

function connect() {
    if (!window["WebSocket"]) {
        alert("Your browser does not support websockets.");
        return
    }

    workspace.ws = new WebSocket("ws://localhost:8000/websocket");

    workspace.ws.onopen = function(e) {
        workspace.reset();
        console.log("Websocket opened");
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
        console.log("Websocket closed");
    };

    workspace.ws.onerror = function(e) {
        console.log("Websocket error: " + e);
    };
}

connect();

// If no websocket, try to connect every 2 seconds.
setInterval(function() {
    if (!workspace.ws || workspace.ws.readyState === WebSocket.CLOSED) { connect() }
}, 2000);
