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

var fs = require('fs');

var monthNames = [ "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December" ];

var toYDHMS = function(seconds){
	var year = parseInt(seconds/(60*60*24*365));
	seconds -= year * (60*60*24*365);
	var days = parseInt(seconds/(60*60*24));
	seconds -= days * (60*60*24);
	var hours = parseInt(seconds/(60*60));
	seconds -= hours * (60*60);
	var minutes = parseInt(seconds/60);
	seconds -= minutes * 60;
	return year.toString() + "y " + days.toString() + "d " + hours.toString() + "h " + minutes.toString() + "m " + seconds.toString() + "s ";
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

var data;

// write histogramm data to disk
var write_data = function(filename){
        console.log("write_data");
        try{
                fs.writeFileSync(filename.toString(), JSON.stringify(data, null, 4), 'utf8');
        }
        catch(err)
        {
                console.log("write_data error " + err);
        }
};

// read histogramm data from disk
var read_data = function(filename){
	try{
        	var rawdata = fs.readFileSync(filename, 'utf8');
        	data = JSON.parse(rawdata);
	}
	catch(err)
	{
        	console.log("created empty config");
        	data = JSON.parse("{}");
	}
	// on unusual exit write data to disk
	process.on('SIGINT', function(){
        	write_data(filename);
        	process.exit()
	});

	// on normal exit write data to disk
	process.on('exit', function(){
                write_data(filename);
        });

	// every 5 minutes write data to disk
	setInterval( function(){
                write_data(filename);
        }, 1000*60*5);

	return data;
};

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

exports.get_seconds_sum = get_seconds_sum;
exports.get_max_val = get_max_val;
exports.get_average_speed = get_average_speed;
exports.get_power_val = get_power_val;
exports.get_max_speed = get_max_speed;
exports.get_seconds_over_4msec = get_seconds_over_4msec;
exports.get_min_max_area = get_min_max_area;
exports.get_min_speed = get_min_speed;
exports.read_data = read_data;
exports.data = data;
exports.update_histogram = update_histogram;
exports.toYDHMS = toYDHMS;
