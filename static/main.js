// Models
var TripModel = Backbone.Model.extend();
// Collections

var TripsCollection = Backbone.Collection.extend({
    
    model: TripModel,
    localStorage: new Backbone.LocalStorage('trips')
    
});

// Views
var ProgressView = Backbone.View.extend({
    template: _.template($('#template-progress').html()),
    
    initialize: function(){
        this.collection.on('change reset', this.render.bind(this));
    },
    
    render: function(){
        var dayCount = this.calculateDayCount();
        this.$el.html(this.template({
            dayCount: dayCount,
            progress: Math.round(dayCount/330*100)
        }));
    },
    
    calculateDayCount: function(){
        // To calculate the day count, we will first count the number
        // of full days in all trips, then we will add one for all
        // days which have the end & beginning of a trip (travel day)
        // since these travel days are not crossing into the US.
        // This may need to be modified in the future.
        
        var dayCount = 0;
        
        // Count full days
        this.collection.each(function(trip){
            var endDate = moment(trip.attributes.endDate);
            var startDate = moment(trip.attributes.startDate);
            var tripDuration = duration(startDate, endDate);
            dayCount += tripDuration;
        });
        
        // Count travel days (which dont touch US)
        this.collection.each(function(trip){
            var hasOnwardTrip = false;
            this.collection.each(function(trip2){
                var tripEnd = moment(trip.attributes.endDate);
                var trip2Start = moment(trip2.attributes.startDate);
                if(trip2Start.format('YYYY-MM-DD') == tripEnd.format('YYYY-MM-DD')){
                    hasOnwardTrip = true;
                }
            });
            if(hasOnwardTrip){
                dayCount += 1;
            }
        }.bind(this));
        
        return dayCount;
    }
    
});

var TripFormView = Backbone.View.extend({
    template: _.template($('#template-trip-form').html()),
    
    events: {
        'click button[data-action=save]': function(e){
            e.preventDefault();
            this.saveTrip();
        },
        'click [data-action=delete]': function(e){
            e.preventDefault();
            this.deleteTrip();
        }
    },
    
    initialize: function(options){
        this.render();
    },
    
    render: function(){
        this.$el.find('.modal-body').html(this.template({
            countries: COUNTRIES
        }));
    },
    
    showTripForm: function(startDate, endDate){
        
        // Clicked a date, maybe an event
        var existingTrip = false;
        if(startDate.format('YYYY-MM-DD') == endDate.format('YYYY-MM-DD')){
            var tripId = freeDate(startDate, true);
            if(tripId){
                existingTrip = tripsColl.get(tripId);
            }else{
                return false;
            }
        }
        
        if(!existingTrip && !freeDateRange(startDate, endDate)){
            alert('Please select a date range not already occupied by another trip');
            return false;
        }
        
        if(existingTrip){
            this.$el.find('.delete-trip').show();
            this.$el.find('[data-field=trip-id]').val(existingTrip.id);
            this.$el.find('[data-field=trip-country]').val(existingTrip.attributes.country);
            startDate = moment(existingTrip.attributes.startDate);
            endDate = moment(existingTrip.attributes.endDate);
        }else{
            this.$el.find('.delete-trip').hide();
            this.$el.find('[data-field=trip-id]').val('');
        }
        
        this.$el.find('[data-field=trip-start-date]').val(startDate.format('YYYY-MM-DD'));
        this.$el.find('[data-field=trip-end-date]').val(endDate.format('YYYY-MM-DD'));
        
        $('#trip-modal').modal('show');
    },
    
    validate: function(values){
        // Validate the trip details
        
        var tripDuration = duration(moment(values.startDate), moment(values.endDate));
        
        if(!tripDuration){
            alert('Trip duration must be at least 1 day');
            return false;
        }
        
        if(!values.country){
            alert('Please select a country');
            return false;
        }
        
        if(!values.startDate._isValid || values.startDate._i.length != 10){
            alert('Please enter a valid start date (format: YYYY-MM-DD)');
            return false;
        }
        
        if(!values.endDate._isValid || values.endDate._i.length != 10){
            alert('Please enter a valid end date (format: YYYY-MM-DD)');
            return false;
        }
        
        
        return true;
    },
    
    saveTrip: function(){
        // Save the trip

        var values = {
            id: this.$el.find('[data-field=trip-id]').val(),
            country: this.$el.find('[data-field=trip-country]').val(),
            startDate: moment(this.$el.find('[data-field=trip-start-date]').val()),
            endDate: moment(this.$el.find('[data-field=trip-end-date]').val())
        };
        
        // Validate it first
        if(!this.validate(values)){
            return;
        }
        
        // Save the trip
        if(values.id){
            var thisTrip = tripsColl.get(values.id);
            thisTrip.set({
                country: values.country
            });
            thisTrip.save();
        }else{
            var thisTrip = new TripModel({
                country: values.country,
                startDate: values.startDate,
                endDate: values.endDate
            });
            tripsColl.add(thisTrip);
            thisTrip.save();
        }
        
        // Close the modal
        this.$el.modal('hide');
        this.$el.find('[data-field=trip-country]').val('');
        this.$el.find('[data-field=trip-id]').val('');
    },
    
    deleteTrip: function(){
        if(confirm('Are you sure you want to delete this trip?')){
            var tripId = this.$el.find('[data-field=trip-id]').val();
            var thisTrip = tripsColl.get(tripId);
            thisTrip.destroy();
            this.$el.modal('hide');
            tripsColl.trigger('change');
        }
    }
    
});

// Calendar Helpers
var mouseOnDay = function(e){
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

// Utils
var freeDate = function(tripDate, returnTripId){
    
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

// Init    

// Load the trips collection
var tripsColl = new TripsCollection();

// Draw trip form
var tripForm = new TripFormView({
    el: $('#trip-modal'),
    collection: tripsColl
});

var progressBar = new ProgressView({
    el: $('#progress'),
    collection: tripsColl
});

// Init Calendar
var currentYear = new Date().getFullYear();
$('#calendar').calendar({ 
    style: 'background',
    alwaysHalfDay: true,
    enableRangeSelection: true,
    mouseOnDay: mouseOnDay,
    mouseOutDay: function(e){
        if(e.events.length > 0){
            $(e.element).popover('hide');
        }
    },
    selectRange: function(e){
        tripForm.showTripForm(moment(e.startDate), moment(e.endDate));
    },
    dataSource: []
});

// Update the calendar every time the trips collection changes
tripsColl.on('change reset', function(){
    var tripsList = [];
    this.each(function(trip){
        tripsList.push({
            country: _.find(COUNTRIES, {
                code: trip.attributes.country.toUpperCase()
            }).name,
            startDate: moment(trip.attributes.startDate)._d,
            endDate: moment(trip.attributes.endDate)._d
        });
    });
    
    $('#calendar').data('calendar').setDataSource(tripsList);
});

// Load trips
tripsColl.fetch({ reset: true });

