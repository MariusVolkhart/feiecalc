// Utilities

var DF = 'YYYY-MM-DD';

var freeDate = function(tripDate, returnTripId){
    // Check whether a date is occupied by an existing trip
    // Takes tripDate (moment obj)
    // Returns true/false or a trip id (2nd arg setting)
    
    // Check for overlap
    var overlap = false;
    tripsColl.each(function(trip){
        if(tripDate.isBetween(safeDate(trip.attributes.startDate), safeDate(trip.attributes.endDate))){
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
        if(safeDate(trip.attributes.startDate).format(DF) == tripDate.format(DF)){
            tripStarts = trip.id;
        }else if(safeDate(trip.attributes.endDate).format(DF) == tripDate.format(DF)){
            tripEnds = trip.id;
        }
    });
    
    if(tripStarts && tripEnds){
        if(returnTripId){
            // TODO Return a list of start and end trips
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
        if(safeDate(trip.attributes.startDate).isBetween(startDate, endDate)){
            encapsulates = true;
        }else if(safeDate(trip.attributes.endDate).isBetween(startDate, endDate)){
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
    tripDuration = tripDuration.asDays() * -1;
    
    // Subtract 1 full day since there are 2 partial days on each side
    return tripDuration - 1;
}

var safeDate = function(dateStr){
    // Revert a date to midnight
    return moment(dateStr).startOf('day');
}

var generateTravelResults = function(rangeStart, rangeEnd){
    // Return an object describing the trips during the given range
    
    var SAFE_LIMIT = 900;
    
    var results = {
        countries: {},
        transitDays: 0
    };
    
    // Count all the full days in another country
    
    var dateCounter = moment(rangeStart.format(DF));
    var rangeEndPlusOne = moment(rangeEnd.format(DF)).add(1, 'days');
    while(!dateCounter.isSame(rangeEndPlusOne) && SAFE_LIMIT){
        SAFE_LIMIT--;
        
        // Continue if a trip doesn't exist on this date
        var existingTrip = freeDate(dateCounter, true);
        
        // Increment date counter
        dateCounter.add(1, 'days');
        
        if(!existingTrip){
            continue;
        }
        
        // Prepare country details
        var thisTrip = tripsColl.get(existingTrip);
        var thisTripCo = thisTrip.get('country');
        
        // Skip USA
        if(thisTripCo == 'us'){
            continue;
        }
        
        // Add the counter for this country if it doesnt exist
        if(!results.countries[thisTripCo]){
            results.countries[thisTripCo] = 0;
        }
        
        // Add 1
        results.countries[thisTripCo]++;
        
    }
    
    // Count all valid transit days
    // Transit day = leave one country and enter another within 24 hours
    // TODO Only count trips within the travel range
    tripsColl.each(function(trip){
        var hasOnwardTrip = false;
        tripsColl.each(function(trip2){
            var tripEnd = safeDate(trip.attributes.endDate);
            var trip2Start = safeDate(trip2.attributes.startDate);
            if(trip2Start.format('YYYY-MM-DD') == tripEnd.format('YYYY-MM-DD')){
                hasOnwardTrip = true;
            }
        });
        if(hasOnwardTrip){
            results.transitDays ++;
        }
    }.bind(this));
    
    return results;
    
}

var mouseOnTrip = function(e){
    // Calendar Helper: Show the trip hover tooltip
    
    if(e.events.length > 0){
        var content = '';
        
        for(var i in e.events) {
            var startDate =  safeDate(e.events[i].startDate);
            var endDate =  safeDate(e.events[i].endDate);
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

var countryByCode = function(code){
    return _.find(COUNTRIES, {
        code: code.toUpperCase()
    }).name;
}

