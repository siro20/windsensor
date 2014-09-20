//   nodejs webserver
//   Copyright (C) 2014 Patrick Rudolph

//   This program is free software: you can redistribute it and/or modify
//   it under the terms of the GNU General Public License as published by
//   the Free Software Foundation, either version 3 of the License, or
//   (at your option) any later version.

//   This program is distributed in the hope that it will be useful,
//   but WITHOUT ANY WARRANTY; without even the implied warranty of
//   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//   GNU General Public License for more details.

//   You should have received a copy of the GNU General Public License
//   along with this program.  If not, see <http://www.gnu.org/licenses/>.

var fs = require('fs');
var express = require('express');
var app     = express(), //for socket.io
    http    = require('http'),
    server  = http.createServer(app);
var configuration = require('./config.json');

app.use(express.static(__dirname + '/public'));

app.locals.pretty = true;

app.get('/', function(req, res) {
	if(req.headers["accept-language"].indexOf("de") > -1 ){
		res.send(fs.readFileSync('./views/index-de.html', 'utf8'));
	}
	else
	{
                res.send(fs.readFileSync('./views/index-en.html', 'utf8'));
	}
});

server.listen(configuration.httpserver.port);
var io = require('socket.io').listen(server);

exports.io = io;
