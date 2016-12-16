// Utilities

var freeDate = function(tripDate, returnTripId){
    // Check whether a date is occupied by an existing trip
    
    // Check for overlap
    var overlap = false;
    tripsColl.each(function(trip){
        if(tripDate.isBetween(moment(trip.attributes.startDate), moment(trip.attributes.endDate))){
            overlap = trip.id;
        }
    });
    
    if(overlap){
        if(returnTripId){
            return overlap;
        }else{
            return false;
        }
    }
    
    // Check if 2 trips start/end on this date
    var tripStarts = false;
    var tripEnds = false;
    tripsColl.each(function(trip){
        if(moment(trip.attributes.startDate).format('YYYY-MM-DD') == tripDate.format('YYYY-MM-DD')){
            tripStarts = trip.id;
        }else if(moment(trip.attributes.endDate).format('YYYY-MM-DD') == tripDate.format('YYYY-MM-DD')){
            tripEnds = trip.id;
        }
    });
    
    if(tripStarts && tripEnds){
        if(returnTripId){
            return tripStarts;
        }else{
            return false;
        }
    }
    
    // What...
    if(returnTripId){ return false; }
    return true;
}

var freeDateRange = function(startDate, endDate){
    // Check whether a date range crosses or contains an
    // existing trip
    
    if(!freeDate(startDate) || !freeDate(endDate)){
        return false;
    }
    
    var encapsulates = false;
    tripsColl.each(function(trip){
        if(moment(trip.attributes.startDate).isBetween(startDate, endDate)){
            encapsulates = true;
        }else if(moment(trip.attributes.endDate).isBetween(startDate, endDate)){
            encapsulates = true;
        }
    });
    if(encapsulates){
        return false;
    }
    
    return true;
}

var duration = function(startDate, endDate){
    // Returns the number of full days in a trip
    
    var tripDuration = moment.duration(startDate.diff(endDate));
    tripDuration = (tripDuration.asDays() * -1)-1;
    
    return tripDuration;
}

var mouseOnTrip = function(e){
    // Calendar Helper: Show the trip hover tooltip
    
    if(e.events.length > 0){
        var content = '';
        
        for(var i in e.events) {
            var startDate =  moment(e.events[i].startDate);
            var endDate =  moment(e.events[i].endDate);
            var tripDuration = duration(startDate, endDate);
            
            content += '\
                <div class="event-tooltip-content">\
                    <div class="event-name" style="color:' +
                        e.events[i].color + 
                        '">' +
                        e.events[i].country +
                    '</div>' +
                    '<div class="event-location">' +
                        tripDuration + ' full days'
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
