
var init = function(){
    // Initialize the app
    
    var currentYear = new Date().getFullYear();

    // Init Calendar
    $('#calendar').calendar({ 
        style: 'background',
        alwaysHalfDay: true,
        enableRangeSelection: true,
        mouseOnDay: mouseOnDay,
        mouseOutDay: function(e) {
            if(e.events.length > 0) {
                $(e.element).popover('hide');
            }
        },
        dataSource: [
            {
                country: 'Malaysia',
                startDate: new Date(currentYear, 1, 4),
                endDate: new Date(currentYear, 3, 5)
            },
            {
                country: 'Japan',
                startDate: new Date(currentYear, 3, 5),
                endDate: new Date(currentYear, 3, 15)
            }
        ]
    });
    
}

// Calendar Helpers
var mouseOnDay = function(e){
    if(e.events.length > 0){
        var content = '';
        
        for(var i in e.events) {
            var startDate =  moment(e.events[i].startDate);
            var endDate =  moment(e.events[i].endDate);
            var tripDuration = moment.duration(startDate.diff(endDate));
            tripDuration = (tripDuration.asDays() * -1);
            
            content += '\
                <div class="event-tooltip-content">\
                    <div class="event-name" style="color:'
                        + e.events[i].color + 
                        '">'
                        + e.events[i].country +
                    '</div>' +
                    '<div class="event-location">'
                        + tripDuration + ' days'
                    '</div>' +
                '</div>';
        }
    
        $(e.element).popover({ 
            trigger: 'manual',
            container: 'body',
            html:true,
            content: content
        });
        
        $(e.element).popover('show');
    }
}
       
init();

