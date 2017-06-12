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
    
    // If a trip starts and ends on this date, a new trip cant start or end here
    if(tripStarts && tripEnds){
        if(returnTripId){
            // TODO Return a list of start and end trips
            return tripStarts;
        }else{
            return false;
        }
    }
    
    // TODO Figure out what this should actually be
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

var tripDuration = function(tripId){
    // Return the # of full days in a trip
    return 333;
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
        
        var tripSD = moment(thisTrip.get('startDate'));
        var tripED = moment(thisTrip.get('endDate'));
        
        // Skip 0 full day trips
        if(tripSD.add(1, 'day').isSame(tripED, 'day')){
            // 0 full day trip
            continue;
        }else{
            // Revert our change to tripSD var
            tripSD.subtract(1, 'day');
        }
        
        // Skip if trip starts or ends on this day
        if(dateCounter.isSame(tripSD, 'day') || dateCounter.isSame(tripED, 'day')){
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
    // We do this by checking 
    tripsColl.each(function(trip){
        var hasOnwardTrip = false;
        var tripEnd = safeDate(trip.get('endDate'));
        
        // If end date isn't within period range, skip
        if(!tripEnd.isBetween(rangeStart, rangeEnd, 'day', '[]')){
            // [] means include start and end dates
            return;
        }
        
        // Look for another trip with start date as same day or next day
        tripsColl.each(function(trip2){
            var trip2Start = safeDate(trip2.get('startDate'));
            
            // If End date of this trip is equal to start date of another trip
            if(trip2Start.isSame(tripEnd, 'day')){
                hasOnwardTrip = true;
            }
        });
        
        // Found another trip with start date = this trips end date
        if(hasOnwardTrip){
            results.transitDays ++;
            return;
        }

        // Look for another trip with start date = this trips end date +1day (overnight travel)
        tripsColl.each(function(trip2){
            var trip2Start = safeDate(trip2.get('startDate'));
            trip2Start.subtract(1, 'day');
            
            // If End date of this trip is equal to start date (-1) of another trip
            if(trip2Start.isSame(tripEnd, 'day')){
                hasOnwardTrip = true;
            }
        });
        
        // Found another trip with start date = this trips end date (but a day after)
        // That means we add 2 transit days
        if(hasOnwardTrip){
            results.transitDays += 2;
            return;
        }
        
    }.bind(this));
    
    return results;
    
}

var mouseOnTrip = function(e){
    // Calendar Helper: Show the trip hover tooltip
    
    if(e.events.length > 0){
        var content = '';
        
        for(var i in e.events) {
            var startDate = safeDate(e.events[i].startDate);
            var endDate =  safeDate(e.events[i].endDate);
            
            //console.log('--');
            //console.log(startDate._d)
            //console.log(endDate._d);
            
            var tripDuration = duration(startDate, endDate);
            
            //console.log(tripDuration);
            
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
            html: true,
            content: content
        });
        
        $(e.element).popover('show');
    }
}

var countryByCode = function(code){
    return _.find(COUNTRIES, {
        code: code.toUpperCase()
    });
}

var bootstrapAppData = function(tripsColl, settingsColl){
    // This generally runs the first time the app loads
    
    var rangePeriod = new Backbone.Model({
        settingKey: 'range',
        startDate: '2017-01-01',
        endDate: '2017-12-31'
    });
    
    settingsColl.add(rangePeriod);
    rangePeriod.save();
    
}

