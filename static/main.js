// Models
var TripModel = Backbone.Model.extend();
// Collections

var TripsCollection = Backbone.Collection.extend({
    
    model: TripModel,
    localStorage: new Backbone.LocalStorage('trips')
    
});

// Views
var TripFormView = Backbone.View.extend({
    template: _.template($('#template-trip-form').html()),
    
    events: {
        'click button[data-action=save]': function(e){
            this.saveTrip();
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
        
        if(!freeDateRange(startDate, endDate)){
            alert('Please select a date range not already occupied by another trip');
            return false;
        }
        
        this.$el.find('[data-field=trip-start-date]').val(startDate.format('YYYY-MM-DD'));
        this.$el.find('[data-field=trip-end-date]').val(endDate.format('YYYY-MM-DD'));
        
        $('#trip-modal').modal('show');
    },
    
    validate: function(values){
        // Validate the trip details
        
        var tripDuration = moment.duration(moment(values.endDate).diff(moment(values.startDate))).days();
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
            country: this.$el.find('[data-field=trip-country]').val(),
            startDate: moment(this.$el.find('[data-field=trip-start-date]').val()),
            endDate: moment(this.$el.find('[data-field=trip-end-date]').val())
        };
        
        // Validate it first
        if(!this.validate(values)){
            return;
        }
        
        // Save the trip
        var trip = new TripModel(values);
        tripsColl.add(trip);
        trip.save();
        
        // Close the modal
        this.$el.modal('hide');
        this.$el.find('[data-field=trip-country]').val('');
    }
});

// Calendar Helpers
var mouseOnDay = function(e){
    if(e.events.length > 0){
        var content = '';
        
        for(var i in e.events) {
            var startDate =  moment(e.events[i].startDate);
            var endDate =  moment(e.events[i].endDate);
            var tripDuration = moment.duration(startDate.diff(endDate));
            tripDuration = (tripDuration.asDays() * -1)-1;
            
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

// Open date checker
var freeDate = function(tripDate){
    
    // Check for overlap
    var overlap = false;
    tripsColl.toJSON().forEach(function(trip){
        if(tripDate.isBetween(moment(trip.startDate), moment(trip.endDate))){
            overlap = true;
        }
    });
    
    if(overlap){
        return false;
    }
    
    // Check if 2 trips start/end on this date
    var tripStarts = false;
    var tripEnds = false;
    tripsColl.toJSON().forEach(function(trip){
        if(moment(trip.startDate).format('YYYY-MM-DD') == tripDate.format('YYYY-MM-DD')){
            tripStarts = true;
        }else if(moment(trip.endDate).format('YYYY-MM-DD') == tripDate.format('YYYY-MM-DD')){
            tripEnds = true;
        }
    });
    
    if(tripStarts && tripEnds){
        return false;
    }
    
    return true;
}

var freeDateRange = function(startDate, endDate){
    
    if(!freeDate(startDate) || !freeDate(endDate)){
        return false;
    }
    
    var encapsulates = false;
    tripsColl.toJSON().forEach(function(trip){
        if(moment(trip.startDate).isBetween(startDate, endDate)){
            encapsulates = true;
        }else if(moment(trip.endDate).isBetween(startDate, endDate)){
            encapsulates = true;
        }
    });
    if(encapsulates){
        return false;
    }
    
    return true;
}

// Init    

// Load the trips collection
var tripsColl = new TripsCollection();

// Draw trip form
var tripForm = new TripFormView({
    el: $('#trip-modal'),
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
    this.toJSON().forEach(function(trip){
        tripsList.push({
            country: _.find(COUNTRIES, {code: trip.country.toUpperCase()}).name,
            startDate: moment(trip.startDate)._d,
            endDate: moment(trip.endDate)._d
        });
    });
    
    $('#calendar').data('calendar').setDataSource(tripsList);
});

// Load trips
tripsColl.fetch({ reset: true });

