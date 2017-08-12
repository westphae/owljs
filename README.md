# owljs
User-configurable plotting of multiple realtime time series data streams.

## Functionality
* Websocket receives data from some source via structure specified by JSONConfig.
* Serves index.html and supporting css and js files.
* Plots stream of live data; user can select which data to plot on which axes.

## Sending component:
* Serves index.html, owl.css, d3.js and owl.js.
* Implements websocket.
* Responds to ping/pong heartbeats sent by client.
* Listens for close and deletes client if closed.
* Listens for pause/resume signals and stops sending data when paused.
* On connection sends jsonConfig metadata: title, data structure.
* Marshals the information according to JSonConfig and sends over websocket.

## Javascript components:
* Receiver:
  * Subscribes to websocket.
  * Sends/receives ping/pong heartbeats, stops sending and closes websocket if heartbeat lost.
  * Connected indication on left panel.
* Data object: holds full raw data set (up to some max lookback for memory purposes).
  * Further back, compress into bars like smokeping.
  * Appears as legend on left panel.
  * User can drag from legend to plot component y-axes to add to plot.
* Plot object: specifies left and right y-axes.
  * All plots share common x-axis.
  * Plotted data is aggregated like smokeping; zooming re-aggregates.
  * Title contains legend for plot (text color matches lines).
  * User can drag title text back to Data object to remove from plot.
* Left panel:
  * Title
  * Number showing data size (num records and time interval)
  * Reset button to clear out data
  * Signal buttons (e.g. AHRS reset/level button to restart AHRS)
  * Pause/Resume button to stop receiving new data (greyed out if no connection)
  * Legend: colored text with available (non-plotted) fields.
  * Initially, print all fields, sorted in order in which it was received.
  * Allow user to order which data is printed and delete fields.
  * Empty box to put an empty plot in main area.
  * Markers: horizontal, vertical - drag to axis to specify.
* Workspace area:
  * Holds common x-axis, full-scale updated as data received from websocket and zoom as chosen by user.
  * Common brush allows for zooming on x-axis; y-axis auto-scales to fit displayed data.
  * Data handle can be dragged to empty area for a new chart or to an existing plot's y-axis to add to it.
  * Data handle can be dragged in-between existing plots to insert a new plot and shrink existing plots.
  * Chart title upper-right can be grabbed to move whole plot to new area of main area.
  * Equal x-width is given to all plots in a row; height is determined by 3:2 ratio.
  
## Development plan:
* Data object to hold data.
* Receiver object to receive data.
* Sending component in Go to have data to work with.
* Panel object
* Workspace area 
* Plot object
