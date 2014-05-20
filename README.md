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

run:
----------------
nodejs server.js

python windsensorserver.py
