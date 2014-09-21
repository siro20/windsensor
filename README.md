NodeJS Windsensor
========
NodeJs webserver to display histograms, statistics and realtime wind data.

Python script to collect and send realtime winddata over TCP/IP.

UI:
-------------
this folder contains the nodejs files. It runs a webserver, handles websockets for realtime data transmission, creates a database and acts as TCP/IP client to receive data from the python script.

server:
-------------------
this folder contains the python files. It samples the frequency on RaspberryPI pin3 and converts it to the actual windspeed. This script runs a TCP/IP server on port 2400. Every connected TCP/IP client receives the current wind speed once a second.

license:
----------------
All serverside code is GNU General Public License v3.
I'm using lot's of Javascript libraries that have it's own licenses (most MIT).
* http://getbootstrap.com/getting-started/
* http://d3js.org/
* http://code.shutterstock.com/rickshaw/
* http://jquery.com/
