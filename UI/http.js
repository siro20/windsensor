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

var express = require('express');
var app     = express(),
    http    = require('http'),
    server  = http.createServer(app);
var configuration = require('./config.json');

var oneDay = 86400000;

// jade setup
app.set('views', __dirname + '/views');
app.set('view engine', 'jade'); // Set jade as default render engine
app.use(express.static(__dirname + '/public', { maxAge: oneDay }));

app.locals.pretty = true; // format output of jade

app.get('/', function(req, res) {
	var years = [];
	var month = [];
	var days = [];
	var now = new Date();
	for(var i in exports.data)
	{
		years.push(i);
	}
	for(var i in exports.data[(1900 + now.getYear()).toString()])
	{
		if(i != "total")
		{
			month.push(i);
		}
	}
	for(var i in exports.data[(1900 + now.getYear()).toString()][exports.monthNames[now.getMonth()]])
	{
		if(i != "total")
		{
			days.push(i);
		}
	}
	if(req.headers["accept-language"].indexOf("de") > -1 ){
		res.render("desktop", {
						   pagetitle: "Webinterface",
						   years: years,
						   month: month,
						   days:  days,
						  });
	}
	else
	{
		res.render("desktop-en", {
						   pagetitle: "Webinterface",
						   years: years,
						   month: month,
						   days:  days,
						  });
	}

});

app.get('/mobile', function(req, res) {
	var years = [];
	var month = [];
	var days = [];
	var now = new Date();
	for(var i in exports.data)
	{
		years.push(i);
	}
	for(var i in exports.data[(1900 + now.getYear()).toString()])
	{
		if(i != "total")
		{
			month.push(i);
		}
	}
	for(var i in exports.data[(1900 + now.getYear()).toString()][exports.monthNames[now.getMonth()]])
	{
		if(i != "total")
		{
			days.push(i);
		}
	}
	res.render('mobile', {
					pagetitle: "Webinterface",
						   years: years,
						   month: month,
						   days:  days,
					 });
});

server.listen(configuration.httpserver.port);

exports.server = server;
