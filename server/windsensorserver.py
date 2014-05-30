#!/usr/bin/python
#   networking daemon running on Raspberry PI for wind-measuring
#   Copyright (C) 2014 Patrick Rudolph

#   This program is free software: you can redistribute it and/or modify
#   it under the terms of the GNU General Public License as published by
#   the Free Software Foundation, either version 3 of the License, or
#   (at your option) any later version.

#   This program is distributed in the hope that it will be useful,
#   but WITHOUT ANY WARRANTY; without even the implied warranty of
#   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#   GNU General Public License for more details.

#   You should have received a copy of the GNU General Public License
#   along with this program.  If not, see <http://www.gnu.org/licenses/>.

import SocketServer
import subprocess
import sys
import threading
from thread import start_new_thread
import time
import RPi.GPIO as GPIO
import math
import time

# RPi.GPIO Layout verwenden (wie Pin-Nummern)
GPIO.setmode(GPIO.BOARD)

# Pin 3 (GPIO 0) auf Input setzen
GPIO.setup(3, GPIO.IN, pull_up_down=GPIO.PUD_UP)

imp_per_sec = 0
actual_windspeed_msec = 0
events = []
def interrupt(val):
        global imp_per_sec
        imp_per_sec += 1

GPIO.add_event_detect(3, GPIO.RISING, callback = interrupt, bouncetime = 5)

def ws100_imp_to_mpersec(val):
        #y = 8E-09x5 - 2E-06x4 + 0,0002x3 - 0,0073x2 + 0,4503x + 0,11

        y = float("8e-9") * math.pow(val,5) - float("2e-6") * math.pow(val,4) + float("2e-4") * math.pow(val,3) - float("7.3e-3") * math.pow(val,2) + 0.4503 * val + 0.11
        if y < 0.2:
                y = 0
        return y

def threadeval():
        global imp_per_sec
        while 1:
                actual_windspeed_msec = ws100_imp_to_mpersec(imp_per_sec)
                imp_per_sec = 0
                for x in events:
                    x.set()
                time.sleep(1)

start_new_thread(threadeval, ())

HOST = ''
PORT = 2400

############################################################################
'''  One instance per connection.
     Override handle(self) to customize action. '''

class TCPConnectionHandler(SocketServer.BaseRequestHandler):
    def handle(self):
        self.event = threading.Event()
        events.append(self.event)
        while 1:
            self.event.wait()
            self.event.clear()
            try:
                self.request.sendall('{"windspeed": %f, "time": "%s"}' % (actual_windspeed_msec,time.strftime('%X %x %Z')))
            except:
                break
        events.remove(self.event)

############################################################################

class Server(SocketServer.ThreadingMixIn, SocketServer.TCPServer):
    # Ctrl-C will cleanly kill all spawned threads
    daemon_threads = True
    # much faster rebinding
    allow_reuse_address = True

    def __init__(self, server_address, RequestHandlerClass):
        SocketServer.TCPServer.__init__(\
        self,\
        server_address,\
        RequestHandlerClass)

############################################################################

if __name__ == "__main__":
    server = Server((HOST, PORT), TCPConnectionHandler)
    # terminate with Ctrl-C
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        sys.exit(0)

############################################################################
