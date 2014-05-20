var socket = io.connect();
var sliderTimeout = 0;
var packet;
var graphdata = {};
var now = new Date();
var monthNames = [ "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December" ];

var gui_day = now.getDate().toString();
var gui_month = monthNames[now.getMonth()];
var gui_year = (1900 + now.getYear()).toString();
var gui_cp, gui_cg, gui_cu, gui_cm;
var show_zero_vals = 0;
var map;

socket.on('connect', function () {
	socket.emit('GetStat', {'day': gui_day, 'month': gui_month, 'year': gui_year}); // sync
	console.log('connected');
} );

socket.on('error', function (e) {
	console.log('System', e ? e : 'An unknown error occurred');
} );

socket.on('realtimedata', function(data) {
        if(typeof data == "undefined"){return;};
	if(typeof data.windspeed == "undefined"){return;};

	graphdata['graph-windspeed-realtime'].graph.series.addData({'m/s': data.windspeed});
//	graphdata['graph-windspeed-realtime'].graph.series.name ='m/s';
        graphdata['graph-windspeed-realtime'].graph.render();
        graphdata['graph-windspeed-realtime'].graphaxisY.render();
	graphdata['graph-windspeed-realtime'].legend.render();
	$('#windspeed-realtime').html(Math.floor(data.windspeed*2)/2 + ' m/s');
	$('#datetime-realtime').html(data.time);
	$('#powerval-realtime').html( parseFloat(parseInt(0.350814814815 * parseFloat(data.windspeed)*parseFloat(data.windspeed)*parseFloat(data.windspeed) * 1000))/1000+ ' Ws');
	$('#graph-windspeed-realtime-label0').html( '<b>m/s</b>' );
	$('#graph-windspeed-realtime-label1').html( '<b>s</b>' );
	$('#electricpowerval-realtime').html( parseFloat(parseInt(0.350814814815 * parseFloat(data.windspeed)*parseFloat(data.windspeed)*parseFloat(data.windspeed) * 0.5518 * 1000))/1000+ ' Ws' );
	if(typeof data.status != "undefined")
	$('status-realtime').html( data.status );
});

var func_updateMenu =  function(data) {
        var tmp = "";
        for(var i in data.val)
        {
                tmp += "<li id='" + data.val[i] + "' name='" + data.fkt + "' class='dpmenu'>" + data.val[i] + "</li>\n";
        }
        $("#" + data.id).html(tmp);

        $('.dpmenu').click(function(ev) {
                var target      = ev.currentTarget,
                        targetid    = $(target).attr('id'),
                        name        = $(target).attr('name');
                if(name == 'year')
                        gui_year = targetid;
                if(name == 'month')
                        gui_month = targetid;
                if(name == 'day')
                        gui_day = targetid;
                socket.emit('GetStat', {'day': gui_day, 'month': gui_month, 'year': gui_year}); // sync
        });
};

var func_updateGraph = function(id) {
                        if(typeof graphdata[id] == "undefined")
                        {
                                console.log(id + ' not found !');
                                return;
                        }
			// create a deep copy
			var data = jQuery.extend(true, {}, graphdata[id].rawdata);
                                if(id.toString().indexOf('hist') > -1)
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
					console.log("setting graphdata");
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

socket.on('UpdateMenu', func_updateMenu);

socket.on('UpdateGUI', function(data) {
	switch (data.fkt) {
		case 'val':
			$("#" + data.id).html(data.val); // # is jQuery for 'get by id'
			break;
		case 'graph':
                        if(typeof graphdata[data.id] == "undefined")
                        {
                                console.log(data.id + ' not found !');
                                break;
                        }
                        // make a copy
                        graphdata[data.id].rawdata = data;
			func_updateGraph(data.id);
			break;
	}
} );


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

//JQuery dark magic
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
	$('.dpmenu').click(function(ev) {
		var target      = ev.currentTarget,
			targetid    = $(target).attr('id'),
			name        = $(target).attr('name');
		if(name == 'year')
			gui_year = targetid;
		if(name == 'month')
			gui_month = targetid;
		if(name == 'day')
			gui_day = targetid;
		socket.emit('GetStat', {'day': gui_day, 'month': gui_month, 'year': gui_year}); // sync
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

