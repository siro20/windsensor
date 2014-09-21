Python Windsensor
========
Python script to collect and send realtime winddata over TCP/IP.

required python modules:
--------------
* https://pypi.python.org/pypi/RPi.GPIO

python configuration:
-------------------
The python script runs the TCP/IP server on port 2400 as default. At the moment there's no config for the python script.
It samples the frequency on Pin3, converts it to rpm, and transmit this value once a second to all connected TCP/IP clients.

hardware:
----------------
* raspberry pi
* connect an impulse generating wind sensor to GND and Pin3
* change the conversion from impulses to m/s in windsensorserver.py
* the current implementation is for Eltako WS100 

python windsensorserver.py

license:
----------------
GNU General Public License v3.
