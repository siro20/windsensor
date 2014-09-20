var socket = io.connect();
var sliderTimeout = 0;
var packet;
var graphdata = {};

var gui_day = 0;
var gui_month = "";
var gui_year = 0;
var map;

var conn_status = "disconnected";
var conn_info = "";
var conn_warning = "";

var set_status = function(){
	$('#status-field').html(conn_status + conn_info + conn_warning);
}

var ua = window.navigator.userAgent;
var msie = ua.indexOf("MSIE ");

if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./))
{
	var ieversion = parseInt(ua.substring(msie + 5, ua.indexOf(".", msie)));
	if(ieversion < 10)
	{
		conn_info = "Internet Explorer " + ieversion + " is too old, please upgrade to 10!";
	}
}

var ff = ua.indexOf("Firefox/");
if(ff > 0)
{
	var ffversion = parseInt(ua.substring(ff+8, ua.indexOf(".", ff)));
	if(ffversion < 24)
	{
                conn_info = "Firefox " + ffversion + " is too old, please upgrade to 24!";
	}
}

var cr = ua.indexOf("Chrome/");
if(cr > 0)
{
        var crversion = parseInt(ua.substring(ff+8, ua.indexOf(".", ff)));
        if(crversion < 14)
        {
                conn_info = "Chrome " + ffversion + " is too old, please upgrade to 14!";
        }
}

set_status();

socket.on('connect', function () {
	socket.emit('clienthello'); // sync
	conn_warning = "";
	conn_status = "connected";
	set_status();
});

socket.on('error', function (e) {
	conn_status = "disconnected";
	conn_warning = "System error: " + e;
	set_status();
});

socket.on('realtimedata', function(data) {
        if(typeof data == "undefined"){return;};
	if(typeof data.windspeed == "undefined"){return;};

	graphdata['graph-windspeed-realtime'].graph.series.addData({'m/s': data.windspeed});
//	graphdata['graph-windspeed-realtime'].graph.series.name ='m/s';
        graphdata['graph-windspeed-realtime'].graph.render();
        graphdata['graph-windspeed-realtime'].graphaxisY.render();
	graphdata['graph-windspeed-realtime'].legend.render();
	$('#windspeed-realtime').html(Math.floor(data.windspeed*2)/2 + ' m/s');
	$('#datetime-realtime').html(data.time + "( now: " + new Date().toUTCString() +  " )" );
	$('#powerval-realtime').html( parseFloat(parseInt(0.350814814815 * parseFloat(data.windspeed)*parseFloat(data.windspeed)*parseFloat(data.windspeed) * 1000))/1000+ ' Ws');
	$('#graph-windspeed-realtime-label0').html( '<b>m/s</b>' );
	$('#graph-windspeed-realtime-label1').html( '<b>s</b>' );
	$('#electricpowerval-realtime').html( parseFloat(parseInt(0.350814814815 * parseFloat(data.windspeed)*parseFloat(data.windspeed)*parseFloat(data.windspeed) * 0.5518 * 1000))/1000+ ' Ws' );
	if(typeof data.status != "undefined")
	$('status-realtime').html( data.status );
});

var menu_onclick = function(target){
        var targetid    = $(target).attr('id');
        var name        = $(target).attr('name');
	console.log(" targetid " + targetid + " name " + name );
                        if(name == 'year' && targetid != gui_year)
                                socket.emit('UpdateYear', {'year': targetid});
                        if(name == 'month' && targetid != gui_month)
                                socket.emit('UpdateMonth', {'month': targetid, 'year': gui_year});
                        if(name == 'day' && targetid != gui_day)
                                socket.emit('UpdateDay', {'day': targetid, 'month': gui_month, 'year': gui_year});
};

socket.on('UpdateMenu', function(data) {
        var tmp = "";
	//console.log("update menu " + data.fkt);
        for(var i in data.val)
        {
                tmp += "<li id='" + data.val[i] + "' name='" + data.fkt + "' class='dpmenu' onclick='menu_onclick(this)'>" + data.val[i] + "</li>\n";
        }
        $("#dd_"+data.fkt).html(tmp);
});

socket.on('UpdateValue', function(data) {
	// update internal date too
	if(data.id == "title-year")
	{
		gui_year = data.val;
        	$("#title-year").html('&nbsp;' + gui_year);
	}
        else if(data.id == "title-month")
       	{
                gui_month = data.val;
                $("#title-month").html('&nbsp;' + gui_month + '&nbsp;' + gui_year);
        }
        else if(data.id == "title-day")
       	{
                gui_day = data.val;
                $("#title-day").html('&nbsp;' + gui_day + '.&nbsp;' + gui_month + '&nbsp;' + gui_year);
        }
	else
	{
		$("#" + data.id).html('&nbsp;' + data.val);
	}
});

var func_updateGraph = function(id){ 
                        if(typeof graphdata[id] == "undefined")
                        {
                                console.log('graph ' + id + ' not found !');
                                return;
                        }
			// create a deep copy
			var data = jQuery.extend(true, {}, graphdata[id].rawdata);
                                if(data.id.toString().indexOf('hist') > -1)
                                {
                                        graphdata[id].graph.series[1].data = data.val;
                                        graphdata[id].graph.series[1].name = data.legend;
                                        graphdata[id].graph.series[0].data = data.val2;
                                        graphdata[id].graph.series[0].name = '90% ' + data.legend;
                                        //remove 0 element if button is active
					if($('#' + id + '-btn1').find('.enabled').hasClass('active'))
                                        {
                                                for(i in graphdata[id].graph.series[1].data)
                                                {
                                                        if(graphdata[id].graph.series[1].data[i].x == 0)
                                                                graphdata[id].graph.series[1].data[i].y = 0;
                                                }
						for(i in graphdata[id].graph.series[0].data)
                                                {
                                                        if(graphdata[id].graph.series[0].data[i].x == 0)
                                                                graphdata[id].graph.series[0].data[i].y = 0;
                                                }
						console.log("enabled");

                                        }
					//console.log("setting graphdata");
                                }
                                else
                                {
                                        graphdata[id].graph.series[0].data = data.val;
                                        graphdata[id].graph.series[0].name = data.legend;
                                }
                                graphdata[id].graph.render();
                                graphdata[id].graphaxisY.render();
                                if(typeof data.units != "undefined"){
                                        graphdata[id].graphaxisX.tickFormat = function(n) {
                                                var map = data.units;
                                                return map[n];
                                        };
                                };
                                graphdata[id].graphaxisX.render();
                                graphdata[id].legend.render();
                                if(typeof data.label_y != "undefined"){
                                        $("#" + id + "-label0").html('<b>' + data.label_y + '</b>');
                                }
                                if(typeof data.label_x != "undefined"){
                                        $("#" + id + "-label1").html('<b>' + data.label_x + '</b>');
                                }
};

socket.on('UpdateGraph', function(data) {
                        if(typeof graphdata[data.id] == "undefined")
                        {
                                console.log(data.id + ' not found !');
                                return;
                        }
                        // make a copy
                        graphdata[data.id].rawdata = data;
			func_updateGraph(data.id);
});

function getPPI(){
  // create an empty element
  var div = document.createElement("div");
  // give it an absolute size of one inch
  div.style.width="1in";
  // append it to the body
  var body = document.getElementsByTagName("body")[0];
  body.appendChild(div);
  // read the computed width
  var ppi = document.defaultView.getComputedStyle(div, null).getPropertyValue('width');
  // remove it again
  body.removeChild(div);
  // and return the value
  return parseFloat(ppi);
}

//JQuery dark magic, adds 'hide()' and 'show()' to each element
(function ($) {
      $.each(['show', 'hide'], function (i, ev) {
        var el = $.fn[ev];
        $.fn[ev] = function () {
          this.trigger(ev);
          return el.apply(this, arguments);
        };
      });
    })(jQuery);

$(document).ready(function() {
	$('.nav-tabs').each(function(){
		$(this).css('font-size', getPPI()/5+'px');
		console.log('setting fonsize ' + getPPI()/5+'px');
	});
	$('#map').click(function(){
                if(typeof map == "undefined")
                {
                // create a map in the "map" div, set the view to a given place and zoom
                map = L.map('map', {center: [52.524, 13.406],zoom: 13});

                // add an OpenStreetMap tile layer
                L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(map);

                // add a marker in the given location, attach some popup content to it and open the popup
                L.marker([52.524, 13.406]).addTo(map);
		}
		map.invalidateSize(false);
        });
	$('.graph-container').each(function(){
		var data = [{'x':0, 'y':0}];
		graphdata[this.id] = {};
                $('#' + this.id + '-chart').width(  $('.container').width() * 0.75 );
                $('#' + this.id + '-chart').height( $('.container').width() * 0.35 );
                $('#' + this.id + '-axis1').width(  $('.container').width() * 0.75 );
		$('#' + this.id + '-axis0').height( $('.container').width() * 0.35 );

                var series = [{
                              color: 'steelblue',
                              data: data,
                              name: ''}];

		var rendererstring='bar';
		if($('#' + this.id ).hasClass( 'line' ) )
		{
			rendererstring = 'line';
		}
                else if($('#' + this.id ).hasClass( 'area' ) )
                {
                        rendererstring = 'area';
               	}
		else if($('#' + this.id ).hasClass( 'multi' ) )
		{
			rendererstring = 'multi';
                	series = [
                                {
                              color: 'rgba(255, 100, 100, 0.4)',
                              data: data,
                              name: '',
                              renderer: 'area'  },

				{
                              color: 'steelblue',
                              data: data,
                              name: '',
			      renderer: 'bar'}
				];
		}

                if($('#' + this.id ).hasClass( 'realtime' ) )
                {
                        series = new Rickshaw.Series.FixedDuration([{ name: 'm/s' }], undefined, {
			timeInterval: 1000,
			maxDataPoints: 100,
			timeBase: new Date().getTime() / 1000
			});
                }

                graphdata[this.id].graph = new Rickshaw.Graph({
                element: document.getElementById(this.id + '-chart'),
                renderer: rendererstring,
                series: series
                });
                graphdata[this.id].graph.render();
                graphdata[this.id].graphaxisY = new Rickshaw.Graph.Axis.Y({
                	element: document.getElementById(this.id + '-axis0'),
                        graph: graphdata[this.id].graph,
                        orientation: 'left',
                        tickFormat: Rickshaw.Fixtures.Number.formatKMBT
                });
                graphdata[this.id].graphaxisY.render();
                var format=function(x){return x;};
                graphdata[this.id].graphaxisX = new Rickshaw.Graph.Axis.X({
                	graph: graphdata[this.id].graph,
                        element:  document.getElementById(this.id + '-axis1'),
                        tickFormat: format,
                });
                graphdata[this.id].graphaxisX.render();
                graphdata[this.id].legend = new Rickshaw.Graph.Legend({
                	graph: graphdata[this.id].graph,
                        element: document.getElementById(this.id + '-legend')
                });

                $('#' + this.id + '-chart').children().width($('#' + this.id + '-chart').width());
                $('#' + this.id + '-chart').children().height($('#' + this.id + '-chart').height());
	});

	$('.btn-toggle').click(function() {
    		$(this).find('.btn').toggleClass('active');
    		if ($(this).find('.btn-primary').size()>0) {
        		$(this).find('.btn').toggleClass('btn-primary');
    		}
		func_updateGraph(this.id.split('-btn')[0]);
	});

});

$( window ).resize(function() {
	$("img").each(function() {
		if(this.width > $('.container').width() * 0.75)
			this.width = $('.container').width() * 0.75;
	});
	for(var i in graphdata)
	{
		$('#' + i + '-chart').width(  $('.container').width() * 0.75 );
                $('#' + i + '-chart').height( $('.container').width() * 0.35 );
		$('#' + i + '-axis1').width(  $('.container').width() * 0.75 );
                $('#' + i + '-axis0').height(  $('.container').width() * 0.35 );

		console.log("new size " + $('#' + i + '-chart').width() + " , " + $('#' + i + '-chart').height());
		graphdata[i].graph.width =  $('#' + i + '-chart').width();
		graphdata[i].graph.height =  $('#' + i + '-chart').height();
		graphdata[i].graph.render();
               	graphdata[i].graphaxisY.render();
                graphdata[i].graphaxisX.render();
		$('#' + i + '-chart').children().width($('#' + i + '-chart').width());
		$('#' + i + '-chart').children().height($('#' + i + '-chart').height());

	};

});

