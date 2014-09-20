//   nodejs webserver and datalogger
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

var http = require('./http.js');
var configuration = require('./config.json');
var recon = require('recon')
var internal = require('./internal.js');
var rawdatafilename = 'data.json';

var localdevice = 1;
var monthNames = [ "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December" ];

var data = internal.read_data(configuration.datafilename);

// socket to communicate with python script 'server'
var conn = recon(configuration.windserver.hostname, configuration.windserver.port);
console.log("connecting to " + configuration.windserver.hostname + " : " + configuration.windserver.port);
// this is the netsocket
var io = http.io;

var conn_msg = {};

// receive data from 'server'
var conn_data = function (buf){
    if(typeof buf == "undefined")
        return;
    var msg = buf.toString().trim();
    console.log(msg);
    try{
        msg = JSON.parse(msg);
    }
    catch(err)
    {
        console.log("JSON parse failed " + msg);
        internal.update_histogram(0);
        return;
    }
    if(typeof msg["windspeed"] != "undefined")
    {
        internal.update_histogram(msg["windspeed"]);
        io.sockets.emit('realtimedata', msg);
    }
};

var conn_recon = function(){
        io.sockets.emit('realtimedata', {'status': 'reconnected ' + new Date()} );
};

var conn_err = function(err){
        io.sockets.emit('realtimedata', {'status': 'Error: ' + err} );
        conn = recon(configuration.windserver.hostname, configuration.windserver.port);
	conn.on('data', conn_data());
	conn.on('reconnect', conn_recon());
	conn.on('error', conn_err());
};

conn.on('data', conn_data);
conn.on('reconnect', conn_recon);
conn.on('error', conn_err);

// websockets callback function
io.sockets.on('connection', function (socket) {
        var updateMenuYear = function(){
                if(typeof data != "undefined")
                {
                        var tmp = [];
                        for(var i in data)
                        {
                                if(i != "total")
                                {
                                        tmp.push(i.toString());
                                }
                        }
                        socket.emit('UpdateMenu', {'fkt':'year', 'val': tmp});
		}
        };
        var updateMenuDay = function(now_year, now_month){
                if(typeof data[now_year][now_month] != "undefined")
                {
                var tmp = [];
                for(var i in data[now_year][now_month])
                {
                        if(i != "total")
                        {
                                tmp.push(i.toString());
                        }
                }
                socket.emit('UpdateMenu', {'fkt':'day', 'val': tmp});
                }
        };
	var updateMenuMonth = function(now_year){
        if(typeof data[now_year] != "undefined")
        {
                var tmp = [];
                for(var i in data[now_year])
                {
                        if( i != "total")
                        {
                                tmp.push(i.toString());
                        }
                }
                socket.emit('UpdateMenu', {'fkt':'month', 'val': tmp});
        }
	};

	var updategraph = function(id, datain, datain2, legend, type)
        {
                var unit_array = [];
                var data_array = [];
                var data_array2 = [];
                var idx = 0;
                var maxval = internal.get_max_val(datain);
                if(maxval > 0)
                {
                        idx = 0;
                        for(i=0;i<=maxval;i+=0.5)
                        {
                                unit_array.push(i.toString());
                                if(typeof datain[i] != "undefined")
                                {
                                        data_array.push({'x': idx, 'y': datain[i]});
                                }
                                else
                                {
                                        data_array.push({'x': idx, 'y': 0});
                                }
                                if(typeof datain2[i] != "undefined")
                                {
                                        data_array2.push({'x': idx, 'y': datain2[i]});
                                }
                                else
                                {
                                        data_array2.push({'x': idx, 'y': 0});
                                }

                                idx += 1;
                        }
                }
                else
                {
                        for(var i in datain)
                        {
                                unit_array.push(i.toString());
                                data_array.push({'x': idx, 'y': datain[i]});
                                if(typeof datain2[i] != "undefined")
                                {
                                        data_array2.push({'x': idx, 'y': datain2[i]});
                                }
                                idx += 1;
                        }
                }
                socket.emit('UpdateGraph', {'id': id, 'graphtype': type, 'val': data_array, 'val2': data_array2, 'units': unit_array, 'legend': legend });
        };

        var updategraph2 = function(id, datain, legend, type, label_x, label_y)
        {
                var unit_array = [];
                var data_array = [];
                var idx = 0;
                var maxval = internal.get_max_val(datain);
                if(maxval > 0)
                {
                        idx = 0;
                        for(i=1;i<=maxval;i+=1)
                        {
                                unit_array.push(i.toString());
                                if(typeof datain[i] != "undefined")
                                {
                                        data_array.push({'x': idx, 'y': datain[i]});
                                }
                                else
                                {
                                        data_array.push({'x': idx, 'y': 0});
                                }
                                idx += 1;
                        }
                }
                else
                {
                        for(var i in datain)
                        {
                                unit_array.push(i.toString());
                                data_array.push({'x': idx, 'y': datain[i]});
                                idx += 1;
                        }
                }
                socket.emit('UpdateGraph', {'id': id, 'graphtype': type, 'val': data_array, 'units': unit_array, 'legend': legend});
        };

        var updateGUIyear = function(gui_year) {
                var now = new Date();
                var hist_data;
                var power_hist_data;

                console.log('updateGUIyear(' + gui_year + ')');

                if(typeof gui_year == "undefined")
                        gui_year = (1900 + now.getYear()).toString();

                //update title
                socket.emit('UpdateValue', {'id': 'title-year','val': gui_year.toString() });

                if(typeof data[gui_year]["total"] == "undefined")
                        return;

                hist_data = data[gui_year]["total"];
               	socket.emit('UpdateValue', {'id': 'top-speed-year','val': internal.get_max_speed(hist_data).toString()+ " m/s"});
                socket.emit('UpdateValue', {'id': 'aver-speed-year','val': (parseInt(internal.get_average_speed(hist_data)*1000)/1000).toString()+ " m/s"});
                socket.emit('UpdateValue', {'id': 'bottom-speed-year','val': internal.get_min_speed(hist_data).toString()+ " m/s"});
                socket.emit('UpdateValue', {'id': 'powerval-year','val': (parseInt(internal.get_power_val(hist_data)*1000)/1000).toString()+ " kWh"});
                socket.emit('UpdateValue', {'id': 'seconds-sum-year','val':internal.get_seconds_sum(hist_data).toString()+ " s ( " + internal.toYDHMS(internal.get_seconds_sum(hist_data)) + " )" });
                socket.emit('UpdateValue', {'id': 'electricpowerval-year','val':(parseInt(internal.get_power_val(hist_data)*0.5518*1000)/1000).toString() + " kWh"});
                socket.emit('UpdateValue', {'id': 'seconds-over-4msec-year','val':internal.get_seconds_over_4msec(hist_data).toString() + " s ( " + internal.toYDHMS(internal.get_seconds_over_4msec(hist_data)) + " )"});

                updategraph('graph-hist-year',hist_data, internal.get_min_max_area(hist_data), 'm/s', 'bar');

                power_hist_data = [];
                //convert hist_data to Ws
                for(var i in hist_data)
                {
                        var power_item = {};
                        power_item[i] = hist_data[i];
                        power_hist_data[i] = internal.get_power_val(power_item);
                }
                updategraph('graph-hist-power-year', power_hist_data, internal.get_min_max_area(power_hist_data),'kWh','bar');

		// graph-aver-speed
		var graph_time_data = {};
                for(var i in data[gui_year])
                {
                        if(i != "total")
                        {
                                graph_time_data[i] = internal.get_average_speed(data[gui_year][i]["total"]);
                        }
                }
                updategraph2('graph-aver-speed-year',graph_time_data, 'm/s', 'bar');

		// graph-powerval
                graph_time_data = {};
                for(var i in data[gui_year])
                {
                        if(i != "total") //skip year total
                        {
                                graph_time_data[i] = internal.get_power_val(data[gui_year][i]["total"]);
                        }
                }
                updategraph2('graph-powerval-year', graph_time_data, 'kWh', 'bar');
		
		// graph-electricpowerval
                graph_time_data = {};
               	for(var i in data[gui_year])
                {
                        if(i != "total") //skip year total
                        {
                               	graph_time_data[i] = internal.get_power_val(data[gui_year][i]["total"])*0.5518;
                        }
                }
                updategraph2('graph-electricpowerval-year', graph_time_data, 'kWh', 'bar');

		// graph-over-4msec
		graph_time_data = {};
                for(var i in data[gui_year])
                {
                        if(i != "total") //skip year total
                        {
                                graph_time_data[i] = internal.get_seconds_over_4msec(data[gui_year][i]["total"]);
                       	}
                }
                updategraph2('graph-over-4msec-year', graph_time_data, 'Windgeschwindigkeit >= 4 m/s', 'bar');

		// update month selection menu
                updateMenuMonth(gui_year);
	}

	var updateGUImonth = function(gui_year, gui_month) {
                var now = new Date();
                var hist_data;
                var power_hist_data;

                console.log('updateGUImonth(' + gui_year + ',' + gui_month + ')');

                if(typeof gui_year == "undefined")
                        gui_year = (1900 + now.getYear()).toString();

                if(typeof gui_month == "undefined")
                        gui_month = -1;

                if(typeof data[gui_year][gui_month] == "undefined")
                        gui_month = -1;

                if(gui_month == -1)
                {
			var i = 0;
                        gui_month = monthNames[i];
                        while(typeof data[gui_year][gui_month] == "undefined" && i < 13)
                        { i++; gui_month = monthNames[i]; }
                        if(i == 13)
                                return;
                }

                if(typeof data[gui_year][gui_month]["total"] == "undefined")
                        return;

                //update title
                socket.emit('UpdateValue', {'id': 'title-month','val': gui_month.toString()});
 		
		hist_data = data[gui_year][gui_month]["total"];
                socket.emit('UpdateValue', {'id': 'top-speed-month','val': internal.get_max_speed(hist_data).toString()+ " m/s"});
                socket.emit('UpdateValue', {'id': 'aver-speed-month','val': (parseInt(internal.get_average_speed(hist_data)*1000)/1000).toString()+ " m/s"});
                socket.emit('UpdateValue', {'id': 'bottom-speed-month','val': internal.get_min_speed(hist_data).toString()+ " m/s"});
                socket.emit('UpdateValue', {'id': 'powerval-month','val': (parseInt(internal.get_power_val(hist_data)*1000)/1000).toString() + " kWh"});
                socket.emit('UpdateValue', {'id': 'seconds-sum-month','val': internal.get_seconds_sum(hist_data).toString()+ " s ( " + internal.toYDHMS(internal.get_seconds_sum(hist_data)) + " )" });
                socket.emit('UpdateValue', {'id': 'seconds-over-4msec-month','val': internal.get_seconds_over_4msec(hist_data).toString() + " s ( " + internal.toYDHMS(internal.get_seconds_over_4msec(hist_data)) + " )"});
                socket.emit('UpdateValue', {'id': 'electricpowerval-month','val':(parseInt(internal.get_power_val(hist_data)*0.5518*1000)/1000).toString() + " kWh"});
                updategraph('graph-hist-month', hist_data, internal.get_min_max_area(hist_data),'m/s', 'bar');

		// graph-hist-power
                power_hist_data = {};
                for(var i in hist_data)
                {
                        var power_item = {};
                        power_item[i] = hist_data[i];
                        power_hist_data[i] = internal.get_power_val(power_item);
                }
                updategraph('graph-hist-power-month', power_hist_data, internal.get_min_max_area(power_hist_data),'kWh','bar');

		// graph-powerval
                graph_time_data = {};
                for(var i in data[gui_year][gui_month])
                {
                        if(i != "total")
                        {
                                graph_time_data[i] = internal.get_power_val(data[gui_year][gui_month][i]);
                        }
                }
                updategraph2('graph-powerval-month', graph_time_data, 'kWh', 'bar');

		// graph-aver-speed
                graph_time_data = {};
                for(var i in data[gui_year][gui_month])
                {
                        if(i != "total")
                       	{
                                graph_time_data[i] = internal.get_average_speed(data[gui_year][gui_month][i]);
                        }
                }
               	updategraph2('graph-aver-speed-month', graph_time_data, 'm/s', 'bar');

		// graph-over-4msec
                graph_time_data = {};
                for(var i in data[gui_year][gui_month])
                {
                        if(i != "total")
                        {
                                graph_time_data[i] = internal.get_seconds_over_4msec(data[gui_year][gui_month][i]);
                        }
                }
                updategraph2('graph-over-4msec-month', graph_time_data, 'Windgeschwindigkeit >= 4 m/s', 'bar');

		// graph-electricpowerval
                graph_time_data = {};
                for(var i in data[gui_year][gui_month])
                {
                        if(i != "total")
                        {
                               	graph_time_data[i] = internal.get_power_val(data[gui_year][gui_month][i])*0.5518;
                        }
                }
                updategraph2('graph-electricpowerval-month', graph_time_data, 'kWh', 'bar');
		
		updateMenuDay(gui_year, gui_month);
	}

	var updateGUIday = function(gui_year, gui_month, gui_day) {
		var now = new Date();
                var hist_data;
                var power_hist_data;

                console.log('updateGUIday(' + gui_year + ',' + gui_month + ',' + gui_day + ')');

                if(typeof gui_year == "undefined")
                        gui_year = (1900 + now.getYear()).toString();

                if(typeof gui_month == "undefined")
                        gui_month = -1;

                if(typeof data[gui_year][gui_month] == "undefined")
                        gui_month = -1;

                if(gui_month == -1)
                {
                        var i = 0;
                        gui_month = monthNames[i];
                        while(typeof data[gui_year][gui_month] == "undefined" && i < 13)
                        { i++; gui_month = monthNames[i]; }
                        if(i == 13)
                                return;
                }
	
		if(typeof gui_day == "undefined")
			gui_day = -1;
	
                if(typeof data[gui_year][gui_month][gui_day] == "undefined")
                        gui_day = -1;
	
		if(gui_day == -1)
		{
			gui_day = 0;
			while(typeof data[gui_year][gui_month][gui_day] == "undefined" && gui_day < 32)
                        { gui_day++; }
			if(gui_day == 32)
				return;
		}
		//update title
		socket.emit('UpdateValue', {'id': 'title-day', 'val': gui_day.toString()});
		
		if(typeof data[gui_year][gui_month][gui_day] == "undefined")
			return;

		hist_data = data[gui_year][gui_month][gui_day];
		socket.emit('UpdateValue', {'id': 'top-speed-day','val': internal.get_max_speed(hist_data).toString() + " m/s"});
		socket.emit('UpdateValue', {'id': 'aver-speed-day','val': (parseInt(internal.get_average_speed(hist_data)*1000)/1000).toString() + " m/s"});
		socket.emit('UpdateValue', {'id': 'bottom-speed-day','val': internal.get_min_speed(hist_data).toString() + " m/s"});
		socket.emit('UpdateValue', {'id': 'powerval-day','val': (parseInt(internal.get_power_val(hist_data)*1000)/1000).toString() + " kWh"});
		socket.emit('UpdateValue', {'id': 'seconds-sum-day','val':internal.get_seconds_sum(hist_data).toString()+ " s ( " + internal.toYDHMS(internal.get_seconds_sum(hist_data)) + " )"});
		socket.emit('UpdateValue', {'id': 'seconds-over-4msec-day','val':internal.get_seconds_over_4msec(hist_data).toString() + " s ( " + internal.toYDHMS(internal.get_seconds_over_4msec(hist_data)) + " )"});
		socket.emit('UpdateValue', {'id': 'electricpowerval-day','val':(parseInt(internal.get_power_val(hist_data)*0.5518*1000)/1000).toString() + " kWh"});
		updategraph('graph-hist-day',hist_data, internal.get_min_max_area(hist_data),'m/s', 'bar');		
	        
		power_hist_data = [];
                //convert hist_data to kWh
                for(var i in hist_data)
                {
                        var power_item = {};
                        power_item[i] = hist_data[i];
                        power_hist_data[i] = internal.get_power_val(power_item);
               	}
                updategraph('graph-hist-power-day',power_hist_data, internal.get_min_max_area(power_hist_data),'KWh','bar');
	};

        socket.on('UpdateYear', function(pkt){
		if(typeof pkt.year != "undefined")
		{
			updateGUIyear(pkt.year);
                        updateGUImonth(pkt.year, -1);
                	updateGUIday(gui_year, -1, -1);
		}
	});
        socket.on('UpdateMonth', function(pkt){
                if(typeof pkt.month != "undefined")
                {
                        if(typeof pkt.year != "undefined")
                        {
                        	updateGUImonth(pkt.year, pkt.month);
				updateGUIday(pkt.year, pkt.month, -1);
			}
                }
        });
        socket.on('UpdateDay', function(pkt){
                if(typeof pkt.day != "undefined")
                {
                	if(typeof pkt.month != "undefined")
                	{
                		if(typeof pkt.year != "undefined")
                		{
                        		updateGUIday(pkt.year, pkt.month, pkt.day);
				}
			}
                }
        });
	// a new client connected, update all graphs
        socket.on('clienthello', function(){
                var now = new Date(),
                        now_day = now.getDate().toString(),
                        now_month = monthNames[now.getMonth()],
                       	now_year = (1900 + now.getYear()).toString();
                updateGUIyear(now_year);
                updateGUImonth(now_year, now_month);
                updateGUIday(now_year, now_month, now_day);
        });

});

