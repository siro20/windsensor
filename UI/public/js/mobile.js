var socket = io.connect();

socket.on('connect', function () {
	socket.emit('GetStat', '');
	console.log('connected');
} );

socket.on('error', function (e) {
	console.log('System', e ? e : 'A unknown error occurred');
} );

socket.on('LichtStat', function(data) {
	console.log(data);
	switch (data.fkt) {
		case 'sw':
			$('#sw' + data.selector).val(data.val?"on":"off").slider("refresh");
			break;
		case 'sl':
			$('#sl' + data.selector).val(data.val).slider("refresh");
			break;
	}
});

$(document).ready(function() {
	$('.nvButton').on('slidestop', function(event, ui) {
		var target      = event.currentTarget,
			sliderId    = $(target).attr('id'),
			buttonValue = ($(this).val() == 'on');
		socket.emit('SetLicht', {'fkt': 'sw', 'dev': sliderId, 'val': buttonValue});
	});

	$('.nvSlider').on('change', function(event, ui) {
		console.log(event);
		var target      = event.currentTarget,
			sliderId    = $(target).attr('id');
		socket.emit('SetLichtm', {'fkt': 'sl', 'dev': sliderId, 'val': $(this).val()});
	});
});

