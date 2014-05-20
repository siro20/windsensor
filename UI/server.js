var fs = require('fs');
var http = require('./http.js');
var sys = require('sys')
var exec = require('child_process').exec;
var configuration = require('./config.json');

var monthNames = [ "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December" ];

var rawdatafilename = 'data.json';

var localdevice = 1;

var data;

var rawdata;
try{
        rawdata = fs.readFileSync(rawdatafilename, 'utf8');
}
catch(err)
{
        console.log("created empty config");
        rawdata = "{}";
}
finally{
        data = JSON.parse(rawdata);
}

http.data = data;
http.monthNames = monthNames;

//socket to communicate with raspberry pi node
var recon = require('recon')
var conn = recon(configuration.windserver.hostname, configuration.windserver.port);

var io = require('socket.io').listen(http.server);

io.enable('browser client minification');  // send minified client
io.enable('browser client etag');          // apply etag caching logic based on version number
io.enable('browser client gzip');          // gzip the file
//io.set('log level', 1);                    // reduce logging
var update_histogram = function(val){
	var now = new Date();
	var now_day = now.getDate().toString();
	var now_month = monthNames[now.getMonth()];
	var now_year = (1900 + now.getYear()).toString();
	if(typeof data[now_year] == "undefined")
	{
		data[now_year] = {};
		data[now_year]["total"] = {};
	}
	if(typeof data[now_year][now_month] == "undefined")
	{
		data[now_year][now_month] = {};
		data[now_year][now_month]["total"] = {};
		for(i=0;i<5;i+=0.5)
               	{
			data[now_year][now_month]["total"][i] = 0;
		}

	}
	if(typeof data[now_year][now_month][now_day] == "undefined")
	{
		data[now_year][now_month][now_day] = {};
		for(i=0;i<5;i+=0.5)
		{
			data[now_year][now_month][now_day][i] = 0;
		}
	}
	var idx = Math.floor(val*2)/2; // use 0.5 steps
	if(idx > 100)
		return;
	if(typeof data[now_year][now_month][now_day][idx] == "undefined")
	{
		data[now_year][now_month][now_day][idx] = 0;
	}
	if(typeof data[now_year]["total"][idx] == "undefined")
	{
		data[now_year]["total"][idx] = 0;
	}
	if(typeof data[now_year][now_month]["total"][idx] == "undefined")
	{
		data[now_year][now_month]["total"][idx] = 0;
	}
	data[now_year]["total"][idx] += 1;
	data[now_year][now_month]["total"][idx] += 1;
	data[now_year][now_month][now_day][idx] += 1;
}


var get_seconds_sum = function(val){
        if(typeof val == "undefined")
       	{
               	return 0;
        }
       	var total = 0;
       	for(var i in val)
        {
		total += val[i];
        }
	return total;
};


var get_max_val = function(val) {
	var maxval = 0;
        for(var i in val)
        {
                 if(!parseFloat(i).isNaN && parseFloat(i) > maxval)
                 {
                         maxval = parseFloat(i);
                 }
        }
        if(maxval > 50)
        	maxval = 50;
	return maxval;
};

var get_average_speed = function(val){
	if(typeof val == "undefined")
	{
		return 0;
	}
	var sum = 0;
	var count = 0;
	for(var i in val)
	{
		sum += parseFloat(i)*parseFloat(val[i]);
		count += parseFloat(val[i]);
	}
	if(count > 0){
		return sum/count;
	}
	else
	{
		return 0;
	}
}

var get_power_val = function(val){
	if(typeof val == "undefined")
	{
		return 0;
	}
	var sum = 0;
	for(var i in val)
	{
		sum += parseFloat(i)*parseFloat(i)*parseFloat(i)*val[i];
	}
	return 0.350814814815 * sum/(1000.0*60.0*60.0); //kW/h
}

var get_max_speed = function(val){
	if(typeof val == "undefined")
	{
		return 0;
	}
	var total = 0;
	for(var i in val)
	{
		if(i != 0){
			total += parseFloat(val[i]);
		}
	}
	var sum = 0;
	for(i=0.5;i<get_max_val(val);i+=0.5)
	{
		if(typeof val[i] != "undefined")
		{
			sum += val[i];
		}
		if(sum > total*0.95)
			return i;
	}
	return 0;
}

var get_min_speed = function(val){
	if(typeof val == "undefined")
	{
		return 0;
	}
	var total = 0;
	for(var i in val)
	{
		if(i != 0){
			total += val[i];
		}
	}
	var sum = 0;
	for(i=0.5;i<get_max_val(val);i+=0.5)
	{
		if(typeof val[i] != "undefined"){
			sum += val[i];
		}
		if(sum > total*0.05)
			return i;
	}
	return 0;
}

var get_seconds_over_4msec = function(val){
        if(typeof val == "undefined")
        {
                return 0;
        }
        var sum = 0;
        for(var i in val)
        {
		if(parseFloat(i) > 4){
                	sum += val[i];
		}
        }
        return sum; 
};

var get_min_max_area = function(val){
	var hist_area_data = {};
	var hist_area_max_val = 0;
	for(var i in val)
	{
		if(i != 0){
			if(parseFloat(val[i])>hist_area_max_val){
				hist_area_max_val = parseFloat(val[i]);
			}
		}
	}
	hist_area_data[get_min_speed(val)-0.001] = 0;
	hist_area_data[get_max_speed(val)+0.001] = 0;
        for(var j=get_min_speed(val);j<get_max_speed(val);j+=0.5)
        {
        	hist_area_data[j] = hist_area_max_val;
        }
        return hist_area_data;
};


var write_data = function(){
	console.log("write_data");
	try{
		fs.writeFileSync(rawdatafilename, JSON.stringify(data, null, 4), 'utf8');
	}
	catch(err)
	{
        	console.log("write_data error " + err);
	}
};

process.on('SIGINT', function(){
	write_data();
	process.exit()
});
process.on('exit', write_data);
setInterval(write_data,1000*60*5);

var conn_msg = {};
conn.on('data', function (buf) {
    var msg = buf.toString().trim();
    console.log(msg);
    try{
        msg = JSON.parse(msg);
    }
    catch(err)
    {
        console.log("JSON parse failed " + msg);
	update_histogram(0);
        return;
    }
    if(typeof msg["windspeed"] != "undefined")
    {
        update_histogram(msg["windspeed"]);
	io.sockets.emit('realtimedata', msg);
    }
});

conn.on('reconnect',function(){
	io.sockets.emit('realtimedata', {'status': 'reconnected ' + new Date()} );
});

conn.on('error',function(err){
	io.sockets.emit('realtimedata', {'status': 'Error: ' + err} );
});

io.sockets.on('connection', function (socket) {
	var gui_year;
	var gui_month;
	var gui_day;

	var updategraph = function(id, datain, datain2, legend, type, label_x, label_y)
	{
		var unit_array = [];
		var data_array = [];
		var data_array2 = [];
		var idx = 0;
		var maxval = get_max_val(datain);
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
		socket.emit('UpdateGUI', {'fkt':'graph', 'id': id, 'graphtype': type, 'val': data_array, 'val2': data_array2, 'units': unit_array, 'legend': legend, 'label_x': label_x, 'label_y': label_y});
	}

	var updategraph2 = function(id, datain, legend, type, label_x, label_y)
        {
                var unit_array = [];
                var data_array = [];
                var idx = 0;
                var maxval = get_max_val(datain);
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
                socket.emit('UpdateGUI', {'fkt':'graph', 'id': id, 'graphtype': type, 'val': data_array, 'units': unit_array, 'legend': legend, 'label_x': label_x, 'label_y': label_y});
        }

        var updateGUIyear = function() {
                var now = new Date();
                var hist_data;
                var power_hist_data;

                if(typeof gui_year == "undefined")
                        gui_year = (1900 + now.getYear()).toString();

                console.log('updateGUIyear( ' + gui_year + ')');

                //update title
                socket.emit('UpdateGUI', {'fkt':'val', 'id': 'title-year','val': '&nbsp;' + gui_year.toString() });

                hist_data = data[gui_year]["total"];
               	socket.emit('UpdateGUI', {'fkt':'val', 'id': 'top-speed-year','val': get_max_speed(hist_data).toString()+ " m/s"});
                socket.emit('UpdateGUI', {'fkt':'val', 'id': 'aver-speed-year','val': (parseInt(get_average_speed(hist_data)*1000)/1000).toString()+ " m/s"});
                socket.emit('UpdateGUI', {'fkt':'val', 'id': 'bottom-speed-year','val': get_min_speed(hist_data).toString()+ " m/s"});
                socket.emit('UpdateGUI', {'fkt':'val', 'id': 'powerval-year','val': (parseInt(get_power_val(hist_data)*1000)/1000).toString()+ " kWh"});
                socket.emit('UpdateGUI', {'fkt':'val', 'id': 'seconds-sum-year','val':get_seconds_sum(hist_data).toString()+ " s"});
                socket.emit('UpdateGUI', {'fkt':'val', 'id': 'electricpowerval-year','val':(parseInt(get_power_val(hist_data)*0.5518*1000)/1000).toString() + " kWh"});
                socket.emit('UpdateGUI', {'fkt':'val', 'id': 'seconds-over-4msec-year','val':get_seconds_over_4msec(hist_data).toString() + " s"});

                updategraph('graph-hist-year',hist_data, get_min_max_area(hist_data), 'm/s', 'bar', 'windspeed m/s', 's');

                power_hist_data = [];
                //convert hist_data to Ws
                for(var i in hist_data)
                {
                        var power_item = {};
                        power_item[i] = hist_data[i];
                        power_hist_data[i] = get_power_val(power_item);
                }
                updategraph('graph-hist-power-year',power_hist_data,get_min_max_area(power_hist_data),'kWh','bar','windspeed m/s','kWh');

		// graph-aver-speed
		var graph_time_data = {};
                for(var i in data[gui_year])
                {
                        if(i != "total")
                        {
                                graph_time_data[i] = get_average_speed(data[gui_year][i]["total"]);
                        }
                }
                updategraph2('graph-aver-speed-year',graph_time_data, 'm/s', 'bar','month','m/s');

		// graph-powerval
                graph_time_data = {};
                for(var i in data[gui_year])
                {
                        if(i != "total") //skip year total
                        {
                                graph_time_data[i] = get_power_val(data[gui_year][i]["total"]);
                        }
                }
                updategraph2('graph-powerval-year',graph_time_data, 'kWh', 'bar', 'month', 'kWh');
		
		// graph-electricpowerval
                graph_time_data = {};
               	for(var i in data[gui_year])
                {
                        if(i != "total") //skip year total
                        {
                               	graph_time_data[i] = get_power_val(data[gui_year][i]["total"])*0.5518;
                        }
                }
                updategraph2('graph-electricpowerval-year',graph_time_data, 'kWh', 'bar', 'month', 'kWh');

		// graph-over-4msec
		graph_time_data = {};
                for(var i in data[gui_year])
                {
                        if(i != "total") //skip year total
                        {
                                graph_time_data[i] = get_seconds_over_4msec(data[gui_year][i]["total"]);
                       	}
                }
                updategraph2('graph-over-4msec-year',graph_time_data, 'Windgeschwindigkeit >= 4 m/s', 'bar', 'month', 's');

		// update month selection menu
		hist_data = [];
		for(var i in data[gui_year])
                {
			if( i != "total")
			{
				hist_data.push(i.toString());
			}
                }
		socket.emit('UpdateMenu', {'fkt':'month', 'id': 'dd_month','val': hist_data});

	}

	var updateGUImonth = function() {
                var now = new Date();
                var hist_data;
                var power_hist_data;

                if(typeof gui_month == "undefined")
                        gui_month = monthNames[now.getMonth()];

                console.log('updateGUImonth( ' + gui_month + ')');

                //update title
                socket.emit('UpdateGUI', {'fkt':'val', 'id': 'title-month','val': '&nbsp;' + gui_month.toString()+ ' ' + gui_year.toString()});
 		
		hist_data = data[gui_year][gui_month]["total"];
                socket.emit('UpdateGUI', {'fkt':'val', 'id': 'top-speed-month','val': get_max_speed(hist_data).toString()+ " m/s"});
                socket.emit('UpdateGUI', {'fkt':'val', 'id': 'aver-speed-month','val': (parseInt(get_average_speed(hist_data)*1000)/1000).toString()+ " m/s"});
                socket.emit('UpdateGUI', {'fkt':'val', 'id': 'bottom-speed-month','val': get_min_speed(hist_data).toString()+ " m/s"});
                socket.emit('UpdateGUI', {'fkt':'val', 'id': 'powerval-month','val': (parseInt(get_power_val(hist_data)*1000)/1000).toString() + " kWh"});
                socket.emit('UpdateGUI', {'fkt':'val', 'id': 'seconds-sum-month','val':get_seconds_sum(hist_data).toString()+ " s"});
                socket.emit('UpdateGUI', {'fkt':'val', 'id': 'seconds-over-4msec-month','val':get_seconds_over_4msec(hist_data).toString() + " s"});
                socket.emit('UpdateGUI', {'fkt':'val', 'id': 'electricpowerval-month','val':(parseInt(get_power_val(hist_data)*0.5518*1000)/1000).toString() + " kWh"});
                updategraph('graph-hist-month',hist_data, get_min_max_area(hist_data),'m/s', 'bar','windspeed m/s','s');

		// graph-hist-power
                power_hist_data = {};
                for(var i in hist_data)
                {
                        var power_item = {};
                        power_item[i] = hist_data[i];
                        power_hist_data[i] = get_power_val(power_item);
                }
                updategraph('graph-hist-power-month',power_hist_data,get_min_max_area(power_hist_data),'kWh','bar','windspeed m/s','kWh');

		// graph-powerval
                graph_time_data = {};
                for(var i in data[gui_year][gui_month])
                {
                        if(i != "total")
                        {
                                graph_time_data[i] =  get_power_val(data[gui_year][gui_month][i]);
                        }
                }
                updategraph2('graph-powerval-month',graph_time_data, 'kWh', 'bar', 'day', 'kWh');

		// graph-aver-speed
                graph_time_data = {};
                for(var i in data[gui_year][gui_month])
                {
                        if(i != "total")
                       	{
                                graph_time_data[i] = get_average_speed(data[gui_year][gui_month][i]);
                        }
                }
               	updategraph2('graph-aver-speed-month',graph_time_data, 'm/s', 'bar', 'day', 'm/s');

		// graph-over-4msec
                graph_time_data = {};
                for(var i in data[gui_year][gui_month])
                {
                        if(i != "total")
                        {
                                graph_time_data[i] =  get_seconds_over_4msec(data[gui_year][gui_month][i]);
                        }
                }
                updategraph2('graph-over-4msec-month',graph_time_data, 'Windgeschwindigkeit >= 4 m/s', 'bar', 'day', 's');

		// graph-electricpowerval
                graph_time_data = {};
                for(var i in data[gui_year][gui_month])
                {
                        if(i != "total")
                        {
                               	graph_time_data[i] =  get_power_val(data[gui_year][gui_month][i])*0.5518;
                        }
                }
                updategraph2('graph-electricpowerval-month',graph_time_data, 'kWh', 'bar', 'day', 'kWh');
		
		hist_data = [];
                for(var i in data[gui_year][gui_month])
                {
			if(i != "total")
			{
                        	hist_data.push(i.toString());
			}
                }
                socket.emit('UpdateMenu', {'fkt':'day', 'id': 'dd_days','val': hist_data});
	}

	var updateGUIday = function() {
		var now = new Date();
                var hist_data;
                var power_hist_data;
	
		if(typeof gui_day == "undefined")
			gui_day = now.getDate().toString();
		
		console.log('updateGUIday( ' + gui_day + ')');
		
		//update title
		socket.emit('UpdateGUI', {'fkt':'val', 'id': 'title-day','val': '&nbsp;' + gui_day.toString()+ '.' + gui_month.toString()+ '.' + gui_year.toString()});
		
		hist_data = data[gui_year][gui_month][gui_day];
		socket.emit('UpdateGUI', {'fkt':'val', 'id': 'top-speed-day','val': get_max_speed(hist_data).toString() + " m/s"});
		socket.emit('UpdateGUI', {'fkt':'val', 'id': 'aver-speed-day','val': (parseInt(get_average_speed(hist_data)*1000)/1000).toString() + " m/s"});
		socket.emit('UpdateGUI', {'fkt':'val', 'id': 'bottom-speed-day','val': get_min_speed(hist_data).toString() + " m/s"});
		socket.emit('UpdateGUI', {'fkt':'val', 'id': 'powerval-day','val': (parseInt(get_power_val(hist_data)*1000)/1000).toString() + " kWh"});
		socket.emit('UpdateGUI', {'fkt':'val', 'id': 'seconds-sum-day','val':get_seconds_sum(hist_data).toString()+ " s"});
		socket.emit('UpdateGUI', {'fkt':'val', 'id': 'seconds-over-4msec-day','val':get_seconds_over_4msec(hist_data).toString() + " s"});
		socket.emit('UpdateGUI', {'fkt':'val', 'id': 'electricpowerval-day','val':(parseInt(get_power_val(hist_data)*0.5518*1000)/1000).toString() + " kWh"});
		updategraph('graph-hist-day',hist_data, get_min_max_area(hist_data),'m/s', 'bar','windspeed m/s','s');		
	        
		power_hist_data = [];
                //convert hist_data to kWh
                for(var i in hist_data)
                {
                        var power_item = {};
                        power_item[i] = hist_data[i];
                        power_hist_data[i] = get_power_val(power_item);
               	}
                updategraph('graph-hist-power-day',power_hist_data,get_min_max_area(power_hist_data),'KWh','bar','windspeed m/s','kWh');
	};
	
    socket.on('GetStat', function (packetdata) {
		if(typeof packetdata.year != "undefined")
		{
			if(typeof data[packetdata.year] != "undefined")
			{
				gui_year = packetdata.year;
				updateGUIyear();
				if(typeof packetdata.month != "undefined")
				{
					if(typeof data[packetdata.year][packetdata.month]  != "undefined")
					{
						gui_month = packetdata.month;
						updateGUImonth();
						if(typeof packetdata.day != "undefined")
						{
							if(typeof data[packetdata.year][packetdata.month][packetdata.day]  != "undefined")
							{
								gui_day = packetdata.day;
								updateGUIday();
							}
							else
							{
								for(var i in  data[packetdata.year][packetdata.month])
								{
									gui_day = i;
									updateGUIday();
									break;
								}
							}
						}
					}
				}
			}
		}
		 
	});
});
