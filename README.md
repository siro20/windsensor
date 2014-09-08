NodeJS Windsensor
========
NodeJs webserver to display histograms, statistics and realtime wind data.

Python script to collect and send realtime winddata over TCP/IP.

required nodejs modules:
--------------
* express
* jade
* recon
* socket.io

 cd to directory UI
 run "npm install" to install all modules.
 run "npm start" to launch the application.

nodejs configuration:
-------------
file config.json:

{

  "windserver": {
    "port": 2400,
    "hostname": 127.0.0.1
  }
  
  "httpserver": {
    "port": 4800
  }
  
}

this will configure the HTTP server to listen on port 4800, and tell the TCP client to connect to host 127.0.0.1 on port 2400.

required python modules:
----------------
* RPi.GPIO

python configuration:
-------------------
The python script runs the TCP/IP server on port 2400 as default. At the moment there's no config for the python script.
It samples the frequency on GPIO 0, converts it to rpm, and transmit this value once a second to all connected TCP/IP clients.

hardware:
----------------
* connect an impulse generating wind sensor to GND and GPIO0 (raspberry pi pin3).
* change the conversion from impulses to m/s in windsensorserver.py
* the current implementation is for Eltako WS100 

run:
----------------
node server.js

python windsensorserver.py

license:
----------------
All serverside code is GNU General Public License v3.
I'm using lot's of Javascript libraries that have it's own licenses (most MIT).
* http://getbootstrap.com/getting-started/
* http://d3js.org/
* http://code.shutterstock.com/rickshaw/
* http://jquery.com/
